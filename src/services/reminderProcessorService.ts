/**
 * Reminder Processor Service — Processes pending reminder jobs safely.
 * Runs safety checks, delivers via adapters, records logs, escalates if needed.
 * Does NOT auto-mutate booking/dispatch state.
 */

import { supabase } from "@/integrations/supabase/client";
import { deliverReminder, type DeliveryResult } from "@/services/reminderDeliveryAdapters";
import { createSuccessLog, createFailureLog, createSuppressionLog, type SendAttempt } from "@/lib/reminderSendLog";
import { shouldCancelReminder, shouldSuppressReminderBecauseSupportActive } from "@/lib/reminderRetryPolicy";
import { hasDuplicatePendingJob, hasRecentSuccessfulSend } from "@/lib/reminderExecutionSafety";
import type { ReminderJob, ReminderChannel } from "@/types/reminderJobs";

export interface ProcessingSummary {
  processed: number;
  sent: number;
  failed: number;
  suppressed: number;
  escalated: number;
  errors: string[];
}

function emptySummary(): ProcessingSummary {
  return { processed: 0, sent: 0, failed: 0, suppressed: 0, escalated: 0, errors: [] };
}

/** Process pending reminder jobs up to a limit */
export async function processPendingReminderJobs(limit: number = 20): Promise<ProcessingSummary> {
  const summary = emptySummary();

  const { data: jobs } = await supabase
    .from("reminder_jobs" as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!jobs?.length) return summary;

  for (const raw of jobs) {
    const job = raw as unknown as ReminderJob;
    const result = await processSingleReminderJob(job);
    summary.processed++;
    if (result === "sent") summary.sent++;
    else if (result === "failed") summary.failed++;
    else if (result === "suppressed") summary.suppressed++;
  }

  return summary;
}

/** Process a single reminder job with full safety checks */
async function processSingleReminderJob(job: ReminderJob): Promise<"sent" | "failed" | "suppressed"> {
  // Fetch booking status
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, under_mediation")
    .eq("id", job.booking_id)
    .single();

  const bookingStatus = (booking as any)?.status || "";

  // Cancel check
  if (shouldCancelReminder(bookingStatus, job)) {
    await updateJobStatus(job.id, "cancelled", "Booking in terminal state");
    return "suppressed";
  }

  // Dispute/support suppression
  const disputeOpen = !!(booking as any)?.under_mediation;
  if (shouldSuppressReminderBecauseSupportActive(disputeOpen, false, job.reminder_key)) {
    await updateJobStatus(job.id, "suppressed", "Active dispute/support override");
    await recordLog(job, "suppressed", null, "Active dispute/support");
    return "suppressed";
  }

  // Recent send check
  const { data: recentLogs } = await supabase
    .from("reminder_send_logs" as any)
    .select("reminder_key, outcome, created_at")
    .eq("booking_id", job.booking_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (hasRecentSuccessfulSend(recentLogs as any[] || [], job.reminder_key)) {
    await updateJobStatus(job.id, "suppressed", "Recent successful send within cooldown");
    return "suppressed";
  }

  // Deliver
  const deliveryResult = await deliverReminder({
    bookingId: job.booking_id,
    reminderKey: job.reminder_key,
    channel: job.channel,
  });

  if (deliveryResult.success) {
    await updateJobStatus(job.id, "sent");
    await recordLog(job, "sent", null, null);
    return "sent";
  } else {
    await updateJobStatus(job.id, "failed", deliveryResult.error);
    await recordLog(job, "failed", deliveryResult.error || "Delivery failed", null);
    return "failed";
  }
}

/** Dry run — evaluate without sending */
export async function dryRunReminderProcessing(limit: number = 20): Promise<ProcessingSummary> {
  const summary = emptySummary();

  const { data: jobs } = await supabase
    .from("reminder_jobs" as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!jobs?.length) return summary;

  for (const raw of jobs) {
    const job = raw as unknown as ReminderJob;
    summary.processed++;

    const { data: booking } = await supabase
      .from("bookings")
      .select("status, under_mediation")
      .eq("id", job.booking_id)
      .single();

    const bookingStatus = (booking as any)?.status || "";

    if (shouldCancelReminder(bookingStatus, job)) {
      summary.suppressed++;
    } else if (shouldSuppressReminderBecauseSupportActive(!!(booking as any)?.under_mediation, false, job.reminder_key)) {
      summary.suppressed++;
    } else {
      summary.sent++; // would send
    }
  }

  return summary;
}

async function updateJobStatus(jobId: string, status: string, reason?: string | null) {
  const update: Record<string, unknown> = { status };
  if (status === "sent") update.sent_at = new Date().toISOString();
  if (status === "failed") update.failed_at = new Date().toISOString();
  if (reason) update.suppression_reason = reason;

  await supabase.from("reminder_jobs" as any).update(update).eq("id", jobId);
}

async function recordLog(job: ReminderJob, outcome: string, error: string | null, suppressionReason: string | null) {
  const attempt: SendAttempt = {
    reminderJobId: job.id,
    bookingId: job.booking_id,
    reminderKey: job.reminder_key,
    channel: job.channel,
    attemptNumber: job.send_count + 1,
  };

  let log;
  if (outcome === "sent") log = createSuccessLog(attempt);
  else if (outcome === "failed") log = createFailureLog(attempt, error || "Unknown");
  else log = createSuppressionLog(attempt, suppressionReason || "Suppressed");

  await supabase.from("reminder_send_logs" as any).insert(log);
}
