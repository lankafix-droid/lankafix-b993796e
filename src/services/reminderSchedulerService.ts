/**
 * Reminder Scheduler Service — Foundation for batch reminder processing.
 * Evaluates bookings and persists job candidates.
 * Does NOT auto-send. Creates pending jobs for review/delivery.
 */

import { supabase } from "@/integrations/supabase/client";
import { evaluateBatch, type BookingSnapshot } from "@/lib/reminderBatchEvaluator";
import { processEscalations } from "@/lib/reminderEscalationBridge";
import { computeReminderStates } from "@/lib/bookingReminderState";
import { mapBookingStatusToStage } from "@/lib/bookingLifecycleModel";

/** Fetch active bookings and evaluate for reminders */
export async function evaluateActiveBookings(): Promise<{
  processed: number;
  jobsCreated: number;
  escalations: number;
}> {
  // Fetch active bookings (not completed/cancelled)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, dispatch_status, updated_at, under_mediation")
    .not("status", "in", '("completed","cancelled")')
    .neq("booking_source", "pilot_simulation")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!bookings?.length) return { processed: 0, jobsCreated: 0, escalations: 0 };

  const snapshots: BookingSnapshot[] = bookings.map((b: any) => ({
    id: b.id,
    stage: mapBookingStatusToStage(b.status, b.dispatch_status),
    stageEnteredAt: b.updated_at,
    status: b.status,
    dispatchStatus: b.dispatch_status,
    hasActiveDispute: b.under_mediation || false,
    hasActiveSupportCase: false,
    isEscalated: b.dispatch_status === "escalated",
    operatorContactedRecently: false,
  }));

  const results = evaluateBatch(snapshots);

  let jobsCreated = 0;
  let totalEscalations = 0;

  for (const result of results) {
    if (result.skipped) continue;

    // Persist pending jobs
    const pendingJobs = result.jobs.filter(j => j.status === "pending");
    if (pendingJobs.length) {
      try {
        await supabase.from("reminder_jobs" as any).insert(pendingJobs);
        jobsCreated += pendingJobs.length;
      } catch {
        // Silent — non-critical
      }
    }

    // Process escalations
    if (result.escalationsRecommended > 0) {
      const ctx = {
        stage: snapshots.find(s => s.id === result.bookingId)!.stage,
        stageEnteredAt: snapshots.find(s => s.id === result.bookingId)!.stageEnteredAt,
      };
      const states = computeReminderStates(ctx);
      const escalated = await processEscalations(result.bookingId, states);
      totalEscalations += escalated;
    }
  }

  return { processed: bookings.length, jobsCreated, escalations: totalEscalations };
}
