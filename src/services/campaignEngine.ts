/**
 * LankaFix Campaign Decision Engine — Production V3 (Ultra-Hardened)
 *
 * V3 changes over V2.1:
 *   1. Context-injected campaigns pass through full governance pipeline
 *      (suppression, fatigue, publishing safety, deduplication)
 *   2. Fallback fill participates in the global dedup set
 *   3. Kill switch activation source wired to campaignKillSwitch service
 *   4. Rollout sampling documented for multi-session / anon behavior
 *   5. All output paths guaranteed deduplicated — no campaign in >1 bucket
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

// ─── Activated Kill Switch Keys ─────────────────────────────────
/**
 * Populated by campaignKillSwitch.ts on app init.
 * Source of truth: platform_settings table → 'campaign_kill_switches' row.
 * If empty, all campaigns with kill_switch_key references still run.
 * See campaignKillSwitch.ts for full integration docs.
 */
let activatedKillSwitchKeys = new Set<string>();

export function setActivatedKillSwitchKeys(keys: string[]) {
  activatedKillSwitchKeys = new Set(keys);
}

// ─── Deterministic Hash (FNV-1a 32-bit) ─────────────────────────
/**
 * Used for rollout sampling. FNV-1a gives good distribution for short strings.
 * The same input always produces the same output → deterministic bucketing.
 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

// ─── Anonymous Session ID ───────────────────────────────────────
/**
 * Persistent anonymous identifier for rollout sampling when user is not logged in.
 *
 * ROLLOUT BEHAVIOR BY USER STATE:
 *   - Logged in: userId + campaignId → stable across devices & sessions
 *   - Logged out: localStorage anon ID + campaignId → stable per device
 *   - Storage cleared: new anon ID generated → may change rollout bucket
 *     (acceptable: storage clears are rare and not adversarial)
 *   - Multi-device (logged out): different buckets per device (acceptable)
 *   - Multi-device (logged in): same bucket everywhere (correct)
 */
let _anonymousSessionId: string | null = null;
function getAnonymousSessionId(): string {
  if (_anonymousSessionId) return _anonymousSessionId;
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem('lf_anon_session_id')
    : null;
  if (stored) {
    _anonymousSessionId = stored;
    return stored;
  }
  const id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  _anonymousSessionId = id;
  try { localStorage.setItem('lf_anon_session_id', id); } catch { /* SSR safe */ }
  return id;
}

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

// ─── Publishing Safety Gate ─────────────────────────────────────
function passesPublishingSafety(campaign: Campaign, userIdentifier?: string): boolean {
  const safety = campaign.publishing_safety;
  if (!safety) return true;

  // Test campaigns only visible in dev/staging
  if (safety.is_test_campaign && import.meta.env.PROD) return false;

  // Deterministic user-hash rollout sampling
  if (safety.rollout_percentage !== undefined && safety.rollout_percentage < 100) {
    const uid = userIdentifier || getAnonymousSessionId();
    const bucket = fnv1aHash(`${uid}:${campaign.id}`) % 100;
    if (bucket >= safety.rollout_percentage) return false;
  }

  // Kill switch: only disable if key is in the activated set
  // The set is populated by campaignKillSwitch.ts from platform_settings
  if (safety.kill_switch_key && activatedKillSwitchKeys.has(safety.kill_switch_key)) {
    return false;
  }

  return true;
}

// ─── Full Campaign Governance Check ─────────────────────────────
/**
 * V3: Unified governance check used for ALL campaigns, including
 * context-injected lifecycle cards. No campaign bypasses governance.
 */
function passesGovernance(
  campaign: Campaign,
  ctx: UserCampaignContext,
  supply: SupplyContext,
  lifecycleActive: boolean,
  userIdentifier?: string,
): boolean {
  if (campaign.status !== 'active') return false;
  if (campaign.approval_status !== 'approved' && campaign.approval_status !== 'active') return false;
  // Context campaigns don't have schedule windows — skip for them
  const isContextCampaign = campaign.id.startsWith('ctx-');
  if (!isContextCampaign && !isWithinSchedule(campaign)) return false;
  if (!matchesAudience(campaign, ctx)) return false;
  // Context campaigns are category-agnostic — skip supply gate
  if (!isContextCampaign && !passesSupplyGate(campaign, supply)) return false;
  if (!passesPublishingSafety(campaign, userIdentifier)) return false;
  if (!evaluateUserSegmentRules(campaign.user_segment_rules, ctx)) return false;
  if (!evaluateBookingStateRules(campaign.booking_state_rules, ctx)) return false;

  const { suppressed } = evaluateSuppressionRules(campaign, ctx, supply, lifecycleActive);
  if (suppressed) return false;

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

// ─── Category-Specific Travel Tolerance ──────────────────────────
/**
 * SERVICE MODEL CATEGORIES:
 *   Drop-off (user travels to shop): MOBILE → wider radius, less ETA-sensitive
 *   Home visit (tech travels): AC, CONSUMER_ELEC → moderate ETA, on-site
 *   Scheduled inspection: SOLAR, CCTV → flexible ETA, planned visit
 *   Urgent response: IT (business) → tight ETA, time-critical
 *
 * FUTURE ZONE MAP INTEGRATION:
 *   When zone adjacency data is available from the zone intelligence service,
 *   replace the static adjacentZones list with dynamic lookups from
 *   zoneIntelligenceService.getAdjacentZones(userZone).
 */
const CATEGORY_ETA_TOLERANCE: Record<string, { maxEtaMinutes: number; adjacentBoost: number }> = {
  MOBILE: { maxEtaMinutes: 60, adjacentBoost: 10 },
  AC: { maxEtaMinutes: 45, adjacentBoost: 6 },
  IT: { maxEtaMinutes: 30, adjacentBoost: 4 },
  CCTV: { maxEtaMinutes: 60, adjacentBoost: 8 },
  SOLAR: { maxEtaMinutes: 90, adjacentBoost: 10 },
  CONSUMER_ELEC: { maxEtaMinutes: 50, adjacentBoost: 6 },
  SMART_HOME_OFFICE: { maxEtaMinutes: 45, adjacentBoost: 6 },
  POWER_BACKUP: { maxEtaMinutes: 60, adjacentBoost: 8 },
  COPIER: { maxEtaMinutes: 45, adjacentBoost: 6 },
  ELECTRICAL: { maxEtaMinutes: 40, adjacentBoost: 5 },
};
const DEFAULT_ETA_TOLERANCE = { maxEtaMinutes: 45, adjacentBoost: 6 };

// ─── Nearby Relevance ────────────────────────────────────────────
function computeNearbyRelevance(campaign: Campaign, supply: SupplyContext, ctx: UserCampaignContext): number {
  if (campaign.campaign_type !== 'nearby_technicians' && campaign.campaign_type !== 'partner_spotlight') {
    return 0;
  }

  let score = 0;
  const nearby = supply.nearby;

  // Exact zone match — strongest signal
  if (ctx.zone && campaign.zones.includes(ctx.zone)) {
    score += 15;
  }

  for (const cat of campaign.category_ids) {
    const tolerance = CATEGORY_ETA_TOLERANCE[cat] || DEFAULT_ETA_TOLERANCE;

    // Adjacent zone reach (weighted by category service model)
    if (nearby?.adjacentZones && campaign.zones.length > 0) {
      const adjacentMatch = campaign.zones.some(z => nearby.adjacentZones?.includes(z));
      if (adjacentMatch) score += tolerance.adjacentBoost;
    }

    // ETA confidence (category-aware thresholds)
    if (ctx.zone && nearby?.zoneEtaEstimates?.[ctx.zone]) {
      const eta = nearby.zoneEtaEstimates[ctx.zone];
      if (eta <= tolerance.maxEtaMinutes * 0.5) score += 10;
      else if (eta <= tolerance.maxEtaMinutes) score += 5;
      else score -= 5; // Beyond tolerance → penalty

      // Future: service radius check
      // if (nearby.serviceRadiusKm && eta exceeds radius-based limit) score -= 8;
    }

    // Category-zone partner density
    if (ctx.zone && nearby?.zonePartnerMatrix?.[ctx.zone]) {
      const count = nearby.zonePartnerMatrix[ctx.zone][cat] ?? 0;
      if (count >= 3) score += 8;
      else if (count >= 1) score += 3;
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
  const { penalty: suppressionPenalty } = evaluateSuppressionRules(
    campaign, ctx, supply, lifecycleActive,
  );

  const trustScore = computeTrustScore(campaign, supply);

  const breakdown = {
    basePriority: campaign.priority,
    contextRelevance: 0,
    zoneRelevance: 0,
    categoryAffinity: 0,
    trustScore: Math.round(trustScore / 5),
    supplyConfidence: 0,
    seasonalRelevance: getSeasonalBoost(campaign),
    bookingStateRelevance: 0,
    fatiguePenalty: 0,
    suppressionPenalty: -suppressionPenalty,
    nearbyRelevance: computeNearbyRelevance(campaign, supply, ctx),
  };

  if (ctx.lastViewedCategory && campaign.category_ids.includes(ctx.lastViewedCategory)) {
    breakdown.categoryAffinity += 15;
  }
  if (ctx.lastCompletedCategory && campaign.category_ids.includes(ctx.lastCompletedCategory)) {
    breakdown.categoryAffinity += 10;
  }
  if (ctx.zone && campaign.zones.includes(ctx.zone)) {
    breakdown.zoneRelevance += 12;
  }
  if (campaign.language === ctx.language || campaign.language === 'mixed') {
    breakdown.contextRelevance += 5;
  }
  if (ctx.hasPendingQuote && campaign.campaign_type === 'pending_quote') {
    breakdown.bookingStateRelevance += 30;
  }
  if (ctx.hasPendingBooking && campaign.campaign_type === 'user_recovery') {
    breakdown.bookingStateRelevance += 25;
  }
  if (ctx.hasAbandonedBooking && campaign.campaign_type === 'user_recovery') {
    breakdown.bookingStateRelevance += 20;
  }
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

// ─── Context Injection (V3: governed) ────────────────────────────
/**
 * V3: Context campaigns now pass through full governance checks.
 * Previously they were injected directly, bypassing suppression/fatigue.
 * Now they respect dismissal cooldowns, fatigue caps, and publishing safety.
 */
function getGovernedContextCampaigns(
  ctx: UserCampaignContext,
  supply: SupplyContext,
  lifecycleActive: boolean,
  userIdentifier?: string,
): Campaign[] {
  const candidates: Campaign[] = [];
  if (ctx.hasPendingQuote) candidates.push(CONTEXT_CAMPAIGNS.pendingQuote);
  if (ctx.hasPendingBooking) candidates.push(CONTEXT_CAMPAIGNS.pendingBooking);
  if (ctx.hasAbandonedBooking && !ctx.hasPendingBooking) candidates.push(CONTEXT_CAMPAIGNS.abandonedBooking);

  // Filter through governance — context campaigns can be dismissed/snoozed
  return candidates.filter(c =>
    passesGovernance(c, ctx, supply, lifecycleActive, userIdentifier)
  );
}

// ─── Strict Cross-Surface Deduplication (V3) ────────────────────
/**
 * DEDUPLICATION PRIORITY ORDER (highest to lowest):
 *   hero > recovery > trust > trending > business > nearby > education > contextRows
 *
 * GUARANTEE: A campaign ID appears in exactly ONE output bucket.
 * This includes context-injected campaigns and fallback fills.
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

  return {
    hero: dedup(hero),
    recovery: dedup(recovery),
    trust: dedup(trust),
    trending: dedup(trending),
    business: dedup(business),
    nearby: dedup(nearby),
    education: dedup(education),
    contextRows: dedup(contextRows),
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
  const lifecycleActive = hasActiveLifecycleCards(userCtx);
  const userIdentifier = userCtx.userId;

  // V3: Context campaigns go through full governance
  const contextInjected = getGovernedContextCampaigns(
    userCtx, supplyCtx, lifecycleActive, userIdentifier,
  );

  // ── Phase 1: Filter all pool campaigns ───────────────────────
  const eligible = pool.filter(c =>
    passesGovernance(c, userCtx, supplyCtx, lifecycleActive, userIdentifier)
  );

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

  // ── Phase 4: Build hero (context cards first, then scored) ───
  const hero = [
    ...slots.urgent_alert_slot.slice(0, 1),
    ...contextInjected.slice(0, 2),
    ...slots.top_hero_slot,
  ].slice(0, maxHero);

  // V3: Fallback fill also goes through dedup (handled by deduplicateAcrossSlots)
  if (hero.length < 2) {
    const safePool = SAFE_FALLBACK_CAMPAIGNS.length > 0 ? SAFE_FALLBACK_CAMPAIGNS : FALLBACK_CAMPAIGNS;
    const existingIds = new Set(hero.map(h => h.id));
    const fallbackFill = safePool
      .filter(f => !existingIds.has(f.id))
      .slice(0, 2 - hero.length);
    hero.push(...fallbackFill);
  }

  // ── Phase 5: Build contextRows from remaining scored ─────────
  const heroIds = new Set(hero.map(h => h.id));
  const contextRows = scored
    .map(s => s.campaign)
    .filter(c => !heroIds.has(c.id))
    .slice(0, maxContext);

  // ── Phase 6: Strict deduplication across ALL surfaces ────────
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
