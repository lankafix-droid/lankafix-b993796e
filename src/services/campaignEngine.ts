/**
 * LankaFix Campaign Decision Engine
 * Ranks, filters, and gates campaigns based on user context, supply, and operational rules.
 */
import type { Campaign, UserCampaignContext, SupplyContext } from '@/types/campaign';
import { FALLBACK_CAMPAIGNS, CONTEXT_CAMPAIGNS } from '@/config/seededCampaigns';

/** Check if campaign is within its active time window */
function isWithinSchedule(campaign: Campaign): boolean {
  const now = new Date();
  if (campaign.active_from && new Date(campaign.active_from) > now) return false;
  if (campaign.active_to && new Date(campaign.active_to) < now) return false;

  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = dayMap[now.getDay()];
  if (campaign.active_days.length > 0 && !campaign.active_days.includes(today)) return false;

  return true;
}

/** Check if audience matches user context */
function matchesAudience(campaign: Campaign, ctx: UserCampaignContext): boolean {
  switch (campaign.audience_type) {
    case 'all': return true;
    case 'new_user': return !ctx.isReturningUser;
    case 'returning': return ctx.isReturningUser;
    case 'business': return ctx.isBusinessUser;
    case 'consumer': return !ctx.isBusinessUser;
    case 'has_pending': return ctx.hasPendingBooking || ctx.hasPendingQuote;
    case 'has_abandoned': return ctx.hasAbandonedBooking;
    default: return true;
  }
}

/** Supply gating — don't promote categories/zones with no real supply */
function passesSupplyGate(campaign: Campaign, supply: SupplyContext): boolean {
  const threshold = campaign.required_supply_threshold;

  // If campaign targets specific categories, check supply
  if (campaign.category_ids.length > 0) {
    const hasSupply = campaign.category_ids.some(
      cat => (supply.categorySupply[cat] ?? 0) >= threshold
    );
    if (!hasSupply) return false;
  }

  // If campaign targets specific zones, check supply
  if (campaign.zones.length > 0 && supply.zoneSupply) {
    const hasZoneSupply = campaign.zones.some(
      zone => (supply.zoneSupply[zone] ?? 0) >= threshold
    );
    if (!hasZoneSupply) return false;
  }

  return true;
}

/** Calculate contextual priority boost */
function contextBoost(campaign: Campaign, ctx: UserCampaignContext): number {
  let boost = 0;

  // Boost if campaign category matches user's recent activity
  if (ctx.lastViewedCategory && campaign.category_ids.includes(ctx.lastViewedCategory)) {
    boost += 15;
  }
  if (ctx.lastCompletedCategory && campaign.category_ids.includes(ctx.lastCompletedCategory)) {
    boost += 10;
  }

  // Boost zone-relevant campaigns
  if (ctx.zone && campaign.zones.includes(ctx.zone)) {
    boost += 10;
  }

  // Language match
  if (campaign.language === ctx.language || campaign.language === 'mixed') {
    boost += 5;
  }

  return boost;
}

/** Inject user-context campaigns (pending booking, pending quote, etc.) */
function getContextCampaigns(ctx: UserCampaignContext): Campaign[] {
  const result: Campaign[] = [];
  if (ctx.hasPendingQuote) result.push(CONTEXT_CAMPAIGNS.pendingQuote);
  if (ctx.hasPendingBooking) result.push(CONTEXT_CAMPAIGNS.pendingBooking);
  if (ctx.hasAbandonedBooking && !ctx.hasPendingBooking) result.push(CONTEXT_CAMPAIGNS.abandonedBooking);
  return result;
}

/**
 * Main entry: rank and return campaigns for display.
 * @param remoteCampaigns - campaigns fetched from DB
 * @param userCtx - current user state
 * @param supplyCtx - real supply data
 * @param maxHero - max hero carousel items
 * @param maxContext - max below-hero context rows
 */
export function rankCampaigns(
  remoteCampaigns: Campaign[],
  userCtx: UserCampaignContext,
  supplyCtx: SupplyContext,
  maxHero = 5,
  maxContext = 6,
): { hero: Campaign[]; contextRows: Campaign[] } {
  // Start with remote, then fallbacks for resilience
  const pool = remoteCampaigns.length > 0 ? remoteCampaigns : FALLBACK_CAMPAIGNS;

  // Inject user-context campaigns at top priority
  const contextInjected = getContextCampaigns(userCtx);

  // Filter
  const eligible = pool.filter(c =>
    c.status === 'active' &&
    isWithinSchedule(c) &&
    matchesAudience(c, userCtx) &&
    passesSupplyGate(c, supplyCtx)
  );

  // Score and sort
  const scored = eligible.map(c => ({
    campaign: c,
    score: c.priority + contextBoost(c, userCtx),
  })).sort((a, b) => b.score - a.score);

  const rankedCampaigns = scored.map(s => s.campaign);

  // Split: hero-eligible types go to carousel, rest to context rows
  const heroTypes = new Set(['hero_promotion', 'seasonal_demand', 'emergency_alert', 'trust_reassurance']);

  const hero = [
    ...contextInjected.slice(0, 2), // user-state campaigns always first
    ...rankedCampaigns.filter(c => heroTypes.has(c.campaign_type)),
  ].slice(0, maxHero);

  const contextRows = rankedCampaigns
    .filter(c => !heroTypes.has(c.campaign_type) || !hero.includes(c))
    .slice(0, maxContext);

  // Fallback: ensure at least 2 hero cards
  if (hero.length < 2) {
    const fallbackFill = FALLBACK_CAMPAIGNS
      .filter(f => !hero.some(h => h.id === f.id))
      .slice(0, 2 - hero.length);
    hero.push(...fallbackFill);
  }

  return { hero, contextRows };
}
