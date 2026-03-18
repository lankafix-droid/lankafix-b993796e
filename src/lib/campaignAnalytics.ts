/**
 * Campaign-specific analytics tracking.
 * Events flow through the main analytics wrapper + DB logging.
 */
import { track } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignEventType } from '@/types/campaign';

export function trackCampaignEvent(
  campaignId: string,
  eventType: CampaignEventType,
  metadata?: Record<string, unknown>,
) {
  // Fire analytics event
  track(`campaign_${eventType}`, {
    campaign_id: campaignId,
    ...metadata,
  });

  // Best-effort DB insert (non-blocking)
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    supabase.from('campaign_events').insert({
      campaign_id: campaignId,
      user_id: data.user.id,
      event_type: eventType,
      metadata: metadata ?? {},
    } as Record<string, unknown>).then(() => {});
  });
}
