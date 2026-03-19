import { useMemo } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useVisualContext } from '@/hooks/useVisualContext';
import { useUserBehavior } from '@/hooks/useUserBehavior';
import CampaignHeroStrip from './CampaignHeroStrip';
import CampaignContextRows from './CampaignContextRows';
import type { UserCampaignContext, SupplyContext } from '@/types/campaign';

/**
 * Top-level smart campaign section for the home page.
 * Wires real user behavior signals + supply context + AI personalization + cultural theming
 * → campaign engine → slotted UI.
 */
export default function SmartCampaignSection() {
  const behavior = useUserBehavior();

  const userCtx = useMemo<UserCampaignContext>(() => ({
    language: 'en',
    userId: behavior.userId ?? undefined,
    hasPendingBooking: behavior.hasPendingBooking,
    hasPendingQuote: false,
    hasAbandonedBooking: false,
    isReturningUser: behavior.isReturningUser,
    isBusinessUser: false,
    bookingCount: behavior.bookingCount,
    preferredCategories: behavior.rankedCategories,
  }), [behavior]);

  // TODO: Wire real supply from readiness service
  const supplyCtx = useMemo<SupplyContext>(() => ({
    categorySupply: {
      MOBILE: 2, AC: 1, IT: 1, CCTV: 1, SOLAR: 1,
      CONSUMER_ELEC: 1, POWER_BACKUP: 1,
    },
    zoneSupply: {},
  }), []);

  const { hero, loading, ...ranked } = useCampaigns(userCtx, supplyCtx);

  // Sri Lankan cultural + time-of-day visual context
  const visualContext = useVisualContext(userCtx.zone);

  return (
    <section aria-label="Smart campaigns" className="py-3">
      <CampaignHeroStrip 
        campaigns={hero} 
        loading={loading} 
        visualContext={visualContext}
      />
      <CampaignContextRows
        ranked={{ hero, ...ranked }}
        className="mt-1"
      />
    </section>
  );
}
