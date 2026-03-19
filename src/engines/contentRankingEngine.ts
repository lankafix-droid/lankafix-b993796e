/**
 * Content Ranking Engine — Multi-signal ranking for content surfaces.
 * Inputs: freshness, trust, quality, relevance, engagement, fatigue.
 */

export interface RankableItem {
  id: string;
  content_type: string;
  freshness_score: number;
  source_trust_score: number;
  ai_quality_score: number;
  category_codes: string[];
  published_at: string | null;
  impression_count?: number;
  click_count?: number;
  is_safety?: boolean;
}

export interface RankingContext {
  userCategoryAffinity: Record<string, number>; // category -> 0-1 affinity score
  viewedItemIds: Set<string>;
  trendMomentum: Record<string, number>; // item_id -> momentum
  seasonalBoosts: string[]; // category codes with seasonal relevance
}

const WEIGHTS = {
  freshness: 0.25,
  trust: 0.15,
  quality: 0.20,
  categoryRelevance: 0.15,
  engagement: 0.10,
  trendMomentum: 0.10,
  safetyBoost: 0.05,
};

/**
 * Rank items with personalization context.
 */
export function rankItems(
  items: RankableItem[],
  context: RankingContext
): Array<{ id: string; score: number }> {
  return items
    .map(item => {
      let score = 0;

      // Freshness
      score += item.freshness_score * WEIGHTS.freshness;

      // Source trust
      score += item.source_trust_score * 100 * WEIGHTS.trust;

      // AI quality
      score += item.ai_quality_score * 100 * WEIGHTS.quality;

      // Category relevance (personalized)
      const maxAffinity = Math.max(
        0,
        ...item.category_codes.map(c => context.userCategoryAffinity[c] ?? 0.3)
      );
      score += maxAffinity * 100 * WEIGHTS.categoryRelevance;

      // Engagement signal
      const ctr = item.impression_count && item.impression_count > 5
        ? (item.click_count ?? 0) / item.impression_count
        : 0.1;
      score += Math.min(ctr * 200, 100) * WEIGHTS.engagement;

      // Trend momentum
      const momentum = context.trendMomentum[item.id] ?? 0;
      score += momentum * WEIGHTS.trendMomentum;

      // Safety boost
      if (item.is_safety) {
        score += 100 * WEIGHTS.safetyBoost;
      }

      // Fatigue penalty — items already seen get penalized
      if (context.viewedItemIds.has(item.id)) {
        score *= 0.5;
      }

      // Seasonal boost
      const hasSeasonal = item.category_codes.some(c => context.seasonalBoosts.includes(c));
      if (hasSeasonal) score *= 1.15;

      // Duplication penalty (same content_type saturation)
      // Applied externally in surface ranking

      return { id: item.id, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Build a default ranking context for anonymous/new users.
 */
export function defaultRankingContext(): RankingContext {
  return {
    userCategoryAffinity: {},
    viewedItemIds: new Set(),
    trendMomentum: {},
    seasonalBoosts: [],
  };
}
