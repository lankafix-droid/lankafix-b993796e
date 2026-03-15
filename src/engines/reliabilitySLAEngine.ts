/**
 * LankaFix Reliability SLA Contract Engine — Pure Functions
 * Computes SLA tier, compliance %, breach risk, and recommended actions.
 * Zero React/Supabase dependencies. Deterministic.
 */

export type SLATier = "platinum" | "gold" | "standard" | "at_risk";

export interface SLAContractResult {
  slaTier: SLATier;
  slaCompliancePercent: number;
  breachRiskProbability: number;
  recommendedAction: string;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Determine SLA tier from reliability score.
 */
export function computeSLATier(reliabilityScore: number): SLATier {
  if (reliabilityScore >= 95) return "platinum";
  if (reliabilityScore >= 85) return "gold";
  if (reliabilityScore >= 70) return "standard";
  return "at_risk";
}

/**
 * Compute SLA compliance percentage based on success rate and escalation rate.
 */
export function computeSLACompliance(
  successRate: number,
  escalationRate: number,
): number {
  // Compliance = weighted blend of success rate adherence + escalation control
  const successCompliance = clamp(successRate); // already 0-100
  const escalationCompliance = clamp(100 - escalationRate * 2); // double-penalize escalation
  return clamp(Math.round(successCompliance * 0.7 + escalationCompliance * 0.3));
}

/**
 * Compute breach risk probability influenced by forecast + budget depletion.
 */
export function computeBreachRisk(
  reliabilityScore: number,
  circuitBreakCount30d: number,
  errorBudgetRemaining: number,
): number {
  // Base risk inversely proportional to reliability score
  const baseRisk = clamp(100 - reliabilityScore);

  // Circuit break penalty: each break adds 3% risk
  const circuitPenalty = clamp(circuitBreakCount30d * 3, 0, 30);

  // Budget depletion penalty: lower budget = higher risk
  const budgetPenalty = clamp(Math.round((100 - clamp(errorBudgetRemaining)) * 0.4), 0, 40);

  return clamp(Math.round(baseRisk * 0.4 + circuitPenalty + budgetPenalty));
}

/**
 * Generate recommended action based on SLA tier and breach risk.
 */
export function computeRecommendedAction(
  slaTier: SLATier,
  breachRiskProbability: number,
): string {
  if (slaTier === "at_risk") {
    return "Immediate reliability intervention required. Escalate to engineering leadership.";
  }
  if (breachRiskProbability >= 60) {
    return "High breach risk detected. Review circuit breaker frequency and error budget allocation.";
  }
  if (slaTier === "standard") {
    return "Monitor escalation trends closely. Consider proactive capacity adjustments.";
  }
  if (breachRiskProbability >= 30) {
    return "Moderate risk. Maintain current reliability posture and review weekly.";
  }
  return "System within SLA targets. Continue standard monitoring.";
}

/**
 * Full SLA contract computation.
 */
export function computeSLAContract(
  reliabilityScore: number,
  successRate: number,
  escalationRate: number,
  circuitBreakCount30d: number,
  errorBudgetRemaining: number,
): SLAContractResult {
  const slaTier = computeSLATier(reliabilityScore);
  const slaCompliancePercent = computeSLACompliance(successRate, escalationRate);
  const breachRiskProbability = computeBreachRisk(reliabilityScore, circuitBreakCount30d, errorBudgetRemaining);
  const recommendedAction = computeRecommendedAction(slaTier, breachRiskProbability);

  return { slaTier, slaCompliancePercent, breachRiskProbability, recommendedAction };
}
