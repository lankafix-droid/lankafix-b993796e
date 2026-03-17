/**
 * SLA Breach Read Model — Identifies bookings exceeding SLA windows.
 * Read-only, advisory. Does not mutate state.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SLABreachItem {
  bookingId: string;
  stage: string;
  elapsedMinutes: number;
  expectedSlaMinutes: number;
  severity: "warning" | "high" | "critical";
  recommendedAction: string;
}

const SLA_WINDOWS: Record<string, { minutes: number; action: string }> = {
  requested: { minutes: 30, action: "Expedite dispatch" },
  dispatching: { minutes: 20, action: "Check partner availability" },
  pending_acceptance: { minutes: 15, action: "Escalate to manual assignment" },
  no_provider_found: { minutes: 45, action: "Senior operator review" },
  escalated: { minutes: 60, action: "Priority resolution needed" },
  quote_pending: { minutes: 120, action: "Follow up on quote" },
  quote_sent: { minutes: 240, action: "Remind customer to approve" },
  in_progress: { minutes: 480, action: "Check technician progress" },
  completed: { minutes: 1440, action: "Confirm completion with customer" },
};

function getSeverity(elapsed: number, expected: number): "warning" | "high" | "critical" {
  const ratio = elapsed / expected;
  if (ratio >= 3) return "critical";
  if (ratio >= 2) return "high";
  return "warning";
}

export async function fetchSLABreaches(): Promise<SLABreachItem[]> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, dispatch_status, updated_at, under_mediation")
    .not("status", "in", '("completed","cancelled")')
    .order("updated_at", { ascending: true })
    .limit(200);

  if (!bookings?.length) return [];

  const breaches: SLABreachItem[] = [];

  for (const b of bookings as any[]) {
    const stage = b.dispatch_status || b.status;
    const sla = SLA_WINDOWS[stage];
    if (!sla) continue;

    const elapsed = (Date.now() - new Date(b.updated_at).getTime()) / 60_000;
    if (elapsed > sla.minutes) {
      breaches.push({
        bookingId: b.id,
        stage,
        elapsedMinutes: Math.round(elapsed),
        expectedSlaMinutes: sla.minutes,
        severity: getSeverity(elapsed, sla.minutes),
        recommendedAction: b.under_mediation ? "Dispute in progress — await mediation" : sla.action,
      });
    }
  }

  return breaches.sort((a, b) => {
    const sev = { critical: 0, high: 1, warning: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

export async function fetchTodayReminderMetrics() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const iso = todayStart.toISOString();

  const [sent, failed, suppressed] = await Promise.all([
    supabase.from("reminder_send_logs" as any).select("id", { count: "exact", head: true }).eq("outcome", "sent").gte("created_at", iso),
    supabase.from("reminder_send_logs" as any).select("id", { count: "exact", head: true }).eq("outcome", "failed").gte("created_at", iso),
    supabase.from("reminder_send_logs" as any).select("id", { count: "exact", head: true }).eq("outcome", "suppressed").gte("created_at", iso),
  ]);

  return { sentToday: sent.count || 0, failedToday: failed.count || 0, suppressedToday: suppressed.count || 0 };
}

export async function fetchChannelDeliveryMetrics() {
  const { data } = await supabase
    .from("reminder_send_logs" as any)
    .select("channel, outcome")
    .order("created_at", { ascending: false })
    .limit(200);

  const metrics: Record<string, { sent: number; failed: number; total: number }> = {};
  for (const row of (data || []) as any[]) {
    if (!metrics[row.channel]) metrics[row.channel] = { sent: 0, failed: 0, total: 0 };
    metrics[row.channel].total++;
    if (row.outcome === "sent") metrics[row.channel].sent++;
    if (row.outcome === "failed") metrics[row.channel].failed++;
  }
  return metrics;
}

export async function fetchBookingDeliveryHistory(bookingId: string) {
  const { data } = await supabase
    .from("reminder_send_logs" as any)
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(30);
  return data || [];
}

export async function fetchReminderEscalationSummary() {
  const { data } = await supabase
    .from("operator_callback_tasks" as any)
    .select("id, created_from_reminder_key, status")
    .not("created_from_reminder_key", "is", null)
    .limit(100);

  const tasks = (data || []) as any[];
  return {
    total: tasks.length,
    open: tasks.filter(t => t.status === "open" || t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };
}
