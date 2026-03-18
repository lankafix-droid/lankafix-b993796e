/**
 * LankaFix Campaign Decision Engine — Production-Grade V2
 *
 * Key V2 improvements:
 *   1. Real rule engine evaluation (user_segment, booking_state, suppression)
 *   2. Cross-surface deduplication — no campaign appears in multiple slots
 *   3. Weighted trust scoring model (not badge count)
 *   4. Nearby slot uses zone-adjacency and ETA context
 *   5. Publishing safety controls (kill switch, rollout %, test campaigns)
 *   6. Fallback supply safety — downgrades weak-supply promos to trust cards
 */
import type {
  Campaign, UserCampaignContext, SupplyContext,
  CampaignScore, RankedCampaigns, SlotStrategy,
} from '@/types/campaign';
import { FALLBACK_CAMPAIGNS, CONTEXT_CAMPAIGNS, SAFE_FALLBACK_CAMPAIGNS } from '@/config/seededCampaigns';
import { SRI_LANKAN_SEASONAL_TRIGGERS } from '@/config/seasonalTriggers';
import {
  evaluateUserSegmentRules,
  evaluateBookingStateRules,
  evaluateSuppressionRules,
} from '@/services/campaignRuleEngine';
import { computeTrustScore } from '@/services/campaignTrustScoring';

// ─── Schedule Check ───────────────────────────────────────────────
function isWithinSchedule(campaign: Campaign): boolean {
  const now = new Date();
  if (campaign.active_from && new Date(campaign.active_from) > now) return false;
  if (campaign.active_to && new Date(campaign.active_to) < now) return false;

  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = dayMap[now.getDay()];
  if (campaign.active_days.length > 0 && !campaign.active_days.includes(today)) return false;

  if (campaign.active_hours && typeof campaign.active_hours === 'object') {
    const hours = campaign.active_hours as { start?: number; end?: number };
    const currentHour = now.getHours();
    if (hours.start !== undefined && hours.end !== undefined) {
      if (hours.start <= hours.end) {
        if (currentHour < hours.start || currentHour >= hours.end) return false;
      } else {
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

// ─── Supply Gating ───────────────────────────────────────────────
function passesSupplyGate(campaign: Campaign, supply: SupplyContext): boolean {
  const threshold = campaign.required_supply_threshold;
  const minConfidence = campaign.minimum_supply_confidence || 0;

  if (campaign.category_ids.length > 0) {
    const hasSupply = campaign.category_ids.some(
      cat => (supply.categorySupply[cat] ?? 0) >= threshold
    );
    if (!hasSupply) return false;

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

// ─── Publishing Safety Gate ──────────────────────────────────────
function passesPublishingSafety(campaign: Campaign): boolean {
  const safety = campaign.publishing_safety;
  if (!safety) return true;

  // Test campaigns only visible in dev/staging
  if (safety.is_test_campaign && import.meta.env.PROD) return false;

  // Rollout percentage: deterministic hash-based sampling
  if (safety.rollout_percentage !== undefined && safety.rollout_percentage < 100) {
    const hash = campaign.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    if ((hash % 100) >= safety.rollout_percentage) return false;
  }

  // Kill switch: if key is set, campaign is force-disabled
  if (safety.kill_switch_key) return false;

  return true;
}

// ─── Lifecycle Detection ─────────────────────────────────────────
function hasActiveLifecycleCards(ctx: UserCampaignContext): boolean {
  return ctx.hasPendingBooking || ctx.hasPendingQuote || ctx.hasAbandonedBooking;
}

// ─── Seasonal Boost ──────────────────────────────────────────────
function getSeasonalBoost(campaign: Campaign): number {
  const month = new Date().getMonth() + 1;
  let boost = 0;
  for (const trigger of SRI_LANKAN_SEASONAL_TRIGGERS) {
    if (!trigger.activeMonths.includes(month)) continue;
    if (campaign.category_ids.some(c => trigger.boostedCategories.includes(c))) {
      boost += trigger.priorityBoost;
    }
  }
  return boost;
}

// ─── Nearby Relevance ────────────────────────────────────────────
function computeNearbyRelevance(campaign: Campaign, supply: SupplyContext, ctx: UserCampaignContext): number {
  if (campaign.campaign_type !== 'nearby_technicians' && campaign.campaign_type !== 'partner_spotlight') {
    return 0;
  }

  let score = 0;
  const nearby = supply.nearby;

  // Direct zone match
  if (ctx.zone && campaign.zones.includes(ctx.zone)) {
    score += 15;
  }

  // Adjacent zone reach
  if (nearby?.adjacentZones && campaign.zones.length > 0) {
    const adjacentMatch = campaign.zones.some(z => nearby.adjacentZones?.includes(z));
    if (adjacentMatch) score += 8;
  }

  // ETA confidence: boost if nearby partners have good ETA
  if (ctx.zone && nearby?.zoneEtaEstimates?.[ctx.zone]) {
    const eta = nearby.zoneEtaEstimates[ctx.zone];
    if (eta <= 20) score += 10;
    else if (eta <= 40) score += 5;
  }

  // Category-zone partner density
  if (ctx.zone && nearby?.zonePartnerMatrix?.[ctx.zone]) {
    const zonePartners = nearby.zonePartnerMatrix[ctx.zone];
    for (const cat of campaign.category_ids) {
      if ((zonePartners[cat] ?? 0) >= 2) score += 5;
    }
  }

  return score;
}

// ─── Full Scoring ────────────────────────────────────────────────
function scoreCampaign(
  campaign: Campaign,
  ctx: UserCampaignContext,
  supply: SupplyContext,
  lifecycleActive: boolean,
): CampaignScore {
  // Evaluate suppression rules
  const { penalty: suppressionPenalty } = evaluateSuppressionRules(
    campaign, ctx, supply, lifecycleActive,
  );

  // Trust score via weighted model
  const trustScore = computeTrustScore(campaign, supply);

  const breakdown = {
    basePriority: campaign.priority,
    contextRelevance: 0,
    zoneRelevance: 0,
    categoryAffinity: 0,
    trustScore: Math.round(trustScore / 5), // Normalize to ~0-20 range for scoring
    supplyConfidence: 0,
    seasonalRelevance: getSeasonalBoost(campaign),
    bookingStateRelevance: 0,
    fatiguePenalty: 0,
    suppressionPenalty: -suppressionPenalty,
    nearbyRelevance: computeNearbyRelevance(campaign, supply, ctx),
  };

  // Category affinity
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
    const avgConf = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.score ?? 50);
    }, 0) / campaign.category_ids.length;
    breakdown.supplyConfidence = Math.round(avgConf / 10);
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
  if (campaign.slot_strategy && SLOT_TO_TYPES[campaign.slot_strategy]) {
    return campaign.slot_strategy;
  }
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

// ─── Cross-Surface Deduplication ─────────────────────────────────
/**
 * Ensures no campaign ID appears in more than one slot bucket.
 * Priority: hero > recovery > trust > trending > business > nearby > education > contextRows
 */
function deduplicateAcrossSlots(
  hero: Campaign[],
  recovery: Campaign[],
  trust: Campaign[],
  trending: Campaign[],
  business: Campaign[],
  nearby: Campaign[],
  education: Campaign[],
  contextRows: Campaign[],
): RankedCampaigns {
  const seen = new Set<string>();

  const dedup = (list: Campaign[]): Campaign[] => {
    const result: Campaign[] = [];
    for (const c of list) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    }
    return result;
  };

  // Deduplicate in priority order
  const dHero = dedup(hero);
  const dRecovery = dedup(recovery);
  const dTrust = dedup(trust);
  const dTrending = dedup(trending);
  const dBusiness = dedup(business);
  const dNearby = dedup(nearby);
  const dEducation = dedup(education);
  const dContext = dedup(contextRows);

  return {
    hero: dHero,
    recovery: dRecovery,
    trust: dTrust,
    trending: dTrending,
    business: dBusiness,
    nearby: dNearby,
    education: dEducation,
    contextRows: dContext,
  };
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
  const lifecycleActive = hasActiveLifecycleCards(userCtx);

  // ── Phase 1: Filter ──────────────────────────────────────────
  const eligible = pool.filter(c => {
    if (c.status !== 'active') return false;
    if (c.approval_status !== 'approved' && c.approval_status !== 'active') return false;
    if (!isWithinSchedule(c)) return false;
    if (!matchesAudience(c, userCtx)) return false;
    if (!passesSupplyGate(c, supplyCtx)) return false;
    if (!passesPublishingSafety(c)) return false;

    // V2: Evaluate real rule engines
    if (!evaluateUserSegmentRules(c.user_segment_rules, userCtx)) return false;
    if (!evaluateBookingStateRules(c.booking_state_rules, userCtx)) return false;

    // Hard suppression check (dismiss/snooze/impression cap)
    const { suppressed } = evaluateSuppressionRules(c, userCtx, supplyCtx, lifecycleActive);
    if (suppressed) return false;

    return true;
  });

  // ── Phase 2: Score and Sort ──────────────────────────────────
  const scored = eligible
    .map(c => scoreCampaign(c, userCtx, supplyCtx, lifecycleActive))
    .sort((a, b) => b.totalScore - a.totalScore);

  // ── Phase 3: Allocate into slot buckets ──────────────────────
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

  // ── Phase 4: Build hero ──────────────────────────────────────
  const hero = [
    ...slots.urgent_alert_slot.slice(0, 1),
    ...contextInjected.slice(0, 2),
    ...slots.top_hero_slot,
  ].slice(0, maxHero);

  // Fallback: ensure at least 2 hero cards from safe fallbacks
  if (hero.length < 2) {
    const safePool = SAFE_FALLBACK_CAMPAIGNS.length > 0 ? SAFE_FALLBACK_CAMPAIGNS : FALLBACK_CAMPAIGNS;
    const fallbackFill = safePool
      .filter(f => !hero.some(h => h.id === f.id))
      .slice(0, 2 - hero.length);
    hero.push(...fallbackFill);
  }

  // ── Phase 5: Build slot outputs ──────────────────────────────
  const contextRows = scored
    .map(s => s.campaign)
    .filter(c => !hero.includes(c))
    .slice(0, maxContext);

  // ── Phase 6: Deduplicate across all surfaces ─────────────────
  return deduplicateAcrossSlots(
    hero,
    [...contextInjected, ...slots.recovery_slot].slice(0, 3),
    slots.trust_slot.slice(0, 4),
    slots.trending_slot.slice(0, 4),
    slots.business_slot.slice(0, 3),
    slots.nearby_slot.slice(0, 3),
    slots.education_slot.slice(0, 3),
    contextRows,
  );
}
