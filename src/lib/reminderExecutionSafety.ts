/**
 * Reminder Execution Safety — Duplicate prevention and pre-flight checks.
 * Prevents spammy sends, duplicate jobs, and duplicate callback tasks.
 */

import type { ReminderJob, OperatorCallbackTask } from "@/types/reminderJobs";

const RECENT_SEND_WINDOW_MINUTES = 30;

/** Check if a duplicate pending job already exists for this booking + key */
export function hasDuplicatePendingJob(
  existingJobs: Pick<ReminderJob, "booking_id" | "reminder_key" | "status">[],
  bookingId: string,
  reminderKey: string
): boolean {
  return existingJobs.some(
    j => j.booking_id === bookingId && j.reminder_key === reminderKey && j.status === "pending"
  );
}

/** Check if a successful send happened recently for this key */
export function hasRecentSuccessfulSend(
  sendLogs: { reminder_key: string; outcome: string; created_at: string }[],
  reminderKey: string,
  windowMinutes: number = RECENT_SEND_WINDOW_MINUTES
): boolean {
  const cutoff = Date.now() - windowMinutes * 60_000;
  return sendLogs.some(
    l => l.reminder_key === reminderKey && l.outcome === "sent" && new Date(l.created_at).getTime() > cutoff
  );
}

/** Check if an open callback task of this type exists for the booking */
export function hasOpenCallbackTaskOfType(
  tasks: Pick<OperatorCallbackTask, "booking_id" | "task_type" | "status">[],
  bookingId: string,
  taskType: string
): boolean {
  return tasks.some(
    t => t.booking_id === bookingId && t.task_type === taskType && ["open", "in_progress"].includes(t.status)
  );
}

/** Pre-flight: can we create a new reminder job? */
export function canCreateReminderJob(
  existingJobs: Pick<ReminderJob, "booking_id" | "reminder_key" | "status">[],
  sendLogs: { reminder_key: string; outcome: string; created_at: string }[],
  bookingId: string,
  reminderKey: string,
  bookingStatus: string
): { allowed: boolean; reason: string } {
  if (["completed", "cancelled"].includes(bookingStatus)) {
    return { allowed: false, reason: "Booking is in a terminal state" };
  }
  if (hasDuplicatePendingJob(existingJobs, bookingId, reminderKey)) {
    return { allowed: false, reason: "Duplicate pending job already exists" };
  }
  if (hasRecentSuccessfulSend(sendLogs, reminderKey)) {
    return { allowed: false, reason: "Recent successful send within cooldown window" };
  }
  return { allowed: true, reason: "Safe to create" };
}

/** Pre-flight: can we create a callback task? */
export function canCreateCallbackTask(
  existingTasks: Pick<OperatorCallbackTask, "booking_id" | "task_type" | "status">[],
  bookingId: string,
  taskType: string
): { allowed: boolean; reason: string } {
  if (hasOpenCallbackTaskOfType(existingTasks, bookingId, taskType)) {
    return { allowed: false, reason: "Open task of this type already exists for booking" };
  }
  return { allowed: true, reason: "Safe to create" };
}
