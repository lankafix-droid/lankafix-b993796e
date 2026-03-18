/**
 * Campaign Analytics & Attribution Layer
 * Handles event tracking, frequency counting, dismissal recording, and attribution.
 * Events are BigQuery-naming-convention ready.
 */
import { track } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignEventType } from '@/types/campaign';

// ─── Session Attribution State ───────────────────────────────────
const sessionState = {
  firstTouchCampaignId: null as string | null,
  lastTouchCampaignId: null as string | null,
  assistedCampaignIds: new Set<string>(),
  impressionCounts: new Map<string, number>(),
  clickCounts: new Map<string, number>(),
};

// ─── Core Event Tracker ──────────────────────────────────────────
export function trackCampaignEvent(
  campaignId: string,
  eventType: CampaignEventType,
  metadata?: Record<string, unknown>,
) {
  // Update session attribution state
  if (eventType === 'cta_click' || eventType === 'card_click') {
    if (!sessionState.firstTouchCampaignId) {
      sessionState.firstTouchCampaignId = campaignId;
    }
    sessionState.lastTouchCampaignId = campaignId;
    sessionState.assistedCampaignIds.add(campaignId);
    sessionState.clickCounts.set(campaignId, (sessionState.clickCounts.get(campaignId) ?? 0) + 1);
  }

  if (eventType === 'viewable_impression') {
    sessionState.impressionCounts.set(campaignId, (sessionState.impressionCounts.get(campaignId) ?? 0) + 1);
  }

  // Fire analytics event with consistent naming
  track(`campaign_${eventType}`, {
    campaign_id: campaignId,
    session_first_touch: sessionState.firstTouchCampaignId,
    session_last_touch: sessionState.lastTouchCampaignId,
    ...metadata,
  });

  // Best-effort DB insert (non-blocking)
  supabase.auth.getUser().then(({ data }) => {
    supabase.from('campaign_events').insert([{
      campaign_id: campaignId,
      user_id: data?.user?.id ?? null,
      event_type: eventType,
      metadata: {
        ...(metadata || {}),
        first_touch: sessionState.firstTouchCampaignId,
        last_touch: sessionState.lastTouchCampaignId,
      },
    }] as any).then(() => {});
  });
}

// ─── Dismiss / Snooze ────────────────────────────────────────────
export function dismissCampaign(campaignId: string) {
  trackCampaignEvent(campaignId, 'dismiss');

  supabase.auth.getUser().then(({ data }) => {
    if (!data?.user) return;
    supabase.from('campaign_dismissals').insert([{
      user_id: data.user.id,
      campaign_id: campaignId,
      dismissal_type: 'dismiss',
    }] as any).then(() => {});
  });
}

export function snoozeCampaign(campaignId: string) {
  trackCampaignEvent(campaignId, 'snooze');

  supabase.auth.getUser().then(({ data }) => {
    if (!data?.user) return;
    supabase.from('campaign_dismissals').insert([{
      user_id: data.user.id,
      campaign_id: campaignId,
      dismissal_type: 'snooze',
    }] as any).then(() => {});
  });
}

// ─── Attribution Helpers ─────────────────────────────────────────
export function getSessionAttribution() {
  return {
    firstTouchCampaignId: sessionState.firstTouchCampaignId,
    lastTouchCampaignId: sessionState.lastTouchCampaignId,
    assistedCampaignIds: Array.from(sessionState.assistedCampaignIds),
  };
}

/** Get impression count for fatigue calculation */
export function getImpressionCount(campaignId: string): number {
  return sessionState.impressionCounts.get(campaignId) ?? 0;
}

/** Get click count for fatigue calculation */
export function getClickCount(campaignId: string): number {
  return sessionState.clickCounts.get(campaignId) ?? 0;
}
