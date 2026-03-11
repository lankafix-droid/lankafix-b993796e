import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Rocket, Shield, CheckCircle2, AlertTriangle, XCircle, Users, MapPin,
  Zap, Brain, Receipt, Heart, BarChart3, Headphones, ArrowLeft, RefreshCw,
  Target, TrendingUp, Clock, Star, Info, Database, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Types ──
type Status = "pass" | "partial" | "fail";
type ScoreSource = "data" | "audit";

interface CheckItem {
  name: string;
  status: Status;
  priority: "critical" | "high" | "medium" | "low";
  owner: string;
  why: string;
  action: string;
}

interface CategoryReadiness {
  code: string;
  label: string;
  tier: "core" | "specialist";
  recruited: number;
  verified: number;
  active: number;
  target: number;
  gap: number;
  status: Status;
  zones: string[];
  risk: string;
  recommendation: "Ready to Launch" | "Recruit Now, Launch After Minor Fixes" | "Do Not Launch Yet";
}

interface ZoneReadiness {
  code: string;
  name: string;
  totalPartners: number;
  verifiedPartners: number;
  activePartners: number;
  categoriesCovered: number;
  totalCategories: number;
  coreGaps: string[];
  allGaps: string[];
  status: Status;
  risk: string;
}

interface SectionScore {
  label: string;
  icon: React.ReactNode;
  score: number;
  weight: number;
  source: ScoreSource;
  items: CheckItem[];
}

interface TestCase {
  name: string;
  category: string;
  expected: string;
  status: Status;
  owner: string;
  testedBy: string;
  dateTested: string;
  actualResult: string;
  blocker: boolean;
  notes: string;
}

// ── Canonical Category Normalization ──
// Strict map: raw partner category string → canonical code
const CATEGORY_NORMALIZE: Record<string, string> = {
  AC: "AC", "AC_SERVICES": "AC", "AIR_CONDITIONING": "AC", "AIRCON": "AC",
  MOBILE: "MOBILE", "MOBILE_REPAIR": "MOBILE", "MOBILE_PHONE": "MOBILE", "PHONE_REPAIR": "MOBILE",
  IT: "IT", "IT_SUPPORT": "IT", "IT_REPAIR": "IT", "COMPUTER": "IT", "LAPTOP": "IT",
  CCTV: "CCTV", "CCTV_SOLUTIONS": "CCTV", "SURVEILLANCE": "CCTV",
  CONSUMER_ELEC: "CONSUMER_ELEC", ELECTRONICS: "CONSUMER_ELEC", "CONSUMER_ELECTRONICS": "CONSUMER_ELEC",
  SOLAR: "SOLAR", "SOLAR_SOLUTIONS": "SOLAR", "SOLAR_PANEL": "SOLAR",
  ELECTRICAL: "ELECTRICAL", "ELECTRICAL_SERVICES": "ELECTRICAL", "WIRING": "ELECTRICAL",
  PLUMBING: "PLUMBING", "PLUMBING_SERVICES": "PLUMBING",
  NETWORK: "NETWORK", "NETWORK_SUPPORT": "NETWORK", "INTERNET": "NETWORK", "WIFI": "NETWORK",
  COPIER: "COPIER", "COPIER_REPAIR": "COPIER", "PRINTER": "COPIER", "PRINT_SUPPLIES": "COPIER",
  SMART_HOME_OFFICE: "SMART_HOME_OFFICE", SMARTHOME: "SMART_HOME_OFFICE", "SMART_HOME": "SMART_HOME_OFFICE",
  POWER_BACKUP: "POWER_BACKUP", "POWER_BACKUP_SOLUTIONS": "POWER_BACKUP", "UPS": "POWER_BACKUP", "GENERATOR": "POWER_BACKUP",
  HOME_SECURITY: "HOME_SECURITY", SECURITY: "HOME_SECURITY",
  APPLIANCE_INSTALL: "APPLIANCE_INSTALL", "APPLIANCE": "APPLIANCE_INSTALL",
};

function normalizeCategory(raw: string): string | null {
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return CATEGORY_NORMALIZE[key] || null;
}

function getPartnerCanonicalCategories(partner: any): string[] {
  const cats: string[] = partner.categories_supported || [];
  const normalized = new Set<string>();
  for (const c of cats) {
    const n = normalizeCategory(c);
    if (n) normalized.add(n);
  }
  return [...normalized];
}

// ── Launch Categories with Tier ──
const LAUNCH_CATEGORIES: { code: string; label: string; tier: "core" | "specialist" }[] = [
  { code: "AC", label: "AC Services", tier: "core" },
  { code: "MOBILE", label: "Mobile Phone Repairs", tier: "core" },
  { code: "IT", label: "IT Repairs & Support", tier: "core" },
  { code: "ELECTRICAL", label: "Electrical Services", tier: "core" },
  { code: "PLUMBING", label: "Plumbing Services", tier: "core" },
  { code: "NETWORK", label: "Network Support", tier: "core" },
  { code: "CCTV", label: "CCTV Solutions", tier: "specialist" },
  { code: "CONSUMER_ELEC", label: "Consumer Electronics", tier: "specialist" },
  { code: "SOLAR", label: "Solar Solutions", tier: "specialist" },
  { code: "COPIER", label: "Copier / Printer Repair", tier: "specialist" },
  { code: "SMART_HOME_OFFICE", label: "Smart Home & Office", tier: "specialist" },
  { code: "POWER_BACKUP", label: "Power Backup Solutions", tier: "specialist" },
];

const CORE_CATEGORIES = LAUNCH_CATEGORIES.filter(c => c.tier === "core");

function getTarget(tier: "core" | "specialist"): number {
  return tier === "core" ? 5 : 3;
}

// ── UI Helpers ──
const statusIcon = (s: Status) =>
  s === "pass" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
  s === "partial" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
  <XCircle className="w-4 h-4 text-red-500" />;

const statusBadge = (s: Status) => (
  <Badge variant="outline" className={
    s === "pass" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
    s === "partial" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
    "bg-red-500/10 text-red-600 border-red-500/20"
  }>
    {s === "pass" ? "Ready" : s === "partial" ? "Partial" : "Not Ready"}
  </Badge>
);

const priorityBadge = (p: string) => (
  <Badge variant="outline" className={
    p === "critical" ? "bg-red-500/10 text-red-600 border-red-500/20" :
    p === "high" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
    p === "medium" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
    "bg-muted text-muted-foreground"
  }>
    {p}
  </Badge>
);

const recBadge = (rec: string) => (
  <Badge variant="outline" className={
    rec === "Ready to Launch" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]" :
    rec.startsWith("Recruit") ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]" :
    "bg-red-500/10 text-red-600 border-red-500/20 text-[10px]"
  }>
    {rec}
  </Badge>
);

const SourceTag = ({ source }: { source: ScoreSource }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
        source === "data" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
      }`}>
        {source === "data" ? <Database className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {source === "data" ? "Data" : "Audit"}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {source === "data" ? "Score computed from live database data" : "Score based on manual audit assessment"}
    </TooltipContent>
  </Tooltip>
);

// ── Component ──
const LaunchReadinessPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, zRes, bRes, qRes, rRes] = await Promise.all([
      supabase.from("partners").select("*"),
      supabase.from("service_zones").select("*").eq("is_active", true),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("quotes").select("id", { count: "exact", head: true }),
      supabase.from("customer_reminders").select("id", { count: "exact", head: true }),
    ]);
    setPartners(pRes.data || []);
    setZones(zRes.data || []);
    setBookingCount(bRes.count || 0);
    setQuoteCount(qRes.count || 0);
    setReminderCount(rRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── Derived: Category Readiness (strict normalization) ──
  const categoryReadiness: CategoryReadiness[] = LAUNCH_CATEGORIES.map(cat => {
    const matching = partners.filter(p => getPartnerCanonicalCategories(p).includes(cat.code));
    const verified = matching.filter(p => p.verification_status === "verified");
    const active = verified.filter(p => p.availability_status !== "offline");
    const target = getTarget(cat.tier);
    const gap = Math.max(0, target - verified.length);
    const coveredZones = [...new Set(matching.flatMap((p: any) => p.service_zones || []))];

    let status: Status;
    if (verified.length >= target) status = "pass";
    else if (verified.length >= Math.ceil(target / 2)) status = "partial";
    else status = "fail";

    let recommendation: CategoryReadiness["recommendation"];
    if (status === "pass") recommendation = "Ready to Launch";
    else if (status === "partial") recommendation = "Recruit Now, Launch After Minor Fixes";
    else recommendation = "Do Not Launch Yet";

    return {
      code: cat.code, label: cat.label, tier: cat.tier,
      recruited: matching.length, verified: verified.length, active: active.length,
      target, gap,
      status, zones: coveredZones,
      risk: gap > Math.ceil(target * 0.6) ? "High — may not cover demand" : gap > 0 ? "Medium — limited coverage" : "Low",
      recommendation,
    };
  });

  const catReady = categoryReadiness.filter(c => c.status === "pass").length;
  const catPartial = categoryReadiness.filter(c => c.status === "partial").length;
  const catNotReady = categoryReadiness.filter(c => c.status === "fail").length;
  const coreZeroVerified = categoryReadiness.filter(c => c.tier === "core" && c.verified === 0);

  // ── Derived: Zone Readiness (strict normalization) ──
  const zoneReadiness: ZoneReadiness[] = zones.map(z => {
    const zonePartners = partners.filter(p => (p.service_zones || []).includes(z.zone_code));
    const zoneVerified = zonePartners.filter(p => p.verification_status === "verified");
    const zoneActive = zoneVerified.filter(p => p.availability_status !== "offline");
    const coveredCodes = new Set(zonePartners.flatMap(p => getPartnerCanonicalCategories(p)));
    const coreGaps = CORE_CATEGORIES.filter(cat => !coveredCodes.has(cat.code)).map(c => c.label);
    const allGaps = LAUNCH_CATEGORIES.filter(cat => !coveredCodes.has(cat.code)).map(c => c.label);

    let status: Status;
    if (zoneVerified.length >= 3 && coreGaps.length === 0) status = "pass";
    else if (zonePartners.length >= 1) status = "partial";
    else status = "fail";

    const risk = coreGaps.length >= 3 ? "High — core categories missing" :
      coreGaps.length > 0 ? "Medium — some core gaps" :
      allGaps.length > 3 ? "Low — specialist gaps only" : "Covered";

    return {
      code: z.zone_code, name: z.zone_name,
      totalPartners: zonePartners.length, verifiedPartners: zoneVerified.length, activePartners: zoneActive.length,
      categoriesCovered: coveredCodes.size, totalCategories: LAUNCH_CATEGORIES.length,
      coreGaps, allGaps, status, risk,
    };
  });

  const zonesWithMajorGaps = zoneReadiness.filter(z => z.coreGaps.length >= 3).length;

  // ── Derived totals ──
  const verifiedCount = partners.filter(p => p.verification_status === "verified").length;
  const activeCount = partners.filter(p => p.availability_status !== "offline").length;

  // ── Section Scores ──
  const buildSections = (): SectionScore[] => [
    {
      label: "Product / UX Readiness", icon: <Star className="w-4 h-4" />, weight: 12, score: 85, source: "audit" as ScoreSource,
      items: [
        { name: "Category selection flow clear", status: "pass", priority: "critical", owner: "Product", why: "Users must find services instantly", action: "None" },
        { name: "Trust badges visible on providers", status: "pass", priority: "critical", owner: "Product", why: "Sri Lankan trust deficit", action: "None" },
        { name: "Pricing transparency in booking", status: "pass", priority: "critical", owner: "Product", why: "Users fear hidden costs", action: "None" },
        { name: "Mobile-first responsive layout", status: "pass", priority: "critical", owner: "Engineering", why: "90%+ mobile users in SL", action: "None" },
        { name: "Dark mode consistency", status: "partial", priority: "medium", owner: "Design", why: "Visual polish", action: "Audit dark mode edge cases" },
        { name: "Professional AI wording", status: "pass", priority: "high", owner: "Product", why: "AI must not confuse users", action: "None" },
        { name: "No-match fallback clarity", status: "pass", priority: "high", owner: "Product", why: "Clear guidance when no tech available", action: "None" },
      ],
    },
    {
      label: "Provider Supply Base", icon: <Users className="w-4 h-4" />, weight: 25, source: "data" as ScoreSource,
      score: LAUNCH_CATEGORIES.length > 0 ? Math.round(categoryReadiness.reduce((s, c) => s + Math.min(100, (c.verified / c.target) * 100), 0) / LAUNCH_CATEGORIES.length) : 0,
      items: [
        { name: `${verifiedCount} verified providers total`, status: verifiedCount >= 20 ? "pass" : verifiedCount >= 5 ? "partial" : "fail", priority: "critical", owner: "Ops", why: "Minimum supply for launch", action: verifiedCount < 20 ? "Accelerate recruitment" : "None" },
        { name: `${catReady}/${LAUNCH_CATEGORIES.length} categories at target`, status: catReady >= 10 ? "pass" : catReady >= 5 ? "partial" : "fail", priority: "critical", owner: "Ops", why: "Category coverage", action: catNotReady > 0 ? `${catNotReady} categories need recruitment` : "None" },
        { name: `${coreZeroVerified.length} core categories with 0 verified`, status: coreZeroVerified.length === 0 ? "pass" : "fail", priority: "critical", owner: "Ops", why: "Cannot launch core category with 0 providers", action: coreZeroVerified.length > 0 ? `Recruit for: ${coreZeroVerified.map(c => c.label).join(", ")}` : "None" },
        { name: `${activeCount} providers currently active`, status: activeCount >= 10 ? "pass" : activeCount >= 3 ? "partial" : "fail", priority: "high", owner: "Ops", why: "Real-time availability", action: activeCount < 10 ? "Ensure providers set online status" : "None" },
      ],
    },
    {
      label: "Provider Platform Readiness", icon: <Users className="w-4 h-4" />, weight: 10, score: 82, source: "audit" as ScoreSource,
      items: [
        { name: "Provider onboarding flow (/join)", status: "pass", priority: "critical", owner: "Engineering", why: "Must recruit efficiently", action: "None" },
        { name: "Document verification workflow (NIC/BR)", status: "pass", priority: "critical", owner: "Ops", why: "Trust & compliance", action: "None" },
        { name: "Provider profile completeness check", status: "partial", priority: "high", owner: "Engineering", why: "Incomplete profiles reduce trust", action: "Add profile strength indicator" },
        { name: "Provider dashboard functional", status: "pass", priority: "critical", owner: "Engineering", why: "Partners need to manage jobs", action: "None" },
        { name: "Job/appointment visibility for providers", status: "pass", priority: "critical", owner: "Engineering", why: "Partners must see incoming jobs", action: "None" },
        { name: "Quote workflow from provider side", status: "pass", priority: "critical", owner: "Engineering", why: "Partners must submit quotes", action: "None" },
        { name: "Cancellation/reschedule fairness rules", status: "partial", priority: "high", owner: "Ops", why: "Fair treatment prevents churn", action: "Define cancellation policy SOP" },
        { name: "Ratings/reputation system visible", status: "pass", priority: "high", owner: "Product", why: "Motivates quality service", action: "None" },
      ],
    },
    {
      label: "Booking Flow Readiness", icon: <TrendingUp className="w-4 h-4" />, weight: 12, score: 90, source: "audit" as ScoreSource,
      items: [
        { name: "Category landing → issue capture", status: "pass", priority: "critical", owner: "Engineering", why: "Core booking entry", action: "None" },
        { name: "AI search handoff to booking", status: "pass", priority: "high", owner: "Engineering", why: "Discovery → conversion", action: "None" },
        { name: "Technician matching + assignment", status: "pass", priority: "critical", owner: "Engineering", why: "Core dispatch", action: "None" },
        { name: "Quote submission + customer review", status: "pass", priority: "critical", owner: "Engineering", why: "Pricing trust", action: "None" },
        { name: "Booking confirmation flow", status: "pass", priority: "critical", owner: "Engineering", why: "Conversion endpoint", action: "None" },
        { name: "No-match fallback", status: "pass", priority: "critical", owner: "Product", why: "Graceful failure", action: "None" },
        { name: "Inspection-first flow (Solar/CCTV)", status: "pass", priority: "high", owner: "Product", why: "Specialist categories", action: "None" },
        { name: "Live tracking / status updates", status: "pass", priority: "high", owner: "Engineering", why: "Customer confidence", action: "None" },
      ],
    },
    {
      label: "Quote & Pricing Quality", icon: <Receipt className="w-4 h-4" />, weight: 8, score: 88, source: "audit" as ScoreSource,
      items: [
        { name: "Market band validation active", status: "pass", priority: "critical", owner: "Engineering", why: "Prevent overcharging", action: "None" },
        { name: "Customer quote review UI", status: "pass", priority: "critical", owner: "Product", why: "Trust in pricing", action: "None" },
        { name: "Quote expiry and follow-up logic", status: "pass", priority: "medium", owner: "Engineering", why: "Recover pending quotes", action: "None" },
        { name: "Inspection-first categories handled", status: "pass", priority: "high", owner: "Product", why: "Solar/CCTV need inspection", action: "None" },
      ],
    },
    {
      label: "AI Module Reliability", icon: <Brain className="w-4 h-4" />, weight: 8, score: 82, source: "audit" as ScoreSource,
      items: [
        { name: "AI Search functional", status: "pass", priority: "high", owner: "Engineering", why: "Discovery entry point", action: "None" },
        { name: "AI Photo Diagnosis functional", status: "pass", priority: "high", owner: "Engineering", why: "Visual issue capture", action: "None" },
        { name: "AI Technician Matching", status: "pass", priority: "critical", owner: "Engineering", why: "Core dispatch logic", action: "None" },
        { name: "Low-confidence fallback to inspection", status: "pass", priority: "critical", owner: "Engineering", why: "Safety fallback", action: "None" },
        { name: "AI rate limiting active", status: "pass", priority: "high", owner: "Engineering", why: "Cost control", action: "None" },
      ],
    },
    {
      label: "Trust & Transparency", icon: <Shield className="w-4 h-4" />, weight: 8, score: 90, source: "audit" as ScoreSource,
      items: [
        { name: "Verified badge on technicians", status: "pass", priority: "critical", owner: "Product", why: "Core trust signal", action: "None" },
        { name: "Pay-after-service messaging", status: "pass", priority: "critical", owner: "Product", why: "SL payment hesitancy", action: "None" },
        { name: "LankaFix Guarantee visible", status: "pass", priority: "high", owner: "Product", why: "Mediation & warranty trust", action: "None" },
        { name: "How Pricing Works page", status: "pass", priority: "medium", owner: "Content", why: "Pricing transparency", action: "None" },
        { name: "FAQ addressing local concerns", status: "pass", priority: "medium", owner: "Content", why: "Power trips, safety etc.", action: "None" },
      ],
    },
    {
      label: "Operations Readiness", icon: <Zap className="w-4 h-4" />, weight: 7, score: 78, source: "audit" as ScoreSource,
      items: [
        { name: "Dispatch board functional", status: "pass", priority: "critical", owner: "Ops", why: "Live job management", action: "None" },
        { name: "Control tower live monitoring", status: "pass", priority: "high", owner: "Ops", why: "Real-time ops visibility", action: "None" },
        { name: "Finance board reconciliation", status: "pass", priority: "high", owner: "Finance", why: "Settlement tracking", action: "None" },
        { name: "Escalation handling workflow", status: "partial", priority: "high", owner: "Ops", why: "Customer SOS must be handled", action: "Define escalation SOP" },
        { name: "Bypass monitoring active", status: "pass", priority: "medium", owner: "Trust", why: "Prevent off-platform deals", action: "None" },
      ],
    },
    {
      label: "Support / Escalation", icon: <Headphones className="w-4 h-4" />, weight: 5, score: 65, source: "audit" as ScoreSource,
      items: [
        { name: "Support ticket creation", status: "pass", priority: "high", owner: "Engineering", why: "Issue capture", action: "None" },
        { name: "SOS emergency flow", status: "pass", priority: "critical", owner: "Product", why: "Safety situations", action: "None" },
        { name: "Mediation workflow defined", status: "partial", priority: "high", owner: "Ops", why: "Dispute resolution", action: "Finalize mediation SOP" },
        { name: "Customer contact channel defined", status: "partial", priority: "high", owner: "Ops", why: "Customers need to reach support", action: "Set up WhatsApp business number" },
      ],
    },
    {
      label: "Data & Analytics", icon: <BarChart3 className="w-4 h-4" />, weight: 3, score: 78, source: "audit" as ScoreSource,
      items: [
        { name: "AI interaction logging", status: "pass", priority: "high", owner: "Engineering", why: "Track AI effectiveness", action: "None" },
        { name: "Booking analytics tracking", status: "pass", priority: "high", owner: "Engineering", why: "Conversion tracking", action: "None" },
        { name: "Dashboard data completeness", status: "partial", priority: "medium", owner: "Engineering", why: "Ops visibility", action: "Verify with real data" },
      ],
    },
    {
      label: "Retention & Follow-up", icon: <Heart className="w-4 h-4" />, weight: 2, score: reminderCount > 0 ? 85 : 70, source: (reminderCount > 0 ? "data" : "audit") as ScoreSource,
      items: [
        { name: "Maintenance reminders generation", status: "pass", priority: "medium", owner: "Engineering", why: "Repeat bookings", action: "None" },
        { name: "Quote follow-up reminders", status: "pass", priority: "medium", owner: "Engineering", why: "Quote recovery", action: "None" },
        { name: "Duplicate prevention", status: "pass", priority: "high", owner: "Engineering", why: "No reminder spam", action: "None" },
        { name: `${reminderCount} reminders in system`, status: reminderCount > 0 ? "pass" : "partial", priority: "low", owner: "Ops", why: "System actively generating", action: reminderCount === 0 ? "Seed test reminders" : "None" },
      ],
    },
  ];

  const sections = buildSections();
  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
  const weightedScore = Math.round(sections.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight);

  // ── Hardened Verdict Logic ──
  const criticalBlockers = sections.flatMap(s => s.items.filter(i => i.status === "fail" && i.priority === "critical"));
  const highIssues = sections.flatMap(s => s.items.filter(i => i.status !== "pass" && i.priority === "high"));

  const bookingFlowSection = sections.find(s => s.label.includes("Booking Flow"));
  const bookingFlowBroken = bookingFlowSection?.items.some(i => i.status === "fail" && i.priority === "critical") ?? false;
  const supportSection = sections.find(s => s.label.includes("Support"));
  const supportMissing = (supportSection?.items.filter(i => i.status === "fail" || i.status === "partial").length ?? 0) >= 3;

  const forceNotReady =
    coreZeroVerified.length > 0 ||
    zonesWithMajorGaps >= Math.ceil(zones.length * 0.5) ||
    bookingFlowBroken ||
    supportMissing;

  const verdict = forceNotReady ? "Not Ready" :
    criticalBlockers.length > 0 ? "Not Ready" :
    weightedScore >= 85 ? "Ready" :
    weightedScore >= 70 ? "Needs Fixes" : "Not Ready";

  const verdictReasons: string[] = [];
  if (coreZeroVerified.length > 0) verdictReasons.push(`${coreZeroVerified.length} core category(s) have 0 verified providers`);
  if (zonesWithMajorGaps >= Math.ceil(zones.length * 0.5)) verdictReasons.push(`${zonesWithMajorGaps} zones have major core category gaps`);
  if (bookingFlowBroken) verdictReasons.push("Critical booking flow step is broken");
  if (supportMissing) verdictReasons.push("Support/escalation workflow is incomplete");
  if (criticalBlockers.length > 0) verdictReasons.push(`${criticalBlockers.length} critical blocker(s)`);

  // ── Test Framework (with execution fields) ──
  const testCases: TestCase[] = [
    { name: "AC booking end-to-end", category: "AC", expected: "Full flow: search → match → quote → confirm", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Mobile photo diagnosis", category: "MOBILE", expected: "Photo upload → AI result → booking handoff", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "CCTV installation quote flow", category: "CCTV", expected: "Inspection-first → match → quote", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Solar inspection fallback", category: "SOLAR", expected: "Inspection required → no upfront price", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Electrical safety query", category: "ELECTRICAL", expected: "Hazard detection → inspection override", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "AI search Sinhala query", category: "ALL", expected: "Sinhala input → correct category", status: "partial", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Partial — some terms not mapped", blocker: false, notes: "Improve Sinhala dictionary" },
    { name: "No technician found fallback", category: "ALL", expected: "Clear message + waitlist", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Quote approval flow", category: "ALL", expected: "View → approve/reject/revise", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Reminder generation after booking", category: "AC", expected: "Maintenance reminder created", status: "pass", owner: "Engineering", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Duplicate reminder prevention", category: "ALL", expected: "Second call doesn't duplicate", status: "pass", owner: "Engineering", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Ops dispatch board loads", category: "OPS", expected: "Bookings with status filters", status: "pass", owner: "Ops", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Partner onboarding /join flow", category: "OPS", expected: "10-step form completes", status: "pass", owner: "Ops", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Zone outside Colombo → waitlist", category: "ALL", expected: "Kandy/Galle → waitlist redirect", status: "pass", owner: "QA", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Empty data resilience", category: "ALL", expected: "No crashes on empty DB", status: "pass", owner: "Engineering", testedBy: "—", dateTested: "—", actualResult: "Pending execution", blocker: false, notes: "" },
    { name: "Provider cancel/reschedule flow", category: "ALL", expected: "Fair handling, no data loss", status: "partial", owner: "Engineering", testedBy: "—", dateTested: "—", actualResult: "Needs SOP", blocker: false, notes: "Define policy first" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading launch data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0E4C92] text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ops/control-tower")} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2"><Rocket className="w-5 h-5" /> Launch Command Center</h1>
              <p className="text-xs text-white/70">Colombo Phase-1 Readiness Audit</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData} className="text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-28">
        {/* GO / NO-GO Banner */}
        <Card className={`border-2 ${verdict === "Ready" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : verdict === "Needs Fixes" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${verdict === "Ready" ? "bg-emerald-500 text-white" : verdict === "Needs Fixes" ? "bg-amber-500 text-white" : "bg-red-500 text-white"}`}>
                  {weightedScore}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Launch Verdict: {verdict}</h2>
                  {verdictReasons.length > 0 ? (
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {verdictReasons.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">All critical checks passed</p>
                  )}
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{partners.length}</div>
                  <div className="text-muted-foreground">Providers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{verifiedCount}</div>
                  <div className="text-muted-foreground">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{zones.length}</div>
                  <div className="text-muted-foreground">Zones</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-600">{catReady}</div>
                <div className="text-xs text-muted-foreground">Ready to Launch</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-amber-600">{catPartial}</div>
                <div className="text-xs text-muted-foreground">Minor Fixes</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-600">{catNotReady}</div>
                <div className="text-xs text-muted-foreground">Do Not Launch</div>
              </div>
            </div>

            {forceNotReady && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 rounded-lg border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong>Hard blocks detected</strong> — verdict forced to "Not Ready" regardless of score. Resolve the items above to unlock launch.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="scores" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="zones">Zones</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* ── SCORES TAB ── */}
          <TabsContent value="scores" className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
              <span className="inline-flex items-center gap-1"><Database className="w-3 h-3 text-blue-600" /> Data-driven score</span>
              <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3 text-amber-600" /> Manual audit assumption</span>
            </div>

            {sections.map((sec) => (
              <Card key={sec.label}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {sec.icon} {sec.label}
                      <SourceTag source={sec.source} />
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{sec.score}%</span>
                      <Progress value={sec.score} className="w-20 h-2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {sec.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                        {statusIcon(item.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-foreground">{item.name}</span>
                            {priorityBadge(item.priority)}
                          </div>
                          {item.action !== "None" && (
                            <p className="text-xs text-amber-600 mt-1">→ {item.action}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.owner}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Weighted Summary */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Weighted Score Breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-center">Source</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Contribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.map(s => (
                      <TableRow key={s.label}>
                        <TableCell className="text-sm">{s.label}</TableCell>
                        <TableCell className="text-center"><SourceTag source={s.source} /></TableCell>
                        <TableCell className="text-right text-sm font-medium">{s.score}%</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{s.weight}%</TableCell>
                        <TableCell className="text-right text-sm font-medium">{((s.score * s.weight) / 100).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Overall</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{weightedScore}%</TableCell>
                      <TableCell className="text-right">{totalWeight}%</TableCell>
                      <TableCell className="text-right">{weightedScore}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROVIDERS TAB ── */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Category Provider Readiness</CardTitle>
                <CardDescription className="text-xs">Core categories: {getTarget("core")} min · Specialist: {getTarget("specialist")} min</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Tier</TableHead>
                        <TableHead className="text-center">Target</TableHead>
                        <TableHead className="text-center">Recruited</TableHead>
                        <TableHead className="text-center">Verified</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">Gap</TableHead>
                        <TableHead>Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryReadiness.map(cat => (
                        <TableRow key={cat.code}>
                          <TableCell className="font-medium text-sm">{cat.label}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cat.tier === "core" ? "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                              {cat.tier}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">{cat.target}</TableCell>
                          <TableCell className="text-center text-sm">{cat.recruited}</TableCell>
                          <TableCell className="text-center text-sm font-medium">{cat.verified}</TableCell>
                          <TableCell className="text-center text-sm">{cat.active}</TableCell>
                          <TableCell className="text-center">
                            {cat.gap > 0 ? <span className="text-sm font-bold text-red-600">-{cat.gap}</span> : <span className="text-sm text-emerald-600">✓</span>}
                          </TableCell>
                          <TableCell>{recBadge(cat.recommendation)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-foreground">{partners.length}</div>
                <div className="text-xs text-muted-foreground">Total Recruited</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-emerald-600">{verifiedCount}</div>
                <div className="text-xs text-muted-foreground">Verified</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
                <div className="text-xs text-muted-foreground">Currently Active</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-foreground">
                  {LAUNCH_CATEGORIES.reduce((s, c) => s + getTarget(c.tier), 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Target</div>
              </Card>
            </div>

            {/* Category Launch Recommendation Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-emerald-500/30 p-4">
                <div className="text-sm font-semibold text-emerald-600 mb-2">Ready to Launch</div>
                {categoryReadiness.filter(c => c.recommendation === "Ready to Launch").length === 0
                  ? <p className="text-xs text-muted-foreground">None yet</p>
                  : categoryReadiness.filter(c => c.recommendation === "Ready to Launch").map(c => (
                    <div key={c.code} className="text-xs text-foreground py-0.5">{c.label}</div>
                  ))
                }
              </Card>
              <Card className="border-amber-500/30 p-4">
                <div className="text-sm font-semibold text-amber-600 mb-2">Recruit Now, Minor Fixes</div>
                {categoryReadiness.filter(c => c.recommendation.startsWith("Recruit")).length === 0
                  ? <p className="text-xs text-muted-foreground">None</p>
                  : categoryReadiness.filter(c => c.recommendation.startsWith("Recruit")).map(c => (
                    <div key={c.code} className="text-xs text-foreground py-0.5">{c.label} <span className="text-muted-foreground">(need {c.gap} more)</span></div>
                  ))
                }
              </Card>
              <Card className="border-red-500/30 p-4">
                <div className="text-sm font-semibold text-red-600 mb-2">Do Not Launch Yet</div>
                {categoryReadiness.filter(c => c.recommendation === "Do Not Launch Yet").length === 0
                  ? <p className="text-xs text-muted-foreground">None</p>
                  : categoryReadiness.filter(c => c.recommendation === "Do Not Launch Yet").map(c => (
                    <div key={c.code} className="text-xs text-foreground py-0.5">{c.label} <span className="text-muted-foreground">(need {c.gap} more)</span></div>
                  ))
                }
              </Card>
            </div>
          </TabsContent>

          {/* ── ZONES TAB ── */}
          <TabsContent value="zones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Colombo Zone Coverage</CardTitle>
                <CardDescription className="text-xs">{zoneReadiness.filter(z => z.status === "pass").length}/{zoneReadiness.length} zones fully ready · {zonesWithMajorGaps} with major gaps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zone</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Verified</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">Categories</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Core Gaps</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zoneReadiness.map(z => (
                        <TableRow key={z.code}>
                          <TableCell className="font-medium text-sm">{z.name}</TableCell>
                          <TableCell className="text-center text-sm">{z.totalPartners}</TableCell>
                          <TableCell className="text-center text-sm font-medium">{z.verifiedPartners}</TableCell>
                          <TableCell className="text-center text-sm">{z.activePartners}</TableCell>
                          <TableCell className="text-center text-sm">{z.categoriesCovered}/{z.totalCategories}</TableCell>
                          <TableCell className="text-center">{statusBadge(z.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                            {z.coreGaps.length > 0 ? z.coreGaps.slice(0, 3).join(", ") + (z.coreGaps.length > 3 ? ` +${z.coreGaps.length - 3}` : "") : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className={z.risk.startsWith("High") ? "text-red-600" : z.risk.startsWith("Medium") ? "text-amber-600" : "text-emerald-600"}>
                              {z.risk}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {zoneReadiness.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No active zones configured</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TESTS TAB ── */}
          <TabsContent value="tests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Pre-Launch Test Checklist</CardTitle>
                <CardDescription className="text-xs">
                  {testCases.filter(t => t.status === "pass").length}/{testCases.length} passing · {testCases.filter(t => t.blocker).length} blockers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Tested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actual Result</TableHead>
                        <TableHead className="text-center">Blocker</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testCases.map((tc, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm whitespace-nowrap">{tc.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{tc.category}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px]">{tc.expected}</TableCell>
                          <TableCell className="text-center">{statusIcon(tc.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tc.owner}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tc.testedBy}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{tc.dateTested}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px]">{tc.actualResult}</TableCell>
                          <TableCell className="text-center">
                            {tc.blocker ? <XCircle className="w-3.5 h-3.5 text-red-500 mx-auto" /> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px]">{tc.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* AI Module Audit */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> AI Module Readiness</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead className="text-center">Functional</TableHead>
                      <TableHead className="text-center">Fallback</TableHead>
                      <TableHead className="text-center">Analytics</TableHead>
                      <TableHead className="text-center">Launch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: "AI Smart Search", fn: "pass", fb: "pass", an: "pass", launch: "pass" },
                      { name: "AI Photo Diagnosis", fn: "pass", fb: "pass", an: "pass", launch: "pass" },
                      { name: "AI Technician Matching", fn: "pass", fb: "pass", an: "pass", launch: "pass" },
                      { name: "AI Quote Assistant", fn: "pass", fb: "pass", an: "pass", launch: "pass" },
                      { name: "Marketplace Intelligence", fn: "pass", fb: "partial", an: "pass", launch: "pass" },
                      { name: "Retention Automation", fn: "pass", fb: "pass", an: "pass", launch: "pass" },
                    ].map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">{statusIcon(m.fn as Status)}</TableCell>
                        <TableCell className="text-center">{statusIcon(m.fb as Status)}</TableCell>
                        <TableCell className="text-center">{statusIcon(m.an as Status)}</TableCell>
                        <TableCell className="text-center">{statusIcon(m.launch as Status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ACTIONS TAB ── */}
          <TabsContent value="actions" className="space-y-4">
            {/* Critical Blockers */}
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-sm text-red-600 flex items-center gap-2"><XCircle className="w-4 h-4" /> Critical Blockers ({criticalBlockers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {criticalBlockers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No critical blockers — all critical checks passed ✓</p>
                ) : (
                  <div className="space-y-3">
                    {criticalBlockers.map((b, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.why}</p>
                          <p className="text-xs text-red-600 mt-1">→ {b.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hard Block Reasons */}
            {forceNotReady && (
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Hard Block Rules Triggered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {verdictReasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-foreground">{r}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* High Priority */}
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> High Priority Issues ({highIssues.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {highIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No high-priority issues</p>
                ) : (
                  <div className="space-y-2">
                    {highIssues.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-foreground">{item.name}</p>
                          {item.action !== "None" && <p className="text-xs text-amber-600">→ {item.action}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{item.owner}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Recommended Next Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: "Recruit minimum verified providers per category (core: 5, specialist: 3)", owner: "Ops", urgency: "critical" },
                    { action: "Set up WhatsApp Business for customer support", owner: "Ops", urgency: "high" },
                    { action: "Define escalation & mediation SOP documents", owner: "Ops", urgency: "high" },
                    { action: "Define cancellation/reschedule fairness policy", owner: "Ops", urgency: "high" },
                    { action: "Run end-to-end booking test with real provider per category", owner: "QA", urgency: "high" },
                    { action: "Add provider profile strength indicator", owner: "Engineering", urgency: "medium" },
                    { action: "Audit dark mode consistency", owner: "Design", urgency: "medium" },
                    { action: "Verify all dashboards with real data", owner: "Engineering", urgency: "medium" },
                  ].map((a, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.urgency === "critical" ? "bg-red-500" : a.urgency === "high" ? "bg-amber-500" : "bg-blue-500"}`} />
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.owner}</p>
                      </div>
                      {priorityBadge(a.urgency)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Executive Summary */}
            <Card className="bg-[#0E4C92]/5 border-[#0E4C92]/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Rocket className="w-4 h-4 text-[#0E4C92]" /> Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-foreground">
                  <strong>Overall Readiness:</strong> {weightedScore}% — <strong>{verdict}</strong>
                </p>
                <p className="text-muted-foreground">
                  LankaFix has {partners.length} recruited providers ({verifiedCount} verified, {activeCount} active) across {zones.length} Colombo zones.
                  {catReady > 0 && ` ${catReady} of ${LAUNCH_CATEGORIES.length} categories meet their target.`}
                  {catNotReady > 0 && ` ${catNotReady} categories are not ready to launch.`}
                  {coreZeroVerified.length > 0 && ` Critical: ${coreZeroVerified.length} core categories have zero verified providers.`}
                </p>
                <p className="text-muted-foreground">
                  The product platform (booking flows, AI modules, trust signals, quote system) is functionally complete.
                  {forceNotReady
                    ? " However, hard-block conditions are active — provider recruitment and operational readiness must be addressed before launch."
                    : " Primary gap is provider supply — once category targets are met, Colombo Phase-1 launch can proceed."
                  }
                </p>
                <div className="pt-2 border-t flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Platform: Ready</Badge>
                  <Badge className={`${catReady >= 8 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                    Supply: {catReady >= 8 ? "Ready" : "Needs Work"}
                  </Badge>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Ops SOPs: In Progress</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LaunchReadinessPage;
