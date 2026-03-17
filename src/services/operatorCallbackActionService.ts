/**
 * Operator Callback Action Service — Manual task execution controls.
 * All actions are human-initiated. No auto-close.
 */

import { supabase } from "@/integrations/supabase/client";

const now = () => new Date().toISOString();

export async function startCallbackTask(taskId: string) {
  await supabase.from("operator_callback_tasks" as any)
    .update({ status: "in_progress", updated_at: now() })
    .eq("id", taskId);
}

export async function completeCallbackTask(taskId: string, notes?: string) {
  const update: Record<string, unknown> = {
    status: "completed",
    completed_at: now(),
    updated_at: now(),
  };
  if (notes) update.notes = notes;
  await supabase.from("operator_callback_tasks" as any).update(update).eq("id", taskId);
}

export async function snoozeCallbackTask(taskId: string, minutes: number, reason: string) {
  const dueAt = new Date(Date.now() + minutes * 60_000).toISOString();
  await supabase.from("operator_callback_tasks" as any)
    .update({ due_at: dueAt, notes: `Snoozed: ${reason}`, updated_at: now() })
    .eq("id", taskId);
}

export async function escalateCallbackTask(taskId: string, reason: string) {
  await supabase.from("operator_callback_tasks" as any)
    .update({ priority: "urgent", notes: `Escalated: ${reason}`, updated_at: now() })
    .eq("id", taskId);
}

export async function addCallbackTaskNote(taskId: string, note: string) {
  await supabase.from("operator_callback_tasks" as any)
    .update({ notes: note, updated_at: now() })
    .eq("id", taskId);
}

export async function assignCallbackTask(taskId: string, operatorId: string) {
  await supabase.from("operator_callback_tasks" as any)
    .update({ assigned_to: operatorId, updated_at: now() })
    .eq("id", taskId);
}

export async function cancelCallbackTask(taskId: string, reason: string) {
  await supabase.from("operator_callback_tasks" as any)
    .update({ status: "cancelled", notes: `Cancelled: ${reason}`, updated_at: now() })
    .eq("id", taskId);
}
