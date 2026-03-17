/**
 * Reminder Delivery Adapters — Future-ready channel adapters.
 * Stub implementations. Returns normalized results.
 * Does NOT require external integrations — safe mocks for now.
 */

import type { ReminderChannel } from "@/types/reminderJobs";
import { getNotificationTemplate } from "@/lib/customerNotificationTemplates";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryResult {
  success: boolean;
  channel: ReminderChannel;
  error?: string;
  messageId?: string;
}

interface DeliveryPayload {
  bookingId: string;
  reminderKey: string;
  recipientId?: string;
  channel: ReminderChannel;
}

/** In-app notification adapter — uses existing notifications table */
async function deliverInApp(payload: DeliveryPayload): Promise<DeliveryResult> {
  const template = getNotificationTemplate(payload.reminderKey);
  if (!template) return { success: false, channel: "in_app", error: "Template not found" };

  try {
    // Only insert if we have a recipient
    if (payload.recipientId) {
      await supabase.from("notifications").insert({
        user_id: payload.recipientId,
        booking_id: payload.bookingId,
        title: template.title,
        message: template.shortMessage,
        type: "reminder",
      });
    }
    return { success: true, channel: "in_app" };
  } catch {
    return { success: false, channel: "in_app", error: "Insert failed" };
  }
}

/** Push notification adapter — stub, logs intent */
async function deliverPush(payload: DeliveryPayload): Promise<DeliveryResult> {
  const template = getNotificationTemplate(payload.reminderKey);
  console.log(`[push-stub] Would send push: ${template?.title || payload.reminderKey} for booking ${payload.bookingId}`);
  return { success: true, channel: "push", messageId: `push-stub-${Date.now()}` };
}

/** WhatsApp adapter — stub, logs intent */
async function deliverWhatsApp(payload: DeliveryPayload): Promise<DeliveryResult> {
  const template = getNotificationTemplate(payload.reminderKey);
  console.log(`[whatsapp-stub] Would send WhatsApp: ${template?.title || payload.reminderKey} for booking ${payload.bookingId}`);
  return { success: true, channel: "whatsapp", messageId: `wa-stub-${Date.now()}` };
}

/** SMS adapter — stub, logs intent */
async function deliverSMS(payload: DeliveryPayload): Promise<DeliveryResult> {
  const template = getNotificationTemplate(payload.reminderKey);
  console.log(`[sms-stub] Would send SMS: ${template?.title || payload.reminderKey} for booking ${payload.bookingId}`);
  return { success: true, channel: "sms", messageId: `sms-stub-${Date.now()}` };
}

/** Operator task adapter — creates a callback task record */
async function deliverOperatorTask(payload: DeliveryPayload): Promise<DeliveryResult> {
  try {
    await supabase.from("operator_callback_tasks" as any).insert({
      booking_id: payload.bookingId,
      task_type: "follow_up_technician",
      title: `Follow up: ${payload.reminderKey}`,
      reason: `Auto-generated from reminder: ${payload.reminderKey}`,
      priority: "normal",
      status: "open",
      created_from_reminder_key: payload.reminderKey,
      advisory_source: "reminder_engine",
    });
    return { success: true, channel: "operator_task" };
  } catch {
    return { success: false, channel: "operator_task", error: "Insert failed" };
  }
}

/** Route delivery to the appropriate channel adapter */
export async function deliverReminder(payload: DeliveryPayload): Promise<DeliveryResult> {
  switch (payload.channel) {
    case "in_app": return deliverInApp(payload);
    case "push": return deliverPush(payload);
    case "whatsapp": return deliverWhatsApp(payload);
    case "sms": return deliverSMS(payload);
    case "operator_task": return deliverOperatorTask(payload);
    default: return { success: false, channel: payload.channel, error: "Unknown channel" };
  }
}
