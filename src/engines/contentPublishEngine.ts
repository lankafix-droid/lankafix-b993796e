/**
 * Content Publish Engine v5 — Launch-grade, SL-first, source-diverse premium ranking.
 * Enforces source diversity, penalizes weak sources, rewards local utility.
 * Returns structured publish stats from all modes.
 */

export interface PublishCandidate {
  id: string;
  content_type: string;
  freshness_score: number;
  source_trust_score: number | null;
  ai_quality_score: number | null;
  status: string;
  published_at: string | null;
  category_codes: string[];
  source_country?: string | null;
  source_name?: string | null;
  image_url?: string | null;
  is_safety?: boolean;
}

export interface PublishRule {
  slot_code: string;
  content_types: string[];
  maxItems: number;
  minSourceTrust: number;
  minAIQuality: number;
  minFreshness: number;
  /** Premium surface — gets SL-first, image-aware, trust-weighted ranking */
  premium?: boolean;
}

export interface PublishStats {
  mode: string;
  attempted_surfaces: string[];
  completed_surfaces: string[];
  skipped_surfaces: string[];
  assignments_written: number;
  dry_run_preview_count: number;
  duration_ms: number;
  errors: string[];
}

/** Maximum items from the same source on any single surface */
const MAX_SAME_SOURCE_PER_SURFACE = 2;

/** Source names with known low average quality — apply ranking penalty */
const WEAK_SOURCE_PENALTY: Record<string, number> = {
  'Ars Technica RSS': -10,
  'Electrek Energy': -7,
  'Hacker News Best': -14,
  'Techmeme': -3,
  'How-To Geek': -4,
};

/** SL-relevant category codes that get extra local utility boost */
const SL_UTILITY_CATEGORIES = new Set([
  'ELECTRICAL', 'SOLAR', 'POWER_BACKUP', 'MOBILE', 'AC', 'CONSUMER_ELEC',
  'CCTV', 'IT', 'NETWORK', 'SMART_HOME_OFFICE', 'HOME_SECURITY',
  'PLUMBING', 'APPLIANCE_INSTALL',
]);

/** Safety-related content types that get urgency boost on premium surfaces */
const SAFETY_TYPES = new Set(['safety_alert', 'scam_alert']);

/** High-value content types for hero placement */
const HERO_PREFERRED_TYPES = new Set([
  'breaking_news', 'safety_alert', 'innovation', 'market_shift',
]);

export const DEFAULT_PUBLISH_RULES: PublishRule[] = [
  {
    slot_code: 'homepage_hero',
    content_types: ['breaking_news', 'hot_topic', 'innovation', 'safety_alert', 'market_shift'],
    maxItems: 3,
    minSourceTrust: 0.6,
    minAIQuality: 0.50,
    minFreshness: 15,
    premium: true,
  },
  {
    slot_code: 'homepage_hot_now',
    content_types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read', 'innovation'],
    maxItems: 8,
    minSourceTrust: 0.5,
    minAIQuality: 0.44,
    minFreshness: 12,
  },
  {
    slot_code: 'homepage_did_you_know',
    content_types: ['knowledge_fact', 'on_this_day', 'history', 'numbers_insight'],
    maxItems: 4,
    minSourceTrust: 0.3,
    minAIQuality: 0.40,
    minFreshness: 5,
  },
  {
    slot_code: 'homepage_innovations',
    content_types: ['innovation', 'market_shift', 'trend_signal'],
    maxItems: 4,
    minSourceTrust: 0.5,
    minAIQuality: 0.46,
    minFreshness: 10,
  },
  {
    slot_code: 'homepage_safety',
    content_types: ['safety_alert', 'scam_alert'],
    maxItems: 3,
    minSourceTrust: 0.6,
    minAIQuality: 0.48,
    minFreshness: 8,
    premium: true,
  },
  {
    slot_code: 'homepage_numbers',
    content_types: ['numbers_insight'],
    maxItems: 4,
    minSourceTrust: 0.4,
    minAIQuality: 0.40,
    minFreshness: 5,
  },
  {
    slot_code: 'homepage_popular',
    content_types: ['most_read', 'hot_topic', 'how_to', 'innovation'],
    maxItems: 5,
    minSourceTrust: 0.4,
    minAIQuality: 0.42,
    minFreshness: 8,
  },
  {
    slot_code: 'ai_banner_forum',
    content_types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal', 'market_shift', 'scam_alert'],
    maxItems: 5,
    minSourceTrust: 0.6,
    minAIQuality: 0.52,
    minFreshness: 15,
    premium: true,
  },
  {
    slot_code: 'category_featured',
    content_types: ['innovation', 'hot_topic', 'breaking_news', 'safety_alert', 'knowledge_fact', 'market_shift'],
    maxItems: 3,
    minSourceTrust: 0.5,
    minAIQuality: 0.46,
    minFreshness: 8,
    premium: true,
  },
  {
    slot_code: 'category_feed',
    content_types: ['hot_topic', 'innovation', 'knowledge_fact', 'how_to', 'most_read', 'trend_signal', 'numbers_insight', 'safety_alert', 'scam_alert', 'market_shift'],
    maxItems: 6,
    minSourceTrust: 0.3,
    minAIQuality: 0.40,
    minFreshness: 5,
  },
];

/**
 * Filter and rank candidates for a given surface slot.
 * Premium surfaces get SL-first, image-aware, trust-weighted, source-diverse scoring.
 */
export function rankForSurface(
  candidates: PublishCandidate[],
  rule: PublishRule
): Array<{ id: string; rank_score: number }> {
  const isPremium = rule.premium ?? false;
  const isHero = rule.slot_code === 'homepage_hero';
  const isSafetySurface = rule.slot_code === 'homepage_safety';

  const scored = candidates
    .filter(c => {
      if (!rule.content_types.includes(c.content_type)) return false;
      if (c.status !== 'published') return false;
      if ((c.source_trust_score ?? 0.5) < rule.minSourceTrust) return false;
      if ((c.ai_quality_score ?? 0.5) < rule.minAIQuality) return false;
      if (c.freshness_score < rule.minFreshness) return false;
      return true;
    })
    .map(c => {
      const trust = c.source_trust_score ?? 0.5;
      const quality = c.ai_quality_score ?? 0.5;
      const isSL = c.source_country === 'lk' || c.source_country === 'LK';
      const hasImage = !!c.image_url;
      const isSafety = SAFETY_TYPES.has(c.content_type);
      const isHeroType = HERO_PREFERRED_TYPES.has(c.content_type);

      const recencyBonus = c.published_at
        ? Math.max(0, 100 - (Date.now() - new Date(c.published_at).getTime()) / 3600000)
        : 0;

      // Local utility: SL items in service-relevant categories get extra boost
      const hasLocalUtility = isSL && c.category_codes.some(cc => SL_UTILITY_CATEGORIES.has(cc));

      // Source penalty for known weak sources
      const sourcePenalty = WEAK_SOURCE_PENALTY[c.source_name ?? ''] ?? 0;

      let rank: number;

      if (isPremium) {
        // Premium: SL-first, quality-second, trust-third, image-fourth
        rank = (
          (isSL ? 24 : 0) +               // Strongest signal: Sri Lanka relevance
          quality * 100 * 0.22 +           // Quality
          trust * 100 * 0.16 +             // Trust
          c.freshness_score * 0.12 +       // Freshness
          recencyBonus * 0.05 +
          (hasLocalUtility ? 12 : 0) +     // Extra for SL items in relevant categories
          (hasImage ? 9 : 0) +             // Image bonus
          (isSafety ? 8 : 0) +             // Safety urgency
          (isHero && isHeroType ? 5 : 0) + // Hero type preference
          sourcePenalty
        );

        // Safety surface: extra urgency weighting
        if (isSafetySurface && isSafety) rank += 6;
      } else {
        // Standard ranking
        rank = (
          c.freshness_score * 0.26 +
          trust * 100 * 0.20 +
          quality * 100 * 0.22 +
          recencyBonus * 0.08 +
          (isSL ? 14 : 0) +
          (hasLocalUtility ? 6 : 0) +
          (hasImage ? 3 : 0) +
          sourcePenalty
        );
      }

      return { id: c.id, rank_score: Math.round(rank * 10) / 10, source_name: c.source_name ?? '' };
    })
    .sort((a, b) => b.rank_score - a.rank_score);

  // Source diversity enforcement: max N items from same source per surface
  const result: Array<{ id: string; rank_score: number }> = [];
  const sourceCounts = new Map<string, number>();

  for (const item of scored) {
    if (result.length >= rule.maxItems) break;
    const count = sourceCounts.get(item.source_name) ?? 0;
    if (count >= MAX_SAME_SOURCE_PER_SURFACE) continue;
    sourceCounts.set(item.source_name, count + 1);
    result.push({ id: item.id, rank_score: item.rank_score });
  }

  return result;
}

/**
 * Check if a content item meets minimum publish thresholds.
 */
export function meetsPublishThreshold(
  item: { source_trust_score: number | null; ai_quality_score: number | null; freshness_score: number; status: string },
  context: 'general' | 'premium' | 'sl_priority' | 'safety' = 'general'
): boolean {
  if (item.status === 'rejected' || item.status === 'archived') return false;
  const trust = item.source_trust_score ?? 0.5;
  const quality = item.ai_quality_score ?? 0;
  const freshness = item.freshness_score;

  switch (context) {
    case 'premium':
      return trust >= 0.5 && quality >= QUALITY_THRESHOLDS.premium_surface && freshness >= 8;
    case 'sl_priority':
      return trust >= 0.3 && quality >= QUALITY_THRESHOLDS.sl_priority_publish && freshness >= 3;
    case 'safety':
      return trust >= 0.5 && quality >= QUALITY_THRESHOLDS.safety_publish && freshness >= 5;
    default:
      return trust >= 0.3 && quality >= QUALITY_THRESHOLDS.general_publish && freshness >= 5;
  }
}

/** Tiered quality thresholds for different contexts */
export const QUALITY_THRESHOLDS = {
  premium_surface: 0.48,
  standard_surface: 0.42,
  general_publish: 0.40,
  sl_priority_publish: 0.35,
  safety_publish: 0.46,
  rescue_minimum: 0.30,
  hero_minimum: 0.50,
  ai_banner_minimum: 0.52,
} as const;

/** Create empty stats object for tracking publish operations */
export function createPublishStats(mode: string): PublishStats {
  return {
    mode,
    attempted_surfaces: [],
    completed_surfaces: [],
    skipped_surfaces: [],
    assignments_written: 0,
    dry_run_preview_count: 0,
    duration_ms: 0,
    errors: [],
  };
}

/** Which surfaces each publish mode targets */
export const PUBLISH_MODE_SURFACES: Record<string, string[]> = {
  publish_fast: [
    'homepage_hero', 'homepage_hot_now', 'homepage_did_you_know',
    'homepage_innovations', 'homepage_safety', 'homepage_numbers',
    'homepage_popular', 'ai_banner_forum',
  ],
  publish_premium: [
    'homepage_hero', 'homepage_safety', 'ai_banner_forum', 'category_featured',
  ],
  publish_category_batch: [
    'category_featured', 'category_feed',
  ],
  publish: [
    'homepage_hero', 'homepage_hot_now', 'homepage_did_you_know',
    'homepage_innovations', 'homepage_safety', 'homepage_numbers',
    'homepage_popular', 'ai_banner_forum', 'category_featured', 'category_feed',
  ],
};
