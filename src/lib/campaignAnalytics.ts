/**
 * Campaign Analytics & Attribution Layer — V2
 *
 * Improvements:
 *   - Full attribution lifecycle (booking, quote, completion, cancellation, dispute)
 *   - Structured writeAttribution for DB persistence
 *   - Fatigue state helpers for the rule engine
 *   - Clear separation of client-session vs backend-synced state
 */
import { track } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignEventType, CampaignAttribution } from '@/types/campaign';

// ─── Session State (client-side, resets on app restart) ──────────
const sessionState = {
  firstTouchCampaignId: null as string | null,
  lastTouchCampaignId: null as string | null,
  assistedCampaignIds: new Set<string>(),
  impressionCounts: new Map<string, number>(),
  clickCounts: new Map<string, number>(),
  lastClickTimestamps: new Map<string, string>(),
};

// ─── Core Event Tracker ──────────────────────────────────────────
export function trackCampaignEvent(
  campaignId: string,
  eventType: CampaignEventType,
  metadata?: Record<string, unknown>,
) {
  // Update session attribution state on interaction events
  if (eventType === 'cta_click' || eventType === 'card_click') {
    if (!sessionState.firstTouchCampaignId) {
      sessionState.firstTouchCampaignId = campaignId;
    }
    sessionState.lastTouchCampaignId = campaignId;
    sessionState.assistedCampaignIds.add(campaignId);
    sessionState.clickCounts.set(campaignId, (sessionState.clickCounts.get(campaignId) ?? 0) + 1);
    sessionState.lastClickTimestamps.set(campaignId, new Date().toISOString());
  }

  if (eventType === 'viewable_impression') {
    sessionState.impressionCounts.set(campaignId, (sessionState.impressionCounts.get(campaignId) ?? 0) + 1);
  }

  // Fire analytics event with consistent naming (BigQuery-ready)
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

// ─── Dismiss / Snooze (backend-synced) ───────────────────────────
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

/**
 * Write a full attribution record to the DB.
 * Called when a conversion event occurs (booking created, completed, etc.)
 */
export async function writeAttribution(
  attribution: Omit<CampaignAttribution, 'attributedRevenueLkr'> & { attributedRevenueLkr?: number },
) {
  const session = getSessionAttribution();

  const record = {
    booking_id: attribution.bookingId,
    first_touch_campaign_id: attribution.firstTouchCampaignId ?? session.firstTouchCampaignId,
    last_touch_campaign_id: attribution.lastTouchCampaignId ?? session.lastTouchCampaignId,
    assisted_campaign_ids: attribution.assistedCampaignIds.length > 0
      ? attribution.assistedCampaignIds
      : session.assistedCampaignIds,
    attributed_revenue_lkr: attribution.attributedRevenueLkr ?? 0,
    attribution_type: attribution.attributionType ?? 'last_touch',
  };

  // Best-effort insert
  await supabase.from('campaign_attributions').insert([record] as any);
}

/**
 * Convenience: attribute a booking creation to the current campaign session.
 */
export function attributeBookingCreation(bookingId: string, revenueLkr?: number) {
  const session = getSessionAttribution();
  if (!session.firstTouchCampaignId && !session.lastTouchCampaignId) return;

  writeAttribution({
    bookingId,
    firstTouchCampaignId: session.firstTouchCampaignId ?? undefined,
    lastTouchCampaignId: session.lastTouchCampaignId ?? undefined,
    assistedCampaignIds: session.assistedCampaignIds,
    attributedRevenueLkr: revenueLkr,
    attributionType: 'last_touch',
    attributionEvent: 'booking_started',
  });

  // Also fire a tracking event
  trackCampaignEvent(
    session.lastTouchCampaignId ?? session.firstTouchCampaignId ?? '',
    'booking_started',
    { booking_id: bookingId },
  );
}

/**
 * Attribute a booking completion.
 */
export function attributeBookingCompletion(bookingId: string, revenueLkr: number) {
  const session = getSessionAttribution();
  if (!session.lastTouchCampaignId) return;

  writeAttribution({
    bookingId,
    firstTouchCampaignId: session.firstTouchCampaignId ?? undefined,
    lastTouchCampaignId: session.lastTouchCampaignId ?? undefined,
    assistedCampaignIds: session.assistedCampaignIds,
    attributedRevenueLkr: revenueLkr,
    attributionType: 'last_touch',
    attributionEvent: 'booking_completed',
  });
}

// ─── Fatigue State Helpers (for rule engine consumption) ─────────
export function getImpressionCount(campaignId: string): number {
  return sessionState.impressionCounts.get(campaignId) ?? 0;
}

export function getClickCount(campaignId: string): number {
  return sessionState.clickCounts.get(campaignId) ?? 0;
}

export function getSessionFatigueState(): {
  impressionsToday: Record<string, number>;
  clickCounts: Record<string, number>;
  lastClickTimestamps: Record<string, string>;
} {
  return {
    impressionsToday: Object.fromEntries(sessionState.impressionCounts),
    clickCounts: Object.fromEntries(sessionState.clickCounts),
    lastClickTimestamps: Object.fromEntries(sessionState.lastClickTimestamps),
  };
}
