/**
 * Reminder Send Log — Tracks delivery attempts.
 * Provides helpers to compute last sent, next eligible, etc.
 */

import type { ReminderSendLog, ReminderChannel } from "@/types/reminderJobs";

export interface SendAttempt {
  reminderJobId: string;
  bookingId: string;
  reminderKey: string;
  channel: ReminderChannel;
  attemptNumber: number;
}

/** Create a send log entry for a successful delivery */
export function createSuccessLog(attempt: SendAttempt): Omit<ReminderSendLog, "id" | "created_at"> {
  return {
    reminder_job_id: attempt.reminderJobId,
    booking_id: attempt.bookingId,
    reminder_key: attempt.reminderKey,
    channel: attempt.channel,
    attempt_number: attempt.attemptNumber,
    outcome: "sent",
    error_message: null,
    metadata: {},
  };
}

/** Create a send log entry for a failed delivery */
export function createFailureLog(attempt: SendAttempt, error: string): Omit<ReminderSendLog, "id" | "created_at"> {
  return {
    reminder_job_id: attempt.reminderJobId,
    booking_id: attempt.bookingId,
    reminder_key: attempt.reminderKey,
    channel: attempt.channel,
    attempt_number: attempt.attemptNumber,
    outcome: "failed",
    error_message: error,
    metadata: {},
  };
}

/** Create a send log entry for a suppressed reminder */
export function createSuppressionLog(attempt: SendAttempt, reason: string): Omit<ReminderSendLog, "id" | "created_at"> {
  return {
    reminder_job_id: attempt.reminderJobId,
    booking_id: attempt.bookingId,
    reminder_key: attempt.reminderKey,
    channel: attempt.channel,
    attempt_number: attempt.attemptNumber,
    outcome: "suppressed",
    error_message: null,
    metadata: { suppression_reason: reason },
  };
}

/** Compute last sent time from a list of logs */
export function getLastSentTime(logs: ReminderSendLog[], reminderKey: string): Date | null {
  const sent = logs
    .filter(l => l.reminder_key === reminderKey && l.outcome === "sent")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return sent[0] ? new Date(sent[0].created_at) : null;
}

/** Count successful sends for a reminder key */
export function getSendCount(logs: ReminderSendLog[], reminderKey: string): number {
  return logs.filter(l => l.reminder_key === reminderKey && l.outcome === "sent").length;
}

/** Get total failed attempts */
export function getFailedCount(logs: ReminderSendLog[], reminderKey: string): number {
  return logs.filter(l => l.reminder_key === reminderKey && l.outcome === "failed").length;
}
