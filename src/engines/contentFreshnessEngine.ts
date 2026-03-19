/**
 * Content Freshness Engine — Manages decay rules and freshness scoring.
 * Different content types have different lifespans.
 */

export interface FreshnessRule {
  /** Maximum hours before content is considered stale */
  maxAgeHours: number;
  /** Decay rate per hour (0-1) */
  decayPerHour: number;
  /** Minimum freshness score before auto-downgrade */
  minFreshness: number;
  /** Whether content can become evergreen */
  canBeEvergreen: boolean;
}

export const FRESHNESS_RULES: Record<string, FreshnessRule> = {
  breaking_news: { maxAgeHours: 6, decayPerHour: 12, minFreshness: 20, canBeEvergreen: false },
  hot_topic: { maxAgeHours: 48, decayPerHour: 3, minFreshness: 15, canBeEvergreen: false },
  innovation: { maxAgeHours: 168, decayPerHour: 0.8, minFreshness: 10, canBeEvergreen: false },
  trend_signal: { maxAgeHours: 72, decayPerHour: 2, minFreshness: 10, canBeEvergreen: false },
  safety_alert: { maxAgeHours: 72, decayPerHour: 1.5, minFreshness: 20, canBeEvergreen: false },
  scam_alert: { maxAgeHours: 168, decayPerHour: 0.8, minFreshness: 15, canBeEvergreen: false },
  knowledge_fact: { maxAgeHours: 8760, decayPerHour: 0.01, minFreshness: 5, canBeEvergreen: true },
  history: { maxAgeHours: 8760, decayPerHour: 0.01, minFreshness: 5, canBeEvergreen: true },
  on_this_day: { maxAgeHours: 48, decayPerHour: 3, minFreshness: 10, canBeEvergreen: true },
  numbers_insight: { maxAgeHours: 720, decayPerHour: 0.1, minFreshness: 5, canBeEvergreen: true },
  seasonal_tip: { maxAgeHours: 720, decayPerHour: 0.15, minFreshness: 5, canBeEvergreen: true },
  how_to: { maxAgeHours: 4380, decayPerHour: 0.02, minFreshness: 5, canBeEvergreen: true },
  most_read: { maxAgeHours: 168, decayPerHour: 1, minFreshness: 10, canBeEvergreen: false },
  market_shift: { maxAgeHours: 336, decayPerHour: 0.5, minFreshness: 10, canBeEvergreen: false },
};

/**
 * Compute current freshness score for a content item.
 */
export function computeFreshness(
  contentType: string,
  publishedAt: string | null,
  baseScore: number = 100
): number {
  const rule = FRESHNESS_RULES[contentType] ?? FRESHNESS_RULES.hot_topic;
  if (!publishedAt) return rule.canBeEvergreen ? 30 : 10;

  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  if (ageHours < 0) return baseScore;

  const decayed = baseScore - (ageHours * rule.decayPerHour);
  const clamped = Math.max(rule.minFreshness, Math.min(100, decayed));

  // If past max age, enforce minimum
  if (ageHours > rule.maxAgeHours) {
    return rule.canBeEvergreen ? rule.minFreshness : 0;
  }

  return Math.round(clamped);
}

/**
 * Determine if a content item should be archived due to staleness.
 */
export function shouldArchive(contentType: string, publishedAt: string | null): boolean {
  const rule = FRESHNESS_RULES[contentType] ?? FRESHNESS_RULES.hot_topic;
  if (rule.canBeEvergreen) return false;
  if (!publishedAt) return true;
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  return ageHours > rule.maxAgeHours * 1.5;
}

/**
 * Get all items that should be refreshed/decayed.
 */
export function getDecayUpdates(
  items: Array<{ id: string; content_type: string; published_at: string | null; freshness_score: number }>
): Array<{ id: string; new_freshness: number; should_archive: boolean }> {
  return items.map(item => {
    const newFreshness = computeFreshness(item.content_type, item.published_at, 100);
    return {
      id: item.id,
      new_freshness: newFreshness,
      should_archive: shouldArchive(item.content_type, item.published_at),
    };
  });
}
