import { useMemo } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import CampaignHeroStrip from './CampaignHeroStrip';
import CampaignContextRows from './CampaignContextRows';
import type { UserCampaignContext, SupplyContext } from '@/types/campaign';

/**
 * Top-level smart campaign section for the home page.
 * Wires up user context + supply context → campaign engine → UI.
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
      CONSUMER_ELEC: 1,
    },
    zoneSupply: {},
  }), []);

  const { hero, contextRows, loading } = useCampaigns(userCtx, supplyCtx);

  return (
    <section aria-label="Smart campaigns" className="py-3">
      <CampaignHeroStrip campaigns={hero} loading={loading} />
      <CampaignContextRows campaigns={contextRows} className="mt-1" />
    </section>
  );
}
