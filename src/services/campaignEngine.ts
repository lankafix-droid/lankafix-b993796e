/**
 * LankaFix Campaign Decision Engine — Production Grade
 * Ranks, filters, gates, suppresses, and allocates campaigns into slots
 * based on user context, supply confidence, fatigue, and operational safety.
 */
import type {
  Campaign, UserCampaignContext, SupplyContext,
  CampaignScore, RankedCampaigns, SlotStrategy, SeasonalTrigger,
} from '@/types/campaign';
import { FALLBACK_CAMPAIGNS, CONTEXT_CAMPAIGNS } from '@/config/seededCampaigns';
import { SRI_LANKAN_SEASONAL_TRIGGERS } from '@/config/seasonalTriggers';

// ─── Schedule Check ───────────────────────────────────────────────
function isWithinSchedule(campaign: Campaign): boolean {
  const now = new Date();
  if (campaign.active_from && new Date(campaign.active_from) > now) return false;
  if (campaign.active_to && new Date(campaign.active_to) < now) return false;

  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = dayMap[now.getDay()];
  if (campaign.active_days.length > 0 && !campaign.active_days.includes(today)) return false;

  // Hour-based scheduling
  if (campaign.active_hours && typeof campaign.active_hours === 'object') {
    const hours = campaign.active_hours as { start?: number; end?: number };
    const currentHour = now.getHours();
    if (hours.start !== undefined && hours.end !== undefined) {
      if (hours.start <= hours.end) {
        if (currentHour < hours.start || currentHour >= hours.end) return false;
      } else {
        // Overnight range (e.g., 22–6)
        if (currentHour < hours.start && currentHour >= hours.end) return false;
      }
    }
  }

  return true;
}

// ─── Audience Match ───────────────────────────────────────────────
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

// ─── Supply Gating (strict) ──────────────────────────────────────
function passesSupplyGate(campaign: Campaign, supply: SupplyContext): boolean {
  const threshold = campaign.required_supply_threshold;
  const minConfidence = campaign.minimum_supply_confidence || 0;

  if (campaign.category_ids.length > 0) {
    const hasSupply = campaign.category_ids.some(
      cat => (supply.categorySupply[cat] ?? 0) >= threshold
    );
    if (!hasSupply) return false;

    // Check supply confidence if available
    if (minConfidence > 0 && supply.supplyConfidence) {
      const hasConfidence = campaign.category_ids.some(
        cat => (supply.supplyConfidence?.[cat]?.score ?? 0) >= minConfidence
      );
      if (!hasConfidence) return false;
    }
  }

  if (campaign.zones.length > 0 && supply.zoneSupply) {
    const hasZoneSupply = campaign.zones.some(
      zone => (supply.zoneSupply[zone] ?? 0) >= threshold
    );
    if (!hasZoneSupply) return false;
  }

  return true;
}

// ─── Suppression Logic ───────────────────────────────────────────
function isSuppressed(campaign: Campaign, ctx: UserCampaignContext): boolean {
  // Suppress quote reminder if no pending quote
  if (campaign.campaign_type === 'pending_quote' && !ctx.hasPendingQuote) return true;

  // Suppress recovery if no abandoned booking
  if (campaign.campaign_type === 'user_recovery' && !ctx.hasAbandonedBooking && !ctx.hasPendingBooking) return true;

  // Suppress same campaign after dismiss (check dismissal cooldown)
  if (ctx.dismissedCampaigns?.[campaign.id]) {
    const dismissedAt = new Date(ctx.dismissedCampaigns[campaign.id]);
    const cooldownHours = campaign.fatigue_rules?.cooldownHoursAfterDismiss ?? 24;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    if (Date.now() - dismissedAt.getTime() < cooldownMs) return true;
  }

  return false;
}

// ─── Fatigue Check ───────────────────────────────────────────────
function getFatiguePenalty(campaign: Campaign, ctx: UserCampaignContext): number {
  let penalty = 0;
  const rules = campaign.fatigue_rules;
  if (!rules) return 0;

  const impressions = ctx.impressionsToday?.[campaign.id] ?? 0;
  const clicks = ctx.clickCounts?.[campaign.id] ?? 0;

  // Impression fatigue
  if (rules.maxImpressionsPerDay && impressions >= rules.maxImpressionsPerDay) {
    penalty += 100; // Effectively suppress
  } else if (impressions > 3) {
    penalty += impressions * 3; // Gradual decay
  }

  // Click cooldown
  if (rules.maxClicksBeforeCooldown && clicks >= rules.maxClicksBeforeCooldown) {
    penalty += 50;
  }

  return penalty;
}

// ─── Seasonal Boost ──────────────────────────────────────────────
function getSeasonalBoost(campaign: Campaign): number {
  const month = new Date().getMonth() + 1;
  let boost = 0;

  for (const trigger of SRI_LANKAN_SEASONAL_TRIGGERS) {
    if (!trigger.activeMonths.includes(month)) continue;
    const overlap = campaign.category_ids.some(c => trigger.boostedCategories.includes(c));
    if (overlap) boost += trigger.priorityBoost;
  }

  return boost;
}

// ─── Full Scoring ────────────────────────────────────────────────
function scoreCampaign(
  campaign: Campaign,
  ctx: UserCampaignContext,
  supply: SupplyContext,
): CampaignScore {
  const breakdown = {
    basePriority: campaign.priority,
    contextRelevance: 0,
    zoneRelevance: 0,
    categoryAffinity: 0,
    trustScore: campaign.trust_badges.length * 3,
    supplyConfidence: 0,
    seasonalRelevance: getSeasonalBoost(campaign),
    bookingStateRelevance: 0,
    fatiguePenalty: -getFatiguePenalty(campaign, ctx),
    suppressionPenalty: 0,
  };

  // Context relevance
  if (ctx.lastViewedCategory && campaign.category_ids.includes(ctx.lastViewedCategory)) {
    breakdown.categoryAffinity += 15;
  }
  if (ctx.lastCompletedCategory && campaign.category_ids.includes(ctx.lastCompletedCategory)) {
    breakdown.categoryAffinity += 10;
  }

  // Zone relevance
  if (ctx.zone && campaign.zones.includes(ctx.zone)) {
    breakdown.zoneRelevance += 12;
  }

  // Language match
  if (campaign.language === ctx.language || campaign.language === 'mixed') {
    breakdown.contextRelevance += 5;
  }

  // Booking state relevance
  if (ctx.hasPendingQuote && campaign.campaign_type === 'pending_quote') {
    breakdown.bookingStateRelevance += 30;
  }
  if (ctx.hasPendingBooking && campaign.campaign_type === 'user_recovery') {
    breakdown.bookingStateRelevance += 25;
  }
  if (ctx.hasAbandonedBooking && campaign.campaign_type === 'user_recovery') {
    breakdown.bookingStateRelevance += 20;
  }

  // Supply confidence scoring
  if (supply.supplyConfidence && campaign.category_ids.length > 0) {
    const avgConfidence = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.score ?? 50);
    }, 0) / campaign.category_ids.length;
    breakdown.supplyConfidence = Math.round(avgConfidence / 10);
  }

  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { campaign, totalScore, breakdown };
}

// ─── Slot Allocation ─────────────────────────────────────────────
const SLOT_TO_TYPES: Record<SlotStrategy, Set<string>> = {
  top_hero_slot: new Set(['hero_promotion', 'seasonal_demand', 'emergency_alert']),
  urgent_alert_slot: new Set(['emergency_alert']),
  recovery_slot: new Set(['user_recovery', 'pending_quote']),
  trust_slot: new Set(['trust_reassurance', 'warranty_assurance']),
  trending_slot: new Set(['seasonal_demand', 'hero_promotion']),
  business_slot: new Set(['sme_business', 'subscription_amc']),
  nearby_slot: new Set(['nearby_technicians', 'partner_spotlight']),
  education_slot: new Set(['education_info']),
};

function allocateToSlot(campaign: Campaign): SlotStrategy {
  // Use explicit slot_strategy if set and valid
  if (campaign.slot_strategy && SLOT_TO_TYPES[campaign.slot_strategy]) {
    return campaign.slot_strategy;
  }
  // Auto-detect from type
  for (const [slot, types] of Object.entries(SLOT_TO_TYPES)) {
    if (types.has(campaign.campaign_type)) return slot as SlotStrategy;
  }
  return 'trending_slot';
}

// ─── Context Injection ───────────────────────────────────────────
function getContextCampaigns(ctx: UserCampaignContext): Campaign[] {
  const result: Campaign[] = [];
  if (ctx.hasPendingQuote) result.push(CONTEXT_CAMPAIGNS.pendingQuote);
  if (ctx.hasPendingBooking) result.push(CONTEXT_CAMPAIGNS.pendingBooking);
  if (ctx.hasAbandonedBooking && !ctx.hasPendingBooking) result.push(CONTEXT_CAMPAIGNS.abandonedBooking);
  return result;
}

// ─── Main Entry Point ────────────────────────────────────────────
export function rankCampaigns(
  remoteCampaigns: Campaign[],
  userCtx: UserCampaignContext,
  supplyCtx: SupplyContext,
  maxHero = 5,
  maxContext = 6,
): RankedCampaigns {
  const pool = remoteCampaigns.length > 0 ? remoteCampaigns : FALLBACK_CAMPAIGNS;
  const contextInjected = getContextCampaigns(userCtx);

  // Filter: active + scheduled + audience + supply + suppression
  const eligible = pool.filter(c =>
    c.status === 'active' &&
    (c.approval_status === 'approved' || c.approval_status === 'active') &&
    isWithinSchedule(c) &&
    matchesAudience(c, userCtx) &&
    passesSupplyGate(c, supplyCtx) &&
    !isSuppressed(c, userCtx)
  );

  // Score all eligible
  const scored = eligible
    .map(c => scoreCampaign(c, userCtx, supplyCtx))
    .sort((a, b) => b.totalScore - a.totalScore);

  // Allocate into slot buckets
  const slots: Record<SlotStrategy, Campaign[]> = {
    top_hero_slot: [],
    urgent_alert_slot: [],
    recovery_slot: [],
    trust_slot: [],
    trending_slot: [],
    business_slot: [],
    nearby_slot: [],
    education_slot: [],
  };

  for (const s of scored) {
    const slot = allocateToSlot(s.campaign);
    slots[slot].push(s.campaign);
  }

  // Build hero: urgent alerts first → context injected → hero slot
  const hero = [
    ...slots.urgent_alert_slot.slice(0, 1),
    ...contextInjected.slice(0, 2),
    ...slots.top_hero_slot,
  ].slice(0, maxHero);

  // Fallback: ensure at least 2 hero cards
  if (hero.length < 2) {
    const fallbackFill = FALLBACK_CAMPAIGNS
      .filter(f => !hero.some(h => h.id === f.id))
      .slice(0, 2 - hero.length);
    hero.push(...fallbackFill);
  }

  // Build context rows from remaining slots
  const contextRows = scored
    .map(s => s.campaign)
    .filter(c => !hero.includes(c))
    .slice(0, maxContext);

  return {
    hero,
    recovery: [...contextInjected, ...slots.recovery_slot].slice(0, 3),
    trust: slots.trust_slot.slice(0, 4),
    trending: slots.trending_slot.slice(0, 4),
    business: slots.business_slot.slice(0, 3),
    nearby: slots.nearby_slot.slice(0, 3),
    education: slots.education_slot.slice(0, 3),
    contextRows,
  };
}
