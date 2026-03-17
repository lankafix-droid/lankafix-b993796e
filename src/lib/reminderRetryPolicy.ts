/**
 * Reminder Retry Policy — Safe retry, cancellation, and duplicate prevention.
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
const BACKOFF_BASE_MINUTES = 10;

const TERMINAL_STATUSES = ["completed", "cancelled"];

/** Evaluate whether a failed reminder job can be retried */
export function evaluateRetry(
  job: ReminderJob,
  logs: ReminderSendLog[],
  currentStage: string,
  originalStage: string,
  disputeOpen: boolean,
  supportOpen: boolean
): RetryDecision {
  if (currentStage !== originalStage) {
    return { canRetry: false, reason: "Booking stage has changed — retry cancelled" };
  }
  if (disputeOpen && job.reminder_key !== "dispute_review_pending") {
    return { canRetry: false, reason: "Active dispute — retry suppressed" };
  }
  if (supportOpen) {
    return { canRetry: false, reason: "Support case active — retry suppressed" };
  }
  const failedCount = getFailedCount(logs, job.reminder_key);
  if (failedCount >= MAX_RETRY_ATTEMPTS) {
    return { canRetry: false, reason: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached` };
  }
  const lastSent = getLastSentTime(logs, job.reminder_key);
  if (lastSent) {
    const sinceLastMinutes = (Date.now() - lastSent.getTime()) / 60_000;
    if (sinceLastMinutes < RETRY_COOLDOWN_MINUTES) {
      return { canRetry: false, reason: `Retry cooldown (${Math.ceil(RETRY_COOLDOWN_MINUTES - sinceLastMinutes)}m remaining)` };
    }
  }
  if (job.status === "sent") {
    return { canRetry: false, reason: "Job already sent successfully" };
  }
  if (job.status === "cancelled" || job.status === "suppressed") {
    return { canRetry: false, reason: `Job is ${job.status}` };
  }
  return { canRetry: true, reason: "Eligible for retry" };
}

/** Should we retry this reminder? Convenience wrapper */
export function shouldRetryReminder(
  job: ReminderJob,
  logs: ReminderSendLog[],
  currentStage: string,
  originalStage: string,
  disputeOpen: boolean,
  supportOpen: boolean
): boolean {
  return evaluateRetry(job, logs, currentStage, originalStage, disputeOpen, supportOpen).canRetry;
}

/** Get next retry time with progressive backoff */
export function getNextRetryTime(failedAttempts: number): Date {
  const backoffMinutes = BACKOFF_BASE_MINUTES * Math.pow(2, Math.min(failedAttempts, 4));
  return new Date(Date.now() + backoffMinutes * 60_000);
}

/** Should this reminder be cancelled entirely? */
export function shouldCancelReminder(
  bookingStatus: string,
  job: ReminderJob
): boolean {
  if (TERMINAL_STATUSES.includes(bookingStatus) && job.reminder_key !== "rating_reminder") {
    return true;
  }
  if (job.send_count >= MAX_RETRY_ATTEMPTS && job.status === "failed") {
    return true;
  }
  return false;
}

/** Should reminder be invalidated because the booking stage changed? */
export function shouldInvalidateReminderOnStageChange(
  currentStage: string,
  originalStage: string
): boolean {
  return currentStage !== originalStage;
}

/** Should reminder be suppressed because support/dispute is active? */
export function shouldSuppressReminderBecauseSupportActive(
  disputeOpen: boolean,
  supportOpen: boolean,
  reminderKey: string
): boolean {
  if (supportOpen) return true;
  if (disputeOpen && reminderKey !== "dispute_review_pending") return true;
  return false;
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
