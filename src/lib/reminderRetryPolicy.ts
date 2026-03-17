/**
 * Reminder Retry Policy — Safe retry and duplicate prevention.
 * Ensures no spammy sends, respects stage changes and active disputes.
 */

import type { ReminderJob, ReminderSendLog } from "@/types/reminderJobs";
import { getLastSentTime, getFailedCount } from "@/lib/reminderSendLog";

export interface RetryDecision {
  canRetry: boolean;
  reason: string;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COOLDOWN_MINUTES = 15;

/** Evaluate whether a failed reminder job can be retried */
export function evaluateRetry(
  job: ReminderJob,
  logs: ReminderSendLog[],
  currentStage: string,
  originalStage: string,
  disputeOpen: boolean,
  supportOpen: boolean
): RetryDecision {
  // No retry if stage changed
  if (currentStage !== originalStage) {
    return { canRetry: false, reason: "Booking stage has changed — retry cancelled" };
  }

  // No retry if dispute/support override
  if (disputeOpen && job.reminder_key !== "dispute_review_pending") {
    return { canRetry: false, reason: "Active dispute — retry suppressed" };
  }
  if (supportOpen) {
    return { canRetry: false, reason: "Support case active — retry suppressed" };
  }

  // Check max retries
  const failedCount = getFailedCount(logs, job.reminder_key);
  if (failedCount >= MAX_RETRY_ATTEMPTS) {
    return { canRetry: false, reason: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached` };
  }

  // Check cooldown
  const lastSent = getLastSentTime(logs, job.reminder_key);
  if (lastSent) {
    const sinceLastMinutes = (Date.now() - lastSent.getTime()) / 60_000;
    if (sinceLastMinutes < RETRY_COOLDOWN_MINUTES) {
      return { canRetry: false, reason: `Retry cooldown (${Math.ceil(RETRY_COOLDOWN_MINUTES - sinceLastMinutes)}m remaining)` };
    }
  }

  // Job already sent successfully
  if (job.status === "sent") {
    return { canRetry: false, reason: "Job already sent successfully" };
  }

  // Job cancelled or suppressed
  if (job.status === "cancelled" || job.status === "suppressed") {
    return { canRetry: false, reason: `Job is ${job.status}` };
  }

  return { canRetry: true, reason: "Eligible for retry" };
}

/** Check if a duplicate operator task already exists */
export function isDuplicateTask(
  existingTasks: { task_type: string; status: string; booking_id: string }[],
  taskType: string,
  bookingId: string
): boolean {
  return existingTasks.some(
    t => t.booking_id === bookingId && t.task_type === taskType && ["open", "in_progress"].includes(t.status)
  );
}
