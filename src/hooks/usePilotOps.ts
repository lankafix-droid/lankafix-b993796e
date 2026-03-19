/**
 * Phase 3 — Pilot Operations Hook
 * Central data layer for Colombo Mobile Repairs pilot ops dashboard.
 * Fetches live booking counts, stuck detection, partner SLA, and daily KPIs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Stuck-state thresholds (minutes) ── */
const STUCK_THRESHOLDS: Record<string, number> = {
  requested: 30,
  matching: 20,
  awaiting_partner_confirmation: 15,
  assigned: 60,
  quote_submitted: 120,
  in_progress: 480,
  payment_pending: 1440,
};

export type StuckBooking = {
  id: string;
  status: string;
  category_code: string;
  partner_id: string | null;
  created_at: string;
  minutes_stuck: number;
  stuck_reason: string;
  severity: "warning" | "critical";
};

export interface PilotDaySummary {
  created: number;
  unassigned: number;
  pendingPartnerResponse: number;
  pendingQuoteApproval: number;
  activeInProgress: number;
  completedToday: number;
  cancelledToday: number;
  paymentPending: number;
  lowRated: number;
  escalations: number;
  stuckBookings: StuckBooking[];
}

export interface PartnerSLA {
  partner_id: string;
  partner_name: string;
  offers_received: number;
  offers_accepted: number;
  offers_declined: number;
  offers_expired: number;
  acceptance_rate: number;
  avg_response_time_sec: number | null;
}

export interface PilotKPIs {
  bookingsPerDay: number;
  assignmentSuccessRate: number;
  avgResponseTimeSec: number | null;
  quoteApprovalRate: number;
  completionRate: number;
  avgCompletionTimeHrs: number | null;
  paymentCollectionRate: number;
  ratingAverage: number | null;
  escalationCount: number;
}

function todayStart(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function weekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d.toISOString();
}

async function fetchPilotDaySummary(): Promise<PilotDaySummary> {
  const today = todayStart();

  const [bRes, offersRes, quotesRes, ratingsRes, escalRes] = await Promise.all([
    supabase.from("bookings").select("id, status, category_code, partner_id, created_at, dispatch_status, payment_status, completed_at")
      .gte("created_at", today).order("created_at", { ascending: false }).limit(500),
    supabase.from("dispatch_offers").select("id, status, booking_id").gte("created_at", today).eq("status", "pending"),
    supabase.from("quotes" as any).select("id, booking_id, status").gte("created_at", today),
    supabase.from("ratings" as any).select("id, booking_id, rating").gte("created_at", today).lt("rating", 3),
    supabase.from("dispatch_escalations").select("id").gte("created_at", today).is("resolved_at", null),
  ]);

  const bookings = bRes.data || [];
  const created = bookings.length;
  const unassigned = bookings.filter(b => !b.partner_id && !["completed", "cancelled"].includes(b.status)).length;
  const pendingPartnerResponse = (offersRes.data || []).length;
  const pendingQuoteApproval = ((quotesRes.data || []) as any[]).filter(q => q.status === "submitted" || q.status === "pending").length;
  const activeInProgress = bookings.filter(b => ["in_progress", "assigned", "tech_en_route", "repair_started"].includes(b.status)).length;
  const completedToday = bookings.filter(b => b.status === "completed").length;
  const cancelledToday = bookings.filter(b => b.status === "cancelled").length;
  const paymentPending = bookings.filter(b => b.status === "completed" && b.payment_status !== "paid").length;
  const lowRated = (ratingsRes.data || []).length;
  const escalations = escalRes.count ?? (escalRes.data || []).length;

  // Stuck detection — scan ALL bookings not just today
  const { data: allActive } = await supabase.from("bookings")
    .select("id, status, category_code, partner_id, created_at")
    .not("status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: true }).limit(200);

  const stuckBookings: StuckBooking[] = [];
  const now = Date.now();
  for (const b of (allActive || [])) {
    const ageMin = Math.round((now - new Date(b.created_at).getTime()) / 60000);
    const threshold = STUCK_THRESHOLDS[b.status];
    if (threshold && ageMin > threshold) {
      stuckBookings.push({
        id: b.id,
        status: b.status,
        category_code: b.category_code,
        partner_id: b.partner_id,
        created_at: b.created_at,
        minutes_stuck: ageMin,
        stuck_reason: `${b.status} for ${ageMin}min (threshold: ${threshold}min)`,
        severity: ageMin > threshold * 2 ? "critical" : "warning",
      });
    }
  }

  return {
    created, unassigned, pendingPartnerResponse, pendingQuoteApproval,
    activeInProgress, completedToday, cancelledToday, paymentPending,
    lowRated, escalations, stuckBookings,
  };
}

async function fetchPartnerSLA(): Promise<PartnerSLA[]> {
  const since = weekStart();
  const { data: offers } = await supabase.from("dispatch_offers")
    .select("partner_id, status, response_time_ms, created_at")
    .gte("created_at", since);
  const { data: partners } = await supabase.from("partners").select("id, full_name");

  const nameMap: Record<string, string> = {};
  (partners || []).forEach(p => { nameMap[p.id] = p.full_name; });

  const grouped: Record<string, { accepted: number; declined: number; expired: number; total: number; responseTimes: number[] }> = {};
  for (const o of (offers || [])) {
    if (!grouped[o.partner_id]) grouped[o.partner_id] = { accepted: 0, declined: 0, expired: 0, total: 0, responseTimes: [] };
    const g = grouped[o.partner_id];
    g.total++;
    if (o.status === "accepted") g.accepted++;
    else if (o.status === "declined") g.declined++;
    else if (o.status === "expired" || o.status === "expired_by_accept") g.expired++;
    if (o.response_time_ms) g.responseTimes.push(o.response_time_ms / 1000);
  }

  return Object.entries(grouped).map(([pid, g]) => ({
    partner_id: pid,
    partner_name: nameMap[pid] || pid.slice(0, 8),
    offers_received: g.total,
    offers_accepted: g.accepted,
    offers_declined: g.declined,
    offers_expired: g.expired,
    acceptance_rate: g.total > 0 ? Math.round((g.accepted / g.total) * 100) : 0,
    avg_response_time_sec: g.responseTimes.length > 0 ? Math.round(g.responseTimes.reduce((a, b) => a + b, 0) / g.responseTimes.length) : null,
  }));
}

async function fetchPilotKPIs(): Promise<PilotKPIs> {
  const since = weekStart();

  const [bRes, offersRes, quotesRes, ratingsRes, escalRes] = await Promise.all([
    supabase.from("bookings").select("id, status, payment_status, created_at, completed_at, assigned_at").gte("created_at", since),
    supabase.from("dispatch_offers").select("id, status, response_time_ms").gte("created_at", since),
    supabase.from("quotes" as any).select("id, status").gte("created_at", since),
    supabase.from("ratings" as any).select("id, rating").gte("created_at", since),
    supabase.from("dispatch_escalations").select("id").gte("created_at", since).is("resolved_at", null),
  ]);

  const bookings = bRes.data || [];
  const offers = offersRes.data || [];
  const quotes = (quotesRes.data || []) as any[];
  const ratings = (ratingsRes.data || []) as any[];
  const days = 7;

  const completed = bookings.filter(b => b.status === "completed");
  const assigned = bookings.filter(b => (b as any).partner_id || b.status === "completed" || b.status === "assigned");

  const responseTimes = offers.filter(o => o.response_time_ms).map(o => o.response_time_ms! / 1000);
  const avgResponse = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

  const approved = quotes.filter(q => q.status === "approved" || q.status === "accepted").length;
  const totalQuotes = quotes.filter(q => q.status !== "draft").length;

  const completionTimes = completed.filter(b => b.completed_at && b.created_at).map(b =>
    (new Date(b.completed_at!).getTime() - new Date(b.created_at).getTime()) / 3600000
  );
  const avgCompletion = completionTimes.length > 0 ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10 : null;

  const paid = completed.filter(b => b.payment_status === "paid").length;
  const ratingAvg = ratings.length > 0 ? Math.round(ratings.reduce((a: number, r: any) => a + r.rating, 0) / ratings.length * 10) / 10 : null;

  return {
    bookingsPerDay: Math.round(bookings.length / days * 10) / 10,
    assignmentSuccessRate: bookings.length > 0 ? Math.round((assigned.length / bookings.length) * 100) : 0,
    avgResponseTimeSec: avgResponse,
    quoteApprovalRate: totalQuotes > 0 ? Math.round((approved / totalQuotes) * 100) : 0,
    completionRate: bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0,
    avgCompletionTimeHrs: avgCompletion,
    paymentCollectionRate: completed.length > 0 ? Math.round((paid / completed.length) * 100) : 0,
    ratingAverage: ratingAvg,
    escalationCount: (escalRes.data || []).length,
  };
}

export function usePilotDaySummary() {
  return useQuery({ queryKey: ["pilot-day-summary"], queryFn: fetchPilotDaySummary, staleTime: 15_000, refetchInterval: 30_000 });
}

export function usePartnerSLA() {
  return useQuery({ queryKey: ["partner-sla"], queryFn: fetchPartnerSLA, staleTime: 60_000, refetchInterval: 60_000 });
}

export function usePilotKPIs() {
  return useQuery({ queryKey: ["pilot-kpis"], queryFn: fetchPilotKPIs, staleTime: 60_000, refetchInterval: 60_000 });
}
