/**
 * Campaign Analytics & Attribution Layer — V2.1 (Final Hardening)
 *
 * V2.1 changes:
 *   - attributeLifecycleEvent: generic lifecycle attribution for all conversion points
 *   - Clear separation of client-session vs backend-synced state
 *   - Fatigue persistence strategy documentation
 *
 * FATIGUE PERSISTENCE ARCHITECTURE:
 *
 * Client-side (session memory, resets on app restart):
 *   - impressionsToday: incremented in-memory per session
 *   - clickCounts: incremented in-memory per session
 *   - lastClickTimestamps: per session
 *   Best-effort, low-latency, acceptable data loss on restart.
 *
 * Backend-synced (campaign_dismissals table):
 *   - dismissedCampaigns: written to DB on dismiss, loaded on session start
 *   - snoozedCampaigns: written to DB on snooze, loaded on session start
 *   Strict enforcement, persists across devices and sessions.
 *
 * Daily reset strategy:
 *   - impressionsToday resets naturally on new session (client-side)
 *   - Backend dismissals use timestamp comparison (cooldownHours)
 *   - No cron needed — all time-based via comparison at read time
 *
 * FUTURE UPGRADE PATH (server-side daily aggregates):
 *   When stricter daily capping is needed for high-priority campaigns:
 *   1. Create campaign_impression_daily table (campaign_id, user_id, date, count)
 *   2. Edge function to increment on viewable_impression events
 *   3. Load daily counts on session init alongside dismissals
 *   4. This replaces client-side impressionsToday for strict enforcement
 *   Current client-side approach is acceptable for launch; upgrade when
 *   impression fraud or cross-device cap enforcement becomes a priority.
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
 * Called at any conversion lifecycle point.
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
  await supabase.from('campaign_attributions').insert([record] as any);
}

/**
 * V2.1: Generic lifecycle attribution.
 * Covers: booking_started, quote_started, quote_approved, booking_completed,
 * cancellation, no_provider_found, dispute_escalated.
 */
export function attributeLifecycleEvent(
  bookingId: string,
  event: CampaignEventType,
  revenueLkr?: number,
) {
  const session = getSessionAttribution();
  if (!session.firstTouchCampaignId && !session.lastTouchCampaignId) return;

  writeAttribution({
    bookingId,
    firstTouchCampaignId: session.firstTouchCampaignId ?? undefined,
    lastTouchCampaignId: session.lastTouchCampaignId ?? undefined,
    assistedCampaignIds: session.assistedCampaignIds,
    attributedRevenueLkr: revenueLkr,
    attributionType: 'last_touch',
    attributionEvent: event,
  });

  trackCampaignEvent(
    session.lastTouchCampaignId ?? session.firstTouchCampaignId ?? '',
    event,
    { booking_id: bookingId, revenue_lkr: revenueLkr },
  );
}

// Convenience wrappers for common lifecycle points
export const attributeBookingCreation = (id: string, rev?: number) => attributeLifecycleEvent(id, 'booking_started', rev);
export const attributeBookingCompletion = (id: string, rev: number) => attributeLifecycleEvent(id, 'booking_completed', rev);
export const attributeQuoteCreation = (id: string) => attributeLifecycleEvent(id, 'quote_started');
export const attributeQuoteApproval = (id: string, rev?: number) => attributeLifecycleEvent(id, 'quote_approved', rev);
export const attributeCancellation = (id: string) => attributeLifecycleEvent(id, 'cancellation');
export const attributeNoProviderFound = (id: string) => attributeLifecycleEvent(id, 'no_provider_found');
export const attributeDisputeEscalated = (id: string) => attributeLifecycleEvent(id, 'dispute_escalated');

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
