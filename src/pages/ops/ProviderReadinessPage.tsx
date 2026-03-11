import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Users,
  Building2, Shield, Star, Briefcase, MapPin, Receipt, Heart, Zap,
  BarChart3, Phone, Clock, Target, TrendingUp, Eye, Database, Info,
  Wallet, MessageSquare, Camera, Scale, Wrench, Award, FileCheck,
  Headphones, Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Types ──
type Status = "pass" | "partial" | "fail";
type ScoreSource = "data" | "audit";

interface AuditItem {
  name: string;
  whyItMatters: string;
  status: Status;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
}

interface CategoryRecruitReady {
  code: string;
  label: string;
  status: "ready" | "partially_ready" | "not_ready";
  reason: string;
  providerCount: number;
  verifiedCount: number;
}

interface SectionScore {
  label: string;
  icon: React.ReactNode;
  score: number;
  weight: number;
  source: ScoreSource;
  items: AuditItem[];
}

// ── Category normalization (canonical) ──
const CATEGORY_NORMALIZE: Record<string, string> = {
  AC: "AC", "ac": "AC", "air conditioning": "AC", "aircon": "AC", "ac_services": "AC", "ac services": "AC",
  MOBILE: "MOBILE", "mobile": "MOBILE", "mobile_repair": "MOBILE", "phone repair": "MOBILE", "mobile phone": "MOBILE",
  IT: "IT", "it": "IT", "it_support": "IT", "computer": "IT", "laptop": "IT",
  CCTV: "CCTV", "cctv": "CCTV", "cctv_solutions": "CCTV", "security camera": "CCTV",
  CONSUMER_ELEC: "CONSUMER_ELEC", "consumer_elec": "CONSUMER_ELEC", "electronics": "CONSUMER_ELEC", "tv repair": "CONSUMER_ELEC",
  SOLAR: "SOLAR", "solar": "SOLAR", "solar_solutions": "SOLAR",
  ELECTRICAL: "ELECTRICAL", "electrical": "ELECTRICAL", "electrician": "ELECTRICAL", "wiring": "ELECTRICAL",
  PLUMBING: "PLUMBING", "plumbing": "PLUMBING", "plumber": "PLUMBING",
  NETWORK: "NETWORK", "network": "NETWORK", "internet": "NETWORK", "wifi": "NETWORK",
  COPIER: "COPIER", "copier": "COPIER", "printer": "COPIER", "copier_repair": "COPIER",
  SMART_HOME_OFFICE: "SMART_HOME_OFFICE", "smart_home": "SMART_HOME_OFFICE", "smart home": "SMART_HOME_OFFICE",
  POWER_BACKUP: "POWER_BACKUP", "power_backup": "POWER_BACKUP", "ups": "POWER_BACKUP", "inverter": "POWER_BACKUP",
};

const ALL_CATEGORIES = [
  { code: "AC", label: "AC Services" },
  { code: "MOBILE", label: "Mobile Phone Repairs" },
  { code: "IT", label: "IT Repairs & Support" },
  { code: "CCTV", label: "CCTV Solutions" },
  { code: "CONSUMER_ELEC", label: "Consumer Electronics" },
  { code: "SOLAR", label: "Solar Solutions" },
  { code: "ELECTRICAL", label: "Electrical" },
  { code: "PLUMBING", label: "Plumbing" },
  { code: "NETWORK", label: "Network Support" },
  { code: "COPIER", label: "Copier / Printer Repair" },
  { code: "SMART_HOME_OFFICE", label: "Smart Home / Office" },
  { code: "POWER_BACKUP", label: "Power Backup" },
];

function normalizeCategory(raw: string): string {
  return CATEGORY_NORMALIZE[raw] || CATEGORY_NORMALIZE[raw.toLowerCase()] || raw.toUpperCase();
}

function statusBadge(s: Status) {
  if (s === "pass") return <Badge className="bg-emerald-600/15 text-emerald-700 border-0 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Pass</Badge>;
  if (s === "partial") return <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 border-0 text-[10px]"><XCircle className="w-3 h-3 mr-1" />Fail</Badge>;
}

function priorityBadge(p: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-600/15 text-red-700",
    high: "bg-amber-500/15 text-amber-700",
    medium: "bg-sky-500/15 text-sky-700",
    low: "bg-slate-400/15 text-slate-600",
  };
  return <Badge className={`${colors[p] || colors.low} border-0 text-[10px] capitalize`}>{p}</Badge>;
}

function sourceBadge(s: ScoreSource) {
  return s === "data"
    ? <Badge className="bg-emerald-600/10 text-emerald-700 border-0 text-[9px] gap-0.5"><Database className="w-2.5 h-2.5" />Data</Badge>
    : <Badge className="bg-amber-500/10 text-amber-700 border-0 text-[9px] gap-0.5"><Eye className="w-2.5 h-2.5" />Audit</Badge>;
}

// ── Main Component ──
export default function ProviderReadinessPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pRes, zRes] = await Promise.all([
        supabase.from("partners").select("*").order("rating_average", { ascending: false }),
        supabase.from("service_zones").select("*").eq("is_active", true),
      ]);
      setPartners(pRes.data || []);
      setZones(zRes.data || []);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  // ── Derived counts ──
  const verified = partners.filter(p => p.verification_status === "verified");
  const active = verified.filter(p => p.availability_status !== "offline");

  function countByCategory(list: any[], catCode: string): number {
    return list.filter(p =>
      (p.categories_supported || []).some((c: string) => normalizeCategory(c) === catCode)
    ).length;
  }

  // ── Category recruitment readiness ──
  const categoryRecruitReadiness: CategoryRecruitReady[] = ALL_CATEGORIES.map(cat => {
    const total = countByCategory(partners, cat.code);
    const ver = countByCategory(verified, cat.code);
    let status: CategoryRecruitReady["status"] = "not_ready";
    let reason = "";

    // Assess from PROVIDER perspective
    if (ver >= 3 && total >= 5) {
      status = "ready";
      reason = "Platform has enough supply to demonstrate value; new providers will see real demand signals.";
    } else if (ver >= 1 || total >= 2) {
      status = "partially_ready";
      reason = "Some providers exist — can pitch but must be transparent about early-stage volume.";
    } else {
      reason = "No credible supply base yet; pitching may erode trust if providers see no activity.";
    }

    return { code: cat.code, label: cat.label, status, reason, providerCount: total, verifiedCount: ver };
  });

  // ── Build audit sections ──
  const hasOnboarding = true; // /join route exists
  const hasPartnerDashboard = true; // /partner route exists
  const hasQuoteBuilder = true; // technician quote builder exists
  const hasWallet = true; // /partner/wallet exists
  const hasProfile = true; // /partner/profile exists

  const sections: SectionScore[] = [
    // 1. Value Proposition
    {
      label: "Provider Value Proposition",
      icon: <Heart className="w-4 h-4" />,
      score: 55,
      weight: 12,
      source: "audit",
      items: [
        { name: "Access to quality leads", whyItMatters: "Providers join platforms for a steady job pipeline", status: "partial", priority: "critical", action: "Show real booking volume metrics on recruitment page; add a 'Why Join LankaFix' section at /join" },
        { name: "Digital job pipeline visibility", whyItMatters: "Providers need to see incoming work clearly", status: "pass", priority: "high", action: "Partner dashboard shows active/pending jobs — functional" },
        { name: "Structured booking flow", whyItMatters: "Reduces ambiguity vs WhatsApp-based freelancing", status: "pass", priority: "high", action: "Full booking lifecycle exists with status transitions" },
        { name: "Quote support & AI assist", whyItMatters: "Helps providers price fairly and win approval", status: "pass", priority: "medium", action: "AI Quote Assistant and technician quote builder exist" },
        { name: "Verified marketplace exposure", whyItMatters: "Providers want their verified status to attract more customers", status: "partial", priority: "high", action: "Verification badge exists but customer-facing provider cards need stronger trust display" },
        { name: "Repeat booking opportunity", whyItMatters: "Recurring revenue is the top motivator for platform loyalty", status: "partial", priority: "high", action: "Service relationships tracked in DB but no visible repeat-customer metric for providers" },
        { name: "Transparent ratings system", whyItMatters: "Fair ratings drive quality providers to stay", status: "partial", priority: "high", action: "Rating fields exist but providers cannot see per-job ratings history yet" },
        { name: "Merit-based growth (Premium tiers)", whyItMatters: "Top providers want recognition and better leads", status: "pass", priority: "medium", action: "Premium partner page (/partner/premium) with Pro/Elite tiers exists" },
        { name: "Compelling pitch vs WhatsApp/referrals", whyItMatters: "Providers must see clear advantage over informal channels", status: "fail", priority: "critical", action: "Create a provider landing page with comparison table: LankaFix vs WhatsApp/Facebook/direct calls" },
      ],
    },
    // 2. Onboarding Readiness
    {
      label: "Partner Onboarding Readiness",
      icon: <FileCheck className="w-4 h-4" />,
      score: 75,
      weight: 14,
      source: "audit",
      items: [
        { name: "10-step onboarding flow (/join)", whyItMatters: "Clear onboarding reduces drop-off and builds commitment", status: "pass", priority: "critical", action: "Full onboarding with identity, categories, zones, documents, availability, bank details" },
        { name: "Category & specialization setup", whyItMatters: "Providers must declare skills accurately for matching", status: "pass", priority: "high", action: "Category selection + brand specializations supported" },
        { name: "Service zone selection", whyItMatters: "Zone accuracy drives correct dispatch", status: "pass", priority: "high", action: "Colombo zones selectable during onboarding" },
        { name: "Document upload (NIC/BR)", whyItMatters: "Verification requires identity proof", status: "pass", priority: "critical", action: "Document upload step exists with NIC, BR, certifications" },
        { name: "Availability / shift setup", whyItMatters: "Providers need to declare working hours upfront", status: "pass", priority: "medium", action: "Working days and hours configurable in onboarding" },
        { name: "Onboarding writes to real partners table", whyItMatters: "Onboarded providers must appear in dispatch system", status: "fail", priority: "critical", action: "Onboarding currently uses Zustand store only — must INSERT into partners table on completion" },
        { name: "First-job activation guidance", whyItMatters: "New providers need help getting their first booking", status: "fail", priority: "high", action: "Add post-onboarding checklist: go online, set zones, first job tips" },
        { name: "Profile completeness indicator", whyItMatters: "Incomplete profiles reduce match quality", status: "partial", priority: "medium", action: "Add profile strength bar to partner dashboard" },
      ],
    },
    // 3. Identity & Profile
    {
      label: "Partner Identity & Profile Strength",
      icon: <Building2 className="w-4 h-4" />,
      score: 60,
      weight: 10,
      source: "audit",
      items: [
        { name: "Provider name + business name", whyItMatters: "Unique identity builds customer trust", status: "pass", priority: "high", action: "full_name and business_name fields in partners table" },
        { name: "Verified badge display", whyItMatters: "Verification status is the #1 trust signal for customers", status: "pass", priority: "critical", action: "Verification badge shown on partner profile" },
        { name: "Profile photo / logo", whyItMatters: "Visual identity increases booking conversion", status: "partial", priority: "high", action: "profile_photo_url column exists but no upload flow in partner settings" },
        { name: "Category specializations visible", whyItMatters: "Customers choose based on expertise", status: "pass", priority: "medium", action: "categories_supported displayed on profile" },
        { name: "Brand specializations", whyItMatters: "AC/Solar providers want brand credibility shown", status: "partial", priority: "medium", action: "brand_specializations column exists but not prominently displayed" },
        { name: "Ratings + job count visible", whyItMatters: "Social proof drives provider confidence", status: "partial", priority: "high", action: "Rating and completed_jobs_count exist but provider-facing display uses mock data" },
        { name: "Performance score visible to provider", whyItMatters: "Providers need feedback to improve", status: "fail", priority: "high", action: "performance_score column exists but no provider-visible scorecard" },
        { name: "Zone coverage display", whyItMatters: "Shows operational reach", status: "pass", priority: "medium", action: "service_zones shown on partner profile page" },
      ],
    },
    // 4. Dashboard Readiness
    {
      label: "Partner Dashboard Readiness",
      icon: <BarChart3 className="w-4 h-4" />,
      score: 50,
      weight: 12,
      source: "audit",
      items: [
        { name: "Job stats overview (active/pending/completed)", whyItMatters: "Daily operational clarity", status: "pass", priority: "critical", action: "Dashboard shows active jobs, awaiting confirmation, in progress, completed today" },
        { name: "Fleet management panel", whyItMatters: "Multi-tech businesses need team visibility", status: "partial", priority: "high", action: "Fleet panel exists but uses mock data — must connect to real partners table" },
        { name: "Performance metrics panel", whyItMatters: "Providers need to track their quality", status: "partial", priority: "high", action: "Performance card exists but uses mock providerERPStore, not real DB data" },
        { name: "Revenue visibility", whyItMatters: "Financial clarity keeps providers engaged", status: "partial", priority: "critical", action: "Revenue card exists but shows mock data — connect to partner_settlements" },
        { name: "Recent jobs list", whyItMatters: "Quick access to current work", status: "pass", priority: "high", action: "Active jobs listed with navigation to detail view" },
        { name: "Quick action buttons", whyItMatters: "Efficient navigation reduces friction", status: "pass", priority: "medium", action: "All Jobs, Technicians, Wallet, Profile buttons present" },
        { name: "Dashboard uses real DB data", whyItMatters: "Mock data erodes trust when providers see fake numbers", status: "fail", priority: "critical", action: "Replace MOCK_PARTNERS with usePartnerProfile hook fetching from partners table" },
      ],
    },
    // 5. Booking Management
    {
      label: "Appointment / Booking Management",
      icon: <Briefcase className="w-4 h-4" />,
      score: 60,
      weight: 10,
      source: "audit",
      items: [
        { name: "Incoming job visibility", whyItMatters: "Providers must see new leads immediately", status: "pass", priority: "critical", action: "Partner jobs page lists bookings with status filters" },
        { name: "Job acceptance flow", whyItMatters: "Quick accept/decline is essential for marketplace speed", status: "partial", priority: "critical", action: "Notification system exists but 60s timer needs production testing" },
        { name: "Inspection vs direct job distinction", whyItMatters: "Providers need to know if diagnosis is required first", status: "partial", priority: "high", action: "pricing_archetype exists but not clearly shown in partner job cards" },
        { name: "Quote-required job flag", whyItMatters: "Providers waste time if they don't know a quote is expected", status: "partial", priority: "high", action: "diagnostic_first archetype implies quote needed — make this explicit in job card" },
        { name: "Status update workflow", whyItMatters: "Providers must update job status for tracking", status: "pass", priority: "high", action: "Technician job detail page has status progression buttons" },
        { name: "Cancelled job visibility", whyItMatters: "Providers need to understand why jobs were cancelled", status: "partial", priority: "medium", action: "cancellation_reason field exists but not shown in provider job history" },
        { name: "Assignment clarity (why me?)", whyItMatters: "Providers want to know they were matched fairly", status: "fail", priority: "high", action: "Match reasoning from match_logs not shown to assigned provider" },
      ],
    },
    // 6. Quote Workflow
    {
      label: "Quote Workflow Readiness",
      icon: <Receipt className="w-4 h-4" />,
      score: 70,
      weight: 10,
      source: "audit",
      items: [
        { name: "Technician quote builder", whyItMatters: "Core tool for providers to price jobs", status: "pass", priority: "critical", action: "QuoteBuilder component exists with labour, parts, materials line items" },
        { name: "AI Quote Assistant", whyItMatters: "Helps providers price competitively and reduces rejection", status: "pass", priority: "high", action: "AI-powered quote suggestion edge function exists" },
        { name: "Quote validation / risk flags", whyItMatters: "Prevents unreasonable quotes that damage trust", status: "pass", priority: "high", action: "QuoteValidationBanner and validate-quote-price edge function exist" },
        { name: "Customer approval visibility", whyItMatters: "Providers need to see if customer approved/rejected/revised", status: "partial", priority: "critical", action: "Quote status (approved/rejected/revision_requested) in DB but provider notification flow needs verification" },
        { name: "Quote history", whyItMatters: "Providers want to review past quotes for consistency", status: "fail", priority: "medium", action: "No quote history view in partner dashboard — add quotes listing" },
        { name: "Category-specific quoting", whyItMatters: "AC install vs mobile repair need different quote structures", status: "partial", priority: "medium", action: "Parts catalog exists but category-specific templates not pre-loaded" },
      ],
    },
    // 7. Cancellation / Fairness
    {
      label: "Cancellation / Reschedule Fairness",
      icon: <Scale className="w-4 h-4" />,
      score: 35,
      weight: 8,
      source: "audit",
      items: [
        { name: "Provider visibility into cancellation reason", whyItMatters: "Providers judge platform fairness by transparency", status: "partial", priority: "high", action: "cancellation_reason stored but not displayed to provider" },
        { name: "No-match case handling", whyItMatters: "Provider should know if no customer was found for their zone", status: "partial", priority: "medium", action: "dispatch_escalations table exists but no provider-facing notification" },
        { name: "Rejected quote explanation", whyItMatters: "Providers need feedback to improve pricing", status: "fail", priority: "high", action: "customer_note on quote rejection not shown to provider" },
        { name: "Reschedule workflow", whyItMatters: "Jobs get rescheduled — providers need clear flow", status: "fail", priority: "medium", action: "No reschedule flow exists — scheduled_at can be changed but no UI" },
        { name: "Strike/warning transparency", whyItMatters: "Providers must understand consequences before they happen", status: "partial", priority: "high", action: "partner_warnings visible to provider but policy documentation missing" },
        { name: "Dispute resolution access", whyItMatters: "Providers need to raise disputes fairly", status: "partial", priority: "high", action: "support_tickets exist but no partner-initiated dispute flow" },
      ],
    },
    // 8. Ratings & Reputation
    {
      label: "Ratings / Reputation / Trust",
      icon: <Star className="w-4 h-4" />,
      score: 45,
      weight: 8,
      source: "audit",
      items: [
        { name: "Customer rating visible to provider", whyItMatters: "Feedback drives quality improvement", status: "partial", priority: "critical", action: "customer_rating on bookings exists but no per-job rating history view for providers" },
        { name: "Average rating on profile", whyItMatters: "Reputation is the provider's most valuable asset", status: "pass", priority: "critical", action: "rating_average on partners table, shown on profile" },
        { name: "Completed jobs count", whyItMatters: "Experience signal for customers", status: "pass", priority: "high", action: "completed_jobs_count tracked" },
        { name: "Verified trust badge", whyItMatters: "Differentiates serious providers from casual ones", status: "pass", priority: "critical", action: "verification_status with badge display" },
        { name: "Category-level credibility", whyItMatters: "AC specialist vs generalist matters to customers", status: "partial", priority: "medium", action: "specializations stored but not shown as credibility badges" },
        { name: "Repeat customer metric", whyItMatters: "Shows providers they're building real relationships", status: "fail", priority: "high", action: "service_relationships table tracks repeats but metric not shown to provider" },
        { name: "Review text visibility", whyItMatters: "Providers want to read customer feedback, not just see stars", status: "fail", priority: "medium", action: "customer_review on bookings exists but no provider review feed" },
      ],
    },
    // 9. Operations & Tools
    {
      label: "Provider Operations & Tools",
      icon: <Wrench className="w-4 h-4" />,
      score: 55,
      weight: 8,
      source: "audit",
      items: [
        { name: "Service area management", whyItMatters: "Providers need to update coverage as they grow", status: "partial", priority: "high", action: "service_zones in DB but no in-app edit UI for providers" },
        { name: "Availability toggle", whyItMatters: "Going online/offline is core daily action", status: "partial", priority: "critical", action: "availability_status field exists but no quick toggle on dashboard" },
        { name: "Technician matching fairness", whyItMatters: "Providers must trust the dispatch algorithm", status: "partial", priority: "high", action: "Score-based matching exists but match reasoning hidden from providers" },
        { name: "Service checklist tools", whyItMatters: "Structured checklists ensure quality and reduce disputes", status: "pass", priority: "medium", action: "SERVICE_CHECKLISTS with category-specific items exist" },
        { name: "Navigation to customer location", whyItMatters: "Efficient routing saves provider time", status: "pass", priority: "medium", action: "Google/Waze navigation integration referenced in technician portal" },
        { name: "Parts inventory reference", whyItMatters: "Knowing part prices helps accurate quoting", status: "pass", priority: "medium", action: "parts_catalog table and TechnicianPartsPage exist" },
      ],
    },
    // 10. Earnings & Payouts
    {
      label: "Earnings / Payout Transparency",
      icon: <Wallet className="w-4 h-4" />,
      score: 40,
      weight: 10,
      source: "audit",
      items: [
        { name: "Partner wallet page", whyItMatters: "Financial transparency is non-negotiable for provider trust", status: "partial", priority: "critical", action: "PartnerWalletPage exists but likely uses mock data — must connect to partner_settlements" },
        { name: "Commission visibility", whyItMatters: "Providers must understand platform fees before joining", status: "partial", priority: "critical", action: "Commission engine exists but rates not shown pre-onboarding" },
        { name: "Per-job payout breakdown", whyItMatters: "Providers want to see gross → commission → net for each job", status: "partial", priority: "high", action: "partner_settlements has gross/commission/net but not shown per-job to provider" },
        { name: "Settlement status tracking", whyItMatters: "Pending vs paid clarity prevents disputes", status: "partial", priority: "high", action: "settlement_status field exists but provider visibility unclear" },
        { name: "Earnings history / trends", whyItMatters: "Providers want to see growth over time", status: "fail", priority: "high", action: "No earnings chart or trend view — add to partner wallet/earnings page" },
        { name: "Deduction visibility", whyItMatters: "Unexpected deductions destroy trust faster than anything", status: "fail", priority: "critical", action: "No deduction breakdown shown to providers" },
      ],
    },
    // 11. Lead Quality & Match Transparency
    {
      label: "Lead Quality / Match Transparency",
      icon: <Target className="w-4 h-4" />,
      score: 40,
      weight: 6,
      source: "audit",
      items: [
        { name: "Service category visible on lead", whyItMatters: "Provider must know what kind of job before accepting", status: "pass", priority: "critical", action: "category_code shown in job cards" },
        { name: "Urgency indicator", whyItMatters: "Emergency vs scheduled changes provider response", status: "pass", priority: "high", action: "is_emergency flag shown" },
        { name: "Zone / location clarity", whyItMatters: "Providers need to assess travel before accepting", status: "partial", priority: "high", action: "zone_code shown but exact distance/ETA not always visible to provider" },
        { name: "Inspection vs direct distinction", whyItMatters: "Inspection-first jobs have different time investment", status: "partial", priority: "high", action: "pricing_archetype stored but not clearly labeled in provider job view" },
        { name: "Why-matched explanation", whyItMatters: "Builds trust in dispatch fairness", status: "fail", priority: "medium", action: "match_logs contain score_breakdown but not surfaced to provider" },
        { name: "Lead seriousness signal", whyItMatters: "Low-intent leads waste provider time", status: "fail", priority: "high", action: "No customer intent scoring or deposit signal shown to provider" },
      ],
    },
    // 12. SLA / Response
    {
      label: "SLA / Response-Time Readiness",
      icon: <Clock className="w-4 h-4" />,
      score: 50,
      weight: 6,
      source: "audit",
      items: [
        { name: "Job acceptance time expectation", whyItMatters: "Colombo customers expect fast response", status: "partial", priority: "critical", action: "60s acceptance timer referenced but needs production verification" },
        { name: "Quote response window", whyItMatters: "Delayed quotes lose customers", status: "partial", priority: "high", action: "expires_at on quotes (24h default) but no countdown visible to provider" },
        { name: "Inactivity / lateness handling", whyItMatters: "Consistent SLA enforcement keeps marketplace quality high", status: "partial", priority: "high", action: "late_arrival_count tracked but escalation rules not documented to providers" },
        { name: "Escalation if provider ignores lead", whyItMatters: "Prevents dead bookings", status: "pass", priority: "high", action: "dispatch_escalations + multi-round dispatch exist" },
      ],
    },
    // 13. Performance Scorecard
    {
      label: "Provider Performance Scorecard",
      icon: <Award className="w-4 h-4" />,
      score: 30,
      weight: 6,
      source: "audit",
      items: [
        { name: "Acceptance rate visible", whyItMatters: "Providers need to know this metric affects their ranking", status: "fail", priority: "high", action: "acceptance_rate in DB but no provider-facing view" },
        { name: "Cancellation rate visible", whyItMatters: "Helps providers self-correct", status: "fail", priority: "high", action: "cancellation_rate in DB but not shown to provider" },
        { name: "On-time rate visible", whyItMatters: "Punctuality affects customer trust", status: "fail", priority: "high", action: "on_time_rate in DB but not shown" },
        { name: "Quote approval rate", whyItMatters: "Providers want to know if their pricing is competitive", status: "fail", priority: "high", action: "quote_approval_rate in DB but not surfaced" },
        { name: "Performance score composite", whyItMatters: "Single number providers can track and improve", status: "fail", priority: "critical", action: "performance_score column exists — build a scorecard widget for partner dashboard" },
        { name: "Response speed metric", whyItMatters: "Fast responders should be rewarded", status: "fail", priority: "medium", action: "average_response_time_minutes tracked but not shown to provider" },
      ],
    },
    // 14. Multi-technician / Business
    {
      label: "Multi-Technician / Business Support",
      icon: <Users className="w-4 h-4" />,
      score: 40,
      weight: 4,
      source: "audit",
      items: [
        { name: "Business account identity", whyItMatters: "Many Sri Lankan providers are companies, not solo techs", status: "pass", priority: "high", action: "business_name field on partners table" },
        { name: "Multi-tech under one partner", whyItMatters: "AC/CCTV/IT companies have 3–10 technicians", status: "partial", priority: "high", action: "Partner → technician hierarchy referenced in types but DB has flat partner model" },
        { name: "Team/fleet visibility", whyItMatters: "Managers need to see their team's status", status: "partial", priority: "medium", action: "Fleet panel exists on dashboard but uses mock data" },
        { name: "Internal assignment visibility", whyItMatters: "Manager assigns tech to specific job", status: "fail", priority: "medium", action: "No in-app assignment of specific technician from partner account" },
      ],
    },
    // 15. Evidence / Proof
    {
      label: "Evidence / Proof Workflow",
      icon: <Camera className="w-4 h-4" />,
      score: 55,
      weight: 4,
      source: "audit",
      items: [
        { name: "Before/after photo upload", whyItMatters: "Visual proof protects providers in disputes", status: "partial", priority: "high", action: "photos field on bookings (JSON array) but structured before/after not enforced" },
        { name: "Service checklist completion", whyItMatters: "Proves work was done properly", status: "pass", priority: "medium", action: "SERVICE_CHECKLISTS with completion tracking" },
        { name: "Start OTP verification", whyItMatters: "Confirms provider arrived at customer location", status: "pass", priority: "high", action: "start_otp + start_otp_expires_at on bookings" },
        { name: "Completion OTP verification", whyItMatters: "Customer confirms work was completed satisfactorily", status: "pass", priority: "high", action: "completion_otp + completion_otp_expires_at on bookings" },
        { name: "Dispute evidence support", whyItMatters: "Photos/docs needed if customer disputes quality", status: "partial", priority: "medium", action: "support_tickets have attachments but no structured evidence workflow" },
      ],
    },
    // 16. Sri Lanka Fit
    {
      label: "WhatsApp-First / Sri Lanka Fit",
      icon: <Globe className="w-4 h-4" />,
      score: 45,
      weight: 4,
      source: "audit",
      items: [
        { name: "Mobile-first design", whyItMatters: "Most Sri Lankan providers use phones, not desktops", status: "pass", priority: "critical", action: "Entire app is mobile-first with responsive design" },
        { name: "WhatsApp-friendly notifications", whyItMatters: "WhatsApp is the primary communication channel in SL", status: "fail", priority: "critical", action: "No WhatsApp integration for job alerts — critical for provider adoption" },
        { name: "Concise job notifications", whyItMatters: "Providers check notifications quickly between jobs", status: "partial", priority: "high", action: "partner_notifications exist but push/SMS delivery not implemented" },
        { name: "Sinhala/Tamil support", whyItMatters: "Many technicians prefer local language", status: "fail", priority: "high", action: "No i18n implemented — English only currently" },
        { name: "Non-corporate, practical tone", whyItMatters: "Overly corporate UX alienates working-class providers", status: "partial", priority: "medium", action: "UI is clean but some sections feel enterprise-heavy" },
        { name: "Offline capability", whyItMatters: "Mobile data can be unreliable in some areas", status: "partial", priority: "medium", action: "PWA with service worker exists but limited offline functionality" },
      ],
    },
  ];

  // ── Compute overall scores ──
  const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
  const weightedScore = Math.round(sections.reduce((s, sec) => s + sec.score * sec.weight, 0) / totalWeight);

  // ── Critical blockers ──
  const criticalFails = sections.flatMap(sec =>
    sec.items.filter(i => i.status === "fail" && i.priority === "critical").map(i => ({ section: sec.label, ...i }))
  );
  const highFails = sections.flatMap(sec =>
    sec.items.filter(i => i.status === "fail" && i.priority === "high").map(i => ({ section: sec.label, ...i }))
  );

  // ── Hard blockers for verdict ──
  const onboardingNotConnected = sections.find(s => s.label.includes("Onboarding"))?.items.some(i => i.name.includes("writes to real") && i.status === "fail");
  const dashboardMockData = sections.find(s => s.label.includes("Dashboard"))?.items.some(i => i.name.includes("real DB") && i.status === "fail");
  const noWhatsApp = sections.find(s => s.label.includes("Sri Lanka"))?.items.some(i => i.name.includes("WhatsApp") && i.status === "fail");
  const noPerformanceCard = sections.find(s => s.label.includes("Performance Scorecard"))?.score! < 40;

  let verdict: "Ready" | "Needs Fixes" | "Not Ready" = "Needs Fixes";
  if (criticalFails.length >= 3 || onboardingNotConnected || dashboardMockData) {
    verdict = "Not Ready";
  } else if (criticalFails.length === 0 && weightedScore >= 75) {
    verdict = "Ready";
  }

  const verdictConfig = {
    "Ready": { color: "bg-emerald-600", text: "Provider Recruitment Ready", icon: CheckCircle2 },
    "Needs Fixes": { color: "bg-amber-500", text: "Needs Fixes Before Recruitment", icon: AlertTriangle },
    "Not Ready": { color: "bg-red-600", text: "Not Ready for Provider Recruitment", icon: XCircle },
  }[verdict];

  const categoriesReady = categoryRecruitReadiness.filter(c => c.status === "ready").length;
  const categoriesPartial = categoryRecruitReadiness.filter(c => c.status === "partially_ready").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading provider readiness data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#0E4C92] text-white px-4 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ops/launch")} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Provider Readiness Audit</h1>
              <p className="text-white/70 text-xs mt-0.5">Colombo Phase-1 — Partner Experience Assessment</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} className="border-white/30 text-white hover:bg-white/10">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ── Verdict Card ── */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={`${verdictConfig.color} text-white px-5 py-4`}>
            <div className="flex items-center gap-3">
              <verdictConfig.icon className="w-7 h-7" />
              <div>
                <h2 className="text-lg font-bold">{verdictConfig.text}</h2>
                <p className="text-white/80 text-xs mt-0.5">
                  Overall Provider Readiness Score: {weightedScore}/100
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-foreground">{partners.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Partners</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-50">
                <p className="text-2xl font-bold text-emerald-700">{verified.length}</p>
                <p className="text-[10px] text-muted-foreground">Verified</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-sky-50">
                <p className="text-2xl font-bold text-sky-700">{active.length}</p>
                <p className="text-[10px] text-muted-foreground">Active Now</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50">
                <p className="text-2xl font-bold text-amber-700">{criticalFails.length}</p>
                <p className="text-[10px] text-muted-foreground">Critical Blockers</p>
              </div>
            </div>
            <Progress value={weightedScore} className="h-2.5" />
          </CardContent>
        </Card>

        {/* ── Critical Blockers ── */}
        {criticalFails.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Critical Blockers ({criticalFails.length})
              </CardTitle>
              <CardDescription className="text-red-700/70 text-xs">Must fix before provider recruitment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {criticalFails.map((item, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-red-900">{item.name}</p>
                      <p className="text-xs text-red-700/70 mt-0.5">{item.section}</p>
                    </div>
                    {priorityBadge("critical")}
                  </div>
                  <p className="text-xs text-red-800 mt-1.5">→ {item.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="sections" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="sections" className="text-xs py-2">Audit Sections</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs py-2">By Category</TabsTrigger>
            <TabsTrigger value="scores" className="text-xs py-2">Scores</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs py-2">Go/No-Go</TabsTrigger>
          </TabsList>

          {/* ── Sections Tab ── */}
          <TabsContent value="sections" className="space-y-4">
            {sections.map((sec, si) => (
              <Card key={si}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {sec.icon} {sec.label}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {sourceBadge(sec.source)}
                      <Badge variant="outline" className="text-xs">{sec.score}/100</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] w-[30%]">Item</TableHead>
                          <TableHead className="text-[10px] w-[25%]">Why It Matters</TableHead>
                          <TableHead className="text-[10px] w-[8%]">Status</TableHead>
                          <TableHead className="text-[10px] w-[8%]">Priority</TableHead>
                          <TableHead className="text-[10px] w-[29%]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sec.items.map((item, ii) => (
                          <TableRow key={ii}>
                            <TableCell className="text-xs font-medium">{item.name}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{item.whyItMatters}</TableCell>
                            <TableCell>{statusBadge(item.status)}</TableCell>
                            <TableCell>{priorityBadge(item.priority)}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{item.action}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Categories Tab ── */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Category Recruitment Readiness (Provider Perspective)
                </CardTitle>
                <CardDescription className="text-xs">Can we credibly pitch LankaFix to providers in each category?</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Category</TableHead>
                      <TableHead className="text-[10px]">Total</TableHead>
                      <TableHead className="text-[10px]">Verified</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                      <TableHead className="text-[10px]">Recruitment Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRecruitReadiness.map(cat => (
                      <TableRow key={cat.code}>
                        <TableCell className="text-xs font-medium">{cat.label}</TableCell>
                        <TableCell className="text-xs">{cat.providerCount}</TableCell>
                        <TableCell className="text-xs">{cat.verifiedCount}</TableCell>
                        <TableCell>
                          {cat.status === "ready" && <Badge className="bg-emerald-600/15 text-emerald-700 border-0 text-[10px]">Ready</Badge>}
                          {cat.status === "partially_ready" && <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px]">Partial</Badge>}
                          {cat.status === "not_ready" && <Badge className="bg-red-500/15 text-red-700 border-0 text-[10px]">Not Ready</Badge>}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{cat.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{categoriesReady}</p>
                  <p className="text-xs text-emerald-600">Ready to Recruit</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{categoriesPartial}</p>
                  <p className="text-xs text-amber-600">Partially Ready</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{12 - categoriesReady - categoriesPartial}</p>
                  <p className="text-xs text-red-600">Not Ready</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Scores Tab ── */}
          <TabsContent value="scores" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Section Scores</CardTitle>
                <CardDescription className="text-xs flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  {sourceBadge("data")} = live DB metrics &nbsp; {sourceBadge("audit")} = manual assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sections.map((sec, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {sec.icon}
                        <span>{sec.label}</span>
                        {sourceBadge(sec.source)}
                      </div>
                      <span className="text-xs font-bold">{sec.score}/100 <span className="text-muted-foreground font-normal">(w:{sec.weight})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={sec.score} className="h-2 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-12 text-right">
                        {sec.items.filter(i => i.status === "fail").length} fails
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Weighted Overall</span>
                    <span className="text-lg font-bold text-primary">{weightedScore}/100</span>
                  </div>
                  <Progress value={weightedScore} className="h-3 mt-1" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Go/No-Go Tab ── */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-5">
                <div className="text-center space-y-2">
                  <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-white font-bold ${verdictConfig.color}`}>
                    <verdictConfig.icon className="w-5 h-5" />
                    {verdictConfig.text}
                  </div>
                  <p className="text-sm text-muted-foreground">Provider Readiness Score: {weightedScore}/100</p>
                </div>

                {/* Key findings */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold">Key Findings</h3>
                  <div className="grid gap-2">
                    {[
                      { label: "Onboarding flow exists", ok: true, detail: "10-step /join flow with identity, categories, zones, documents" },
                      { label: "Onboarding saves to real DB", ok: false, detail: "Uses Zustand store only — must write to partners table" },
                      { label: "Partner dashboard exists", ok: true, detail: "Active jobs, fleet, performance, revenue panels" },
                      { label: "Dashboard uses real data", ok: false, detail: "Currently MOCK_PARTNERS — must connect to real DB" },
                      { label: "Quote workflow functional", ok: true, detail: "Builder + AI assist + validation + approval cycle" },
                      { label: "Provider performance scorecard", ok: false, detail: "DB columns exist but no provider-facing scorecard view" },
                      { label: "Earnings/payout transparency", ok: false, detail: "Wallet page exists but uses mock data; no deduction visibility" },
                      { label: "WhatsApp notifications", ok: false, detail: "No WhatsApp integration — critical for Sri Lankan adoption" },
                      { label: "Provider landing/pitch page", ok: false, detail: "No compelling 'Why Join LankaFix' comparison page" },
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                        {f.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                        <div>
                          <p className="text-xs font-medium">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground">{f.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top urgent actions */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-red-800">Top Urgent Actions Before Provider Recruitment</h3>
                  <ol className="space-y-1.5">
                    {[
                      "Connect onboarding (/join) to write real partner records to DB",
                      "Replace mock data in partner dashboard with real DB queries",
                      "Build provider performance scorecard widget (acceptance, on-time, rating, approval rates)",
                      "Connect wallet/earnings page to real partner_settlements data",
                      "Add provider landing page with 'LankaFix vs WhatsApp/Facebook/direct' comparison",
                      "Implement WhatsApp notification integration for job alerts",
                      "Add availability online/offline toggle to partner dashboard",
                      "Surface match reasoning to providers (why they were assigned)",
                      "Add earnings trend chart and deduction visibility",
                      "Show repeat-customer metric and review text to providers",
                    ].map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className="bg-red-100 text-red-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {action}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Easiest categories to recruit first */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-emerald-800">Easiest Categories to Recruit First</h3>
                  <p className="text-xs text-muted-foreground">
                    AC Services, Mobile Repairs, and IT Support have the strongest app flows (structured quoting, parts catalog, diagnostic-first support).
                    CCTV and Solar have inspection-first archetypes already built. Electrical and Plumbing have the simplest booking models.
                    Start with categories where the app flow already matches provider expectations.
                  </p>
                </div>

                {/* Biggest trust risks */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-amber-800">Biggest Provider Trust Risks</h3>
                  <div className="grid gap-1.5">
                    {[
                      "Mock data visible in partner dashboard — providers will immediately lose trust",
                      "No earnings/deduction transparency — financial opacity drives churn fastest",
                      "No performance scorecard — providers can't see how to improve or why they get fewer leads",
                      "No WhatsApp integration — forcing app-only usage in WhatsApp-dominant Sri Lanka",
                      "No match reasoning — providers will suspect unfair algorithm bias",
                    ].map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2 bg-amber-50 rounded-lg">
                        <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Provider Readiness Audit • LankaFix Colombo Phase-1 • {new Date().toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
