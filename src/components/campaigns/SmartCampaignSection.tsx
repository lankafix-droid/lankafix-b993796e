import { useMemo } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useVisualContext } from '@/hooks/useVisualContext';
import CampaignHeroStrip from './CampaignHeroStrip';
import CampaignContextRows from './CampaignContextRows';
import type { UserCampaignContext, SupplyContext } from '@/types/campaign';

/**
 * Top-level smart campaign section for the home page.
 * Wires user context + supply context + AI personalization + cultural theming
 * → campaign engine → slotted UI.
 */
export default function SmartCampaignSection() {
  // TODO: Wire real user context from auth/booking state
  const userCtx = useMemo<UserCampaignContext>(() => ({
    language: 'en',
    hasPendingBooking: false,
    hasPendingQuote: false,
    hasAbandonedBooking: false,
    isReturningUser: false,
    isBusinessUser: false,
    bookingCount: 0,
  }), []);

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
