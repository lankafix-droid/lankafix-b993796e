/**
 * Reminder History Service — Persists send logs and job status updates.
 * Uses Supabase for storage. All operations are safe / idempotent.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ReminderSendLog } from "@/types/reminderJobs";

/** Record a send attempt in the database */
export async function recordSendAttempt(
  log: Omit<ReminderSendLog, "id" | "created_at">
): Promise<void> {
  try {
    await supabase.from("reminder_send_logs" as any).insert(log);
  } catch {
    console.error("[reminderHistory] Failed to record send attempt");
  }
}

/** Update a reminder job status */
export async function updateJobStatus(
  jobId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase
      .from("reminder_jobs" as any)
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq("id", jobId);
  } catch {
    console.error("[reminderHistory] Failed to update job status");
  }
}

/** Mark a job as sent */
export async function markJobSent(jobId: string): Promise<void> {
  await updateJobStatus(jobId, "sent", { sent_at: new Date().toISOString() });
}

/** Mark a job as failed */
export async function markJobFailed(jobId: string): Promise<void> {
  await updateJobStatus(jobId, "failed", { failed_at: new Date().toISOString() });
}

/** Mark a job as suppressed */
export async function markJobSuppressed(jobId: string, reason: string): Promise<void> {
  await updateJobStatus(jobId, "suppressed", { suppression_reason: reason });
}

/** Fetch send logs for a booking */
export async function fetchSendLogs(bookingId: string): Promise<ReminderSendLog[]> {
  try {
    const { data } = await supabase
      .from("reminder_send_logs" as any)
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as unknown as ReminderSendLog[]) || [];
  } catch {
    return [];
  }
}

/** Fetch reminder jobs for a booking */
export async function fetchReminderJobs(bookingId: string) {
  try {
    const { data } = await supabase
      .from("reminder_jobs" as any)
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  } catch {
    return [];
  }
}
