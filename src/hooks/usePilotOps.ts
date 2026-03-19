/**
 * Phase 3+ — Smart Pilot Operations Hook
 * Scalable data layer with category/zone filters, archetype-aware stuck detection,
 * recommended action resolution, and REAL enriched booking context.
 *
 * ENRICHMENT STRATEGY:
 * - Stuck bookings are fetched with real fields: under_mediation, payment_status, payment_method
 * - Supplementary data (quotes, ratings, escalations, support cases) is batch-fetched
 *   per stuck-booking set and joined client-side by booking_id
 * - This avoids N+1 queries while providing real signals for the action matrix
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStuckThreshold, resolveRecommendedAction, type RecommendedAction, type BookingActionContext } from "@/engines/interventionEngine";

/* ── Filter Model ── */
export interface OpsFilters {
  category?: string;
  zone?: string;
  dateRange: "today" | "week" | "month";
  severity?: "all" | "warning" | "critical";
}

/* ── Enriched Stuck Booking — carries REAL context signals ── */
export type StuckBooking = {
  id: string;
  status: string;
  category_code: string;
  zone_code: string | null;
  partner_id: string | null;
  created_at: string;
  payment_method: string | null;
  payment_status: string | null;       // SOURCE: bookings.payment_status (real DB field)
  under_mediation: boolean;             // SOURCE: bookings.under_mediation (real DB flag)
  has_quote: boolean;                   // SOURCE: quotes table lookup by booking_id
  quote_status: string | null;          // SOURCE: most recent quote status for this booking
  rating: number | null;                // SOURCE: ratings table lookup by booking_id
  low_rating: boolean;                  // SOURCE: rating < 3 from real ratings data
  escalation_exists: boolean;           // SOURCE: unresolved dispatch_escalations by booking_id
  support_case_open: boolean;           // SOURCE: unresolved support_cases by booking_id
  minutes_stuck: number;
  stuck_reason: string;
  severity: "warning" | "critical";
  recommended: RecommendedAction;
};

/**
 * Builds a BookingActionContext from real StuckBooking data.
 * This is the SINGLE SOURCE for dialog context — no inline heuristics.
 *
 * FALLBACK POLICY:
 * - underMediation: true if booking.under_mediation OR open support case exists
 * - escalationExists: true if unresolved dispatch_escalation exists for this booking
 * - lowRating: true only if a real rating < 3 exists in ratings table
 * - hasQuote: true only if quotes table has a record for this booking
 * - paymentStatus/Method: direct from booking fields, null if unavailable
 * - hasPartner: direct from booking.partner_id
 */
export function buildBookingActionContext(b: StuckBooking): BookingActionContext {
  return {
    hasPartner: !!b.partner_id,
    hasQuote: b.has_quote,
    paymentStatus: b.payment_status,
    paymentMethod: b.payment_method,
    lowRating: b.low_rating,
    // Escalation: real unresolved escalation record takes precedence
    escalationExists: b.escalation_exists,
    // Mediation: true if booking flag is set OR an open support case exists
    // This dual-source approach ensures mediation-safe actions even if only
    // one system has been updated (booking flag vs support case)
    underMediation: b.under_mediation || b.support_case_open,
  };
}

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
  reassignment_count: number;
  low_rating_count: number;
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
  stuckCount: number;
  lowRatedCount: number;
}

function rangeStart(range: "today" | "week" | "month"): string {
  const d = new Date();
  if (range === "week") d.setDate(d.getDate() - 7);
  else if (range === "month") d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchPilotDaySummary(filters: OpsFilters): Promise<PilotDaySummary> {
  const since = rangeStart(filters.dateRange);

  // Build booking query with filters
  let bookingQ = supabase.from("bookings")
    .select("id, status, category_code, zone_code, partner_id, created_at, dispatch_status, payment_status, payment_method, completed_at")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(500);

  if (filters.category) bookingQ = bookingQ.eq("category_code", filters.category);
  if (filters.zone) bookingQ = bookingQ.eq("zone_code", filters.zone);

  let offersQ = supabase.from("dispatch_offers").select("id, status, booking_id").gte("created_at", since).eq("status", "pending");
  let escalQ = supabase.from("dispatch_escalations").select("id, booking_id, reason, created_at").gte("created_at", since).is("resolved_at", null);

  const [bRes, offersRes, quotesRes, ratingsRes, escalRes] = await Promise.all([
    bookingQ,
    offersQ,
    supabase.from("quotes").select("id, booking_id, status").gte("created_at", since),
    supabase.from("ratings").select("id, booking_id, rating").gte("created_at", since).lt("rating", 3),
    escalQ,
  ]);

  const bookings = bRes.data || [];
  const created = bookings.length;
  const unassigned = bookings.filter(b => !b.partner_id && !["completed", "cancelled"].includes(b.status)).length;
  const pendingPartnerResponse = (offersRes.data || []).length;
  const pendingQuoteApproval = (quotesRes.data || []).filter((q: any) => q.status === "submitted" || q.status === "pending").length;
  const activeInProgress = bookings.filter(b => ["in_progress", "assigned", "tech_en_route", "repair_started"].includes(b.status)).length;
  const completedToday = bookings.filter(b => b.status === "completed").length;
  const cancelledToday = bookings.filter(b => b.status === "cancelled").length;
  const paymentPending = bookings.filter(b => b.status === "completed" && b.payment_status !== "paid").length;
  const lowRated = (ratingsRes.data || []).length;
  const escalations = (escalRes.data || []).length;

  // ── STUCK DETECTION with REAL ENRICHMENT ──
  // Fetch active bookings with real fields including under_mediation
  let activeQ = supabase.from("bookings")
    .select("id, status, category_code, zone_code, partner_id, created_at, payment_method, payment_status, under_mediation")
    .not("status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: true }).limit(300);

  if (filters.category) activeQ = activeQ.eq("category_code", filters.category);
  if (filters.zone) activeQ = activeQ.eq("zone_code", filters.zone);

  const { data: allActive } = await activeQ;

  // Identify stuck bookings first (before enrichment queries)
  const stuckRaw: Array<{ booking: typeof allActive extends (infer T)[] | null ? T : never; ageMin: number; severity: "warning" | "critical"; threshold: number }> = [];
  const now = Date.now();
  for (const b of (allActive || [])) {
    const ageMin = Math.round((now - new Date(b.created_at).getTime()) / 60000);
    const threshold = getStuckThreshold(b.status, b.category_code, b.payment_method);
    if (threshold > 0 && ageMin > threshold) {
      const severity: "warning" | "critical" = ageMin > threshold * 2 ? "critical" : "warning";
      if (filters.severity && filters.severity !== "all" && filters.severity !== severity) continue;
      stuckRaw.push({ booking: b, ageMin, severity, threshold });
    }
  }

  // Batch-fetch enrichment data for stuck booking IDs only (lightweight)
  const stuckIds = stuckRaw.map(s => s.booking.id);
  let quotesMap: Record<string, { has: boolean; status: string | null }> = {};
  let ratingsMap: Record<string, { rating: number; low: boolean }> = {};
  let escalMap: Record<string, boolean> = {};
  let supportMap: Record<string, boolean> = {};

  if (stuckIds.length > 0) {
    // Batch fetch: quotes, ratings, escalations, support cases for stuck bookings
    const [qRes, rRes, eRes, sRes] = await Promise.all([
      supabase.from("quotes").select("booking_id, status").in("booking_id", stuckIds),
      supabase.from("ratings").select("booking_id, rating").in("booking_id", stuckIds),
      supabase.from("dispatch_escalations").select("booking_id").in("booking_id", stuckIds).is("resolved_at", null),
      supabase.from("support_cases").select("booking_id").in("booking_id", stuckIds).is("resolved_at", null),
    ]);

    // Build quote map — use most recent non-draft status per booking
    for (const q of (qRes.data || []) as any[]) {
      const existing = quotesMap[q.booking_id];
      if (!existing || q.status !== "draft") {
        quotesMap[q.booking_id] = { has: true, status: q.status };
      }
    }

    // Build ratings map — use lowest rating per booking (worst signal)
    for (const r of (rRes.data || []) as any[]) {
      const existing = ratingsMap[r.booking_id];
      if (!existing || r.rating < existing.rating) {
        ratingsMap[r.booking_id] = { rating: r.rating, low: r.rating < 3 };
      }
    }

    // Build escalation map — any unresolved escalation = true
    for (const e of (eRes.data || [])) {
      if (e.booking_id) escalMap[e.booking_id] = true;
    }

    // Build support case map — any open support case = true
    for (const s of (sRes.data || [])) {
      if (s.booking_id) supportMap[s.booking_id] = true;
    }
  }

  // Assemble enriched stuck bookings
  const stuckBookings: StuckBooking[] = stuckRaw.map(({ booking: b, ageMin, severity, threshold }) => {
    const quoteInfo = quotesMap[b.id];
    const ratingInfo = ratingsMap[b.id];
    const hasEscalation = !!escalMap[b.id];
    const hasSupportCase = !!supportMap[b.id];
    const isLowRated = ratingInfo?.low ?? false;
    const isUnderMediation = !!(b.under_mediation) || hasSupportCase;

    const recommended = resolveRecommendedAction(
      b.status, ageMin, severity, b.category_code,
      !!b.partner_id, b.payment_method,
      ratingInfo?.rating ?? null
    );

    return {
      id: b.id,
      status: b.status,
      category_code: b.category_code,
      zone_code: b.zone_code,
      partner_id: b.partner_id,
      created_at: b.created_at,
      payment_method: b.payment_method,
      payment_status: b.payment_status as string | null,
      under_mediation: isUnderMediation,
      has_quote: quoteInfo?.has ?? false,
      quote_status: quoteInfo?.status ?? null,
      rating: ratingInfo?.rating ?? null,
      low_rating: isLowRated,
      escalation_exists: hasEscalation,
      support_case_open: hasSupportCase,
      minutes_stuck: ageMin,
      stuck_reason: `${b.status} for ${ageMin}min (threshold: ${threshold}min for ${b.category_code})`,
      severity,
      recommended,
    };
  });

  // Sort stuck bookings: critical first, then by age descending
  stuckBookings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return b.minutes_stuck - a.minutes_stuck;
  });

  return {
    created, unassigned, pendingPartnerResponse, pendingQuoteApproval,
    activeInProgress, completedToday, cancelledToday, paymentPending,
    lowRated, escalations, stuckBookings,
  };
}

async function fetchPartnerSLA(filters: OpsFilters): Promise<PartnerSLA[]> {
  const since = rangeStart(filters.dateRange === "today" ? "week" : filters.dateRange);

  let offersQ = supabase.from("dispatch_offers")
    .select("partner_id, status, response_time_ms, created_at")
    .gte("created_at", since);
  if (filters.category) offersQ = offersQ.eq("category_code", filters.category);

  const [offersRes, partnersRes, ratingsRes] = await Promise.all([
    offersQ,
    supabase.from("partners").select("id, full_name"),
    supabase.from("ratings").select("partner_id, rating").gte("created_at", since).lt("rating", 3),
  ]);

  const nameMap: Record<string, string> = {};
  (partnersRes.data || []).forEach(p => { nameMap[p.id] = p.full_name; });

  const lowRatings: Record<string, number> = {};
  ((ratingsRes.data || []) as any[]).forEach(r => {
    lowRatings[r.partner_id] = (lowRatings[r.partner_id] || 0) + 1;
  });

  const grouped: Record<string, { accepted: number; declined: number; expired: number; total: number; responseTimes: number[]; reassignments: number }> = {};
  for (const o of (offersRes.data || [])) {
    if (!grouped[o.partner_id]) grouped[o.partner_id] = { accepted: 0, declined: 0, expired: 0, total: 0, responseTimes: [], reassignments: 0 };
    const g = grouped[o.partner_id];
    g.total++;
    if (o.status === "accepted") g.accepted++;
    else if (o.status === "declined") g.declined++;
    else if (o.status === "expired" || o.status === "expired_by_accept") { g.expired++; g.reassignments++; }
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
    reassignment_count: g.reassignments,
    low_rating_count: lowRatings[pid] || 0,
  }));
}

async function fetchPilotKPIs(filters: OpsFilters): Promise<PilotKPIs> {
  const since = rangeStart(filters.dateRange);
  const days = filters.dateRange === "today" ? 1 : filters.dateRange === "week" ? 7 : 30;

  let bQ = supabase.from("bookings").select("id, status, payment_status, created_at, completed_at, assigned_at, partner_id").gte("created_at", since);
  if (filters.category) bQ = bQ.eq("category_code", filters.category);
  if (filters.zone) bQ = bQ.eq("zone_code", filters.zone);

  const [bRes, offersRes, quotesRes, ratingsRes, escalRes] = await Promise.all([
    bQ,
    supabase.from("dispatch_offers").select("id, status, response_time_ms").gte("created_at", since),
    supabase.from("quotes" as any).select("id, status").gte("created_at", since),
    supabase.from("ratings" as any).select("id, rating").gte("created_at", since),
    supabase.from("dispatch_escalations").select("id").gte("created_at", since).is("resolved_at", null),
  ]);

  const bookings = bRes.data || [];
  const offers = offersRes.data || [];
  const quotes = (quotesRes.data || []) as any[];
  const ratings = (ratingsRes.data || []) as any[];

  const completed = bookings.filter(b => b.status === "completed");
  const assigned = bookings.filter(b => b.partner_id || b.status === "completed" || b.status === "assigned");
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
  const lowRatedCount = ratings.filter((r: any) => r.rating < 3).length;

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
    stuckCount: 0, // Filled by panel from summary
    lowRatedCount,
  };
}

export function usePilotDaySummary(filters: OpsFilters) {
  return useQuery({
    queryKey: ["pilot-day-summary", filters],
    queryFn: () => fetchPilotDaySummary(filters),
    staleTime: 15_000, refetchInterval: 30_000,
  });
}

export function usePartnerSLA(filters: OpsFilters) {
  return useQuery({
    queryKey: ["partner-sla", filters],
    queryFn: () => fetchPartnerSLA(filters),
    staleTime: 60_000, refetchInterval: 60_000,
  });
}

export function usePilotKPIs(filters: OpsFilters) {
  return useQuery({
    queryKey: ["pilot-kpis", filters],
    queryFn: () => fetchPilotKPIs(filters),
    staleTime: 60_000, refetchInterval: 60_000,
  });
}
