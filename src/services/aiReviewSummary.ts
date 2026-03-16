/**
 * AI Review Summarization Service
 * Summarizes partner reviews into actionable insights.
 *
 * HARDENED: feature flags, schema validation, metering, caching, advisory_only, confidence.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";
import { isAIEnabled } from "@/config/aiFlags";
import { isValidReviewSummary } from "@/ai/schemas";
import { recordAIUsage } from "@/services/aiUsageMeter";
import { withCache } from "@/services/aiCacheService";
import { logAIEvent } from "@/services/aiEventTracking";
import type { AIAdvisoryMeta } from "@/ai/types";

export interface ReviewSummary extends AIAdvisoryMeta {
  positiveThemes: string[];
  complaintThemes: string[];
  qualityStrengths: string[];
  riskSignals: string[];
  overallSentiment: "positive" | "mixed" | "negative";
  totalReviews: number;
  avgRating: number;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
  category?: string;
}

const EMPTY_SUMMARY: ReviewSummary = {
  positiveThemes: [],
  complaintThemes: [],
  qualityStrengths: [],
  riskSignals: [],
  overallSentiment: "mixed",
  totalReviews: 0,
  avgRating: 0,
  confidence: createConfidenceEnvelope(10, ["no_data"]),
  fallback_used: true,
  advisory_only: true,
};

/** Generate a review summary from a list of reviews */
export function summarizeReviews(reviews: ReviewInput[]): ReviewSummary {
  const start = performance.now();

  // Feature flag check
  if (!isAIEnabled("ai_review_summary")) {
    recordAIUsage("ai_review_summary", 0, true);
    return { ...EMPTY_SUMMARY, totalReviews: reviews.length, confidence: createConfidenceEnvelope(10, ["feature_disabled"]) };
  }

  if (reviews.length === 0) {
    recordAIUsage("ai_review_summary", 0, false);
    return { ...EMPTY_SUMMARY, fallback_used: false, confidence: createConfidenceEnvelope(10, ["no_reviews"]) };
  }

  try {
    const result = computeSummary(reviews);

    // Schema validation
    const valid = isValidReviewSummary({
      positive_themes: result.positiveThemes,
      complaint_themes: result.complaintThemes,
      quality_strengths: result.qualityStrengths,
      risk_signals: result.riskSignals,
      overall_sentiment: result.overallSentiment,
    });

    const latency = Math.round(performance.now() - start);

    if (!valid) {
      recordAIUsage("ai_review_summary", latency, true);
      return {
        ...EMPTY_SUMMARY,
        totalReviews: reviews.length,
        avgRating: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
        confidence: createConfidenceEnvelope(15, ["schema_validation_failed"]),
      };
    }

    recordAIUsage("ai_review_summary", latency, false);

    logAIEvent({
      ai_module: "ai_review_summary",
      input_summary: `${reviews.length} reviews`,
      output_summary: `sentiment=${result.overallSentiment}, avg=${result.avgRating}`,
      confidence_score: result.confidence.confidence_score,
    });

    return result;
  } catch {
    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_review_summary", latency, true);
    return {
      ...EMPTY_SUMMARY,
      totalReviews: reviews.length,
      confidence: createConfidenceEnvelope(10, ["computation_error", "fallback_used"]),
    };
  }
}

/** Cached review summary */
export async function summarizeReviewsCached(
  partnerId: string,
  reviews: ReviewInput[]
): Promise<ReviewSummary> {
  const { data, cached } = await withCache(
    "ai_review_summary",
    { partnerId, count: reviews.length },
    async () => summarizeReviews(reviews),
    5 * 60 * 1000
  );
  return { ...data, cached };
}

const POSITIVE_KEYWORDS = ["professional", "quick", "clean", "on time", "friendly", "excellent", "great", "recommended"];
const NEGATIVE_KEYWORDS = ["late", "expensive", "rude", "incomplete", "damaged", "slow", "unprofessional", "overcharged"];

function computeSummary(reviews: ReviewInput[]): ReviewSummary {
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const positive = reviews.filter((r) => r.rating >= 4);
  const negative = reviews.filter((r) => r.rating <= 2);

  const positiveThemes = extractThemes(positive.map((r) => r.comment || ""), POSITIVE_KEYWORDS);
  const complaintThemes = extractThemes(negative.map((r) => r.comment || ""), NEGATIVE_KEYWORDS);

  const qualityStrengths: string[] = [];
  if (avgRating >= 4.5) qualityStrengths.push("Consistently high ratings");
  if (positive.length / reviews.length > 0.8) qualityStrengths.push("Strong customer approval");

  const riskSignals: string[] = [];
  if (negative.length / reviews.length > 0.3) riskSignals.push("Elevated complaint rate");
  if (avgRating < 3.0) riskSignals.push("Below-average ratings");

  // Confidence: higher with more reviews, lower with mixed signals
  const reviewCountBoost = Math.min(30, reviews.length * 2);
  const consistencyBoost = riskSignals.length === 0 ? 15 : 0;
  const confidenceScore = Math.min(85, 40 + reviewCountBoost + consistencyBoost);

  return {
    positiveThemes,
    complaintThemes,
    qualityStrengths,
    riskSignals,
    overallSentiment: avgRating >= 4 ? "positive" : avgRating >= 3 ? "mixed" : "negative",
    totalReviews: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
    confidence: createConfidenceEnvelope(confidenceScore, riskSignals.length > 0 ? riskSignals : ["standard_summary"]),
    fallback_used: false,
    advisory_only: true,
  };
}

function extractThemes(comments: string[], keywords: string[]): string[] {
  const found: string[] = [];
  const joined = comments.join(" ").toLowerCase();
  for (const kw of keywords) {
    if (joined.includes(kw)) found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
  }
  return found.slice(0, 5);
}
