/**
 * Phase 6+7 — Ops Reliability Hooks
 * Lightweight queries for launch-critical watchpoints.
 * Surfaces: consultation backlog, stuck jobs, settlement exceptions,
 * dispatch escalation backlog, bypass attempts, retention cron health,
 * Phase 7: watchdog cron health, system incidents, alert thresholds.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Thresholds */
const STUCK_THRESHOLD_MIN = 30;
const CONSULTATION_BACKLOG_ALERT = 5;

export interface ReliabilitySummary {
  consultationBacklog: number;
  stuckJobs: number;
  settlementExceptions: number;
  unresolvedEscalations: number;
  bypassAttemptsToday: number;
  retentionCronHealthy: boolean;
  watchdogCronHealthy: boolean;
  recentIncidentsCount: number;
  /** Computed alert flags */
  alerts: {
    stuckJobAlert: boolean;
    consultationBacklogAlert: boolean;
    settlementAlert: boolean;
    escalationAlert: boolean;
    cronAlert: boolean;
  };
  /** Detail rows for drill-down */
  consultationBookings: { id: string; category_code: string; created_at: string; zone_code: string | null }[];
  stuckBookings: { id: string; category_code: string; status: string; created_at: string; minutes_age: number }[];
  missingSettlements: { id: string; category_code: string; completed_at: string | null; partner_id: string | null }[];
  recentIncidents: { id: string; incident_type: string; severity: string; source: string; error_message: string | null; created_at: string }[];
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchReliability(): Promise<ReliabilitySummary> {
  const cutoff = minutesAgo(STUCK_THRESHOLD_MIN);
  const today = todayStart();

  const [
    consultRes,
    stuckRes,
    completedRes,
    escalationRes,
    bypassRes,
    reminderRes,
    watchdogRes,
    incidentRes,
  ] = await Promise.all([
    // 1. Consultation backlog: manual + requested
    supabase
      .from("bookings")
      .select("id, category_code, created_at, zone_code")
      .eq("dispatch_mode", "manual")
      .eq("status", "requested")
      .order("created_at", { ascending: true })
      .limit(50),

    // 2. Stuck jobs: not completed/cancelled, created > 30min ago, still in early states
    supabase
      .from("bookings")
      .select("id, category_code, status, created_at")
      .not("status", "in", '("completed","cancelled")')
      .in("status", ["requested", "matching", "awaiting_partner_confirmation"])
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(50),

    // 3. Settlement exceptions: completed bookings with no settlement row
    supabase
      .from("bookings")
      .select("id, category_code, completed_at, partner_id")
      .eq("status", "completed")
      .not("partner_id", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100),

    // 4. Unresolved escalations
    supabase
      .from("dispatch_escalations")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),

    // 5. Bypass attempts today
    supabase
      .from("bypass_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),

    // 6. Retention cron health: any reminders created today?
    supabase
      .from("customer_reminders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),

    // 7. Watchdog cron health: any watchdog timeline entries today?
    supabase
      .from("job_timeline")
      .select("id", { count: "exact", head: true })
      .in("status", ["watchdog_timeout", "watchdog_retry_dispatch", "watchdog_unstuck"])
      .gte("created_at", today),

    // 8. Recent system incidents (last 24h)
    supabase
      .from("system_incidents" as any)
      .select("id, incident_type, severity, source, error_message, created_at")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString())
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const consultationBookings = (consultRes.data || []) as ReliabilitySummary["consultationBookings"];

  const stuckBookings = (stuckRes.data || []).map((b: any) => ({
    ...b,
    minutes_age: Math.round((Date.now() - new Date(b.created_at).getTime()) / 60_000),
  })) as ReliabilitySummary["stuckBookings"];

  // Settlement exceptions: cross-check completed bookings vs settlements
  let missingSettlements: ReliabilitySummary["missingSettlements"] = [];
  const completedBookings = completedRes.data || [];
  if (completedBookings.length > 0) {
    const ids = completedBookings.map((b: any) => b.id);
    const { data: settlements } = await supabase
      .from("partner_settlements")
      .select("booking_id")
      .in("booking_id", ids);
    const settledIds = new Set((settlements || []).map((s: any) => s.booking_id));
    missingSettlements = completedBookings.filter((b: any) => !settledIds.has(b.id)) as any;
  }

  const recentIncidents = (incidentRes.data || []) as ReliabilitySummary["recentIncidents"];

  // Check if watchdog ran today — if there are bookings in early states,
  // watchdog should have produced timeline entries. If no bookings need recovery,
  // absence of watchdog entries is fine.
  const hasActiveBookings = stuckBookings.length > 0;
  const watchdogRanToday = (watchdogRes.count ?? 0) > 0;
  // Watchdog is "healthy" if it ran or there's nothing to recover
  const watchdogCronHealthy = watchdogRanToday || !hasActiveBookings;

  const consultationBacklog = consultationBookings.length;
  const stuckJobs = stuckBookings.length;
  const settlementExceptions = missingSettlements.length;
  const unresolvedEscalations = escalationRes.count ?? 0;

  return {
    consultationBacklog,
    stuckJobs,
    settlementExceptions,
    unresolvedEscalations,
    bypassAttemptsToday: bypassRes.count ?? 0,
    retentionCronHealthy: (reminderRes.count ?? 0) > 0,
    watchdogCronHealthy,
    recentIncidentsCount: recentIncidents.length,
    alerts: {
      stuckJobAlert: stuckJobs > 0,
      consultationBacklogAlert: consultationBacklog > CONSULTATION_BACKLOG_ALERT,
      settlementAlert: settlementExceptions > 0,
      escalationAlert: unresolvedEscalations > 0,
      cronAlert: !watchdogCronHealthy || (reminderRes.count ?? 0) === 0,
    },
    consultationBookings,
    stuckBookings,
    missingSettlements,
    recentIncidents,
  };
}

export function useOpsReliability() {
  return useQuery({
    queryKey: ["ops-reliability"],
    queryFn: fetchReliability,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
