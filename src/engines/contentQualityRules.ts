/**
 * Content Quality Rules — Determines publish/review/reject routing.
 */

export interface QualityInput {
  ai_quality_score: number | null;
  source_trust_score: number | null;
  freshness_score: number;
  content_type: string;
  has_categories: boolean;
  has_ai_brief: boolean;
}

export type QualityDecision = 'published' | 'needs_review' | 'rejected';

const SAFETY_TYPES = new Set(['safety_alert', 'scam_alert']);

export function determinePublishStatus(input: QualityInput): QualityDecision {
  const quality = input.ai_quality_score ?? 0;
  const trust = input.source_trust_score ?? 0.5;

  // Auto-reject: very low quality or trust
  if (quality < 0.25) return 'rejected';
  if (trust < 0.2) return 'rejected';

  // Safety content needs higher bar
  if (SAFETY_TYPES.has(input.content_type)) {
    if (quality < 0.6 || trust < 0.5) return 'needs_review';
  }

  // Auto-publish: high quality + trust + has categories + has brief
  if (quality >= 0.6 && trust >= 0.4 && input.has_categories && input.has_ai_brief) {
    return 'published';
  }

  // Medium quality → needs review
  if (quality >= 0.35) return 'needs_review';

  return 'rejected';
}

export function computeContentFreshness(contentType: string, publishedAt: string | null): number {
  const EVERGREEN = new Set(['knowledge_fact', 'history', 'numbers_insight', 'seasonal_tip', 'how_to']);
  const MAX_HOURS: Record<string, number> = {
    breaking_news: 6, hot_topic: 48, innovation: 168, trend_signal: 72,
    safety_alert: 72, scam_alert: 168, knowledge_fact: 8760, history: 8760,
    on_this_day: 48, numbers_insight: 720, seasonal_tip: 720, how_to: 4380,
    most_read: 168, market_shift: 336,
  };

  if (!publishedAt) return EVERGREEN.has(contentType) ? 30 : 10;
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  const maxAge = MAX_HOURS[contentType] ?? 48;
  if (ageHours > maxAge * 1.5 && !EVERGREEN.has(contentType)) return 0;
  const decay = contentType === 'breaking_news' ? 12 : contentType === 'hot_topic' ? 3 : 1;
  return Math.max(5, Math.round(Math.min(100, 100 - ageHours * decay)));
}
