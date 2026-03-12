/**
 * Partner Intelligence Service
 * 
 * Client-side utility for interpreting partner AI scores and tiers.
 * The actual score computation happens server-side via the
 * compute-performance-scores edge function.
 * 
 * This module provides:
 * - Score interpretation
 * - Tier classification
 * - Risk detection
 * - Display helpers for ops/partner pages
 * 
 * The AI partner score is integrated into smart-dispatch as
 * `performance_signal` (3% weight) and `tier_signal` (2% weight).
 */

export type PartnerTier = "elite" | "pro" | "verified" | "under_review";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PartnerAIProfile {
  partner_id: string;
  ai_score: number;
  tier: PartnerTier;
  risk_level: RiskLevel;
  risk_factors: string[];
}

/**
 * Calculate a partner's AI score from their metrics.
 * Mirrors compute-performance-scores edge function logic for client display.
 */
export function calculatePartnerAIScore(partner: {
  rating_average?: number | null;
  cancellation_rate?: number | null;
  completed_jobs_count?: number | null;
  average_response_time_minutes?: number | null;
  quote_approval_rate?: number | null;
  on_time_rate?: number | null;
  strike_count?: number | null;
  acceptance_rate?: number | null;
}): number {
  const ratingScore = Math.min(((partner.rating_average || 0) / 5) * 100, 100);
  const cancelRate = partner.cancellation_rate || 0;
  const completionScore = Math.max(0, 100 - cancelRate * 2.5);
  const avgResp = partner.average_response_time_minutes || 30;
  const responseScore = avgResp <= 3 ? 100 : avgResp <= 5 ? 90 : avgResp <= 10 ? 75 : avgResp <= 20 ? 55 : avgResp <= 30 ? 35 : 15;
  const quoteApprovalScore = Math.min(partner.quote_approval_rate || 80, 100);
  const onTimeScore = Math.min(partner.on_time_rate || 90, 100);

  let score = Math.round(
    ratingScore * 0.25 + completionScore * 0.20 + responseScore * 0.15 +
    quoteApprovalScore * 0.15 + onTimeScore * 0.15 + 50 * 0.10 // repeat placeholder
  );

  const strikes = partner.strike_count || 0;
  if (strikes > 0) score = Math.max(0, score - strikes * 5);

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine partner tier from their metrics.
 * Mirrors compute-performance-scores edge function logic.
 */
export function generatePartnerTier(partner: {
  performance_score?: number | null;
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  cancellation_rate?: number | null;
  strike_count?: number | null;
  on_time_rate?: number | null;
}): { tier: PartnerTier; reason: string } {
  const score = partner.performance_score || 0;
  const rating = partner.rating_average || 0;
  const jobs = partner.completed_jobs_count || 0;
  const cancelRate = partner.cancellation_rate || 0;
  const strikes = partner.strike_count || 0;
  const onTime = partner.on_time_rate || 95;

  if (strikes >= 3) return { tier: "under_review", reason: `${strikes} strikes` };
  if (cancelRate >= 25 && jobs >= 5) return { tier: "under_review", reason: `High cancel rate` };
  if (score > 0 && score <= 35 && jobs >= 10) return { tier: "under_review", reason: `Low score` };
  if (rating > 0 && rating <= 3.0 && jobs >= 10) return { tier: "under_review", reason: `Low rating` };
  if (jobs < 5) return { tier: "verified", reason: "New partner" };

  if (score >= 80 && rating >= 4.5 && jobs >= 20 && cancelRate <= 5 && strikes <= 0 && onTime >= 90) {
    return { tier: "elite", reason: "Top performer" };
  }
  if (score >= 60 && rating >= 3.8 && jobs >= 8 && cancelRate <= 15 && strikes <= 1) {
    return { tier: "pro", reason: "Strong performer" };
  }

  return { tier: "verified", reason: "Standard" };
}

/**
 * Detect risk level and contributing factors for a partner.
 */
export function detectRiskPartner(partner: {
  cancellation_rate?: number | null;
  strike_count?: number | null;
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  late_arrival_count?: number | null;
  performance_score?: number | null;
}): { risk_level: RiskLevel; factors: string[] } {
  const factors: string[] = [];
  const strikes = partner.strike_count || 0;
  const cancelRate = partner.cancellation_rate || 0;
  const rating = partner.rating_average || 5;
  const lateCount = partner.late_arrival_count || 0;
  const score = partner.performance_score || 50;

  if (strikes >= 3) factors.push(`${strikes} active strikes`);
  if (cancelRate >= 30) factors.push(`${cancelRate}% cancellation rate`);
  if (rating > 0 && rating <= 2.5) factors.push(`Rating ${rating}/5`);
  if (lateCount >= 5) factors.push(`${lateCount} late arrivals`);
  if (score > 0 && score <= 25) factors.push(`AI score ${score}/100`);

  let risk_level: RiskLevel = "low";
  if (factors.length >= 3) risk_level = "critical";
  else if (factors.length === 2) risk_level = "high";
  else if (factors.length === 1) risk_level = "medium";

  return { risk_level, factors };
}

/**
 * Build a complete AI profile for a partner.
 */
export function getPartnerAIProfile(partner: {
  id: string;
  performance_score?: number | null;
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  cancellation_rate?: number | null;
  strike_count?: number | null;
  on_time_rate?: number | null;
  late_arrival_count?: number | null;
  average_response_time_minutes?: number | null;
  quote_approval_rate?: number | null;
}): PartnerAIProfile {
  const ai_score = partner.performance_score || calculatePartnerAIScore(partner);
  const { tier } = generatePartnerTier({ ...partner, performance_score: ai_score });
  const { risk_level, factors } = detectRiskPartner(partner);

  return {
    partner_id: partner.id,
    ai_score,
    tier,
    risk_level,
    risk_factors: factors,
  };
}

/** Display helpers */

export const TIER_LABELS: Record<PartnerTier, string> = {
  elite: "Elite",
  pro: "Pro",
  verified: "Verified",
  under_review: "Under Review",
};

export const TIER_COLORS: Record<PartnerTier, string> = {
  elite: "bg-amber-500/15 text-amber-700",
  pro: "bg-sky-500/15 text-sky-700",
  verified: "bg-emerald-500/15 text-emerald-700",
  under_review: "bg-red-500/15 text-red-700",
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-destructive",
  critical: "text-destructive",
};
