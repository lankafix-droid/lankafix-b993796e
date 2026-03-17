/**
 * Reminder Channel Configuration — Delivery channel policies and fallback rules.
 * Sri Lanka-friendly defaults: in-app → push → WhatsApp → human callback.
 */

import type { ReminderChannel } from "@/types/reminderJobs";

export interface ChannelConfig {
  enabled: boolean;
  provider: string;
  stubMode: boolean;
  displayName: string;
  fallbackOrder: number;
}

/** Per-channel configuration — stub mode = true means no live provider wired */
export const CHANNEL_CONFIG: Record<ReminderChannel, ChannelConfig> = {
  in_app: { enabled: true, provider: "supabase", stubMode: false, displayName: "In-App", fallbackOrder: 1 },
  push: { enabled: true, provider: "firebase", stubMode: true, displayName: "Push", fallbackOrder: 2 },
  whatsapp: { enabled: true, provider: "meta", stubMode: true, displayName: "WhatsApp", fallbackOrder: 3 },
  sms: { enabled: false, provider: "twilio", stubMode: true, displayName: "SMS", fallbackOrder: 4 },
  operator_task: { enabled: true, provider: "internal", stubMode: false, displayName: "Operator Task", fallbackOrder: 5 },
};

/** Stage → preferred channel map */
const STAGE_CHANNEL_MAP: Record<string, ReminderChannel[]> = {
  awaiting_quote_approval: ["in_app", "push", "whatsapp"],
  awaiting_completion_confirmation: ["in_app", "push"],
  technician_delayed: ["in_app", "push", "whatsapp"],
  no_provider_found: ["in_app", "operator_task"],
  partner_not_responding: ["in_app", "operator_task"],
  escalated: ["operator_task", "in_app"],
  dispute_opened: ["operator_task"],
  abandoned_draft: ["in_app", "push"],
  awaiting_rating: ["in_app"],
};

const DEFAULT_FALLBACK: ReminderChannel[] = ["in_app", "push", "whatsapp", "operator_task"];

/** Resolve the preferred delivery channel for a booking stage */
export function resolveDeliveryChannel(stage: string): ReminderChannel {
  const preferred = STAGE_CHANNEL_MAP[stage] || DEFAULT_FALLBACK;
  for (const ch of preferred) {
    const cfg = CHANNEL_CONFIG[ch];
    if (cfg.enabled) return ch;
  }
  return "in_app";
}

/** Get ordered fallback channels for a stage */
export function getFallbackChannels(stage: string): ReminderChannel[] {
  const preferred = STAGE_CHANNEL_MAP[stage] || DEFAULT_FALLBACK;
  return preferred.filter(ch => CHANNEL_CONFIG[ch].enabled);
}

/** After digital channels fail, should we escalate to human callback? */
export function shouldEscalateToHumanAfterDigitalFailure(
  failedChannels: ReminderChannel[],
  stage: string,
): boolean {
  const highFrictionStages = ["escalated", "dispute_opened", "no_provider_found", "partner_not_responding"];
  if (highFrictionStages.includes(stage)) return true;
  const digitalChannels: ReminderChannel[] = ["in_app", "push", "whatsapp", "sms"];
  const allDigitalFailed = digitalChannels
    .filter(ch => CHANNEL_CONFIG[ch].enabled)
    .every(ch => failedChannels.includes(ch));
  return allDigitalFailed;
}

/** Check if a channel is in stub/placeholder mode */
export function isChannelStub(channel: ReminderChannel): boolean {
  return CHANNEL_CONFIG[channel]?.stubMode ?? true;
}

/** Get enabled channel list sorted by fallback order */
export function getEnabledChannels(): { channel: ReminderChannel; config: ChannelConfig }[] {
  return (Object.entries(CHANNEL_CONFIG) as [ReminderChannel, ChannelConfig][])
    .filter(([, cfg]) => cfg.enabled)
    .sort((a, b) => a[1].fallbackOrder - b[1].fallbackOrder)
    .map(([channel, config]) => ({ channel, config }));
}
