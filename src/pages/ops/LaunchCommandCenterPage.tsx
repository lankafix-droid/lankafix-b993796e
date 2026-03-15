/**
 * LankaFix Launch Command Center
 * Top-level GO/HOLD/NO-GO cockpit for daily pilot launch decisions.
 * Aggregates zone readiness, team readiness, automation health, payment stability.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Shield, CheckCircle2, AlertTriangle, XCircle, MapPin, Users,
  Zap, CreditCard, Activity, Clock, ArrowLeft,
  ChevronRight, Rocket, FileText, Radio,
  RefreshCw, MessageSquare, Target, Save, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { track } from "@/lib/analytics";
import {
  PILLAR_WEIGHTS, MIN_ACTIVE_PARTNERS_TARGET, MIN_ACTIVE_PARTNERS_CHECKLIST,
  PAYMENT_FAILURE_SCORE_PENALTY, UNPAID_COMPLETED_SCORE_PENALTY, MAX_PAYMENT_FAILURES_CHECKLIST,
  AUTOMATION_ERROR_SCORE_PENALTY, AUTOMATION_MONITOR_WINDOW_MINUTES,
  ESCALATION_SCORE_PENALTY, STALE_BOOKING_SCORE_PENALTY, STALE_BOOKING_THRESHOLD_MINUTES,
  MAX_ESCALATIONS_CHECKLIST, MAX_STALE_BOOKINGS_CHECKLIST,
  EXPIRED_OFFER_THRESHOLDS, ZONE_MIN_PARTNERS_READY, MIN_READY_ZONES_CHECKLIST,
  MAX_URGENT_OFFERS_CHECKLIST, MAX_SUPPORT_OPEN_CHECKLIST,
  WATCH_PILLAR_THRESHOLD_FOR_HOLD, PILLAR_HEALTHY_MIN, PILLAR_WATCH_MIN,
  UNPAID_REVENUE_THRESHOLD,
} from "@/config/launchReadinessConfig";

// ── Types ──
type Verdict = "GO" | "HOLD" | "NO_GO";
type PillarStatus = "healthy" | "watch" | "critical";
type ZoneStatus = "ready" | "watch" | "risky" | "not_ready";
type Trend = "improving" | "stable" | "deteriorating";

interface Pillar {
  key: string;
  label: string;
  icon: React.ElementType;
  score: number;
  status: PillarStatus;
  detail: string;
  weight: number;
  trend: Trend;
}

interface ZoneReadiness {
  code: string;
  label: string;
  partners: number;
  activePartners: number;
  bookingsToday: number;
  staleCount: number;
  status: ZoneStatus;
}

interface ChecklistItem {
  label: string;
  pass: boolean;
  note: string;
}

// ── Helpers ──
function pillarStatus(score: number): PillarStatus {
  if (score >= PILLAR_HEALTHY_MIN) return "healthy";
  if (score >= PILLAR_WATCH_MIN) return "watch";
  return "critical";
}

const STATUS_STYLES: Record<PillarStatus, { bg: string; text: string; border: string }> = {
  healthy: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
  watch: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
  critical: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
};

const ZONE_STATUS_STYLES: Record<ZoneStatus, { bg: string; text: string; label: string }> = {
  ready: { bg: "bg-success/10", text: "text-success", label: "Ready" },
  watch: { bg: "bg-warning/10", text: "text-warning", label: "Watch" },
  risky: { bg: "bg-destructive/10", text: "text-destructive", label: "Risky" },
  not_ready: { bg: "bg-muted", text: "text-muted-foreground", label: "Not Ready" },
};

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; label: string }> = {
  GO: { bg: "bg-success/15 border-success/30", text: "text-success", label: "GO" },
  HOLD: { bg: "bg-warning/15 border-warning/30", text: "text-warning", label: "HOLD" },
  NO_GO: { bg: "bg-destructive/15 border-destructive/30", text: "text-destructive", label: "NO-GO" },
};

// ── Pilot zones ──
const PILOT_ZONE_IDS = [
  "col_01", "col_02", "col_03", "col_04", "col_05", "col_06", "col_07",
  "col_08", "col_09", "col_10", "col_11", "col_12", "col_13", "col_14", "col_15",
  "rajagiriya", "battaramulla", "nawala", "nugegoda", "dehiwala", "mt_lavinia",
  "thalawathugoda", "negombo", "wattala", "moratuwa",
];

const ZONE_LABEL_MAP: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL_MAP[z.id] = z.label; });

// ── Drill-down links (only confirmed routes) ──
const DRILL_DOWN_LINKS = [
  { label: "War Room", path: "/ops/war-room", icon: Radio },
  { label: "Launch Readiness", path: "/ops/launch", icon: Rocket },
  { label: "Partner Readiness", path: "/ops/partner-readiness", icon: Users },
  { label: "Dispatch Board", path: "/ops/dispatch", icon: Zap },
  { label: "Finance Board", path: "/ops/finance", icon: CreditCard },
  { label: "Automation Health", path: "/ops/automation-health", icon: Activity },
  { label: "Support Cases", path: "/ops/support", icon: Shield },
];

// ── groupBy utility ──
function groupBy(arr: any[], field: string): Record<string, any[]> {
  const map: Record<string, any[]> = {};
  arr.forEach(item => {
    const key = item?.[field] || "unknown";
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });
  return map;
}

// ── Safe count helper ──
function safeLen(data: any[] | null | undefined): number {
  return Array.isArray(data) ? data.length : 0;
}

// ── Trend helper ──
function computeTrend(current: number, previous: number, inverted = false): Trend {
  if (previous === 0 && current === 0) return "stable";
  const diff = current - previous;
  if (Math.abs(diff) <= 1) return "stable";
  if (inverted) return diff > 0 ? "deteriorating" : "improving";
  return diff > 0 ? "improving" : "deteriorating";
}

// ── Pilot mode hook ──
function usePilotMode() {
  return useQuery({
    queryKey: ["pilot-mode-status"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("platform_settings" as any)
          .select("value")
          .eq("key", "pilot_mode")
          .maybeSingle();
        if (data?.value === "paused" || data?.value === false || data?.value === "false") return "PAUSED" as const;
        return "ACTIVE" as const;
      } catch {
        return "ACTIVE" as const;
      }
    },
    staleTime: 60_000,
  });
}

// ── Data hook with graceful fallbacks ──
function useLaunchData() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const staleThreshold = new Date(Date.now() - STALE_BOOKING_THRESHOLD_MINUTES * 60_000).toISOString();
  const autoWindow = new Date(Date.now() - AUTOMATION_MONITOR_WINDOW_MINUTES * 60_000).toISOString();
  const prevWindowStart = new Date(Date.now() - AUTOMATION_MONITOR_WINDOW_MINUTES * 2 * 60_000).toISOString();

  return useQuery({
    queryKey: ["launch-command-center"],
    queryFn: async () => {
      // Fire all queries; individual failures return empty arrays
      const results = await Promise.allSettled([
        supabase.from("partners").select("id, verification_status, availability_status, service_zones, categories_supported"),
        supabase.from("bookings").select("id, zone_code, category_code, status, payment_status").gte("created_at", todayISO).neq("booking_source", "pilot_simulation"),
        supabase.from("bookings").select("id, zone_code, status, partner_id, assigned_at, updated_at")
          .in("status", ["assigned", "tech_en_route", "arrived", "inspection_started", "repair_started", "quote_submitted"])
          .neq("booking_source", "pilot_simulation"),
        supabase.from("dispatch_escalations").select("id, booking_id").gte("created_at", todayISO).is("resolved_at", null),
        supabase.from("payments" as any).select("id, booking_id").eq("payment_status", "failed").gte("created_at", todayISO),
        supabase.from("automation_event_log").select("id").in("severity", ["error", "critical"]).gte("created_at", autoWindow),
        supabase.from("bookings").select("id, zone_code").in("status", ["assigned", "tech_en_route"]).lt("updated_at", staleThreshold).neq("booking_source", "pilot_simulation"),
        supabase.from("dispatch_offers").select("id").eq("status", "pending").lte("expires_at", new Date(Date.now() + 60_000).toISOString()).gte("expires_at", new Date().toISOString()),
        supabase.from("dispatch_offers").select("id").in("status", ["expired", "expired_by_accept"]).gte("created_at", todayISO),
        supabase.from("bookings").select("id, final_price_lkr").eq("status", "completed").eq("payment_status", "pending").gte("created_at", staleThreshold),
        supabase.from("support_cases" as any).select("id").in("status", ["open", "in_progress"]),
        supabase.from("dispatch_offers").select("id").eq("status", "accepted").gte("created_at", todayISO),
        supabase.from("dispatch_offers").select("id").gte("created_at", todayISO),
        // ── Previous-window trend queries (indices 13-16) ──
        supabase.from("payments" as any).select("id").eq("payment_status", "failed").gte("created_at", prevWindowStart).lt("created_at", autoWindow),
        supabase.from("automation_event_log").select("id").in("severity", ["error", "critical"]).gte("created_at", prevWindowStart).lt("created_at", autoWindow),
        supabase.from("dispatch_escalations").select("id").gte("created_at", prevWindowStart).lt("created_at", autoWindow).is("resolved_at", null),
        supabase.from("dispatch_offers").select("id").in("status", ["expired", "expired_by_accept"]).gte("created_at", prevWindowStart).lt("created_at", autoWindow),
      ]);

      const extract = (idx: number): any[] => {
        const r = results[idx];
        if (r.status === "fulfilled") return (r.value as any)?.data || [];
        console.warn(`[LaunchCommand] Query ${idx} failed:`, r.reason);
        return [];
      };

      const partners = extract(0);
      const bookingsToday = extract(1);
      const activeBookings = extract(2);
      const escalations = extract(3);
      const paymentFailures = extract(4);
      const automationErrors = extract(5);
      const staleBookings = extract(6);
      const urgentOffers = extract(7);
      const expiredOffers = extract(8);
      const unpaidCompleted = extract(9);
      const supportOpen = extract(10);
      const dispatchAccepted = extract(11);
      const dispatchTotal = extract(12);

      // Previous window for trends
      const prevPaymentFailures = extract(13);
      const prevAutomationErrors = extract(14);
      const prevEscalations = extract(15);
      const prevExpiredOffers = extract(16);

      const verifiedPartners = partners.filter((p: any) => p.verification_status === "verified");
      const activePartners = verifiedPartners.filter((p: any) => p.availability_status !== "offline");

      const dispatchAcceptRate = dispatchTotal.length > 0
        ? Math.round((dispatchAccepted.length / dispatchTotal.length) * 100)
        : 100;

      return {
        partners,
        verifiedPartners,
        activePartners,
        bookingsToday,
        activeBookings,
        escalationCount: escalations.length,
        paymentFailureCount: paymentFailures.length,
        automationErrorCount: automationErrors.length,
        staleBookingCount: staleBookings.length,
        urgentOfferCount: urgentOffers.length,
        expiredOfferCount: expiredOffers.length,
        unpaidCompletedCount: unpaidCompleted.length,
        unpaidRevenue: unpaidCompleted.reduce((s: number, b: any) => s + (b.final_price_lkr || 0), 0),
        supportOpenCount: supportOpen.length,
        dispatchAcceptRate,
        bookingsByZone: groupBy(bookingsToday, "zone_code"),
        staleByZone: groupBy(staleBookings, "zone_code"),
        // Trend previous-window counts
        prevPaymentFailureCount: prevPaymentFailures.length,
        prevAutomationErrorCount: prevAutomationErrors.length,
        prevEscalationCount: prevEscalations.length,
        prevExpiredOfferCount: prevExpiredOffers.length,
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ── Operator note persistence via automation_event_log ──
async function persistOperatorNote(note: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("automation_event_log").insert({
      event_type: "launch_operator_note",
      severity: "info",
      trigger_reason: note.slice(0, 500),
      action_taken: "operator_note_saved",
      metadata: { timestamp: new Date().toISOString(), source: "launch_command_center" },
    });
    return !error;
  } catch {
    return false;
  }
}

// ── Main Component ──
export default function LaunchCommandCenterPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useLaunchData();
  const [opsNote, setOpsNote] = useState("");
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { track("launch_command_center_viewed"); }, []);

  // Load latest operator note from DB on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: rows } = await supabase
          .from("automation_event_log")
          .select("trigger_reason, created_at")
          .eq("event_type", "launch_operator_note")
          .order("created_at", { ascending: false })
          .limit(1);
        if (rows && rows.length > 0) {
          setSavedNote(rows[0].trigger_reason);
        }
      } catch {
        // Silent — non-critical
      }
    })();
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!opsNote.trim()) return;
    setSavingNote(true);
    const ok = await persistOperatorNote(opsNote);
    setSavingNote(false);
    if (ok) {
      setSavedNote(opsNote);
      setOpsNote("");
      track("launch_ops_note_saved", { note: opsNote.slice(0, 100) });
    }
  }, [opsNote]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading launch data…</div>
        </main>
      </div>
    );
  }

  // Error / no data fallback
  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-warning mx-auto" />
            <p className="text-sm text-muted-foreground">Unable to load launch data. Some queries may have failed.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Compute Pillars ──
  const supplyScore = Math.min(100, Math.round((safeLen(data.activePartners) / Math.max(1, MIN_ACTIVE_PARTNERS_TARGET)) * 100));
  const dispatchScore = Math.min(100, data.dispatchAcceptRate);
  const paymentScore = Math.max(0, 100 - (data.paymentFailureCount * PAYMENT_FAILURE_SCORE_PENALTY) - (data.unpaidCompletedCount * UNPAID_COMPLETED_SCORE_PENALTY));
  const automationScore = data.automationErrorCount === 0 ? 100 : Math.max(0, 100 - (data.automationErrorCount * AUTOMATION_ERROR_SCORE_PENALTY));
  const escalationScore = Math.max(0, 100 - (data.escalationCount * ESCALATION_SCORE_PENALTY) - (data.staleBookingCount * STALE_BOOKING_SCORE_PENALTY));
  const offerScore = data.expiredOfferCount > EXPIRED_OFFER_THRESHOLDS.critical ? 40
    : data.expiredOfferCount > EXPIRED_OFFER_THRESHOLDS.watch ? 65
    : data.expiredOfferCount > EXPIRED_OFFER_THRESHOLDS.minor ? 85 : 100;

  const pillars: Pillar[] = [
    { key: "supply", label: "Supply Readiness", icon: Users, score: supplyScore, status: pillarStatus(supplyScore), detail: `${safeLen(data.activePartners)} active partners`, weight: PILLAR_WEIGHTS.supply },
    { key: "dispatch", label: "Dispatch Reliability", icon: Zap, score: dispatchScore, status: pillarStatus(dispatchScore), detail: `${dispatchScore}% acceptance rate`, weight: PILLAR_WEIGHTS.dispatch },
    { key: "payment", label: "Payment Stability", icon: CreditCard, score: paymentScore, status: pillarStatus(paymentScore), detail: `${data.paymentFailureCount} failures today`, weight: PILLAR_WEIGHTS.payment },
    { key: "automation", label: "Automation Health", icon: Activity, score: automationScore, status: pillarStatus(automationScore), detail: `${data.automationErrorCount} errors (${AUTOMATION_MONITOR_WINDOW_MINUTES}m)`, weight: PILLAR_WEIGHTS.automation },
    { key: "ops", label: "Ops Load", icon: Shield, score: escalationScore, status: pillarStatus(escalationScore), detail: `${data.escalationCount} escalations, ${data.staleBookingCount} stale`, weight: PILLAR_WEIGHTS.ops },
    { key: "offers", label: "Offer Health", icon: Clock, score: offerScore, status: pillarStatus(offerScore), detail: `${data.expiredOfferCount} expired today`, weight: PILLAR_WEIGHTS.offers },
  ];

  const totalWeight = pillars.reduce((s, p) => s + p.weight, 0);
  const overallScore = Math.round(pillars.reduce((s, p) => s + (p.score * p.weight), 0) / totalWeight);

  const hasCritical = pillars.some(p => p.status === "critical");
  const watchCount = pillars.filter(p => p.status === "watch").length;
  const verdict: Verdict = hasCritical ? "NO_GO" : watchCount >= WATCH_PILLAR_THRESHOLD_FOR_HOLD ? "HOLD" : "GO";
  const verdictStyle = VERDICT_STYLES[verdict];

  // ── Zone Readiness (no fake precision — omit zone-level escalation/payment metrics) ──
  const zoneReadiness: ZoneReadiness[] = PILOT_ZONE_IDS.map(zoneId => {
    const zonePartners = (data.activePartners || []).filter((p: any) => Array.isArray(p.service_zones) && p.service_zones.includes(zoneId));
    const allZonePartners = (data.verifiedPartners || []).filter((p: any) => Array.isArray(p.service_zones) && p.service_zones.includes(zoneId));
    const zoneBookings = data.bookingsByZone?.[zoneId] || [];
    const zoneStale = data.staleByZone?.[zoneId] || [];

    let status: ZoneStatus;
    if (allZonePartners.length >= ZONE_MIN_PARTNERS_READY && zoneStale.length === 0) status = "ready";
    else if (allZonePartners.length >= 1) status = "watch";
    else if (allZonePartners.length === 0 && zoneBookings.length > 0) status = "risky";
    else status = "not_ready";

    return {
      code: zoneId,
      label: ZONE_LABEL_MAP[zoneId] || zoneId,
      partners: allZonePartners.length,
      activePartners: zonePartners.length,
      bookingsToday: zoneBookings.length,
      staleCount: zoneStale.length,
      status,
    };
  });

  const zonesReady = zoneReadiness.filter(z => z.status === "ready").length;
  const zonesWatch = zoneReadiness.filter(z => z.status === "watch").length;
  const zonesRisky = zoneReadiness.filter(z => z.status === "risky" || z.status === "not_ready").length;

  // ── Daily Checklist ──
  const checklist: ChecklistItem[] = [
    { label: `Minimum partners active (≥${MIN_ACTIVE_PARTNERS_CHECKLIST})`, pass: safeLen(data.activePartners) >= MIN_ACTIVE_PARTNERS_CHECKLIST, note: `${safeLen(data.activePartners)} active` },
    { label: `Zones enabled (≥${MIN_READY_ZONES_CHECKLIST} ready)`, pass: zonesReady >= MIN_READY_ZONES_CHECKLIST, note: `${zonesReady} ready` },
    { label: `Dispatch alerts below threshold (≤${MAX_ESCALATIONS_CHECKLIST})`, pass: data.escalationCount <= MAX_ESCALATIONS_CHECKLIST, note: `${data.escalationCount} open escalations` },
    { label: `Payment failures acceptable (≤${MAX_PAYMENT_FAILURES_CHECKLIST})`, pass: data.paymentFailureCount <= MAX_PAYMENT_FAILURES_CHECKLIST, note: `${data.paymentFailureCount} failures` },
    { label: "Automations healthy", pass: data.automationErrorCount === 0, note: data.automationErrorCount === 0 ? "All healthy" : `${data.automationErrorCount} errors` },
    { label: `Urgent offers responded to (≤${MAX_URGENT_OFFERS_CHECKLIST})`, pass: data.urgentOfferCount <= MAX_URGENT_OFFERS_CHECKLIST, note: `${data.urgentOfferCount} expiring soon` },
    { label: `No critical unresolved cases (≤${MAX_SUPPORT_OPEN_CHECKLIST})`, pass: data.supportOpenCount <= MAX_SUPPORT_OPEN_CHECKLIST, note: `${data.supportOpenCount} open cases` },
    { label: `Stale bookings under control (≤${MAX_STALE_BOOKINGS_CHECKLIST})`, pass: data.staleBookingCount <= MAX_STALE_BOOKINGS_CHECKLIST, note: `${data.staleBookingCount} stale` },
  ];

  const checklistPass = checklist.filter(c => c.pass).length;

  const recommendation = verdict === "GO"
    ? "All critical pillars healthy. Pilot can proceed with standard monitoring."
    : verdict === "HOLD"
    ? `Minor issues detected (${watchCount} pillars on watch). Pilot possible with manual ops oversight.`
    : "Critical service risk detected. Resolve critical pillars before launching.";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/ops/war-room" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> War Room
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>

          {/* ── HERO: Launch Summary ── */}
          <Card className={`mb-6 border-2 ${verdictStyle.bg}`}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${verdictStyle.bg}`}>
                    <Rocket className={`w-8 h-8 ${verdictStyle.text}`} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Launch Command Center</h1>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-LK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-lg px-4 py-2 font-bold ${verdictStyle.bg} ${verdictStyle.text} border-none`}>
                    {verdictStyle.label}
                  </Badge>
                  <p className="text-2xl font-bold text-foreground mt-1">{overallScore}%</p>
                  <p className="text-[11px] text-muted-foreground">Launch Readiness</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> {zonesReady} zones ready</span>
                <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3.5 h-3.5" /> {zonesWatch} watch</span>
                <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" /> {zonesRisky} risky</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" /> {safeLen(data.activePartners)} active partners</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Target className="w-3.5 h-3.5" /> {safeLen(data.bookingsToday)} bookings today</span>
              </div>

              <p className="text-sm text-muted-foreground mt-3">{recommendation}</p>
            </CardContent>
          </Card>

          {/* ── SCORECARD: Pillars ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Readiness Scorecard
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {pillars.map(p => {
              const style = STATUS_STYLES[p.status];
              const Icon = p.icon;
              return (
                <Card key={p.key} className={`${style.border} border`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${style.text}`} />
                        <span className="text-xs font-medium text-foreground">{p.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${style.text}`}>{p.score}</span>
                    </div>
                    <Progress value={p.score} className="h-1.5 mb-1.5" />
                    <p className="text-[10px] text-muted-foreground">{p.detail}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── ZONE READINESS ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Zone Readiness
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            {zoneReadiness
              .sort((a, b) => {
                const order: Record<ZoneStatus, number> = { risky: 0, not_ready: 1, watch: 2, ready: 3 };
                return order[a.status] - order[b.status];
              })
              .filter(z => z.partners > 0 || z.bookingsToday > 0)
              .map(z => {
                const zs = ZONE_STATUS_STYLES[z.status];
                return (
                  <div key={z.code} className={`rounded-lg border p-3 ${zs.bg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{z.label}</span>
                      <Badge variant="outline" className={`text-[9px] ${zs.text}`}>{zs.label}</Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>{z.partners} partners</span>
                      <span>{z.activePartners} active</span>
                      <span>{z.bookingsToday} bookings</span>
                      {z.staleCount > 0 && <span className="text-destructive">{z.staleCount} stale</span>}
                    </div>
                  </div>
                );
              })}
            {zoneReadiness.filter(z => z.partners > 0 || z.bookingsToday > 0).length === 0 && (
              <p className="text-xs text-muted-foreground col-span-2 text-center py-4">No zones with active partners or bookings</p>
            )}
          </div>

          {/* ── TEAM READINESS ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Team & Operations Readiness
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <MetricTile label="Active Partners" value={safeLen(data.activePartners)} threshold={MIN_ACTIVE_PARTNERS_CHECKLIST} />
            <MetricTile label="Open Escalations" value={data.escalationCount} threshold={MAX_ESCALATIONS_CHECKLIST} inverted />
            <MetricTile label="Support Cases" value={data.supportOpenCount} threshold={MAX_SUPPORT_OPEN_CHECKLIST} inverted />
            <MetricTile label="Stale Bookings" value={data.staleBookingCount} threshold={MAX_STALE_BOOKINGS_CHECKLIST} inverted />
          </div>

          {/* ── AUTOMATION HEALTH ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Automation Health
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <MetricTile label={`Auto Errors (${AUTOMATION_MONITOR_WINDOW_MINUTES}m)`} value={data.automationErrorCount} threshold={1} inverted />
            <MetricTile label="Expired Offers Today" value={data.expiredOfferCount} threshold={EXPIRED_OFFER_THRESHOLDS.watch} inverted />
            <MetricTile label="Urgent Offers Now" value={data.urgentOfferCount} threshold={MAX_URGENT_OFFERS_CHECKLIST + 1} inverted />
            <MetricTile label="Unpaid Revenue" value={data.unpaidRevenue} threshold={UNPAID_REVENUE_THRESHOLD} inverted formatFn={v => `LKR ${v.toLocaleString()}`} />
          </div>

          {/* ── DAILY CHECKLIST ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Daily Pilot Checklist ({checklistPass}/{checklist.length})
          </h2>
          <Card className="mb-6">
            <CardContent className="p-4 space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.pass ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </div>
                  <span className={`text-[10px] ${item.pass ? "text-muted-foreground" : "text-destructive font-medium"}`}>{item.note}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── OPERATOR NOTE ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Operator Note
          </h2>
          <Card className="mb-6">
            <CardContent className="p-4 space-y-3">
              {savedNote && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                  <p className="text-xs text-foreground">{savedNote}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Saved this session</p>
                </div>
              )}
              <Textarea
                placeholder="E.g. Launch approved with caution — Zone X has low partner density..."
                value={opsNote}
                onChange={e => setOpsNote(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <Button size="sm" onClick={handleSaveNote} disabled={!opsNote.trim() || savingNote} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {savingNote ? "Saving…" : "Save Note"}
              </Button>
            </CardContent>
          </Card>

          {/* ── DRILL-DOWN LINKS ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Drill-Down</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {DRILL_DOWN_LINKS.map(link => (
              <Button
                key={link.path}
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-9 text-xs"
                onClick={() => navigate(link.path)}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Reusable metric tile ──
function MetricTile({ label, value, threshold, inverted, formatFn }: {
  label: string;
  value: number;
  threshold: number;
  inverted?: boolean;
  formatFn?: (v: number) => string;
}) {
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
  const isGood = inverted ? safeValue <= threshold : safeValue >= threshold;
  return (
    <div className={`rounded-lg border p-3 text-center ${isGood ? "bg-success/5 border-success/10" : "bg-destructive/5 border-destructive/10"}`}>
      <p className={`text-lg font-bold ${isGood ? "text-success" : "text-destructive"}`}>
        {formatFn ? formatFn(safeValue) : safeValue}
      </p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
