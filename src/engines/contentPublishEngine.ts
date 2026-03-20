/**
 * Content Publish Engine v2 — SL-first, image-aware, trust-weighted premium ranking.
 * Items must meet trust, quality, freshness, and relevance thresholds.
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

export const DEFAULT_PUBLISH_RULES: PublishRule[] = [
  {
    slot_code: 'homepage_hero',
    content_types: ['breaking_news', 'hot_topic', 'innovation', 'safety_alert'],
    maxItems: 3,
    minSourceTrust: 0.6,
    minAIQuality: 0.55,
    minFreshness: 20,
    premium: true,
  },
  {
    slot_code: 'homepage_hot_now',
    content_types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read'],
    maxItems: 8,
    minSourceTrust: 0.5,
    minAIQuality: 0.5,
    minFreshness: 20,
  },
  {
    slot_code: 'homepage_did_you_know',
    content_types: ['knowledge_fact', 'on_this_day', 'history'],
    maxItems: 4,
    minSourceTrust: 0.3,
    minAIQuality: 0.4,
    minFreshness: 5,
  },
  {
    slot_code: 'homepage_innovations',
    content_types: ['innovation', 'market_shift', 'trend_signal'],
    maxItems: 4,
    minSourceTrust: 0.5,
    minAIQuality: 0.5,
    minFreshness: 10,
  },
  {
    slot_code: 'homepage_safety',
    content_types: ['safety_alert', 'scam_alert'],
    maxItems: 3,
    minSourceTrust: 0.6,
    minAIQuality: 0.55,
    minFreshness: 15,
    premium: true,
  },
  {
    slot_code: 'homepage_numbers',
    content_types: ['numbers_insight'],
    maxItems: 4,
    minSourceTrust: 0.4,
    minAIQuality: 0.4,
    minFreshness: 5,
  },
  {
    slot_code: 'homepage_popular',
    content_types: ['most_read', 'hot_topic', 'how_to'],
    maxItems: 5,
    minSourceTrust: 0.4,
    minAIQuality: 0.4,
    minFreshness: 10,
  },
  {
    slot_code: 'ai_banner_forum',
    content_types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal', 'market_shift'],
    maxItems: 5,
    minSourceTrust: 0.6,
    minAIQuality: 0.6,
    minFreshness: 25,
    premium: true,
  },
  {
    slot_code: 'category_featured',
    content_types: ['innovation', 'hot_topic', 'breaking_news', 'safety_alert', 'knowledge_fact', 'market_shift'],
    maxItems: 3,
    minSourceTrust: 0.5,
    minAIQuality: 0.5,
    minFreshness: 10,
    premium: true,
  },
  {
    slot_code: 'category_feed',
    content_types: ['hot_topic', 'innovation', 'knowledge_fact', 'how_to', 'most_read', 'trend_signal', 'numbers_insight', 'safety_alert', 'scam_alert', 'market_shift'],
    maxItems: 6,
    minSourceTrust: 0.3,
    minAIQuality: 0.4,
    minFreshness: 5,
  },
];

/**
 * Filter and rank candidates for a given surface slot.
 * Premium surfaces get SL-first, image-aware, trust-weighted scoring.
 */
export function rankForSurface(
  candidates: PublishCandidate[],
  rule: PublishRule
): Array<{ id: string; rank_score: number }> {
  const isPremium = rule.premium ?? false;

  return candidates
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
      const isSafety = c.content_type === 'safety_alert' || c.content_type === 'scam_alert';

      const recencyBonus = c.published_at
        ? Math.max(0, 100 - (Date.now() - new Date(c.published_at).getTime()) / 3600000)
        : 0;

      let rank: number;

      if (isPremium) {
        // Premium ranking: quality-first, SL-boosted, image-aware
        rank = (
          quality * 100 * 0.28 +
          trust * 100 * 0.20 +
          c.freshness_score * 0.18 +
          recencyBonus * 0.10 +
          (isSL ? 18 : 0) +         // Strong SL boost for premium surfaces
          (hasImage ? 8 : 0) +       // Image presence bonus
          (isSafety ? 6 : 0)         // Safety urgency bonus
        );
      } else {
        // Standard ranking
        rank = (
          c.freshness_score * 0.30 +
          trust * 100 * 0.22 +
          quality * 100 * 0.25 +
          recencyBonus * 0.13 +
          (isSL ? 10 : 0)
        );
      }

      return { id: c.id, rank_score: Math.round(rank * 10) / 10 };
    })
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, rule.maxItems);
}

/**
 * Check if a content item meets minimum publish thresholds.
 */
export function meetsPublishThreshold(
  item: { source_trust_score: number | null; ai_quality_score: number | null; freshness_score: number; status: string }
): boolean {
  if (item.status === 'rejected' || item.status === 'archived') return false;
  if ((item.source_trust_score ?? 0.5) < 0.3) return false;
  if ((item.ai_quality_score ?? 0) < 0.4) return false;
  if (item.freshness_score < 5) return false;
  return true;
}

/** Tiered quality thresholds for different contexts */
export const QUALITY_THRESHOLDS = {
  premium_surface: 0.55,
  standard_surface: 0.45,
  general_publish: 0.40,
  sl_priority_publish: 0.35,
  safety_publish: 0.50,
  rescue_minimum: 0.30,
} as const;
