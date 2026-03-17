/**
 * Reminder Ops Read Model — Query helpers for reminder/callback data.
 * Read-only. Does not mutate state.
 */

import { supabase } from "@/integrations/supabase/client";

export async function fetchBookingReminderHistory(bookingId: string) {
  const { data } = await supabase
    .from("reminder_jobs" as any)
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(30);
  return data || [];
}

export async function fetchBookingCallbackTasks(bookingId: string) {
  const { data } = await supabase
    .from("operator_callback_tasks" as any)
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

export async function fetchPendingReminderJobs() {
  const { data } = await supabase
    .from("reminder_jobs" as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  return data || [];
}

export async function fetchOverdueCallbackTasks() {
  const { data } = await supabase
    .from("operator_callback_tasks" as any)
    .select("*")
    .in("status", ["open", "in_progress"])
    .order("due_at", { ascending: true })
    .limit(50);
  return (data || []).filter((t: any) => t.due_at && new Date(t.due_at) < new Date());
}

export async function fetchReminderOpsSummary() {
  const [pending, sent, failed] = await Promise.all([
    supabase.from("reminder_jobs" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reminder_jobs" as any).select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("reminder_jobs" as any).select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return {
    pending: pending.count || 0,
    sent: sent.count || 0,
    failed: failed.count || 0,
  };
}

export async function fetchOpenCallbackExecutionTasks() {
  const { data } = await supabase
    .from("operator_callback_tasks" as any)
    .select("*")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: true })
    .limit(50);
  return data || [];
}
