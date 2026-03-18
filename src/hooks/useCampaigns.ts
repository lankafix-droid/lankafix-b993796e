import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { rankCampaigns } from '@/services/campaignEngine';
import { FALLBACK_CAMPAIGNS } from '@/config/seededCampaigns';
import type { Campaign, UserCampaignContext, SupplyContext } from '@/types/campaign';

/** Fetch active campaigns from DB, falling back to static defaults */
export function useCampaigns(
  userCtx: UserCampaignContext,
  supplyCtx: SupplyContext,
) {
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
          .limit(30);

        if (!cancelled && data) {
          setRemoteCampaigns(data.map((d: any) => ({
            ...d,
            category_ids: d.category_ids ?? [],
            zones: d.zones ?? [],
            active_days: d.active_days ?? [],
            trust_badges: d.trust_badges ?? [],
            booking_state_rules: d.booking_state_rules ?? {},
            user_segment_rules: d.user_segment_rules ?? {},
            suppression_rules: d.suppression_rules ?? {},
          })));
        }
      } catch {
        // Fallback to static
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
