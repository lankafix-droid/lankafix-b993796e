/**
 * Content Publish Engine — Decides what gets published and surfaced.
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
}

export interface PublishRule {
  slot_code: string;
  content_types: string[];
  maxItems: number;
  minSourceTrust: number;
  minAIQuality: number;
  minFreshness: number;
}

export const DEFAULT_PUBLISH_RULES: PublishRule[] = [
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
    minAIQuality: 0.6,
    minFreshness: 15,
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
    content_types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal'],
    maxItems: 5,
    minSourceTrust: 0.6,
    minAIQuality: 0.6,
    minFreshness: 25,
  },
];

/**
 * Filter and rank candidates for a given surface slot.
 */
export function rankForSurface(
  candidates: PublishCandidate[],
  rule: PublishRule
): Array<{ id: string; rank_score: number }> {
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
      // Composite ranking score
      const freshWeight = 0.35;
      const trustWeight = 0.25;
      const qualityWeight = 0.25;
      const recencyWeight = 0.15;

      const recencyBonus = c.published_at
        ? Math.max(0, 100 - (Date.now() - new Date(c.published_at).getTime()) / 3600000)
        : 0;

      const rank = (
        c.freshness_score * freshWeight +
        (c.source_trust_score ?? 0.5) * 100 * trustWeight +
        (c.ai_quality_score ?? 0.5) * 100 * qualityWeight +
        recencyBonus * recencyWeight
      );

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
