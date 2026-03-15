import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  zoneLabel, catLabel, bookingStatusLabel, bookingStatusColor,
  dispatchStatusLabel, dispatchStatusColor,
  paymentStatusLabel, paymentStatusColor,
  quoteStatusLabel, quoteStatusColor,
} from "@/lib/opsLabels";
import {
  Shield, AlertTriangle, Activity, Clock, Users, Zap, Eye,
  RefreshCw, ExternalLink, ChevronRight, Radio, TriangleAlert,
  CheckCircle2, XCircle, TrendingUp, MapPin, ChevronDown,
  BookOpen, FileText, Phone, MessageSquare, Tag, Camera, Image
} from "lucide-react";
import ETAIntelligencePanel from "@/components/warroom/ETAIntelligencePanel";

// ── Types ──
interface BookingRow {
  id: string;
  category_code: string;
  zone_code: string | null;
  status: string;
  dispatch_status: string | null;
  payment_status: string | null;
  customer_rating: number | null;
  created_at: string;
  assigned_at: string | null;
  partner_id: string | null;
  booking_source: string | null;
  is_emergency: boolean | null;
  sla_eta_minutes: number | null;
}

interface QuoteRow {
  id: string;
  booking_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  total_lkr: number | null;
}

interface PartnerRow {
  id: string;
  full_name: string;
  categories_supported: string[];
  service_zones: string[] | null;
  availability_status: string;
  acceptance_rate: number | null;
  cancellation_rate: number | null;
  rating_average: number | null;
  average_response_time_minutes: number | null;
  completed_jobs_count: number | null;
}

interface IncidentRow {
  id: string;
  event_type: string;
  severity: string;
  trigger_reason: string;
  action_taken: string;
  created_at: string;
  booking_id: string | null;
}

interface PaymentRow {
  id: string;
  booking_id: string;
  payment_status: string;
  amount_lkr: number;
  created_at: string;
}

interface EscalationRow {
  id: string;
  booking_id: string;
  reason: string;
  dispatch_rounds_attempted: number | null;
  created_at: string;
  resolved_at: string | null;
}

interface DispatchLogRow {
  id: string;
  booking_id: string;
  partner_id: string;
  status: string | null;
  response: string | null;
  created_at: string;
  responded_at: string | null;
  response_time_seconds: number | null;
}

interface EvidenceRow {
  booking_id: string;
  service_verified: boolean;
  customer_confirmed: boolean;
  customer_dispute: boolean;
  before_photos: any;
  after_photos: any;
  warranty_activated: boolean;
  warranty_end_date: string | null;
  maintenance_due_date: string | null;
  created_at: string;
}

// ── SLA config per category (minutes) ──
const CATEGORY_SLA: Record<string, number> = {
  MOBILE: 60, IT: 90, AC: 120, CCTV: 180, SOLAR: 240,
  ELECTRICAL: 120, PLUMBING: 120, CONSUMER_ELEC: 120,
  APPLIANCE_INSTALL: 180, NETWORK: 120, SMART_HOME_OFFICE: 180,
  HOME_SECURITY: 180, POWER_BACKUP: 180, COPIER: 120, PRINT_SUPPLIES: 60,
};

const getSlaStatus = (booking: BookingRow) => {
  if (booking.status === "completed" || booking.status === "cancelled") return "safe";
  const sla = CATEGORY_SLA[booking.category_code] || 120;
  const elapsed = (Date.now() - new Date(booking.created_at).getTime()) / 60000;
  if (elapsed > sla) return "breached";
  if (elapsed > sla * 0.75) return "warning";
  return "safe";
};

// ── Health color helpers ──
const healthColor = (val: number, greenBelow: number, yellowBelow: number) => {
  if (val <= greenBelow) return "text-emerald-600";
  if (val <= yellowBelow) return "text-amber-600";
  return "text-destructive";
};

const healthBg = (val: number, greenBelow: number, yellowBelow: number) => {
  if (val <= greenBelow) return "bg-emerald-500/10 border-emerald-500/20";
  if (val <= yellowBelow) return "bg-amber-500/10 border-amber-500/20";
  return "bg-destructive/10 border-destructive/20";
};

const rateHealthBg = (val: number, greenAbove: number, yellowAbove: number) => {
  if (val >= greenAbove) return "bg-emerald-500/10 border-emerald-500/20";
  if (val >= yellowAbove) return "bg-amber-500/10 border-amber-500/20";
  return "bg-destructive/10 border-destructive/20";
};

// ── Component ──
export default function WarRoomPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogRow[]>([]);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [bk, qt, pt, inc, pay, esc, dl, ev] = await Promise.all([
      supabase.from("bookings").select("id,category_code,zone_code,status,dispatch_status,payment_status,customer_rating,created_at,assigned_at,partner_id,booking_source,is_emergency,sla_eta_minutes")
        .neq("booking_source", "pilot_simulation").order("created_at", { ascending: false }).limit(200),
      supabase.from("quotes").select("id,booking_id,status,created_at,submitted_at,approved_at,total_lkr").order("created_at", { ascending: false }).limit(200),
      supabase.from("partners").select("id,full_name,categories_supported,service_zones,availability_status,acceptance_rate,cancellation_rate,rating_average,average_response_time_minutes,completed_jobs_count"),
      supabase.from("automation_event_log").select("id,event_type,severity,trigger_reason,action_taken,created_at,booking_id")
        .neq("action_taken", "simulation_logged").order("created_at", { ascending: false }).limit(100),
      supabase.from("payments").select("id,booking_id,payment_status,amount_lkr,created_at").gte("created_at", todayStart).order("created_at", { ascending: false }),
      supabase.from("dispatch_escalations").select("id,booking_id,reason,dispatch_rounds_attempted,created_at,resolved_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("dispatch_log").select("id,booking_id,partner_id,status,response,created_at,responded_at,response_time_seconds").gte("created_at", todayStart).order("created_at", { ascending: false }).limit(500),
      supabase.from("service_evidence").select("booking_id,service_verified,customer_confirmed,customer_dispute,before_photos,after_photos,warranty_activated,warranty_end_date,maintenance_due_date,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const liveBookings = (bk.data || []) as BookingRow[];
    setBookings(liveBookings);

    // Build live booking ID set for simulation isolation
    const liveBookingIds = new Set(liveBookings.map(b => b.id));

    // Filter quotes, payments, escalations, evidence to only those linked to live bookings
    setQuotes(((qt.data || []) as QuoteRow[]).filter(q => liveBookingIds.has(q.booking_id)));
    setPartners((pt.data || []) as PartnerRow[]);
    setIncidents(((inc.data || []) as IncidentRow[]).filter(i => !i.booking_id || liveBookingIds.has(i.booking_id)));
    setPayments(((pay.data || []) as PaymentRow[]).filter(p => liveBookingIds.has(p.booking_id)));
    setEscalations(((esc.data || []) as EscalationRow[]).filter(e => liveBookingIds.has(e.booking_id)));
    setDispatchLogs(((dl.data || []) as DispatchLogRow[]).filter(d => liveBookingIds.has(d.booking_id)));
    setEvidenceRecords(((ev.data || []) as EvidenceRow[]).filter(e => liveBookingIds.has(e.booking_id)));
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 30000); return () => clearInterval(iv); }, []);

  // ── Derived metrics ──
  const todayBookings = bookings.filter(b => b.created_at >= todayStart);
  const activeJobs = bookings.filter(b => ["assigned", "in_progress", "en_route", "diagnosing", "quoting"].includes(b.status));
  const openEscalations = escalations.filter(e => !e.resolved_at);

  // Partner lookup map for provider names
  const partnerMap = useMemo(() => {
    const m: Record<string, string> = {};
    partners.forEach(p => { m[p.id] = p.full_name; });
    return m;
  }, [partners]);

  // Quote aging helper — prefer submitted_at, fallback to created_at
  const quoteAgeMinutes = (q: QuoteRow) => {
    const ref = q.submitted_at || q.created_at;
    return (Date.now() - new Date(ref).getTime()) / 60000;
  };

  const staleQuotes = quotes.filter(q => {
    if (q.status !== "submitted" && q.status !== "pending") return false;
    return quoteAgeMinutes(q) > 30;
  });
  const paymentFailures = payments.filter(p => p.payment_status === "failed");
  const lowRatings = todayBookings.filter(b => b.customer_rating !== null && b.customer_rating < 3);
  const slaBreaches = todayBookings.filter(b => getSlaStatus(b) === "breached");

  // Dispatch metrics — computed from dispatch_log for accuracy
  const dlAccepted = dispatchLogs.filter(d => d.status === "accepted" || d.response === "accepted");
  const dlTotal = dispatchLogs.length;
  const dispatchSuccessRate = dlTotal > 0 ? (dlAccepted.length / dlTotal) * 100 : 100;
  const dlResponseTimes = dispatchLogs
    .filter(d => d.response_time_seconds !== null && d.response_time_seconds > 0)
    .map(d => d.response_time_seconds!);
  const avgDispatchMin = dlResponseTimes.length > 0
    ? (dlResponseTimes.reduce((a, b) => a + b, 0) / dlResponseTimes.length) / 60 : 0;
  const noProviderCases = todayBookings.filter(b => b.dispatch_status === "no_provider_found");

  // Quote metrics
  const quotesSubmitted = quotes.filter(q => q.status === "submitted" || q.status === "approved" || q.status === "rejected");
  const quotesAwaiting = quotes.filter(q => q.status === "submitted");
  const quotesRejected = quotes.filter(q => q.status === "rejected");
  const quotesRevised = quotes.filter(q => q.status === "revised");
  const quotesExpired = quotes.filter(q => q.status === "expired");

  // Quote aging buckets — using submitted_at-aware helper
  const pendingQuotes = quotes.filter(q => q.status === "submitted" || q.status === "pending");
  const qBucket0_15 = pendingQuotes.filter(q => quoteAgeMinutes(q) <= 15);
  const qBucket15_30 = pendingQuotes.filter(q => quoteAgeMinutes(q) > 15 && quoteAgeMinutes(q) <= 30);
  const qBucket30_60 = pendingQuotes.filter(q => quoteAgeMinutes(q) > 30 && quoteAgeMinutes(q) <= 60);
  const qBucket60 = pendingQuotes.filter(q => quoteAgeMinutes(q) > 60);

  // Partner tiers
  const partnerTier = (p: PartnerRow) => {
    if ((p.rating_average ?? 5) < 3) return "critical";
    if ((p.acceptance_rate ?? 100) < 40 || (p.cancellation_rate ?? 0) > 30) return "attention";
    return "healthy";
  };
  const healthyPartners = partners.filter(p => partnerTier(p) === "healthy");
  const attentionPartners = partners.filter(p => partnerTier(p) === "attention");
  const criticalPartners = partners.filter(p => partnerTier(p) === "critical");

  // Partner supply by zone
  const onlinePartners = partners.filter(p => p.availability_status === "online" || p.availability_status === "available");
  const zoneCoverage = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    onlinePartners.forEach(p => {
      (p.service_zones || []).forEach(z => {
        if (!map[z]) map[z] = {};
        (p.categories_supported || []).forEach(c => {
          map[z][c] = (map[z][c] || 0) + 1;
        });
      });
    });
    return map;
  }, [onlinePartners]);

  // Customer experience
  const ratedBookings = todayBookings.filter(b => b.customer_rating !== null);
  const avgRating = ratedBookings.length > 0
    ? ratedBookings.reduce((s, b) => s + (b.customer_rating || 0), 0) / ratedBookings.length : 0;

  // Critical incidents
  const criticalIncidents = incidents.filter(i => i.severity === "critical" || i.severity === "high");
  const todayIncidents = incidents.filter(i => i.created_at >= todayStart);

  // Launch milestones
  const totalCompleted = bookings.filter(b => b.status === "completed").length;
  const milestones = [25, 50, 100];
  const currentMilestone = milestones.find(m => totalCompleted < m) || 100;
  const milestoneProgress = Math.min((totalCompleted / currentMilestone) * 100, 100);

  // Service Proof metrics
  const evidenceMap = useMemo(() => {
    const m: Record<string, EvidenceRow> = {};
    evidenceRecords.forEach(e => { m[e.booking_id] = e; });
    return m;
  }, [evidenceRecords]);
  const completedBookings = bookings.filter(b => b.status === "completed");
  const jobsMissingBefore = completedBookings.filter(b => {
    const ev = evidenceMap[b.id];
    const before = ev ? (Array.isArray(ev.before_photos) ? ev.before_photos : []) : [];
    return before.length === 0;
  });
  const jobsMissingAfter = completedBookings.filter(b => {
    const ev = evidenceMap[b.id];
    const after = ev ? (Array.isArray(ev.after_photos) ? ev.after_photos : []) : [];
    return after.length === 0;
  });
  const jobsMissingEvidence = completedBookings.filter(b => {
    const ev = evidenceMap[b.id];
    if (!ev) return true;
    const before = Array.isArray(ev.before_photos) ? ev.before_photos : [];
    const after = Array.isArray(ev.after_photos) ? ev.after_photos : [];
    return before.length === 0 && after.length === 0;
  });
  const activeDisputes = evidenceRecords.filter(e => e.customer_dispute);
  const pendingConfirmations = evidenceRecords.filter(e => !e.customer_confirmed && !e.customer_dispute);
  const pendingOver24h = pendingConfirmations.filter(e => {
    const age = Date.now() - new Date(e.created_at).getTime();
    return age > 24 * 60 * 60 * 1000;
  });
  const verifiedJobs = evidenceRecords.filter(e => e.service_verified);
  const todayWarranties = evidenceRecords.filter(e => e.warranty_activated && e.created_at >= todayStart);
  const maintenanceDueSoon = evidenceRecords.filter(e => e.maintenance_due_date && new Date(e.maintenance_due_date) <= new Date(Date.now() + 7 * 86400000));

  // ── Protocol state ──
  const [guideOpen, setGuideOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [incidentTags, setIncidentTags] = useState<Record<string, string>>({});

  // Detect active issues for contextual guidance
  const hasDispatchIssue = dispatchSuccessRate < 85 || noProviderCases.length > 0 || openEscalations.length > 0;
  const hasQuoteDelay = staleQuotes.length > 0;
  const hasPaymentFailure = paymentFailures.length > 0;
  const hasPartnerIssue = criticalPartners.length > 0 || attentionPartners.length > 0;
  const hasCustomerIssue = lowRatings.length > 0;
  const hasSlaBreaches = slaBreaches.length > 0;
  const hasSupplyShortage = Object.values(zoneCoverage).some(cats => Object.values(cats).reduce((s, n) => s + n, 0) < 2);
  const isPilotProtection = totalCompleted < 25;
  const activeAlertCount = [hasDispatchIssue, hasQuoteDelay, hasPaymentFailure, hasPartnerIssue, hasCustomerIssue, hasSlaBreaches, hasSupplyShortage].filter(Boolean).length;

  const INCIDENT_TAG_OPTIONS = ["dispatch issue", "partner issue", "payment issue", "customer complaint", "system issue"];

  const generateReport = useCallback(() => {
    const completedToday = todayBookings.filter(b => b.status === "completed").length;
    const incidentCount = todayIncidents.length;
    const lines = [
      `═══ LankaFix War Room Daily Report ═══`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Time: ${new Date().toLocaleTimeString()}`,
      ``,
      `── Bookings ──`,
      `Received: ${todayBookings.length}`,
      `Completed: ${completedToday}`,
      `Active: ${activeJobs.length}`,
      `Cancelled: ${todayBookings.filter(b => b.status === "cancelled").length}`,
      ``,
      `── Dispatch ──`,
      `Success Rate: ${dispatchSuccessRate.toFixed(1)}%`,
      `Avg Dispatch Time: ${avgDispatchMin.toFixed(1)} min`,
      `Escalations: ${openEscalations.length}`,
      `No Provider: ${noProviderCases.length}`,
      ``,
      `── Quotes ──`,
      `Submitted: ${quotesSubmitted.length}`,
      `Awaiting: ${quotesAwaiting.length}`,
      `Stale (>30m): ${staleQuotes.length}`,
      `Rejected: ${quotesRejected.length}`,
      ``,
      `── Payments ──`,
      `Successful: ${payments.filter(p => p.payment_status === "paid").length}`,
      `Failed: ${paymentFailures.length}`,
      `Pending: ${payments.filter(p => p.payment_status === "pending").length}`,
      ``,
      `── Incidents ──`,
      `Total Today: ${incidentCount}`,
      `Critical: ${todayIncidents.filter(i => i.severity === "critical").length}`,
      `High: ${todayIncidents.filter(i => i.severity === "high").length}`,
      ``,
      `── Customer ──`,
      `Avg Rating: ${avgRating > 0 ? avgRating.toFixed(1) : "N/A"}`,
      `Low Ratings (<3): ${lowRatings.length}`,
      `SLA Breaches: ${slaBreaches.length}`,
      ``,
      `── Service Proof ──`,
      `Missing Before Evidence: ${jobsMissingBefore.length}`,
      `Missing After Evidence: ${jobsMissingAfter.length}`,
      `Open Disputes: ${activeDisputes.length}`,
      `Review Pending >24h: ${pendingOver24h.length}`,
      `Pending Confirmations: ${pendingConfirmations.length}`,
      `Verified Jobs: ${verifiedJobs.length}`,
      `Warranties Activated Today: ${todayWarranties.length}`,
      `Maintenance Due (7d): ${maintenanceDueSoon.length}`,
      ``,
      `── Launch ──`,
      `Total Completed: ${totalCompleted} / ${currentMilestone}`,
      `Pilot Protection: ${isPilotProtection ? "ACTIVE" : "OFF"}`,
      ``,
      `═══ End Report ═══`,
    ];
    return lines.join("\n");
  }, [todayBookings, activeJobs, dispatchSuccessRate, avgDispatchMin, openEscalations, noProviderCases, quotesSubmitted, quotesAwaiting, staleQuotes, quotesRejected, payments, paymentFailures, todayIncidents, avgRating, lowRatings, slaBreaches, totalCompleted, currentMilestone, isPilotProtection, jobsMissingEvidence, activeDisputes, pendingConfirmations, verifiedJobs]);

  // ── Response Guide Section ──
  const ResponseStep = ({ steps, color }: { steps: string[]; color: "red" | "yellow" }) => (
    <ol className={`text-[11px] space-y-0.5 pl-4 list-decimal ${color === "red" ? "text-destructive" : "text-amber-700"}`}>
      {steps.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
  );

  // ── Metric Card ──
  const MetricCard = ({ label, value, icon: Icon, alert }: { label: string; value: number | string; icon: any; alert?: "green" | "yellow" | "red" }) => {
    const bg = alert === "red" ? "bg-destructive/10 border-destructive/30" : alert === "yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30";
    const fg = alert === "red" ? "text-destructive" : alert === "yellow" ? "text-amber-600" : "text-emerald-600";
    return (
      <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-2.5 ${bg}`}>
        <Icon className={`w-4 h-4 ${fg}`} />
        <div className="min-w-0">
          <div className={`text-lg font-bold leading-tight ${fg}`}>{value}</div>
          <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-destructive animate-pulse" />
            <h1 className="text-lg font-heading font-bold">War Room</h1>
            <Badge variant="destructive" className="text-[10px]">LIVE</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {lastRefresh.toLocaleTimeString()}
            </span>
            <Button variant="ghost" size="icon" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ══ 1. LAUNCH HEALTH STRIP ══ */}
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="Bookings Today" value={todayBookings.length} icon={Activity}
            alert={todayBookings.length === 0 ? "yellow" : "green"} />
          <MetricCard label="Active Jobs" value={activeJobs.length} icon={Zap}
            alert={activeJobs.length > 10 ? "yellow" : "green"} />
          <MetricCard label="Escalations" value={openEscalations.length} icon={AlertTriangle}
            alert={openEscalations.length > 0 ? "red" : "green"} />
          <MetricCard label="Stale Quotes" value={staleQuotes.length} icon={Clock}
            alert={staleQuotes.length > 0 ? "yellow" : "green"} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="Pay Failures" value={paymentFailures.length} icon={XCircle}
            alert={paymentFailures.length > 0 ? "red" : "green"} />
          <MetricCard label="Low Ratings" value={lowRatings.length} icon={TriangleAlert}
            alert={lowRatings.length > 0 ? "red" : "green"} />
          <MetricCard label="SLA Breaches" value={slaBreaches.length} icon={Shield}
            alert={slaBreaches.length > 0 ? "red" : "green"} />
        </div>

        {/* ══ PILOT PROTECTION MODE BANNER ══ */}
        {isPilotProtection && (
          <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-700">PILOT PROTECTION MODE ACTIVE</span>
              <Badge className="bg-amber-500/20 text-amber-700 text-[9px] ml-auto">{totalCompleted}/25</Badge>
            </div>
            <p className="text-[11px] text-amber-700/80">No booking should fail. Manual intervention required if dispatch fails.</p>
          </div>
        )}

        {/* ══ CONTEXTUAL RESPONSE ALERTS ══ */}
        {activeAlertCount > 0 && (
          <div className="space-y-1.5">
            {hasDispatchIssue && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[11px] font-semibold text-destructive">Dispatch Failure Detected</span>
                </div>
                <ResponseStep color="red" steps={[
                  "Reassign nearest available technician",
                  "Contact provider directly via WhatsApp",
                  "Expand dispatch radius if needed",
                  "Escalate to partner manager"
                ]} />
              </div>
            )}
            {hasQuoteDelay && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-semibold text-amber-700">Quote Delay ({staleQuotes.length} stale)</span>
                </div>
                <ResponseStep color="yellow" steps={[
                  "Notify technician to submit quote",
                  "Contact customer with update",
                  "Verify repair scope clarity",
                  "Request quote revision if excessive"
                ]} />
              </div>
            )}
            {hasPaymentFailure && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[11px] font-semibold text-destructive">Payment Failure ({paymentFailures.length})</span>
                </div>
                <ResponseStep color="red" steps={[
                  "Retry payment processing",
                  "Offer alternative payment method",
                  "Verify transaction manually",
                  "Confirm service continuation with customer"
                ]} />
              </div>
            )}
            {hasSlaBreaches && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[11px] font-semibold text-destructive">SLA Breach ({slaBreaches.length})</span>
                </div>
                <ResponseStep color="red" steps={[
                  "Contact assigned technician immediately",
                  "Update customer with revised ETA",
                  "Reschedule if technician unavailable",
                  "Offer compensation if appropriate"
                ]} />
              </div>
            )}
            {hasCustomerIssue && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[11px] font-semibold text-destructive">Customer Issue ({lowRatings.length} low ratings)</span>
                </div>
                <ResponseStep color="red" steps={[
                  "Contact customer within 30 minutes",
                  "Apologize and investigate root cause",
                  "Offer repair revisit, discount, or refund"
                ]} />
              </div>
            )}
            {hasSupplyShortage && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-semibold text-amber-700">Supply Shortage in Zone(s)</span>
                </div>
                <ResponseStep color="yellow" steps={[
                  "Expand dispatch radius for affected zones",
                  "Contact offline partners to come online",
                  "Prioritize urgent bookings in low-supply zones"
                ]} />
              </div>
            )}
            {hasPartnerIssue && criticalPartners.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[11px] font-semibold text-destructive">Critical Partner(s): {criticalPartners.map(p => p.full_name).join(", ")}</span>
                </div>
                <ResponseStep color="red" steps={[
                  "Call partner immediately",
                  "Pause provider if quality risk persists",
                  "Assign alternative technician to active jobs"
                ]} />
              </div>
            )}
          </div>
        )}

        {/* ══ 2. LIVE BOOKINGS STREAM ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" />
              Live Bookings
              <Badge variant="secondary" className="ml-auto text-[10px]">{todayBookings.length} today</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {todayBookings.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No bookings yet today</div>
            ) : (
              <div className="overflow-auto max-h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">ID</TableHead>
                      <TableHead className="text-[10px]">Cat</TableHead>
                      <TableHead className="text-[10px]">Zone</TableHead>
                      <TableHead className="text-[10px]">Provider</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                      <TableHead className="text-[10px]">Dispatch</TableHead>
                      <TableHead className="text-[10px]">Quote</TableHead>
                      <TableHead className="text-[10px]">Pay</TableHead>
                      <TableHead className="text-[10px]">SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayBookings.slice(0, 20).map(b => {
                      const sla = getSlaStatus(b);
                      const quote = quotes.find(q => q.booking_id === b.id);
                      const isCancelled = b.status === "cancelled";
                      const isLowRated = b.customer_rating !== null && b.customer_rating < 3;
                      return (
                        <TableRow key={b.id}
                          className={`cursor-pointer ${isCancelled ? "bg-destructive/5" : isLowRated ? "bg-amber-500/5" : sla === "breached" ? "bg-destructive/5" : ""}`}
                          onClick={() => navigate(`/tracker/${b.id}`)}
                        >
                          <TableCell className="text-[10px] font-mono">{b.id.slice(0, 6)}</TableCell>
                          <TableCell className="text-[10px]">{catLabel(b.category_code)}</TableCell>
                          <TableCell className="text-[10px]">{zoneLabel(b.zone_code)}</TableCell>
                          <TableCell className="text-[10px] truncate max-w-[80px]">{b.partner_id ? (partnerMap[b.partner_id] || b.partner_id.slice(0, 6)) : "—"}</TableCell>
                          <TableCell><Badge className={`${bookingStatusColor(b.status)} text-[9px]`}>{bookingStatusLabel(b.status)}</Badge></TableCell>
                          <TableCell><Badge className={`${dispatchStatusColor(b.dispatch_status || "")} text-[9px]`}>{dispatchStatusLabel(b.dispatch_status)}</Badge></TableCell>
                          <TableCell>
                            {quote ? <Badge className={`${quoteStatusColor(quote.status)} text-[9px]`}>{quoteStatusLabel(quote.status)}</Badge> : <span className="text-[10px] text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><span className={`text-[10px] ${paymentStatusColor(b.payment_status)}`}>{paymentStatusLabel(b.payment_status)}</span></TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${sla === "breached" ? "bg-destructive/10 text-destructive" : sla === "warning" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                              {sla === "breached" ? "Breached" : sla === "warning" ? "Warning" : "Safe"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ 3. DISPATCH HEALTH ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-primary" /> Dispatch Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg border p-3 ${rateHealthBg(dispatchSuccessRate, 85, 70)}`}>
                <div className="text-lg font-bold">{dispatchSuccessRate.toFixed(0)}%</div>
                <div className="text-[10px] text-muted-foreground">Success Rate</div>
              </div>
              <div className={`rounded-lg border p-3 ${healthBg(avgDispatchMin, 5, 8)}`}>
                <div className="text-lg font-bold">{avgDispatchMin.toFixed(1)}m</div>
                <div className="text-[10px] text-muted-foreground">Avg Dispatch</div>
              </div>
              <div className={`rounded-lg border p-3 ${healthBg(noProviderCases.length, 0, 2)}`}>
                <div className="text-lg font-bold">{noProviderCases.length}</div>
                <div className="text-[10px] text-muted-foreground">No Provider</div>
              </div>
              <div className={`rounded-lg border p-3 ${healthBg(openEscalations.length, 0, 2)}`}>
                <div className="text-lg font-bold">{openEscalations.length}</div>
                <div className="text-[10px] text-muted-foreground">Escalations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══ 4. ESCALATION QUEUE ══ */}
        {openEscalations.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="w-4 h-4" /> Escalation Queue
                <Badge variant="destructive" className="ml-auto">{openEscalations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Booking</TableHead>
                    <TableHead className="text-[10px]">Reason</TableHead>
                    <TableHead className="text-[10px]">Attempts</TableHead>
                    <TableHead className="text-[10px]">Time</TableHead>
                    <TableHead className="text-[10px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openEscalations.map(e => {
                    const bk = bookings.find(b => b.id === e.booking_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-[10px] font-mono">{e.booking_id.slice(0, 6)}</TableCell>
                        <TableCell className="text-[10px]">{e.reason.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-[10px]">{e.dispatch_rounds_attempted ?? 0}</TableCell>
                        <TableCell className="text-[10px]">{new Date(e.created_at).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => navigate(`/tracker/${e.booking_id}`)}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ══ 5. QUOTE MONITOR ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-primary" /> Quote Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold">{quotesSubmitted.length}</div>
                <div className="text-[10px] text-muted-foreground">Submitted</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <div className="text-lg font-bold text-amber-600">{quotesAwaiting.length}</div>
                <div className="text-[10px] text-muted-foreground">Awaiting</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <div className="text-lg font-bold text-destructive">{quotesRejected.length}</div>
                <div className="text-[10px] text-muted-foreground">Rejected</div>
              </div>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5">Aging Buckets</div>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="text-center p-1.5 rounded bg-emerald-500/10">
                <div className="text-sm font-bold text-emerald-600">{qBucket0_15.length}</div>
                <div className="text-[9px] text-muted-foreground">0-15m</div>
              </div>
              <div className="text-center p-1.5 rounded bg-emerald-500/10">
                <div className="text-sm font-bold text-emerald-600">{qBucket15_30.length}</div>
                <div className="text-[9px] text-muted-foreground">15-30m</div>
              </div>
              <div className="text-center p-1.5 rounded bg-amber-500/10">
                <div className="text-sm font-bold text-amber-600">{qBucket30_60.length}</div>
                <div className="text-[9px] text-muted-foreground">30-60m</div>
              </div>
              <div className={`text-center p-1.5 rounded ${qBucket60.length > 0 ? "bg-destructive/10" : "bg-muted/50"}`}>
                <div className={`text-sm font-bold ${qBucket60.length > 0 ? "text-destructive" : ""}`}>{qBucket60.length}</div>
                <div className="text-[9px] text-muted-foreground">60m+</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══ 6. PAYMENT MONITOR ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Payment Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                <div className="text-lg font-bold text-emerald-600">{payments.filter(p => p.payment_status === "paid").length}</div>
                <div className="text-[10px] text-muted-foreground">Successful</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${paymentFailures.length > 0 ? "bg-destructive/10" : "bg-muted/50"}`}>
                <div className={`text-lg font-bold ${paymentFailures.length > 0 ? "text-destructive" : ""}`}>{paymentFailures.length}</div>
                <div className="text-[10px] text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <div className="text-lg font-bold text-amber-600">{payments.filter(p => p.payment_status === "pending").length}</div>
                <div className="text-[10px] text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══ 7. PARTNER PERFORMANCE ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" /> Partner Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                <div className="text-lg font-bold text-emerald-600">{healthyPartners.length}</div>
                <div className="text-[10px] text-muted-foreground">Healthy</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <div className="text-lg font-bold text-amber-600">{attentionPartners.length}</div>
                <div className="text-[10px] text-muted-foreground">Attention</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${criticalPartners.length > 0 ? "bg-destructive/10" : "bg-muted/50"}`}>
                <div className={`text-lg font-bold ${criticalPartners.length > 0 ? "text-destructive" : ""}`}>{criticalPartners.length}</div>
                <div className="text-[10px] text-muted-foreground">Critical</div>
              </div>
            </div>
            {(attentionPartners.length > 0 || criticalPartners.length > 0) && (
              <div className="space-y-1.5 max-h-[160px] overflow-auto">
                {[...criticalPartners, ...attentionPartners].slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/30">
                    <span className="font-medium truncate">{p.full_name}</span>
                    <div className="flex items-center gap-2">
                      <span>⭐ {(p.rating_average ?? 0).toFixed(1)}</span>
                      <span>Acc {(p.acceptance_rate ?? 0).toFixed(0)}%</span>
                      <Badge className={`text-[9px] ${partnerTier(p) === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                        {partnerTier(p)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ 8. SUPPLY COVERAGE ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-primary" /> Supply Coverage
              <Badge variant="secondary" className="ml-auto text-[10px]">{onlinePartners.length} online</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(zoneCoverage).length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">No partners online</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {Object.entries(zoneCoverage).slice(0, 10).map(([zone, cats]) => {
                  const total = Object.values(cats).reduce((s, n) => s + n, 0);
                  return (
                    <div key={zone} className="p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium">{zoneLabel(zone)}</span>
                        <Badge className={`text-[9px] ${total < 2 ? "bg-destructive/10 text-destructive" : total < 4 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                          {total} online
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(cats).map(([cat, count]) => (
                          <span key={cat} className="text-[9px] bg-background rounded px-1.5 py-0.5">
                            {catLabel(cat)}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ 9. CUSTOMER EXPERIENCE ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" /> Customer Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div className={`text-center p-2 rounded-lg ${avgRating >= 4 ? "bg-emerald-500/10" : avgRating >= 3 ? "bg-amber-500/10" : "bg-destructive/10"}`}>
                <div className="text-lg font-bold">{avgRating > 0 ? `${avgRating.toFixed(1)} ⭐` : "—"}</div>
                <div className="text-[10px] text-muted-foreground">Avg Rating Today</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${lowRatings.length > 0 ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
                <div className={`text-lg font-bold ${lowRatings.length > 0 ? "text-destructive" : "text-emerald-600"}`}>{lowRatings.length}</div>
                <div className="text-[10px] text-muted-foreground">Rated &lt;3</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══ 10. INCIDENT PANEL ══ */}
        <Card className={criticalIncidents.length > 0 ? "border-destructive/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="w-4 h-4 text-primary" /> Incidents
              {criticalIncidents.length > 0 && (
                <Badge variant="destructive" className="ml-auto">{criticalIncidents.length} critical</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <div className="text-lg font-bold text-destructive">{incidents.filter(i => i.severity === "critical").length}</div>
                <div className="text-[10px] text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <div className="text-lg font-bold text-amber-600">{incidents.filter(i => i.severity === "high").length}</div>
                <div className="text-[10px] text-muted-foreground">High</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold">{incidents.filter(i => i.severity === "medium" || i.severity === "info").length}</div>
                <div className="text-[10px] text-muted-foreground">Medium</div>
              </div>
            </div>
            {todayIncidents.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-3">No incidents today — all clear</div>
            ) : (
              todayIncidents.slice(0, 5).map(inc => (
                <div key={inc.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 mb-1 text-[11px]">
                  <Badge className={`text-[9px] ${inc.severity === "critical" ? "bg-destructive/10 text-destructive" : inc.severity === "high" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                    {inc.severity}
                  </Badge>
                  <span className="truncate flex-1">{inc.event_type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{new Date(inc.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full mt-2 text-[11px]" onClick={() => navigate("/ops/incidents")}>
              View All Incidents <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* ══ 11. LAUNCH MILESTONE TRACKER ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" /> Launch Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{totalCompleted} / {currentMilestone} bookings completed</span>
              <span className="text-sm font-bold text-primary">{milestoneProgress.toFixed(0)}%</span>
            </div>
            <Progress value={milestoneProgress} className="h-3 mb-3" />
            <div className="flex justify-between">
              {milestones.map(m => (
                <div key={m} className={`text-center ${totalCompleted >= m ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <div className="text-xs font-bold">{m}</div>
                  <div className="text-[9px]">{totalCompleted >= m ? "✓" : "—"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ══ INCIDENT RESPONSE TAGS ══ */}
        {todayIncidents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="w-4 h-4 text-primary" /> Incident Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {todayIncidents.slice(0, 8).map(inc => (
                <div key={inc.id} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-muted/30">
                  <Badge className={`text-[9px] shrink-0 ${inc.severity === "critical" ? "bg-destructive/10 text-destructive" : inc.severity === "high" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                    {inc.severity}
                  </Badge>
                  <span className="truncate flex-1">{inc.event_type.replace(/_/g, " ")}</span>
                  <select
                    className="text-[10px] bg-background border rounded px-1 py-0.5 h-6"
                    value={incidentTags[inc.id] || ""}
                    onChange={e => setIncidentTags(prev => ({ ...prev, [inc.id]: e.target.value }))}
                  >
                    <option value="">tag…</option>
                    {INCIDENT_TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ══ WAR-ROOM RESPONSE GUIDE ══ */}
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
          <Card className="border-primary/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4 text-primary" /> War-Room Response Guide
                  <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${guideOpen ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {[
                  { title: "Dispatch Failure", icon: Zap, steps: ["Reassign nearest technician", "Contact provider directly", "Expand dispatch radius", "Escalate to partner manager"] },
                  { title: "Quote Delay (>30m)", icon: Clock, steps: ["Notify technician", "Contact customer", "Verify repair scope", "Request quote revision if excessive"] },
                  { title: "Payment Failure", icon: XCircle, steps: ["Retry payment", "Offer alternative method", "Verify transaction manually", "Confirm service continuation"] },
                  { title: "Partner Critical", icon: Users, steps: ["Call partner immediately", "Pause provider if necessary", "Assign alternative technician"] },
                  { title: "Partner Attention", icon: Users, steps: ["Notify partner of metrics", "Monitor next 3 bookings closely"] },
                  { title: "Customer Recovery", icon: MessageSquare, steps: ["Contact within 30 minutes", "Apologize and investigate", "Offer revisit / discount / refund"] },
                  { title: "SLA Breach", icon: Shield, steps: ["Contact technician", "Update customer", "Reschedule if required", "Provide compensation if needed"] },
                  { title: "Supply Shortage", icon: MapPin, steps: ["Expand dispatch radius", "Contact offline partners", "Prioritize urgent bookings"] },
                ].map(({ title, icon: IIcon, steps }) => (
                  <div key={title} className="p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <IIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-semibold">{title}</span>
                    </div>
                    <ol className="text-[10px] text-muted-foreground pl-4 list-decimal space-y-0.5">
                      {steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ══ DAILY WAR ROOM REPORT ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" /> Daily Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[11px] h-9 mb-2"
              onClick={() => setReportOpen(!reportOpen)}
            >
              <FileText className="w-3 h-3 mr-1" /> {reportOpen ? "Hide" : "Generate"} Daily War Room Report
            </Button>
            {reportOpen && (
              <div className="relative">
                <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-auto max-h-[300px] whitespace-pre-wrap font-mono">
                  {generateReport()}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 text-[10px]"
                  onClick={() => { navigator.clipboard.writeText(generateReport()); }}
                >
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ SERVICE PROOF MONITOR ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="w-4 h-4 text-primary" /> Service Proof Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className={`p-2 rounded-lg border text-center ${jobsMissingBefore.length > 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border"}`}>
                <p className={`text-lg font-bold ${jobsMissingBefore.length > 0 ? "text-destructive" : "text-foreground"}`}>{jobsMissingBefore.length}</p>
                <p className="text-[10px] text-muted-foreground">Missing Before</p>
              </div>
              <div className={`p-2 rounded-lg border text-center ${jobsMissingAfter.length > 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border"}`}>
                <p className={`text-lg font-bold ${jobsMissingAfter.length > 0 ? "text-destructive" : "text-foreground"}`}>{jobsMissingAfter.length}</p>
                <p className="text-[10px] text-muted-foreground">Missing After</p>
              </div>
              <div className={`p-2 rounded-lg border text-center ${activeDisputes.length > 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border"}`}>
                <p className={`text-lg font-bold ${activeDisputes.length > 0 ? "text-destructive" : "text-foreground"}`}>{activeDisputes.length}</p>
                <p className="text-[10px] text-muted-foreground">Open Disputes</p>
              </div>
              <div className={`p-2 rounded-lg border text-center ${pendingOver24h.length > 0 ? "bg-warning/5 border-warning/20" : "bg-muted/30 border-border"}`}>
                <p className={`text-lg font-bold ${pendingOver24h.length > 0 ? "text-warning" : "text-foreground"}`}>{pendingOver24h.length}</p>
                <p className="text-[10px] text-muted-foreground">Review &gt;24h</p>
              </div>
              <div className="p-2 rounded-lg border bg-success/5 border-success/20 text-center">
                <p className="text-lg font-bold text-success">{verifiedJobs.length}</p>
                <p className="text-[10px] text-muted-foreground">Verified Today</p>
              </div>
              <div className="p-2 rounded-lg border bg-primary/5 border-primary/20 text-center">
                <p className="text-lg font-bold text-primary">{todayWarranties.length}</p>
                <p className="text-[10px] text-muted-foreground">Warranties Today</p>
              </div>
              <div className="p-2 rounded-lg border bg-muted/30 border-border text-center col-span-3">
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-foreground">{maintenanceDueSoon.length}</p>
                    <p className="text-[10px] text-muted-foreground">Maint. Due (7d)</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{pendingConfirmations.length}</p>
                    <p className="text-[10px] text-muted-foreground">Pending Confirm</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable booking list */}
            {(jobsMissingBefore.length > 0 || jobsMissingAfter.length > 0 || activeDisputes.length > 0 || pendingOver24h.length > 0) && (
              <div className="space-y-1 mt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Action Required</p>
                {jobsMissingBefore.slice(0, 3).map(b => (
                  <div key={`mb-${b.id}`} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-destructive/5 cursor-pointer hover:bg-destructive/10"
                    onClick={() => navigate(`/tracker/${b.id}`)}>
                    <Badge className="text-[9px] bg-destructive/10 text-destructive shrink-0">no before</Badge>
                    <span className="font-mono">{b.id.slice(0, 6)}</span>
                    <span className="text-muted-foreground">{catLabel(b.category_code)}</span>
                    <span className="text-muted-foreground">{zoneLabel(b.zone_code)}</span>
                    <span className="text-muted-foreground ml-auto truncate max-w-[60px]">{b.partner_id ? (partnerMap[b.partner_id] || "—") : "—"}</span>
                    <Eye className="w-3 h-3 text-muted-foreground shrink-0" />
                  </div>
                ))}
                {jobsMissingAfter.slice(0, 3).map(b => (
                  <div key={`ma-${b.id}`} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-destructive/5 cursor-pointer hover:bg-destructive/10"
                    onClick={() => navigate(`/tracker/${b.id}`)}>
                    <Badge className="text-[9px] bg-destructive/10 text-destructive shrink-0">no after</Badge>
                    <span className="font-mono">{b.id.slice(0, 6)}</span>
                    <span className="text-muted-foreground">{catLabel(b.category_code)}</span>
                    <span className="text-muted-foreground">{zoneLabel(b.zone_code)}</span>
                    <span className="text-muted-foreground ml-auto truncate max-w-[60px]">{b.partner_id ? (partnerMap[b.partner_id] || "—") : "—"}</span>
                    <Eye className="w-3 h-3 text-muted-foreground shrink-0" />
                  </div>
                ))}
                {activeDisputes.slice(0, 5).map(e => {
                  const bk = bookings.find(b => b.id === e.booking_id);
                  return (
                    <div key={`dp-${e.booking_id}`} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-destructive/5 cursor-pointer hover:bg-destructive/10"
                      onClick={() => navigate(`/tracker/${e.booking_id}`)}>
                      <Badge className="text-[9px] bg-destructive/10 text-destructive shrink-0">dispute</Badge>
                      <span className="font-mono">{e.booking_id.slice(0, 6)}</span>
                      <span className="text-muted-foreground">{bk ? catLabel(bk.category_code) : "—"}</span>
                      <span className="text-muted-foreground">{bk ? zoneLabel(bk.zone_code) : "—"}</span>
                      <Eye className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                    </div>
                  );
                })}
                {pendingOver24h.slice(0, 3).map(e => {
                  const bk = bookings.find(b => b.id === e.booking_id);
                  return (
                    <div key={`pc-${e.booking_id}`} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-warning/5 cursor-pointer hover:bg-warning/10"
                      onClick={() => navigate(`/tracker/${e.booking_id}`)}>
                      <Badge className="text-[9px] bg-warning/10 text-warning shrink-0">review &gt;24h</Badge>
                      <span className="font-mono">{e.booking_id.slice(0, 6)}</span>
                      <span className="text-muted-foreground">{bk ? catLabel(bk.category_code) : "—"}</span>
                      <span className="text-muted-foreground">{bk ? zoneLabel(bk.zone_code) : "—"}</span>
                      <Eye className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ ETA INTELLIGENCE ══ */}
        <ETAIntelligencePanel />

        {/* ══ TECHNICIAN ARRIVAL MONITOR ══ */}
        {(() => {
          const ARRIVAL_LABELS: Record<string, { label: string; color: string }> = {
            assigned: { label: "Preparing", color: "bg-primary/10 text-primary" },
            tech_en_route: { label: "En Route", color: "bg-accent/10 text-accent" },
            arrived: { label: "Arrived", color: "bg-success/10 text-success" },
            inspection_started: { label: "Inspecting", color: "bg-warning/10 text-warning" },
            repair_started: { label: "Repairing", color: "bg-warning/10 text-warning" },
            in_progress: { label: "In Progress", color: "bg-warning/10 text-warning" },
          };
          const arrivalBookings = bookings.filter(b => b.partner_id && Object.keys(ARRIVAL_LABELS).includes(b.status));
          if (arrivalBookings.length === 0) return null;

          const enRouteCount = arrivalBookings.filter(b => b.status === "tech_en_route").length;
          const arrivedCount = arrivalBookings.filter(b => b.status === "arrived").length;
          const workingCount = arrivalBookings.filter(b => ["inspection_started", "repair_started", "in_progress"].includes(b.status)).length;
          const delayedCount = arrivalBookings.filter(b => {
            if (b.status !== "assigned" || !b.assigned_at) return false;
            const elapsed = (Date.now() - new Date(b.assigned_at).getTime()) / 60000;
            return elapsed > 30;
          }).length;

          return (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Technician Arrivals
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">{arrivalBookings.length} active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-accent/5 rounded-lg border border-accent/10">
                    <p className="text-lg font-bold text-accent">{enRouteCount}</p>
                    <p className="text-[9px] text-muted-foreground">En Route</p>
                  </div>
                  <div className="text-center p-2 bg-success/5 rounded-lg border border-success/10">
                    <p className="text-lg font-bold text-success">{arrivedCount}</p>
                    <p className="text-[9px] text-muted-foreground">Arrived</p>
                  </div>
                  <div className="text-center p-2 bg-warning/5 rounded-lg border border-warning/10">
                    <p className="text-lg font-bold text-warning">{workingCount}</p>
                    <p className="text-[9px] text-muted-foreground">Working</p>
                  </div>
                  <div className="text-center p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                    <p className="text-lg font-bold text-destructive">{delayedCount}</p>
                    <p className="text-[9px] text-muted-foreground">Delayed</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Booking</TableHead>
                      <TableHead className="text-[10px]">Technician</TableHead>
                      <TableHead className="text-[10px]">Zone</TableHead>
                      <TableHead className="text-[10px]">State</TableHead>
                      <TableHead className="text-[10px]">ETA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arrivalBookings.slice(0, 10).map(b => {
                      const state = ARRIVAL_LABELS[b.status] || ARRIVAL_LABELS.assigned;
                      const etaDisplay = b.sla_eta_minutes ? `~${b.sla_eta_minutes}m` : "—";
                      const isDelayed = b.status === "assigned" && b.assigned_at &&
                        (Date.now() - new Date(b.assigned_at).getTime()) / 60000 > 30;
                      return (
                        <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tracker/${b.id}`)}>
                          <TableCell className="text-[10px] font-mono">{b.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-[10px]">{b.partner_id ? (partnerMap[b.partner_id] || b.partner_id.slice(0, 8)) : "—"}</TableCell>
                          <TableCell className="text-[10px]">{zoneLabel(b.zone_code)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] ${isDelayed ? "bg-destructive/10 text-destructive" : state.color}`}>
                              {isDelayed ? "Delayed" : state.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{etaDisplay}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })()}

        {/* ══ 12. QUICK ACTIONS ══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-[11px] h-9" onClick={() => navigate("/ops/pilot-bookings")}>
                <Eye className="w-3 h-3 mr-1" /> Booking Monitor
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-9" onClick={() => navigate("/ops/incidents")}>
                <AlertTriangle className="w-3 h-3 mr-1" /> Incidents
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-9" onClick={() => navigate("/ops/dispatch")}>
                <Zap className="w-3 h-3 mr-1" /> Dispatch Board
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-9" onClick={() => navigate("/ops/partner-readiness")}>
                <Users className="w-3 h-3 mr-1" /> Partner Health
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-9" onClick={() => navigate("/ops/finance")}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Finance Board
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-9" onClick={() => navigate("/ops/ai-intelligence")}>
                <Activity className="w-3 h-3 mr-1" /> AI Intel Hub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
