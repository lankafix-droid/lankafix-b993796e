/**
 * AI Review Summarization Service
 * Summarizes partner reviews into actionable insights.
 * Uses Lovable AI for actual summarization when enabled.
 */
import { isAIEnabled } from "@/lib/aiFeatureFlags";

export interface ReviewSummary {
  positiveThemes: string[];
  complaintThemes: string[];
  qualityStrengths: string[];
  riskSignals: string[];
  overallSentiment: "positive" | "mixed" | "negative";
  totalReviews: number;
  avgRating: number;
}

interface Review {
  rating: number;
  comment?: string;
  category?: string;
}

/** Generate a review summary from a list of reviews (local analysis) */
export function summarizeReviews(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) {
    return {
      positiveThemes: [],
      complaintThemes: [],
      qualityStrengths: [],
      riskSignals: [],
      overallSentiment: "mixed",
      totalReviews: 0,
      avgRating: 0,
    };
  }

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const positive = reviews.filter((r) => r.rating >= 4);
  const negative = reviews.filter((r) => r.rating <= 2);

  // Simple keyword extraction for themes
  const positiveThemes = extractThemes(positive.map((r) => r.comment || ""), POSITIVE_KEYWORDS);
  const complaintThemes = extractThemes(negative.map((r) => r.comment || ""), NEGATIVE_KEYWORDS);

  const qualityStrengths: string[] = [];
  if (avgRating >= 4.5) qualityStrengths.push("Consistently high ratings");
  if (positive.length / reviews.length > 0.8) qualityStrengths.push("Strong customer approval");

  const riskSignals: string[] = [];
  if (negative.length / reviews.length > 0.3) riskSignals.push("Elevated complaint rate");
  if (avgRating < 3.0) riskSignals.push("Below-average ratings");

  return {
    positiveThemes,
    complaintThemes,
    qualityStrengths,
    riskSignals,
    overallSentiment: avgRating >= 4 ? "positive" : avgRating >= 3 ? "mixed" : "negative",
    totalReviews: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
  };
}

const POSITIVE_KEYWORDS = ["professional", "quick", "clean", "on time", "friendly", "excellent", "great", "recommended"];
const NEGATIVE_KEYWORDS = ["late", "expensive", "rude", "incomplete", "damaged", "slow", "unprofessional", "overcharged"];

function extractThemes(comments: string[], keywords: string[]): string[] {
  const found: string[] = [];
  const joined = comments.join(" ").toLowerCase();
  for (const kw of keywords) {
    if (joined.includes(kw)) found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
  }
  return found.slice(0, 5);
}
