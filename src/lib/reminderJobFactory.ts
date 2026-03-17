/**
 * Reminder Job Factory — Creates structured reminder job objects.
 * Does not insert into DB. Returns plain objects for service layer.
 */

import type { ReminderJob, ReminderChannel, ReminderAudience } from "@/types/reminderJobs";
import { getNotificationTemplate } from "@/lib/customerNotificationTemplates";

interface CreateJobParams {
  bookingId: string;
  reminderKey: string;
  audience: ReminderAudience;
  channel: ReminderChannel;
  scheduledFor?: Date;
  createdBy?: "system" | "operator";
}

/** Create a reminder job record (not yet persisted) */
export function createReminderJob(params: CreateJobParams): Omit<ReminderJob, "id" | "created_at" | "updated_at"> {
  const template = getNotificationTemplate(params.reminderKey);
  const payloadSummary = template
    ? `${template.title}: ${template.shortMessage}`
    : params.reminderKey;

  return {
    booking_id: params.bookingId,
    reminder_key: params.reminderKey,
    audience: params.audience,
    channel: params.channel,
    status: "pending",
    scheduled_for: params.scheduledFor?.toISOString() || null,
    sent_at: null,
    failed_at: null,
    suppression_reason: null,
    send_count: 0,
    payload_summary: payloadSummary,
    created_by: params.createdBy || "system",
    advisory_only: true,
  };
}

/** Create a suppressed job record */
export function createSuppressedJob(
  params: CreateJobParams,
  reason: string
): Omit<ReminderJob, "id" | "created_at" | "updated_at"> {
  return {
    ...createReminderJob(params),
    status: "suppressed",
    suppression_reason: reason,
  };
}
