/**
 * Content Moderation Service — Routes items through quality gates.
 * Applies quality rules, flags suspicious content, routes to review.
 */
import { determinePublishStatus, type QualityInput } from './contentQualityRules';

export interface ModerationResult {
  status: 'published' | 'needs_review' | 'rejected';
  reason: string;
}

const BLOCKED_KEYWORDS = [
  'fake news', 'conspiracy', 'unverified claim', 'rumour', 'political party',
  'election propaganda', 'adult content', 'gambling',
];

export function moderateContent(input: {
  title: string;
  raw_excerpt: string | null;
  ai_quality_score: number | null;
  source_trust_score: number | null;
  freshness_score: number;
  content_type: string;
  category_codes: string[];
  has_ai_brief: boolean;
}): ModerationResult {
  const text = `${input.title} ${input.raw_excerpt ?? ''}`.toLowerCase();

  // Block check
  for (const kw of BLOCKED_KEYWORDS) {
    if (text.includes(kw)) {
      return { status: 'rejected', reason: `Blocked keyword detected: ${kw}` };
    }
  }

  // No categories at all = weak relevance
  if (input.category_codes.length === 0) {
    return { status: 'needs_review', reason: 'No LankaFix category relevance detected' };
  }

  const qualityInput: QualityInput = {
    ai_quality_score: input.ai_quality_score,
    source_trust_score: input.source_trust_score,
    freshness_score: input.freshness_score,
    content_type: input.content_type,
    has_categories: input.category_codes.length > 0,
    has_ai_brief: input.has_ai_brief,
  };

  const status = determinePublishStatus(qualityInput);
  const reason = status === 'published'
    ? 'Auto-published: meets quality thresholds'
    : status === 'needs_review'
    ? 'Routed to review: quality below auto-publish threshold'
    : 'Rejected: quality too low';

  return { status, reason };
}
