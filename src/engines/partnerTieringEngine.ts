/**
 * LankaFix Partner Reliability Tiering Engine
 * 
 * Computes an internal reliability tier for each partner based on
 * performance signals. Tiers are internal-only for ops and dispatch.
 * 
 * Tiers:
 *   elite        — Top performers: high score, high volume, low cancellation
 *   pro          — Reliable and experienced
 *   verified     — Default tier for newly verified partners
 *   under_review — Flagged due to poor metrics or warnings
 * 
 * HARDENING:
 *   - under_review requires minimum evidence (jobs ≥ 5 for cancel, ≥ 10 for score/rating)
 *   - Low-data partners stay "verified" — never downgraded without evidence
 *   - tier_reason provides ops-visible explanation
 */

export type ReliabilityTier = "elite" | "pro" | "verified" | "under_review";

export interface TierInput {
  performance_score: number | null;
  rating_average: number | null;
  completed_jobs_count: number | null;
  cancellation_rate: number | null;
  strike_count: number | null;
  on_time_rate: number | null;
  acceptance_rate: number | null;
  quote_approval_rate: number | null;
}

export interface TierResult {
  tier: ReliabilityTier;
  reason: string;
  /** Whether enough data exists to make a confident tier assessment */
  has_sufficient_data: boolean;
}

// ── Thresholds (tunable by ops later via platform_settings) ──
const THRESHOLDS = {
  elite: {
    minPerformanceScore: 80,
    minRating: 4.5,
    minCompletedJobs: 20,
    maxCancellationRate: 5,
    maxStrikes: 0,
    minOnTimeRate: 90,
  },
  pro: {
    minPerformanceScore: 60,
    minRating: 3.8,
    minCompletedJobs: 8,
    maxCancellationRate: 15,
    maxStrikes: 1,
  },
  under_review: {
    // Minimum evidence thresholds — never downgrade without enough jobs
    minJobsForCancelDowngrade: 5,
    minJobsForScoreDowngrade: 10,
    minJobsForRatingDowngrade: 10,
    maxPerformanceScore: 35,
    maxRating: 3.0,
    minCancellationRate: 25,
    minStrikes: 3,
  },
} as const;

/** Minimum jobs required before any tier promotion above verified */
const MIN_JOBS_FOR_PROMOTION = 5;

/**
 * Compute reliability tier from partner signals.
 * 
 * HARDENING RULES:
 * 1. Partners with < MIN_JOBS_FOR_PROMOTION jobs always stay "verified"
 * 2. under_review requires specific minimum evidence thresholds per signal
 * 3. Strikes are the only signal that can downgrade without job-count guard (≥3 = ops issue)
 * 4. Missing/null data defaults to neutral — never penalizes
 */
export function computeReliabilityTier(input: TierInput): TierResult {
  const score = input.performance_score ?? 0;
  const rating = input.rating_average ?? 0;
  const jobs = input.completed_jobs_count ?? 0;
  const cancelRate = input.cancellation_rate ?? 0;
  const strikes = input.strike_count ?? 0;
  const onTime = input.on_time_rate ?? 95;

  const hasSufficientData = jobs >= MIN_JOBS_FOR_PROMOTION;

  // ── Under Review: requires minimum evidence per signal ──
  // Strikes are the only exception — 3+ strikes always flags regardless of job count
  if (strikes >= THRESHOLDS.under_review.minStrikes) {
    return { tier: "under_review", reason: `${strikes} performance strikes — requires ops review`, has_sufficient_data: true };
  }

  // Cancel-based downgrade: requires minJobsForCancelDowngrade
  if (cancelRate >= THRESHOLDS.under_review.minCancellationRate && jobs >= THRESHOLDS.under_review.minJobsForCancelDowngrade) {
    return { tier: "under_review", reason: `Cancellation rate ${cancelRate}% across ${jobs} jobs`, has_sufficient_data: true };
  }

  // Score-based downgrade: requires minJobsForScoreDowngrade
  if (score > 0 && score <= THRESHOLDS.under_review.maxPerformanceScore && jobs >= THRESHOLDS.under_review.minJobsForScoreDowngrade) {
    return { tier: "under_review", reason: `Performance score ${score}/100 across ${jobs} jobs`, has_sufficient_data: true };
  }

  // Rating-based downgrade: requires minJobsForRatingDowngrade
  if (rating > 0 && rating <= THRESHOLDS.under_review.maxRating && jobs >= THRESHOLDS.under_review.minJobsForRatingDowngrade) {
    return { tier: "under_review", reason: `Rating ${rating}/5.0 across ${jobs} jobs`, has_sufficient_data: true };
  }

  // ── Low-data partners: stay verified (never promoted or demoted without evidence) ──
  if (!hasSufficientData) {
    return { tier: "verified", reason: `New partner (${jobs} jobs) — insufficient data for tier assessment`, has_sufficient_data: false };
  }

  // ── Elite: all signals must be strong ──
  const t = THRESHOLDS.elite;
  if (
    score >= t.minPerformanceScore &&
    rating >= t.minRating &&
    jobs >= t.minCompletedJobs &&
    cancelRate <= t.maxCancellationRate &&
    strikes <= t.maxStrikes &&
    onTime >= t.minOnTimeRate
  ) {
    return { tier: "elite", reason: `Score ${score}, Rating ${rating}, ${jobs} jobs, ${onTime}% on-time`, has_sufficient_data: true };
  }

  // ── Pro: solid metrics ──
  const p = THRESHOLDS.pro;
  if (
    score >= p.minPerformanceScore &&
    rating >= p.minRating &&
    jobs >= p.minCompletedJobs &&
    cancelRate <= p.maxCancellationRate &&
    strikes <= p.maxStrikes
  ) {
    return { tier: "pro", reason: `Score ${score}, Rating ${rating}, ${jobs} jobs completed`, has_sufficient_data: true };
  }

  // ── Default: Verified ──
  return { tier: "verified", reason: "Standard verified partner", has_sufficient_data: true };
}

// ── Display helpers ──
export const TIER_CONFIG: Record<ReliabilityTier, { label: string; color: string; description: string }> = {
  elite: {
    label: "Elite",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    description: "Top performer — high ratings, reliability, and volume",
  },
  pro: {
    label: "Pro",
    color: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    description: "Reliable partner with strong track record",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    description: "Verified partner — standard tier",
  },
  under_review: {
    label: "Under Review",
    color: "bg-red-500/15 text-red-700 border-red-500/30",
    description: "Flagged for quality concerns — requires ops attention",
  },
};
