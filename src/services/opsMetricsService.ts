/**
 * Ops Metrics Service — Phase 5C
 * 
 * Provides real-time core KPIs from Supabase for ops dashboards.
 * Internal-only: never expose to customer or partner APIs.
 * 
 * Caching: 30s staleTime via react-query.
 * Performance: select only needed columns, no large joins, limit scoped queries.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpsMetricsFilters {
  /** ISO date string — defaults to start of today */
  dateFrom?: string;
  /** ISO date string — defaults to now */
  dateTo?: string;
  zone?: string;
  category?: string;
}

export interface OpsMetrics {
  active_bookings: number;
  bookings_today: number;
  avg_dispatch_time_min: number | null;
  dispatch_failures: number;
  dispatch_escalations: number;
  quotes_pending_approval: number;
  jobs_in_progress: number;
  completed_today: number;
  payments_today_lkr: number;
  payments_today_count: number;
  fraud_alerts_today: number;
  /** Phase 8: Soft launch ops metrics */
  dispatch_success_rate: number | null;
  avg_partner_response_sec: number | null;
  jobs_awaiting_partner: number;
  consultation_queue: number;
  /** Pilot launch ops metrics */
  payments_failed: number;
  technician_cancelled: number;
  technician_late: number;
  partners_flagged: number;
  quotes_stale: number;
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchOpsMetrics(filters: OpsMetricsFilters = {}): Promise<OpsMetrics> {
  const from = filters.dateFrom || todayStart();
  const to = filters.dateTo || new Date().toISOString();

  // Build all queries in parallel — each is lightweight with minimal columns
  const [
    activeRes,
    todayRes,
    dispatchTimeRes,
    failuresRes,
    escalationsRes,
    quotesRes,
    inProgressRes,
    completedRes,
    paymentsRes,
    fraudRes,
    // Phase 8
    dispatchedTodayRes,
    awaitingPartnerRes,
    consultationQueueRes,
    // Pilot launch
    paymentFailedRes,
    techCancelledRes,
    techLateRes,
    partnersFlaggedRes,
    staleQuotesRes,
  ] = await Promise.all([
    // 1. Active bookings (not completed/cancelled)
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("completed","cancelled")');
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 2. Bookings created today
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lte("created_at", to);
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 3. Average dispatch time (from dispatch_log responses today)
    (() => {
      let q = supabase
        .from("dispatch_log")
        .select("response_time_seconds")
        .gte("created_at", from)
        .not("response_time_seconds", "is", null)
        .limit(500);
      return q;
    })(),

    // 4. Dispatch failures today (dispatch_status = escalated or no_provider_found)
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("dispatch_status", ["escalated", "no_provider_found"])
        .gte("created_at", from)
        .lte("created_at", to);
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 5. Unresolved escalations
    supabase
      .from("dispatch_escalations")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),

    // 6. Quotes pending approval
    (() => {
      let q = supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted");
      return q;
    })(),

    // 7. Jobs in progress (active work states)
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("status", ["repair_started", "inspection_started", "tech_en_route", "arrived"]);
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 8. Completed today
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", from)
        .lte("completed_at", to);
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 9. Payments today
    (() => {
      let q = supabase
        .from("payments")
        .select("amount_lkr")
        .eq("payment_status", "paid")
        .gte("paid_at", from)
        .lte("paid_at", to)
        .limit(500);
      return q;
    })(),

    // 10. Fraud alerts (bypass attempts today)
    supabase
      .from("bypass_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", from)
      .lte("created_at", to),

    // 11. Phase 8: Total dispatched today (auto dispatch bookings created today)
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("dispatch_mode", "auto")
        .gte("created_at", from)
        .lte("created_at", to);
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 12. Phase 8: Jobs awaiting partner (pending_acceptance or dispatching)
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("dispatch_status", ["pending_acceptance", "dispatching", "pending"])
        .not("status", "in", '("completed","cancelled")')
        .eq("dispatch_mode", "auto");
      if (filters.zone) q = q.eq("zone_code", filters.zone);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q;
    })(),

    // 13. Phase 8: Consultation queue (manual dispatch + requested)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("dispatch_mode", "manual")
      .eq("status", "requested"),

    // 14. Pilot: Payment failures
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "failed"),

    // 15. Pilot: Technician cancelled bookings today
    (() => {
      let q = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled")
        .eq("cancellation_reason", "technician_cancelled")
        .gte("cancelled_at", from);
      return q;
    })(),

    // 16. Pilot: Technician late (SLA breached, still active)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("sla_breached", true)
      .not("status", "in", '("completed","cancelled")'),

    // 17. Pilot: Partners flagged (rating < 3.5 OR acceptance < 60)
    supabase
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .or("rating_average.lt.3.5,acceptance_rate.lt.60"),

    // 18. Pilot: Stale quotes (submitted > 30 min ago, not approved/rejected)
    (() => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      return supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .lt("submitted_at", thirtyMinAgo);
    })(),
  ]);

  // Compute avg dispatch time from response_time_seconds
  let avgDispatch: number | null = null;
  if (dispatchTimeRes.data && dispatchTimeRes.data.length > 0) {
    const total = dispatchTimeRes.data.reduce(
      (sum: number, r: any) => sum + (r.response_time_seconds || 0),
      0
    );
    avgDispatch = Math.round(total / dispatchTimeRes.data.length / 60 * 10) / 10; // minutes
  }

  // Sum payments
  const paymentRows = paymentsRes.data || [];
  const paymentsTotal = paymentRows.reduce((sum: number, r: any) => sum + (r.amount_lkr || 0), 0);

  // Phase 8: Dispatch success rate
  const dispatchedTotal = dispatchedTodayRes.count ?? 0;
  const failuresTotal = failuresRes.count ?? 0;
  const dispatchSuccessRate = dispatchedTotal > 0
    ? Math.round(((dispatchedTotal - failuresTotal) / dispatchedTotal) * 100)
    : null;

  // Phase 8: Avg partner response time (seconds)
  const dispatchRows = dispatchTimeRes.data || [];
  let avgPartnerResponseSec: number | null = null;
  if (dispatchRows.length > 0) {
    const totalSec = dispatchRows.reduce((sum: number, r: any) => sum + (r.response_time_seconds || 0), 0);
    avgPartnerResponseSec = Math.round(totalSec / dispatchRows.length);
  }

  // Destructure pilot metrics
  const [paymentFailedRes, techCancelledRes, techLateRes, partnersFlaggedRes, staleQuotesRes] = [
    results[13], results[14], results[15], results[16], results[17],
  ];

  return {
    active_bookings: activeRes.count ?? 0,
    bookings_today: todayRes.count ?? 0,
    avg_dispatch_time_min: avgDispatch,
    dispatch_failures: failuresTotal,
    dispatch_escalations: escalationsRes.count ?? 0,
    quotes_pending_approval: quotesRes.count ?? 0,
    jobs_in_progress: inProgressRes.count ?? 0,
    completed_today: completedRes.count ?? 0,
    payments_today_lkr: paymentsTotal,
    payments_today_count: paymentRows.length,
    fraud_alerts_today: fraudRes.count ?? 0,
    dispatch_success_rate: dispatchSuccessRate,
    avg_partner_response_sec: avgPartnerResponseSec,
    jobs_awaiting_partner: awaitingPartnerRes.count ?? 0,
    consultation_queue: consultationQueueRes.count ?? 0,
    payments_failed: paymentFailedRes?.count ?? 0,
    technician_cancelled: techCancelledRes?.count ?? 0,
    technician_late: techLateRes?.count ?? 0,
    partners_flagged: partnersFlaggedRes?.count ?? 0,
    quotes_stale: staleQuotesRes?.count ?? 0,
  };
}

/**
 * React Query hook for ops metrics.
 * 30-second stale time for performance. Auto-refetches every 30s.
 */
export function useOpsMetrics(filters: OpsMetricsFilters = {}) {
  return useQuery({
    queryKey: ["ops-metrics", filters],
    queryFn: () => fetchOpsMetrics(filters),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
