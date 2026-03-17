/**
 * Operator Callback Tasks — Human follow-up task definitions.
 * Advisory task generation. Does not auto-assign or auto-escalate.
 */

import type { OperatorCallbackTask, CallbackTaskType } from "@/types/reminderJobs";

interface CreateTaskParams {
  bookingId: string;
  taskType: CallbackTaskType;
  title: string;
  reason: string;
  priority?: "low" | "normal" | "high" | "urgent";
  dueInMinutes?: number;
  reminderKey?: string;
  advisorySource?: string;
}

const TASK_TITLES: Record<CallbackTaskType, string> = {
  call_customer: "Call Customer",
  whatsapp_customer: "WhatsApp Customer",
  follow_up_technician: "Follow Up with Technician",
  verify_quote_delay: "Verify Quote Delay",
  confirm_completion_issue: "Confirm Completion Issue",
  senior_review_required: "Senior Review Required",
  dispute_follow_up: "Dispute Follow-Up",
};

/** Create an operator callback task (not yet persisted) */
export function createCallbackTask(
  params: CreateTaskParams
): Omit<OperatorCallbackTask, "id" | "created_at" | "updated_at"> {
  return {
    booking_id: params.bookingId,
    task_type: params.taskType,
    title: params.title || TASK_TITLES[params.taskType],
    reason: params.reason,
    priority: params.priority || "normal",
    due_at: params.dueInMinutes
      ? new Date(Date.now() + params.dueInMinutes * 60_000).toISOString()
      : null,
    assigned_to: null,
    status: "open",
    completed_at: null,
    created_from_reminder_key: params.reminderKey || null,
    advisory_source: params.advisorySource || null,
    notes: null,
  };
}

/** Get default priority for a task type */
export function getDefaultPriority(taskType: CallbackTaskType): "low" | "normal" | "high" | "urgent" {
  const map: Record<CallbackTaskType, "low" | "normal" | "high" | "urgent"> = {
    call_customer: "high",
    whatsapp_customer: "normal",
    follow_up_technician: "normal",
    verify_quote_delay: "normal",
    confirm_completion_issue: "high",
    senior_review_required: "urgent",
    dispute_follow_up: "urgent",
  };
  return map[taskType];
}
