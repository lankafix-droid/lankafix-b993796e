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
    maxPerformanceScore: 35,
    maxRating: 3.0,
    minCancellationRate: 25,
    minStrikes: 3,
  },
} as const;

/**
 * Compute reliability tier from partner signals.
 * Safe with missing data — defaults to "verified" when signals are sparse.
 */
export function computeReliabilityTier(input: TierInput): TierResult {
  const score = input.performance_score ?? 0;
  const rating = input.rating_average ?? 0;
  const jobs = input.completed_jobs_count ?? 0;
  const cancelRate = input.cancellation_rate ?? 0;
  const strikes = input.strike_count ?? 0;
  const onTime = input.on_time_rate ?? 95;

  // ── Under Review: any hard-fail signal triggers this ──
  if (strikes >= THRESHOLDS.under_review.minStrikes) {
    return { tier: "under_review", reason: `${strikes} strikes — requires ops review` };
  }
  if (cancelRate >= THRESHOLDS.under_review.minCancellationRate && jobs >= 5) {
    return { tier: "under_review", reason: `High cancellation rate (${cancelRate}%)` };
  }
  if (score > 0 && score <= THRESHOLDS.under_review.maxPerformanceScore && jobs >= 10) {
    return { tier: "under_review", reason: `Low performance score (${score})` };
  }
  if (rating > 0 && rating <= THRESHOLDS.under_review.maxRating && jobs >= 10) {
    return { tier: "under_review", reason: `Low rating (${rating})` };
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
    return { tier: "elite", reason: `Score ${score}, Rating ${rating}, ${jobs} jobs, ${onTime}% on-time` };
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
    return { tier: "pro", reason: `Score ${score}, Rating ${rating}, ${jobs} jobs completed` };
  }

  // ── Default: Verified ──
  return { tier: "verified", reason: "Standard verified partner" };
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
