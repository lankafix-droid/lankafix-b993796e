import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { rankCampaigns } from '@/services/campaignEngine';
import { FALLBACK_CAMPAIGNS } from '@/config/seededCampaigns';
import { getSessionFatigueState } from '@/lib/campaignAnalytics';
import type { Campaign, UserCampaignContext, SupplyContext, RankedCampaigns } from '@/types/campaign';

/** Normalize DB row to Campaign type with safe defaults */
function normalizeDbCampaign(d: any): Campaign {
  return {
    ...d,
    category_ids: d.category_ids ?? [],
    zones: d.zones ?? [],
    active_days: d.active_days ?? [],
    trust_badges: (d.trust_badges ?? []) as Campaign['trust_badges'],
    booking_state_rules: d.booking_state_rules ?? {},
    user_segment_rules: d.user_segment_rules ?? {},
    suppression_rules: d.suppression_rules ?? {},
    fatigue_rules: d.fatigue_rules ?? {},
    publishing_safety: d.publishing_safety ?? undefined,
    required_supply_threshold: d.required_supply_threshold ?? 1,
    minimum_supply_confidence: d.minimum_supply_confidence ?? 0,
    slot_strategy: d.slot_strategy ?? 'top_hero_slot',
    approval_status: d.approval_status ?? 'approved',
  };
}

/**
 * Load user's dismiss/snooze history from backend for strict enforcement.
 * Returns { dismissedCampaigns, snoozedCampaigns } with timestamps.
 */
async function loadDismissalState(userId: string): Promise<{
  dismissedCampaigns: Record<string, string>;
  snoozedCampaigns: Record<string, string>;
}> {
  const dismissed: Record<string, string> = {};
  const snoozed: Record<string, string> = {};

  try {
    // Only load recent dismissals (last 7 days) for performance
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('campaign_dismissals')
      .select('campaign_id, dismissal_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (data) {
      for (const row of data as any[]) {
        // Keep only most recent per campaign
        if (row.dismissal_type === 'dismiss' && !dismissed[row.campaign_id]) {
          dismissed[row.campaign_id] = row.created_at;
        }
        if (row.dismissal_type === 'snooze' && !snoozed[row.campaign_id]) {
          snoozed[row.campaign_id] = row.created_at;
        }
      }
    }
  } catch {
    // Non-critical — proceed without dismissal data
  }

  return { dismissedCampaigns: dismissed, snoozedCampaigns: snoozed };
}

/** Fetch active campaigns from DB, falling back to static defaults */
export function useCampaigns(
  userCtx: UserCampaignContext,
  supplyCtx: SupplyContext,
): RankedCampaigns & { loading: boolean } {
  const [remoteCampaigns, setRemoteCampaigns] = useState<Campaign[]>([]);
  const [dismissalState, setDismissalState] = useState<{
    dismissedCampaigns: Record<string, string>;
    snoozedCampaigns: Record<string, string>;
  }>({ dismissedCampaigns: {}, snoozedCampaigns: {} });
  const [loading, setLoading] = useState(true);

  // Load campaigns and dismissal state in parallel
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const campaignPromise = supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(50);

      const dismissalPromise = userCtx.userId
        ? loadDismissalState(userCtx.userId)
        : Promise.resolve({ dismissedCampaigns: {}, snoozedCampaigns: {} });

      try {
        const [{ data }, dismissals] = await Promise.all([campaignPromise, dismissalPromise]);

        if (!cancelled) {
          if (data) setRemoteCampaigns(data.map(normalizeDbCampaign));
          setDismissalState(dismissals);
        }
      } catch {
        // Silent fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userCtx.userId]);

  // Merge client-side fatigue state with backend dismissals
  const enrichedCtx = useMemo<UserCampaignContext>(() => {
    const fatigueState = getSessionFatigueState();
    return {
      ...userCtx,
      dismissedCampaigns: dismissalState.dismissedCampaigns,
      snoozedCampaigns: dismissalState.snoozedCampaigns,
      impressionsToday: fatigueState.impressionsToday,
      clickCounts: fatigueState.clickCounts,
      lastClickTimestamps: fatigueState.lastClickTimestamps,
    };
  }, [userCtx, dismissalState]);

  const ranked = useMemo(
    () => rankCampaigns(
      remoteCampaigns.length > 0 ? remoteCampaigns : FALLBACK_CAMPAIGNS,
      enrichedCtx,
      supplyCtx,
    ),
    [remoteCampaigns, enrichedCtx, supplyCtx],
  );

  return { ...ranked, loading };
}
