import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { rankCampaigns } from '@/services/campaignEngine';
import { FALLBACK_CAMPAIGNS } from '@/config/seededCampaigns';
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
    required_supply_threshold: d.required_supply_threshold ?? 1,
    minimum_supply_confidence: d.minimum_supply_confidence ?? 0,
    slot_strategy: d.slot_strategy ?? 'top_hero_slot',
    approval_status: d.approval_status ?? 'approved',
  };
}

/** Fetch active campaigns from DB, falling back to static defaults */
export function useCampaigns(
  userCtx: UserCampaignContext,
  supplyCtx: SupplyContext,
): RankedCampaigns & { loading: boolean } {
  const [remoteCampaigns, setRemoteCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'active')
          .order('priority', { ascending: false })
          .limit(50);

        if (!cancelled && data) {
          setRemoteCampaigns(data.map(normalizeDbCampaign));
        }
      } catch {
        // Silent fallback to static campaigns
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ranked = useMemo(
    () => rankCampaigns(
      remoteCampaigns.length > 0 ? remoteCampaigns : FALLBACK_CAMPAIGNS,
      userCtx,
      supplyCtx,
    ),
    [remoteCampaigns, userCtx, supplyCtx],
  );

  return { ...ranked, loading };
}
