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
  Headphones, Globe, ShieldAlert, DollarSign, Ban, CircleDot
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ══════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════
type Status = "pass" | "partial" | "fail";
type ScoreSource = "data" | "audit";
type ReadinessLevel = "ui_exists" | "db_connected" | "real_data" | "e2e_tested" | "production_safe";

interface AuditItem {
  name: string;
  whyItMatters: string;
  status: Status;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
}

interface ModuleReadiness {
  module: string;
  uiExists: boolean;
  dbConnected: boolean;
  realDataVerified: boolean;
  e2eTested: boolean;
  productionSafe: boolean;
  mockDataDetected: boolean;
  notes: string;
}

interface CategoryRecruitReady {
  code: string;
  label: string;
  tier: "core" | "specialist";
  target: number;
  status: "ready" | "partially_ready" | "not_ready";
  reason: string;
  providerCount: number;
  verifiedCount: number;
  activeCount: number;
}

interface ZoneReadiness {
  code: string;
  name: string;
  totalPartners: number;
  verifiedPartners: number;
  activePartners: number;
  categoriesCovered: string[];
  coreGaps: string[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  status: Status;
}

interface SectionScore {
  label: string;
  icon: React.ReactNode;
  score: number;
  weight: number;
  source: ScoreSource;
  items: AuditItem[];
}

// ══════════════════════════════════════════════════════════
//  Robust Category Normalizer
// ══════════════════════════════════════════════════════════
const CANONICAL_ALIASES: Record<string, string[]> = {
  AC: ["ac", "air conditioning", "aircon", "ac_services", "ac services", "air-conditioning", "a/c", "hvac"],
  MOBILE: ["mobile", "mobile_repair", "phone repair", "mobile phone", "mobile-repair", "phone", "smartphone", "cell phone"],
  IT: ["it", "it_support", "it support", "computer", "laptop", "pc", "desktop", "it-support", "it repair"],
  CCTV: ["cctv", "cctv_solutions", "cctv solutions", "security camera", "surveillance", "cctv-solutions"],
  CONSUMER_ELEC: ["consumer_elec", "consumer electronics", "electronics", "tv repair", "tv", "consumer-elec", "home electronics"],
  SOLAR: ["solar", "solar_solutions", "solar solutions", "solar panel", "solar-solutions", "solar energy"],
  ELECTRICAL: ["electrical", "electrician", "wiring", "electrical services", "electrical-services"],
  PLUMBING: ["plumbing", "plumber", "plumbing services", "plumbing-services", "pipe", "pipes"],
  NETWORK: ["network", "internet", "wifi", "wi-fi", "networking", "network support", "network-support", "broadband", "router"],
  COPIER: ["copier", "printer", "copier_repair", "copier repair", "copier-repair", "print", "photocopier"],
  SMART_HOME_OFFICE: ["smart_home_office", "smart_home", "smart home", "smart-home", "home automation", "smart office", "iot"],
  POWER_BACKUP: ["power_backup", "power backup", "ups", "inverter", "power-backup", "generator", "battery backup"],
};

// Build lookup map
const NORMALIZE_MAP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES)) {
  NORMALIZE_MAP.set(canonical.toLowerCase(), canonical);
  for (const alias of aliases) {
    NORMALIZE_MAP.set(alias.toLowerCase(), canonical);
  }
}

function normalizeCategory(raw: unknown): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const key = raw.trim().replace(/[-_]+/g, " ").toLowerCase();
  if (!key) return null;
  return NORMALIZE_MAP.get(key) ?? null;
}

const CORE_CATEGORIES = [
  { code: "AC", label: "AC Services" },
  { code: "MOBILE", label: "Mobile Phone Repairs" },
  { code: "IT", label: "IT Repairs & Support" },
  { code: "ELECTRICAL", label: "Electrical" },
  { code: "PLUMBING", label: "Plumbing" },
  { code: "NETWORK", label: "Network Support" },
];

const SPECIALIST_CATEGORIES = [
  { code: "CCTV", label: "CCTV Solutions" },
  { code: "CONSUMER_ELEC", label: "Consumer Electronics" },
  { code: "SOLAR", label: "Solar Solutions" },
  { code: "COPIER", label: "Copier / Printer Repair" },
  { code: "SMART_HOME_OFFICE", label: "Smart Home / Office" },
  { code: "POWER_BACKUP", label: "Power Backup" },
];

const ALL_CATEGORIES = [
  ...CORE_CATEGORIES.map(c => ({ ...c, tier: "core" as const, target: 5 })),
  ...SPECIALIST_CATEGORIES.map(c => ({ ...c, tier: "specialist" as const, target: 3 })),
];

const CORE_CODES = new Set(CORE_CATEGORIES.map(c => c.code));

// ══════════════════════════════════════════════════════════
//  UI Helpers
// ══════════════════════════════════════════════════════════
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

function boolDot(val: boolean) {
  return val
    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    : <XCircle className="w-3.5 h-3.5 text-red-400" />;
}

function severityBadge(s: string) {
  const map: Record<string, string> = {
    none: "bg-emerald-600/15 text-emerald-700",
    low: "bg-sky-500/15 text-sky-700",
    medium: "bg-amber-500/15 text-amber-700",
    high: "bg-red-500/15 text-red-700",
    critical: "bg-red-700/20 text-red-800",
  };
  return <Badge className={`${map[s] || map.medium} border-0 text-[10px] capitalize`}>{s}</Badge>;
}

// ══════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════
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

  // ── Unmapped category detection ──
  const allRawCategories = new Set<string>();
  const unmappedCategories = new Set<string>();
  partners.forEach(p => {
    (p.categories_supported || []).forEach((c: string) => {
      allRawCategories.add(c);
      if (normalizeCategory(c) === null) unmappedCategories.add(c);
    });
  });

  function countByCategory(list: any[], catCode: string): number {
    return list.filter(p =>
      (p.categories_supported || []).some((c: string) => normalizeCategory(c) === catCode)
    ).length;
  }

  function getPartnerCategories(p: any): string[] {
    return (p.categories_supported || [])
      .map((c: string) => normalizeCategory(c))
      .filter((c: string | null): c is string => c !== null);
  }

  // ══════════════════════════════════════════════════════════
  //  Module Readiness Matrix (UI exists ≠ production ready)
  // ══════════════════════════════════════════════════════════
  const moduleReadiness: ModuleReadiness[] = [
    { module: "Provider Onboarding (/join)", uiExists: true, dbConnected: false, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: false, notes: "10-step flow exists but saves to Zustand only — not writing to partners table" },
    { module: "Partner Dashboard (/partner)", uiExists: true, dbConnected: false, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: true, notes: "Uses MOCK_PARTNERS — fleet, performance, revenue all from mock providerERPStore" },
    { module: "Partner Profile (/partner/profile)", uiExists: true, dbConnected: false, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: true, notes: "Renders MOCK_PARTNERS[0] — not reading from partners table" },
    { module: "Partner Wallet (/partner/wallet)", uiExists: true, dbConnected: false, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: true, notes: "Wallet page exists but likely uses mock data, not partner_settlements" },
    { module: "Partner Jobs (/partner/jobs)", uiExists: true, dbConnected: true, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: false, notes: "Uses bookingStore — needs verification against real DB bookings" },
    { module: "Technician Quote Builder", uiExists: true, dbConnected: true, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: false, notes: "QuoteBuilder inserts to quotes table — needs e2e validation" },
    { module: "Technician Dashboard", uiExists: true, dbConnected: false, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: true, notes: "Uses mock data for stats — not reading from real partner record" },
    { module: "Technician Earnings", uiExists: true, dbConnected: false, realDataVerified: false, e2eTested: false, productionSafe: false, mockDataDetected: true, notes: "Page exists but earnings likely from mock data" },
  ];

  const mockDataDetected = moduleReadiness.some(m => m.mockDataDetected);
  const modulesProductionSafe = moduleReadiness.filter(m => m.productionSafe).length;

  // ══════════════════════════════════════════════════════════
  //  Category Recruitment Readiness (core=5, specialist=3)
  // ══════════════════════════════════════════════════════════
  const categoryRecruitReadiness: CategoryRecruitReady[] = ALL_CATEGORIES.map(cat => {
    const total = countByCategory(partners, cat.code);
    const ver = countByCategory(verified, cat.code);
    const act = countByCategory(active, cat.code);
    const target = cat.target;
    let status: CategoryRecruitReady["status"] = "not_ready";
    let reason = "";

    if (ver >= target) {
      status = "ready";
      reason = `${ver} verified providers meet the ${target}-provider target. Platform credible for recruitment.`;
    } else if (ver >= Math.ceil(target / 2) || total >= target) {
      status = "partially_ready";
      reason = `${ver} verified of ${target} target. Can pitch early adopters but must be transparent about volume.`;
    } else {
      reason = `Only ${ver} verified (target: ${target}). Insufficient supply base — pitching may erode trust.`;
    }

    return { code: cat.code, label: cat.label, tier: cat.tier, target, status, reason, providerCount: total, verifiedCount: ver, activeCount: act };
  });

  // ══════════════════════════════════════════════════════════
  //  Colombo Zone Readiness
  // ══════════════════════════════════════════════════════════
  const zoneReadiness: ZoneReadiness[] = zones.map(z => {
    const zoneCode = z.zone_code;
    const zoneName = z.zone_name;
    const inZone = partners.filter(p => (p.service_zones || []).includes(zoneCode));
    const verInZone = inZone.filter(p => p.verification_status === "verified");
    const actInZone = verInZone.filter(p => p.availability_status !== "offline");

    const coveredCats = new Set<string>();
    inZone.forEach(p => getPartnerCategories(p).forEach(c => coveredCats.add(c)));

    const coreGaps = CORE_CATEGORIES.filter(c => !coveredCats.has(c.code)).map(c => c.label);
    const totalCoreGaps = coreGaps.length;

    let severity: ZoneReadiness["severity"] = "none";
    let status: Status = "pass";
    if (verInZone.length === 0) { severity = "critical"; status = "fail"; }
    else if (totalCoreGaps >= 4) { severity = "high"; status = "fail"; }
    else if (totalCoreGaps >= 2) { severity = "medium"; status = "partial"; }
    else if (totalCoreGaps >= 1) { severity = "low"; status = "partial"; }

    return {
      code: zoneCode,
      name: zoneName,
      totalPartners: inZone.length,
      verifiedPartners: verInZone.length,
      activePartners: actInZone.length,
      categoriesCovered: Array.from(coveredCats),
      coreGaps,
      severity,
      status,
    };
  });

  // ══════════════════════════════════════════════════════════
  //  Audit Sections
  // ══════════════════════════════════════════════════════════
  const sections: SectionScore[] = [
    // 1. Value Proposition
    {
      label: "Provider Value Proposition",
      icon: <Heart className="w-4 h-4" />,
      score: 50,
      weight: 12,
      source: "audit",
      items: [
        { name: "Access to quality leads", whyItMatters: "Providers join platforms for a steady job pipeline", status: "partial", priority: "critical", action: "Show real booking volume metrics on recruitment page; add a 'Why Join LankaFix' section at /join" },
        { name: "Digital job pipeline visibility", whyItMatters: "Providers need to see incoming work clearly", status: "partial", priority: "high", action: "UI exists but dashboard uses mock data — not real pipeline" },
        { name: "Structured booking flow", whyItMatters: "Reduces ambiguity vs WhatsApp-based freelancing", status: "pass", priority: "high", action: "Full booking lifecycle exists with status transitions" },
        { name: "Quote support & AI assist", whyItMatters: "Helps providers price fairly and win approval", status: "pass", priority: "medium", action: "AI Quote Assistant and technician quote builder exist" },
        { name: "Verified marketplace exposure", whyItMatters: "Providers want verified status to attract customers", status: "partial", priority: "high", action: "Badge exists but customer-facing provider cards need stronger trust display" },
        { name: "Repeat booking opportunity", whyItMatters: "Recurring revenue is top motivator for platform loyalty", status: "partial", priority: "high", action: "service_relationships tracked but no visible repeat-customer metric for providers" },
        { name: "Transparent ratings system", whyItMatters: "Fair ratings drive quality providers to stay", status: "partial", priority: "high", action: "Rating fields exist but providers cannot see per-job ratings history" },
        { name: "Merit-based growth (Premium tiers)", whyItMatters: "Top providers want recognition and better leads", status: "pass", priority: "medium", action: "/partner/premium with Pro/Elite tiers exists" },
        { name: "Compelling pitch vs WhatsApp/referrals", whyItMatters: "Must show clear advantage over informal channels", status: "fail", priority: "critical", action: "Create provider landing page with comparison: LankaFix vs WhatsApp/Facebook/direct calls" },
      ],
    },
    // 2. Onboarding
    {
      label: "Partner Onboarding Readiness",
      icon: <FileCheck className="w-4 h-4" />,
      score: 55,
      weight: 14,
      source: "audit",
      items: [
        { name: "10-step onboarding flow (/join)", whyItMatters: "Clear onboarding reduces drop-off", status: "pass", priority: "critical", action: "Full flow with identity, categories, zones, documents, bank details" },
        { name: "Category & specialization setup", whyItMatters: "Accurate skills for matching", status: "pass", priority: "high", action: "Category selection + brand specializations supported" },
        { name: "Service zone selection", whyItMatters: "Zone accuracy drives correct dispatch", status: "pass", priority: "high", action: "Colombo zones selectable during onboarding" },
        { name: "Document upload (NIC/BR)", whyItMatters: "Verification requires identity proof", status: "pass", priority: "critical", action: "Document upload step with NIC, BR, certifications" },
        { name: "Availability / shift setup", whyItMatters: "Declare working hours upfront", status: "pass", priority: "medium", action: "Working days and hours configurable" },
        { name: "Onboarding writes to real partners table", whyItMatters: "Must appear in dispatch system", status: "fail", priority: "critical", action: "Currently Zustand only — must INSERT into partners table on submit" },
        { name: "First-job activation guidance", whyItMatters: "New providers need first booking help", status: "fail", priority: "high", action: "Add post-onboarding checklist: go online, set zones, first job tips" },
        { name: "Profile completeness indicator", whyItMatters: "Incomplete profiles reduce match quality", status: "partial", priority: "medium", action: "Add profile strength bar to partner dashboard" },
      ],
    },
    // 3. Identity & Profile
    {
      label: "Partner Identity & Profile Strength",
      icon: <Building2 className="w-4 h-4" />,
      score: 55,
      weight: 10,
      source: "audit",
      items: [
        { name: "Provider name + business name", whyItMatters: "Unique identity builds customer trust", status: "pass", priority: "high", action: "full_name and business_name fields in partners table" },
        { name: "Verified badge display", whyItMatters: "#1 trust signal for customers", status: "pass", priority: "critical", action: "Verification badge shown on partner profile" },
        { name: "Profile photo / logo upload", whyItMatters: "Visual identity increases conversion", status: "partial", priority: "high", action: "Column exists but no upload flow in partner settings" },
        { name: "Category specializations visible", whyItMatters: "Customers choose based on expertise", status: "pass", priority: "medium", action: "categories_supported displayed" },
        { name: "Ratings + job count (real data)", whyItMatters: "Social proof drives provider confidence", status: "fail", priority: "high", action: "Profile page uses MOCK_PARTNERS — must read from partners table" },
        { name: "Performance score visible", whyItMatters: "Providers need feedback to improve", status: "fail", priority: "high", action: "performance_score column exists but no provider-visible view" },
        { name: "Zone coverage display", whyItMatters: "Shows operational reach", status: "pass", priority: "medium", action: "service_zones shown on partner profile" },
      ],
    },
    // 4. Dashboard
    {
      label: "Partner Dashboard Readiness",
      icon: <BarChart3 className="w-4 h-4" />,
      score: 40,
      weight: 12,
      source: "audit",
      items: [
        { name: "Job stats overview", whyItMatters: "Daily operational clarity", status: "partial", priority: "critical", action: "UI exists but pulls from bookingStore + MOCK_PARTNERS, not real DB queries for this partner" },
        { name: "Fleet management panel", whyItMatters: "Multi-tech businesses need team visibility", status: "fail", priority: "high", action: "Uses mock providerERPStore — not connected to real partner data" },
        { name: "Performance metrics panel", whyItMatters: "Track quality over time", status: "fail", priority: "high", action: "Uses mock data from providerERPStore" },
        { name: "Revenue visibility (real)", whyItMatters: "Financial clarity keeps providers engaged", status: "fail", priority: "critical", action: "Revenue card shows mock data — must connect to partner_settlements" },
        { name: "Recent jobs list", whyItMatters: "Quick access to current work", status: "partial", priority: "high", action: "Lists from bookingStore — should query bookings table for authenticated partner" },
        { name: "Dashboard uses real DB data", whyItMatters: "Mock data erodes trust instantly", status: "fail", priority: "critical", action: "Replace MOCK_PARTNERS with authenticated partner query" },
      ],
    },
    // 5. Booking Management
    {
      label: "Appointment / Booking Management",
      icon: <Briefcase className="w-4 h-4" />,
      score: 55,
      weight: 10,
      source: "audit",
      items: [
        { name: "Incoming job visibility", whyItMatters: "Must see new leads immediately", status: "pass", priority: "critical", action: "Partner jobs page lists bookings with status filters" },
        { name: "Job acceptance flow", whyItMatters: "Quick accept/decline essential", status: "partial", priority: "critical", action: "60s timer referenced but needs production testing" },
        { name: "Inspection vs direct distinction", whyItMatters: "Know if diagnosis required first", status: "partial", priority: "high", action: "pricing_archetype exists but not clearly labeled in job cards" },
        { name: "Quote-required job flag", whyItMatters: "Don't waste time if quote expected", status: "partial", priority: "high", action: "diagnostic_first archetype implies quote — make explicit" },
        { name: "Status update workflow", whyItMatters: "Update job status for tracking", status: "pass", priority: "high", action: "Technician job detail has status progression" },
        { name: "Cancelled job visibility + reason", whyItMatters: "Understand why jobs cancelled", status: "partial", priority: "medium", action: "cancellation_reason stored but not shown in provider job history" },
        { name: "Assignment clarity (why me?)", whyItMatters: "Know they were matched fairly", status: "fail", priority: "high", action: "match_logs reasoning not shown to assigned provider" },
      ],
    },
    // 6. Quote Workflow
    {
      label: "Quote Workflow Readiness",
      icon: <Receipt className="w-4 h-4" />,
      score: 65,
      weight: 10,
      source: "audit",
      items: [
        { name: "Technician quote builder", whyItMatters: "Core pricing tool", status: "pass", priority: "critical", action: "QuoteBuilder with labour, parts, materials line items" },
        { name: "AI Quote Assistant", whyItMatters: "Price competitively, reduce rejection", status: "pass", priority: "high", action: "AI-powered quote suggestion edge function exists" },
        { name: "Quote validation / risk flags", whyItMatters: "Prevent unreasonable quotes", status: "pass", priority: "high", action: "QuoteValidationBanner + validate-quote-price function" },
        { name: "Customer approval visibility", whyItMatters: "See approved/rejected/revised", status: "partial", priority: "critical", action: "Quote status in DB but provider notification flow unverified" },
        { name: "Quote history", whyItMatters: "Review past quotes for consistency", status: "fail", priority: "medium", action: "No quote history view — add quotes listing to partner dashboard" },
        { name: "Category-specific quote templates", whyItMatters: "AC vs mobile need different structures", status: "partial", priority: "medium", action: "Parts catalog exists but templates not pre-loaded" },
      ],
    },
    // 7. Provider Money Clarity (NEW dedicated section)
    {
      label: "Provider Money Clarity",
      icon: <DollarSign className="w-4 h-4" />,
      score: 30,
      weight: 12,
      source: "audit",
      items: [
        { name: "Commission rate visibility", whyItMatters: "Providers must know platform fees BEFORE joining", status: "partial", priority: "critical", action: "Commission engine exists (5%/7%/10% by category) but not shown during onboarding or on dashboard" },
        { name: "Payout timing clarity", whyItMatters: "When do I get paid? #1 provider question", status: "fail", priority: "critical", action: "No payout schedule or expected timing shown anywhere" },
        { name: "Settlement visibility", whyItMatters: "Pending vs paid clarity prevents disputes", status: "partial", priority: "critical", action: "partner_settlements table exists but provider view uses mock data" },
        { name: "Per-job gross → commission → net", whyItMatters: "Understand exact take-home per job", status: "fail", priority: "high", action: "partner_settlements has fields but not shown per-job to provider" },
        { name: "Deductions / adjustments visibility", whyItMatters: "Unexpected deductions destroy trust fastest", status: "fail", priority: "critical", action: "No deduction breakdown shown to providers" },
        { name: "Quote amount vs actual payout", whyItMatters: "Provider quotes LKR 5000 — how much do they receive?", status: "fail", priority: "high", action: "No visual breakdown of quote → commission → provider payout" },
        { name: "Earnings history / trends", whyItMatters: "See growth over time motivates engagement", status: "fail", priority: "high", action: "No earnings chart or trend view" },
        { name: "Wallet page uses real data", whyItMatters: "Mock earnings data is worse than no data", status: "fail", priority: "critical", action: "PartnerWalletPage must connect to partner_settlements" },
      ],
    },
    // 8. Cancellation / Fairness
    {
      label: "Provider Fairness & Transparency",
      icon: <Scale className="w-4 h-4" />,
      score: 30,
      weight: 8,
      source: "audit",
      items: [
        { name: "Cancellation reason visible to provider", whyItMatters: "Fairness is judged by transparency", status: "partial", priority: "high", action: "cancellation_reason stored but not displayed to provider" },
        { name: "Quote rejection reason visible", whyItMatters: "Need feedback to improve pricing", status: "fail", priority: "high", action: "customer_note on rejection not shown to provider" },
        { name: "No-match outcome clarity", whyItMatters: "Know if no customer found for their zone", status: "fail", priority: "medium", action: "dispatch_escalations exist but no provider notification" },
        { name: "Why another provider was assigned", whyItMatters: "Reduces suspicion of unfair algorithm", status: "fail", priority: "high", action: "No visibility into why a competing provider was chosen" },
        { name: "Customer unreachable notification", whyItMatters: "Provider wastes time on unreachable customers", status: "fail", priority: "medium", action: "No structured unreachable-customer flow" },
        { name: "LankaFix manual intervention visibility", whyItMatters: "Know when platform intervened in their job", status: "fail", priority: "medium", action: "under_mediation flag exists but no provider-facing explanation" },
        { name: "Strike/warning transparency + policy", whyItMatters: "Must understand consequences before they happen", status: "partial", priority: "high", action: "partner_warnings visible but policy docs missing" },
        { name: "Dispute resolution access", whyItMatters: "Need to raise disputes fairly", status: "partial", priority: "high", action: "support_tickets exist but no partner-initiated dispute flow" },
      ],
    },
    // 9. Ratings & Reputation
    {
      label: "Ratings / Reputation / Trust",
      icon: <Star className="w-4 h-4" />,
      score: 40,
      weight: 8,
      source: "audit",
      items: [
        { name: "Per-job rating visible to provider", whyItMatters: "Feedback drives improvement", status: "fail", priority: "critical", action: "customer_rating on bookings exists but no per-job history view" },
        { name: "Average rating on profile (real data)", whyItMatters: "Reputation is most valuable asset", status: "fail", priority: "critical", action: "rating_average exists in DB but profile page reads MOCK_PARTNERS" },
        { name: "Completed jobs count (real)", whyItMatters: "Experience signal for customers", status: "fail", priority: "high", action: "completed_jobs_count in DB but displayed from mock data" },
        { name: "Verified trust badge", whyItMatters: "Differentiates serious providers", status: "pass", priority: "critical", action: "verification_status with badge display" },
        { name: "Repeat customer metric", whyItMatters: "Shows real relationship building", status: "fail", priority: "high", action: "service_relationships tracks repeats but not shown to provider" },
        { name: "Customer review text feed", whyItMatters: "Read feedback, not just stars", status: "fail", priority: "medium", action: "customer_review on bookings exists but no provider review feed" },
      ],
    },
    // 10. Operations & Tools
    {
      label: "Provider Operations & Tools",
      icon: <Wrench className="w-4 h-4" />,
      score: 50,
      weight: 6,
      source: "audit",
      items: [
        { name: "Service area edit UI", whyItMatters: "Update coverage as they grow", status: "fail", priority: "high", action: "service_zones in DB but no in-app edit UI for providers" },
        { name: "Availability online/offline toggle", whyItMatters: "Core daily action — go online/offline", status: "fail", priority: "critical", action: "availability_status field exists but no quick toggle on dashboard" },
        { name: "Match fairness transparency", whyItMatters: "Trust the dispatch algorithm", status: "partial", priority: "high", action: "Score-based matching exists but reasoning hidden" },
        { name: "Service checklist tools", whyItMatters: "Structured checklists reduce disputes", status: "pass", priority: "medium", action: "SERVICE_CHECKLISTS with category-specific items" },
        { name: "Navigation to customer", whyItMatters: "Efficient routing saves time", status: "pass", priority: "medium", action: "Google/Waze integration referenced" },
        { name: "Parts inventory reference", whyItMatters: "Part prices help quoting", status: "pass", priority: "medium", action: "parts_catalog + TechnicianPartsPage exist" },
      ],
    },
    // 11. Provider Performance Scorecard
    {
      label: "Provider Performance Scorecard",
      icon: <Award className="w-4 h-4" />,
      score: 20,
      weight: 8,
      source: "audit",
      items: [
        { name: "Acceptance rate visible", whyItMatters: "Know this metric affects ranking", status: "fail", priority: "high", action: "acceptance_rate in DB — not shown to provider [DB exists, UI missing]" },
        { name: "Cancellation rate visible", whyItMatters: "Self-correct behaviour", status: "fail", priority: "high", action: "cancellation_rate in DB — not shown [DB exists, UI missing]" },
        { name: "On-time rate visible", whyItMatters: "Punctuality affects trust", status: "fail", priority: "high", action: "on_time_rate in DB — not shown [DB exists, UI missing]" },
        { name: "Quote approval rate visible", whyItMatters: "Know if pricing is competitive", status: "fail", priority: "high", action: "quote_approval_rate in DB — not shown [DB exists, UI missing]" },
        { name: "Composite performance score", whyItMatters: "Single number to track and improve", status: "fail", priority: "critical", action: "performance_score column exists — build scorecard widget" },
        { name: "Response speed metric", whyItMatters: "Fast responders should be rewarded", status: "fail", priority: "medium", action: "average_response_time_minutes tracked — not shown [DB exists, UI missing]" },
        { name: "Repeat customer signal", whyItMatters: "Know they're building loyalty", status: "fail", priority: "high", action: "service_relationships exists — not surfaced [DB exists, UI missing]" },
      ],
    },
    // 12. Provider Trust Risk (NEW section)
    {
      label: "Provider Trust Risk Signals",
      icon: <ShieldAlert className="w-4 h-4" />,
      score: 25,
      weight: 8,
      source: "audit",
      items: [
        { name: "Onboarding not writing to DB", whyItMatters: "Providers complete form → nothing happens in real system", status: "fail", priority: "critical", action: "Connect /join to INSERT into partners table" },
        { name: "Dashboard shows mock/fake data", whyItMatters: "Providers will notice fake job counts and revenue immediately", status: "fail", priority: "critical", action: "Replace all MOCK_PARTNERS references with real DB queries" },
        { name: "Unclear cancellation/rejection reasons", whyItMatters: "Provider feels blindsided → leaves platform", status: "fail", priority: "high", action: "Surface cancellation_reason and customer_note to providers" },
        { name: "No quote history", whyItMatters: "Can't review what they've quoted or learn from rejections", status: "fail", priority: "high", action: "Add quote history page in partner section" },
        { name: "Unclear earnings logic", whyItMatters: "If providers can't understand pay, they won't trust platform", status: "fail", priority: "critical", action: "Add commission explainer + per-job breakdown" },
        { name: "Demo provider identity in customer flows", whyItMatters: "Fake technician names/photos destroy marketplace credibility", status: "partial", priority: "critical", action: "Production mode guard added — verify all customer screens use real data" },
        { name: "Weak pitch vs WhatsApp/Facebook", whyItMatters: "Providers ask 'why not just use WhatsApp?' — no answer on platform", status: "fail", priority: "high", action: "Create provider value comparison landing page" },
        { name: "No WhatsApp job notifications", whyItMatters: "Sri Lankan providers live on WhatsApp — app-only is friction", status: "fail", priority: "critical", action: "Integrate WhatsApp Business API for job alerts" },
      ],
    },
    // 13. Multi-tech / Business
    {
      label: "Multi-Technician / Business Support",
      icon: <Users className="w-4 h-4" />,
      score: 35,
      weight: 4,
      source: "audit",
      items: [
        { name: "Business account identity", whyItMatters: "Many SL providers are companies", status: "pass", priority: "high", action: "business_name field on partners" },
        { name: "Multi-tech under one partner", whyItMatters: "AC/CCTV/IT companies have 3–10 techs", status: "partial", priority: "high", action: "Hierarchy referenced in types but DB is flat" },
        { name: "Team/fleet visibility (real)", whyItMatters: "Managers see team status", status: "fail", priority: "medium", action: "Fleet panel uses mock data" },
        { name: "Internal job assignment", whyItMatters: "Assign tech to specific job", status: "fail", priority: "medium", action: "No in-app assignment from partner account" },
      ],
    },
    // 14. Evidence / Proof
    {
      label: "Evidence / Proof Workflow",
      icon: <Camera className="w-4 h-4" />,
      score: 55,
      weight: 4,
      source: "audit",
      items: [
        { name: "Before/after photo upload", whyItMatters: "Protects providers in disputes", status: "partial", priority: "high", action: "photos JSON field exists but structured before/after not enforced" },
        { name: "Service checklist completion", whyItMatters: "Proves work done properly", status: "pass", priority: "medium", action: "SERVICE_CHECKLISTS with completion tracking" },
        { name: "Start OTP verification", whyItMatters: "Confirms arrival at location", status: "pass", priority: "high", action: "start_otp + expiry on bookings" },
        { name: "Completion OTP verification", whyItMatters: "Customer confirms work complete", status: "pass", priority: "high", action: "completion_otp + expiry on bookings" },
        { name: "Dispute evidence support", whyItMatters: "Docs needed if customer disputes quality", status: "partial", priority: "medium", action: "support_tickets have attachments but no structured evidence flow" },
      ],
    },
    // 15. Sri Lanka Fit
    {
      label: "WhatsApp-First / Sri Lanka Fit",
      icon: <Globe className="w-4 h-4" />,
      score: 40,
      weight: 4,
      source: "audit",
      items: [
        { name: "Mobile-first design", whyItMatters: "Most SL providers use phones only", status: "pass", priority: "critical", action: "Entire app is mobile-first" },
        { name: "WhatsApp job notifications", whyItMatters: "WhatsApp is primary channel in SL", status: "fail", priority: "critical", action: "No WhatsApp integration — critical for adoption" },
        { name: "Push/SMS notification delivery", whyItMatters: "Need real-time alerts between jobs", status: "fail", priority: "high", action: "partner_notifications DB ready but delivery not implemented" },
        { name: "Sinhala/Tamil UI support", whyItMatters: "Many technicians prefer local language", status: "fail", priority: "high", action: "No i18n — English only" },
        { name: "Non-corporate practical tone", whyItMatters: "Overly corporate UX alienates working-class providers", status: "partial", priority: "medium", action: "Clean UI but some sections feel enterprise-heavy" },
        { name: "Offline-capable PWA", whyItMatters: "Mobile data can be unreliable", status: "partial", priority: "medium", action: "SW exists but limited offline" },
      ],
    },
    // 16. SLA / Response
    {
      label: "SLA / Response-Time Readiness",
      icon: <Clock className="w-4 h-4" />,
      score: 45,
      weight: 4,
      source: "audit",
      items: [
        { name: "Job acceptance time expectation", whyItMatters: "Colombo expects fast response", status: "partial", priority: "critical", action: "60s timer referenced — needs production verification" },
        { name: "Quote response window", whyItMatters: "Delayed quotes lose customers", status: "partial", priority: "high", action: "24h expiry but no countdown visible to provider" },
        { name: "Inactivity / lateness handling", whyItMatters: "Consistent enforcement keeps quality", status: "partial", priority: "high", action: "late_arrival_count tracked but rules not documented" },
        { name: "Escalation if lead ignored", whyItMatters: "Prevents dead bookings", status: "pass", priority: "high", action: "dispatch_escalations + multi-round dispatch exist" },
      ],
    },
  ];

  // ══════════════════════════════════════════════════════════
  //  Scoring & Verdict
  // ══════════════════════════════════════════════════════════
  const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
  const weightedScore = Math.round(sections.reduce((s, sec) => s + sec.score * sec.weight, 0) / totalWeight);

  const criticalFails = sections.flatMap(sec =>
    sec.items.filter(i => i.status === "fail" && i.priority === "critical").map(i => ({ section: sec.label, ...i }))
  );
  const highFails = sections.flatMap(sec =>
    sec.items.filter(i => i.status === "fail" && i.priority === "high").map(i => ({ section: sec.label, ...i }))
  );

  // Hard blocker rules — force Not Ready regardless of score
  const hasOnboardingDBFail = sections.some(s => s.items.some(i => i.name.includes("writes to real") && i.status === "fail"));
  const hasDashboardMock = sections.some(s => s.items.some(i => i.name.includes("real DB data") && i.status === "fail"));
  const hasMoneyFails = (sections.find(s => s.label.includes("Money"))?.items.filter(i => i.status === "fail" && i.priority === "critical").length ?? 0) >= 3;
  const hasTrustRiskFails = (sections.find(s => s.label.includes("Trust Risk"))?.items.filter(i => i.status === "fail" && i.priority === "critical").length ?? 0) >= 3;

  let verdict: "Ready" | "Needs Fixes" | "Not Ready" = "Needs Fixes";
  if (hasOnboardingDBFail || hasDashboardMock || hasMoneyFails || hasTrustRiskFails || criticalFails.length >= 4) {
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

  // ── Must-fix executive punch list ──
  const mustFixBeforeRecruitment = [
    { item: "Connect /join onboarding to INSERT real partner records into DB", why: "Providers complete onboarding → nothing happens in dispatch system" },
    { item: "Replace all MOCK_PARTNERS in partner dashboard/profile/wallet with real DB queries", why: "Fake job counts, revenue, and ratings destroy trust on first login" },
    { item: "Show commission rates clearly during onboarding and on dashboard", why: "'How much do I earn?' is the first question every provider asks" },
    { item: "Add per-job payout breakdown: quote → commission → provider take-home", why: "Financial opacity is the #1 reason providers leave marketplaces" },
    { item: "Build provider performance scorecard (acceptance, on-time, rating, approval rates)", why: "Providers need feedback to improve — all data already in DB columns" },
    { item: "Add availability online/offline toggle to partner dashboard", why: "Going online is the core daily action — currently no UI" },
  ];
  const fixAfterInitialRecruitment = [
    { item: "Integrate WhatsApp Business API for job alert notifications", why: "Sri Lankan providers live on WhatsApp — app-only is high friction" },
    { item: "Create provider landing/pitch page: LankaFix vs WhatsApp/Facebook/referrals", why: "Needed for sales conversations with prospective providers" },
    { item: "Surface match reasoning to providers (why they were assigned)", why: "Reduces algorithm suspicion — builds long-term trust" },
    { item: "Add cancellation/rejection reason visibility + customer review feed", why: "Provider fairness perception depends on transparent feedback" },
    { item: "Add Sinhala/Tamil UI support", why: "Many technicians prefer local language — English-only limits reach" },
    { item: "Add earnings trend chart and deduction breakdown", why: "Growth visibility motivates continued platform engagement" },
  ];

  // ══════════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════════
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
          <div className="flex items-center gap-3 mb-1">
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

        {/* ═══ Mock Data Warning Banner ═══ */}
        {mockDataDetected && (
          <Card className="border-red-300 bg-red-50 shadow-md">
            <CardContent className="p-4 flex items-start gap-3">
              <Ban className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900">⚠ Provider Platform Not Launch-Safe: Mock/Demo Data Detected</p>
                <p className="text-xs text-red-700 mt-1">
                  {moduleReadiness.filter(m => m.mockDataDetected).length} provider-facing module(s) still use mock/placeholder data.
                  Providers will immediately see fake revenue, fake job counts, or fake ratings — this will destroy trust on first login.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {moduleReadiness.filter(m => m.mockDataDetected).map(m => (
                    <Badge key={m.module} className="bg-red-200/60 text-red-800 border-0 text-[10px]">{m.module}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Unmapped Categories Warning ═══ */}
        {unmappedCategories.size > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Unmapped Categories Detected ({unmappedCategories.size})</p>
                <p className="text-xs text-amber-700 mt-0.5">These partner category values couldn't be normalized — they won't count in readiness metrics:</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Array.from(unmappedCategories).map(c => (
                    <Badge key={c} className="bg-amber-200/60 text-amber-800 border-0 text-[10px]">"{c}"</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Verdict Card ═══ */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={`${verdictConfig.color} text-white px-5 py-4`}>
            <div className="flex items-center gap-3">
              <verdictConfig.icon className="w-7 h-7" />
              <div>
                <h2 className="text-lg font-bold">{verdictConfig.text}</h2>
                <p className="text-white/80 text-xs mt-0.5">
                  Overall Provider Readiness: {weightedScore}/100 • {criticalFails.length} critical blockers • {modulesProductionSafe}/{moduleReadiness.length} modules production-safe
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
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
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-700">{moduleReadiness.filter(m => m.mockDataDetected).length}</p>
                <p className="text-[10px] text-muted-foreground">Mock Data Modules</p>
              </div>
            </div>
            <Progress value={weightedScore} className="h-2.5" />
          </CardContent>
        </Card>

        {/* ═══ Executive Must-Fix Punch List ═══ */}
        <Card className="border-red-200 bg-red-50/30 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-900 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Must Fix Before Provider Recruitment ({mustFixBeforeRecruitment.length})
            </CardTitle>
            <CardDescription className="text-red-700/70 text-xs">Critical items — do not pitch providers until these are resolved</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mustFixBeforeRecruitment.map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-red-100">
                <div className="flex items-start gap-2">
                  <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-xs font-semibold text-red-900">{item.item}</p>
                    <p className="text-[10px] text-red-700/80 mt-0.5">{item.why}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Fix After Initial Recruitment ({fixAfterInitialRecruitment.length})
            </CardTitle>
            <CardDescription className="text-amber-700/70 text-xs">High-priority improvements — can recruit early adopters without these</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {fixAfterInitialRecruitment.map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-2.5 border border-amber-100 flex items-start gap-2">
                <span className="bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-xs font-medium text-amber-900">{item.item}</p>
                  <p className="text-[10px] text-amber-700/80">{item.why}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ═══ Tabs ═══ */}
        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList className="w-full grid grid-cols-6 h-auto">
            <TabsTrigger value="modules" className="text-[10px] py-2">Modules</TabsTrigger>
            <TabsTrigger value="tiers" className="text-[10px] py-2">Tiers</TabsTrigger>
            <TabsTrigger value="sections" className="text-[10px] py-2">Audit</TabsTrigger>
            <TabsTrigger value="zones" className="text-[10px] py-2">Zones</TabsTrigger>
            <TabsTrigger value="categories" className="text-[10px] py-2">Categories</TabsTrigger>
            <TabsTrigger value="summary" className="text-[10px] py-2">Go/No-Go</TabsTrigger>
          </TabsList>

          {/* ═══ Modules Tab ═══ */}
          <TabsContent value="modules" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CircleDot className="w-4 h-4" /> Module Production Readiness
                </CardTitle>
                <CardDescription className="text-xs">UI exists ≠ production ready. Each column must be true for launch.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Module</TableHead>
                        <TableHead className="text-[10px] text-center">UI</TableHead>
                        <TableHead className="text-[10px] text-center">DB</TableHead>
                        <TableHead className="text-[10px] text-center">Real Data</TableHead>
                        <TableHead className="text-[10px] text-center">E2E</TableHead>
                        <TableHead className="text-[10px] text-center">Prod Safe</TableHead>
                        <TableHead className="text-[10px] text-center">Mock?</TableHead>
                        <TableHead className="text-[10px]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moduleReadiness.map((m, i) => (
                        <TableRow key={i} className={m.mockDataDetected ? "bg-red-50/50" : ""}>
                          <TableCell className="text-xs font-medium">{m.module}</TableCell>
                          <TableCell className="text-center">{boolDot(m.uiExists)}</TableCell>
                          <TableCell className="text-center">{boolDot(m.dbConnected)}</TableCell>
                          <TableCell className="text-center">{boolDot(m.realDataVerified)}</TableCell>
                          <TableCell className="text-center">{boolDot(m.e2eTested)}</TableCell>
                          <TableCell className="text-center">{boolDot(m.productionSafe)}</TableCell>
                          <TableCell className="text-center">{m.mockDataDetected ? <Badge className="bg-red-500/15 text-red-700 border-0 text-[9px]">MOCK</Badge> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground max-w-[200px]">{m.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Partner Tiers Tab ═══ */}
          <TabsContent value="tiers" className="space-y-4">
            {(() => {
              const tierGroups: Record<string, typeof partners> = { elite: [], pro: [], verified: [], under_review: [] };
              partners.forEach(p => {
                const t = p.reliability_tier || "verified";
                if (tierGroups[t]) tierGroups[t].push(p);
                else tierGroups.verified.push(p);
              });
              const tierMeta: Record<string, { label: string; color: string; bg: string; desc: string }> = {
                elite: { label: "Elite", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", desc: "Top performer — high ratings, reliability, and volume" },
                pro: { label: "Pro", color: "text-sky-700", bg: "bg-sky-50 border-sky-200", desc: "Reliable partner with strong track record" },
                verified: { label: "Verified", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", desc: "Standard verified partner" },
                under_review: { label: "Under Review", color: "text-red-700", bg: "bg-red-50 border-red-200", desc: "Flagged for quality concerns" },
              };

              return (
                <>
                  {/* Tier distribution summary */}
                  <div className="grid grid-cols-4 gap-3">
                    {(["elite", "pro", "verified", "under_review"] as const).map(t => (
                      <Card key={t} className={tierMeta[t].bg}>
                        <CardContent className="p-4 text-center">
                          <p className={`text-2xl font-bold ${tierMeta[t].color}`}>{tierGroups[t].length}</p>
                          <p className={`text-xs ${tierMeta[t].color}`}>{tierMeta[t].label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Partner tier table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="w-4 h-4" /> Partner Reliability Tiers
                      </CardTitle>
                      <CardDescription className="text-xs">Internal tiers computed from performance score, rating, jobs, cancellation rate, and strikes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Partner</TableHead>
                              <TableHead className="text-[10px]">Tier</TableHead>
                              <TableHead className="text-[10px] text-center">Score</TableHead>
                              <TableHead className="text-[10px] text-center">Rating</TableHead>
                              <TableHead className="text-[10px] text-center">Jobs</TableHead>
                              <TableHead className="text-[10px] text-center">Cancel %</TableHead>
                              <TableHead className="text-[10px] text-center">On-Time %</TableHead>
                              <TableHead className="text-[10px] text-center">Strikes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...partners]
                              .filter(p => p.verification_status === "verified")
                              .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
                              .map(p => {
                                const tier = p.reliability_tier || "verified";
                                const meta = tierMeta[tier] || tierMeta.verified;
                                return (
                                  <TableRow key={p.id} className={tier === "under_review" ? "bg-red-50/50" : tier === "elite" ? "bg-amber-50/30" : ""}>
                                    <TableCell className="text-xs font-medium">{p.full_name}{p.business_name ? ` (${p.business_name})` : ""}</TableCell>
                                    <TableCell>
                                      <Badge className={`border text-[10px] ${
                                        tier === "elite" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
                                        tier === "pro" ? "bg-sky-500/15 text-sky-700 border-sky-500/30" :
                                        tier === "under_review" ? "bg-red-500/15 text-red-700 border-red-500/30" :
                                        "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                      }`}>
                                        {meta.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-center font-mono">{p.performance_score ?? "—"}</TableCell>
                                    <TableCell className="text-xs text-center">{p.rating_average ? Number(p.rating_average).toFixed(1) : "—"}</TableCell>
                                    <TableCell className="text-xs text-center">{p.completed_jobs_count ?? 0}</TableCell>
                                    <TableCell className="text-xs text-center">{p.cancellation_rate ?? 0}%</TableCell>
                                    <TableCell className="text-xs text-center">{p.on_time_rate ?? "—"}%</TableCell>
                                    <TableCell className="text-xs text-center">{p.strike_count ?? 0}</TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                      {verified.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">No verified partners found</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tier criteria reference */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4" /> Tier Criteria (Internal)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {([
                        { tier: "Elite", criteria: "Score ≥ 80, Rating ≥ 4.5, Jobs ≥ 20, Cancel ≤ 5%, On-time ≥ 90%, 0 strikes" },
                        { tier: "Pro", criteria: "Score ≥ 60, Rating ≥ 3.8, Jobs ≥ 8, Cancel ≤ 15%, ≤ 1 strike" },
                        { tier: "Verified", criteria: "Default tier for all verified partners" },
                        { tier: "Under Review", criteria: "Score ≤ 35 (10+ jobs), Rating ≤ 3.0 (10+ jobs), Cancel ≥ 25% (5+ jobs), or 3+ strikes" },
                      ]).map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded-lg">
                          <span className="font-semibold w-24 shrink-0">{t.tier}</span>
                          <span className="text-muted-foreground">{t.criteria}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* ═══ Audit Sections Tab ═══ */}
          <TabsContent value="sections" className="space-y-4">
            {/* Scores overview first */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Section Scores</CardTitle>
                <CardDescription className="text-xs flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  {sourceBadge("data")} = live DB metrics &nbsp; {sourceBadge("audit")} = manual assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {sections.map((sec, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {sec.icon}
                        <span className="truncate">{sec.label}</span>
                        {sourceBadge(sec.source)}
                      </div>
                      <span className="text-xs font-bold shrink-0">{sec.score}/100 <span className="text-muted-foreground font-normal">(w:{sec.weight})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={sec.score} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-12 text-right">
                        {sec.items.filter(it => it.status === "fail").length} fails
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

            {/* Detailed sections */}
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
                          <TableHead className="text-[10px] w-[28%]">Item</TableHead>
                          <TableHead className="text-[10px] w-[22%]">Why It Matters</TableHead>
                          <TableHead className="text-[10px] w-[8%]">Status</TableHead>
                          <TableHead className="text-[10px] w-[8%]">Priority</TableHead>
                          <TableHead className="text-[10px] w-[34%]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sec.items.map((item, ii) => (
                          <TableRow key={ii} className={item.status === "fail" && item.priority === "critical" ? "bg-red-50/50" : ""}>
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

          {/* ═══ Zones Tab ═══ */}
          <TabsContent value="zones" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Colombo Zone Readiness ({zones.length} active zones)
                </CardTitle>
                <CardDescription className="text-xs">Provider density and core category gaps per zone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Zone</TableHead>
                        <TableHead className="text-[10px] text-center">Total</TableHead>
                        <TableHead className="text-[10px] text-center">Verified</TableHead>
                        <TableHead className="text-[10px] text-center">Active</TableHead>
                        <TableHead className="text-[10px] text-center">Cats</TableHead>
                        <TableHead className="text-[10px]">Core Gaps</TableHead>
                        <TableHead className="text-[10px]">Severity</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zoneReadiness.sort((a, b) => {
                        const ord = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
                        return (ord[a.severity] ?? 5) - (ord[b.severity] ?? 5);
                      }).map(z => (
                        <TableRow key={z.code} className={z.severity === "critical" ? "bg-red-50/50" : z.severity === "high" ? "bg-amber-50/30" : ""}>
                          <TableCell className="text-xs font-medium">{z.name}</TableCell>
                          <TableCell className="text-xs text-center">{z.totalPartners}</TableCell>
                          <TableCell className="text-xs text-center">{z.verifiedPartners}</TableCell>
                          <TableCell className="text-xs text-center">{z.activePartners}</TableCell>
                          <TableCell className="text-xs text-center">{z.categoriesCovered.length}/12</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{z.coreGaps.length > 0 ? z.coreGaps.join(", ") : "—"}</TableCell>
                          <TableCell>{severityBadge(z.severity)}</TableCell>
                          <TableCell>{statusBadge(z.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {zoneReadiness.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No active service zones found in database</p>
                )}
              </CardContent>
            </Card>

            {/* Zone summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{zoneReadiness.filter(z => z.status === "pass").length}</p>
                  <p className="text-xs text-emerald-600">Zones Ready</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{zoneReadiness.filter(z => z.status === "partial").length}</p>
                  <p className="text-xs text-amber-600">Zones Partial</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{zoneReadiness.filter(z => z.status === "fail").length}</p>
                  <p className="text-xs text-red-600">Zones Not Ready</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ Categories Tab ═══ */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Category Recruitment Readiness
                </CardTitle>
                <CardDescription className="text-xs">Core categories need 5 verified providers; specialist categories need 3</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Category</TableHead>
                      <TableHead className="text-[10px]">Tier</TableHead>
                      <TableHead className="text-[10px] text-center">Target</TableHead>
                      <TableHead className="text-[10px] text-center">Total</TableHead>
                      <TableHead className="text-[10px] text-center">Verified</TableHead>
                      <TableHead className="text-[10px] text-center">Active</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                      <TableHead className="text-[10px]">Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRecruitReadiness.map(cat => (
                      <TableRow key={cat.code} className={cat.status === "not_ready" ? "bg-red-50/30" : ""}>
                        <TableCell className="text-xs font-medium">{cat.label}</TableCell>
                        <TableCell>
                          <Badge className={`border-0 text-[9px] ${cat.tier === "core" ? "bg-sky-500/15 text-sky-700" : "bg-slate-400/15 text-slate-600"}`}>
                            {cat.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center font-medium">{cat.target}</TableCell>
                        <TableCell className="text-xs text-center">{cat.providerCount}</TableCell>
                        <TableCell className="text-xs text-center">{cat.verifiedCount}</TableCell>
                        <TableCell className="text-xs text-center">{cat.activeCount}</TableCell>
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
                  <p className="text-2xl font-bold text-red-700">{ALL_CATEGORIES.length - categoriesReady - categoriesPartial}</p>
                  <p className="text-xs text-red-600">Not Ready</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ Go/No-Go Tab ═══ */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-5">
                <div className="text-center space-y-2">
                  <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-white font-bold ${verdictConfig.color}`}>
                    <verdictConfig.icon className="w-5 h-5" />
                    {verdictConfig.text}
                  </div>
                  <p className="text-sm text-muted-foreground">Provider Readiness Score: {weightedScore}/100</p>
                  {verdict === "Not Ready" && (
                    <p className="text-xs text-red-700">Hard blockers detected: onboarding not connected to DB, dashboard uses mock data, financial clarity missing</p>
                  )}
                </div>

                {/* Module status summary */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold">Module Production Status</h3>
                  <div className="grid gap-1.5">
                    {moduleReadiness.map((m, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${m.mockDataDetected ? "bg-red-50 border border-red-100" : m.productionSafe ? "bg-emerald-50" : "bg-slate-50"}`}>
                        {m.productionSafe ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : m.mockDataDetected ? <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span className="font-medium flex-1">{m.module}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {[m.uiExists && "UI", m.dbConnected && "DB", m.realDataVerified && "Data", m.e2eTested && "E2E", m.productionSafe && "Prod"].filter(Boolean).join(" · ") || "UI only"}
                        </span>
                        {m.mockDataDetected && <Badge className="bg-red-500/15 text-red-700 border-0 text-[9px]">MOCK</Badge>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Provider trust risks */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-red-800 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Provider Trust Risks</h3>
                  <div className="grid gap-1.5">
                    {[
                      "Mock data in partner dashboard — providers see fake job counts and revenue on first login",
                      "No per-job payout breakdown — providers can't verify their earnings",
                      "No commission rate shown during onboarding — providers discover fees after joining",
                      "No performance scorecard — all metrics exist in DB but none surfaced to providers",
                      "No WhatsApp integration — forcing app-only in WhatsApp-dominant Sri Lanka",
                      "No match reasoning — providers suspect unfair algorithm without visibility",
                      "Onboarding doesn't create real partner record — providers complete form but don't appear in system",
                    ].map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2 bg-red-50 rounded-lg border border-red-100">
                        <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Provider fairness audit */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Scale className="w-4 h-4" /> Provider Fairness Visibility</h3>
                  <div className="grid gap-1.5">
                    {[
                      { item: "Cancellation reason", exists: true, visible: false },
                      { item: "Quote rejection reason", exists: true, visible: false },
                      { item: "No-match outcome", exists: true, visible: false },
                      { item: "Why another provider assigned", exists: false, visible: false },
                      { item: "Customer unreachable notification", exists: false, visible: false },
                      { item: "LankaFix manual intervention", exists: true, visible: false },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 bg-amber-50/50 rounded-lg">
                        {f.visible ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        <span className="flex-1">{f.item}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {f.exists ? "DB exists" : "Not built"} → {f.visible ? "Visible" : "Not shown to provider"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Provider scorecard audit */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Award className="w-4 h-4" /> Scorecard Metric Readiness</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { metric: "Acceptance rate", dbExists: true, shown: false },
                      { metric: "Cancellation rate", dbExists: true, shown: false },
                      { metric: "On-time rate", dbExists: true, shown: false },
                      { metric: "Quote approval rate", dbExists: true, shown: false },
                      { metric: "Completed jobs", dbExists: true, shown: false },
                      { metric: "Response time", dbExists: true, shown: false },
                      { metric: "Repeat customers", dbExists: true, shown: false },
                      { metric: "Performance score", dbExists: true, shown: false },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded-lg">
                        <Database className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="flex-1">{m.metric}</span>
                        {m.shown
                          ? <Badge className="bg-emerald-600/15 text-emerald-700 border-0 text-[9px]">Visible</Badge>
                          : <Badge className="bg-red-500/15 text-red-700 border-0 text-[9px]">UI Missing</Badge>
                        }
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">All 8 scorecard metrics exist in the partners table — none are currently surfaced to providers</p>
                </div>

                {/* Easiest categories */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-emerald-800">Easiest Categories to Recruit First</h3>
                  <p className="text-xs text-muted-foreground">
                    <strong>AC Services, Mobile Repairs, IT Support</strong> have the strongest app flows (structured quoting, parts catalog, diagnostic-first support).
                    <strong> CCTV and Solar</strong> have inspection-first archetypes already built.
                    <strong> Electrical and Plumbing</strong> have the simplest booking models.
                    Start where the app flow already matches provider expectations.
                  </p>
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
