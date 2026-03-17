/**
 * Operator Task Factory Service — Persists callback tasks via Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import type { OperatorCallbackTask, CallbackTaskType } from "@/types/reminderJobs";
import { createCallbackTask, getDefaultPriority } from "@/lib/operatorCallbackTasks";

/** Insert a new operator callback task */
export async function insertCallbackTask(
  params: {
    bookingId: string;
    taskType: CallbackTaskType;
    title: string;
    reason: string;
    priority?: "low" | "normal" | "high" | "urgent";
    dueInMinutes?: number;
    reminderKey?: string;
  }
): Promise<void> {
  const task = createCallbackTask({
    ...params,
    priority: params.priority || getDefaultPriority(params.taskType),
  });

  try {
    // Duplicate check — don't create if same type/booking is already open
    const { data: existing } = await supabase
      .from("operator_callback_tasks" as any)
      .select("id")
      .eq("booking_id", params.bookingId)
      .eq("task_type", params.taskType)
      .in("status", ["open", "in_progress"])
      .limit(1);

    if (existing && existing.length > 0) return; // Already open

    await supabase.from("operator_callback_tasks" as any).insert(task);
  } catch {
    console.error("[operatorTaskFactory] Failed to insert callback task");
  }
}

/** Fetch open tasks for a booking */
export async function fetchOpenTasks(bookingId: string): Promise<OperatorCallbackTask[]> {
  try {
    const { data } = await supabase
      .from("operator_callback_tasks" as any)
      .select("*")
      .eq("booking_id", bookingId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false });
    return (data as unknown as OperatorCallbackTask[]) || [];
  } catch {
    return [];
  }
}

/** Fetch all open tasks across bookings (for ops dashboard) */
export async function fetchAllOpenTasks(limit = 50): Promise<OperatorCallbackTask[]> {
  try {
    const { data } = await supabase
      .from("operator_callback_tasks" as any)
      .select("*")
      .in("status", ["open", "in_progress"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);
    return (data || []) as OperatorCallbackTask[];
  } catch {
    return [];
  }
}

/** Mark a task as completed */
export async function completeTask(taskId: string, notes?: string): Promise<void> {
  try {
    await supabase
      .from("operator_callback_tasks" as any)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  } catch {
    console.error("[operatorTaskFactory] Failed to complete task");
  }
}
