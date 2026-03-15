/**
 * LankaFix Reliability Cost-of-Failure Engine — Pure Functions
 * Estimates financial exposure from reliability degradation.
 * Zero React/Supabase dependencies. Deterministic.
 */

export type CostSeverityLevel = "minimal" | "material" | "severe";

export interface CostOfFailureResult {
  estimatedDailyRevenueAtRisk: number;
  projected30DayExposure: number;
  costSeverityLevel: CostSeverityLevel;
}

/**
 * Compute cost of failure based on booking volume, value, and escalation rates.
 */
export function computeCostOfFailure(
  dailyBookingVolume: number,
  avgBookingValue: number,
  escalationRate: number,
  projectedEscalationRate: number,
): CostOfFailureResult {
  const safeVolume = Math.max(0, dailyBookingVolume);
  const safeValue = Math.max(0, avgBookingValue);
  const safeEscRate = Math.max(0, Math.min(100, escalationRate));
  const safeProjRate = Math.max(0, Math.min(100, projectedEscalationRate));

  // Daily revenue at risk = volume * value * (escalation% / 100)
  const estimatedDailyRevenueAtRisk = Math.round(safeVolume * safeValue * (safeEscRate / 100));

  // 30-day projection uses the worse of current vs projected
  const worstRate = Math.max(safeEscRate, safeProjRate);
  const projected30DayExposure = Math.round(safeVolume * safeValue * (worstRate / 100) * 30);

  const costSeverityLevel: CostSeverityLevel =
    projected30DayExposure >= 500_000 ? "severe" :
    projected30DayExposure >= 100_000 ? "material" :
    "minimal";

  return { estimatedDailyRevenueAtRisk, projected30DayExposure, costSeverityLevel };
}
