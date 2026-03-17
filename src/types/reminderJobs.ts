/**
 * Reminder Job Types — Structured model for reminder delivery jobs.
 */

export type ReminderAudience = "customer" | "operator";
export type ReminderChannel = "in_app" | "push" | "whatsapp" | "sms" | "operator_task";
export type ReminderJobStatus = "pending" | "sent" | "failed" | "suppressed" | "cancelled";

export interface ReminderJob {
  id: string;
  booking_id: string;
  reminder_key: string;
  audience: ReminderAudience;
  channel: ReminderChannel;
  status: ReminderJobStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  failed_at: string | null;
  suppression_reason: string | null;
  send_count: number;
  payload_summary: string | null;
  created_by: "system" | "operator";
  advisory_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderSendLog {
  id: string;
  reminder_job_id: string;
  booking_id: string;
  reminder_key: string;
  channel: ReminderChannel;
  attempt_number: number;
  outcome: "pending" | "sent" | "failed" | "suppressed";
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type CallbackTaskType =
  | "call_customer"
  | "whatsapp_customer"
  | "follow_up_technician"
  | "verify_quote_delay"
  | "confirm_completion_issue"
  | "senior_review_required"
  | "dispute_follow_up";

export type CallbackTaskStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface OperatorCallbackTask {
  id: string;
  booking_id: string;
  task_type: CallbackTaskType;
  title: string;
  reason: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  due_at: string | null;
  assigned_to: string | null;
  status: CallbackTaskStatus;
  completed_at: string | null;
  created_from_reminder_key: string | null;
  advisory_source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
