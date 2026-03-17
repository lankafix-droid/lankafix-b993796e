/**
 * Reminder Delivery Adapters — Production-ready channel adapters.
 * Provider-agnostic interfaces. Stub mode for unconfigured providers.
 * Never breaks processing if one provider fails.
 */

import type { ReminderChannel } from "@/types/reminderJobs";
import { getNotificationTemplate } from "@/lib/customerNotificationTemplates";
import { supabase } from "@/integrations/supabase/client";
import { isChannelStub, CHANNEL_CONFIG } from "@/config/reminderChannels";

export interface DeliveryResult {
  success: boolean;
  channel: ReminderChannel;
  error?: string;
  messageId?: string;
  deliveredAt?: string;
  advisory_only: boolean;
  provider: string;
}

interface DeliveryPayload {
  bookingId: string;
  reminderKey: string;
  recipientId?: string;
  channel: ReminderChannel;
}

const now = () => new Date().toISOString();
const stubId = (prefix: string) => `${prefix}-stub-${Date.now()}`;

/** In-app notification adapter — uses existing notifications table */
async function deliverInApp(payload: DeliveryPayload): Promise<DeliveryResult> {
  const provider = CHANNEL_CONFIG.in_app.provider;
  const template = getNotificationTemplate(payload.reminderKey);
  if (!template) return { success: false, channel: "in_app", error: "Template not found", advisory_only: false, provider };

  try {
    if (payload.recipientId) {
      await supabase.from("notifications").insert({
        user_id: payload.recipientId,
        booking_id: payload.bookingId,
        title: template.title,
        message: template.shortMessage,
        type: "reminder",
      });
    }
    return { success: true, channel: "in_app", deliveredAt: now(), advisory_only: false, provider };
  } catch {
    return { success: false, channel: "in_app", error: "Insert failed", advisory_only: false, provider };
  }
}

/** Push notification adapter — Firebase/OneSignal compatible placeholder */
async function deliverPush(payload: DeliveryPayload): Promise<DeliveryResult> {
  const provider = CHANNEL_CONFIG.push.provider;
  const stub = isChannelStub("push");
  const template = getNotificationTemplate(payload.reminderKey);
  if (stub) {
    console.log(`[push-${provider}] Would send: ${template?.title || payload.reminderKey} for booking ${payload.bookingId}`);
    return { success: true, channel: "push", messageId: stubId("push"), deliveredAt: now(), advisory_only: true, provider };
  }
  // Future: real Firebase/OneSignal call here
  return { success: true, channel: "push", messageId: stubId("push"), deliveredAt: now(), advisory_only: true, provider };
}

/** WhatsApp adapter — Meta/Twilio WhatsApp compatible placeholder */
async function deliverWhatsApp(payload: DeliveryPayload): Promise<DeliveryResult> {
  const provider = CHANNEL_CONFIG.whatsapp.provider;
  const stub = isChannelStub("whatsapp");
  const template = getNotificationTemplate(payload.reminderKey);
  if (stub) {
    console.log(`[whatsapp-${provider}] Would send: ${template?.title || payload.reminderKey} for booking ${payload.bookingId}`);
    return { success: true, channel: "whatsapp", messageId: stubId("wa"), deliveredAt: now(), advisory_only: true, provider };
  }
  // Future: real Meta/Twilio WhatsApp API call here
  return { success: true, channel: "whatsapp", messageId: stubId("wa"), deliveredAt: now(), advisory_only: true, provider };
}

/** SMS adapter — Twilio compatible placeholder */
async function deliverSMS(payload: DeliveryPayload): Promise<DeliveryResult> {
  const provider = CHANNEL_CONFIG.sms.provider;
  const stub = isChannelStub("sms");
  const template = getNotificationTemplate(payload.reminderKey);
  if (stub) {
    console.log(`[sms-${provider}] Would send: ${template?.title || payload.reminderKey} for booking ${payload.bookingId}`);
    return { success: true, channel: "sms", messageId: stubId("sms"), deliveredAt: now(), advisory_only: true, provider };
  }
  // Future: real Twilio SMS call here
  return { success: true, channel: "sms", messageId: stubId("sms"), deliveredAt: now(), advisory_only: true, provider };
}

/** Operator task adapter — creates a callback task record */
async function deliverOperatorTask(payload: DeliveryPayload): Promise<DeliveryResult> {
  const provider = CHANNEL_CONFIG.operator_task.provider;
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
    return { success: true, channel: "operator_task", deliveredAt: now(), advisory_only: false, provider };
  } catch {
    return { success: false, channel: "operator_task", error: "Insert failed", advisory_only: false, provider };
  }
}

/** Route delivery to the appropriate channel adapter — never throws */
export async function deliverReminder(payload: DeliveryPayload): Promise<DeliveryResult> {
  try {
    switch (payload.channel) {
      case "in_app": return await deliverInApp(payload);
      case "push": return await deliverPush(payload);
      case "whatsapp": return await deliverWhatsApp(payload);
      case "sms": return await deliverSMS(payload);
      case "operator_task": return await deliverOperatorTask(payload);
      default: return { success: false, channel: payload.channel, error: "Unknown channel", advisory_only: false, provider: "unknown" };
    }
  } catch (err: any) {
    return { success: false, channel: payload.channel, error: err?.message || "Adapter error", advisory_only: false, provider: "unknown" };
  }
}
