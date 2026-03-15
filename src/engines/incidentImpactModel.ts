/**
 * LankaFix Incident Impact Model — Pure Functions
 * Quantifies operational + reputational impact of reliability degradation.
 * Zero React/Supabase dependencies. Deterministic.
 */

export type ImpactLevel = "low" | "moderate" | "high" | "critical";

export interface IncidentImpactResult {
  operationalImpactScore: number;
  reputationalRiskScore: number;
  compositeImpactScore: number;
  impactLevel: ImpactLevel;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute operational impact score.
 * Driven by escalation rate and zone guardrail activations.
 */
export function computeOperationalImpact(
  escalationRate: number,
  zoneGuardrailCount: number,
): number {
  const escalationComponent = clamp(escalationRate * 2, 0, 60);
  const guardrailComponent = clamp(zoneGuardrailCount * 8, 0, 40);
  return clamp(Math.round(escalationComponent + guardrailComponent));
}

/**
 * Compute reputational risk score.
 * Driven by risk probability and budget runway.
 */
export function computeReputationalRisk(
  riskProbability: number,
  daysUntilBudgetExhaustion: number,
): number {
  const riskComponent = clamp(riskProbability * 0.6, 0, 60);
  // Lower days = higher reputational risk
  const budgetUrgency = daysUntilBudgetExhaustion <= 0
    ? 40
    : clamp(Math.round(40 * Math.max(0, 1 - daysUntilBudgetExhaustion / 30)), 0, 40);
  return clamp(Math.round(riskComponent + budgetUrgency));
}

/**
 * Compute composite impact and level.
 */
export function computeIncidentImpact(
  escalationRate: number,
  zoneGuardrailCount: number,
  riskProbability: number,
  daysUntilBudgetExhaustion: number,
): IncidentImpactResult {
  const operationalImpactScore = computeOperationalImpact(escalationRate, zoneGuardrailCount);
  const reputationalRiskScore = computeReputationalRisk(riskProbability, daysUntilBudgetExhaustion);

  const compositeImpactScore = clamp(
    Math.round(operationalImpactScore * 0.55 + reputationalRiskScore * 0.45)
  );

  const impactLevel: ImpactLevel =
    compositeImpactScore >= 75 ? "critical" :
    compositeImpactScore >= 50 ? "high" :
    compositeImpactScore >= 25 ? "moderate" :
    "low";

  return { operationalImpactScore, reputationalRiskScore, compositeImpactScore, impactLevel };
}
