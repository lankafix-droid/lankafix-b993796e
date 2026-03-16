/**
 * LankaFix Reliability Dispatch Risk Engine — Pure Functions
 * Produces advisory dispatch risk signals from reliability metrics.
 * Zero React/Supabase/Date.now dependencies. Deterministic. Read-only.
 * Does NOT alter dispatch behavior — signals only.
 */

export type DispatchRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type RoutingRecommendation = "NORMAL" | "CAUTION" | "LIMIT_ROUTING" | "AVOID_ZONE";
export type TechnicianLoadRecommendation = "NORMAL" | "REDUCE_LOAD" | "HALT_ASSIGNMENTS";

export interface DispatchRiskInput {
  reliabilityScore: number;
  riskProbability: number;
  breachRisk: number;
  compositeImpact: number;
  escalationRate: number;
  circuitBreakCount: number;
  zoneGuardrailCount: number;
}

export interface DispatchReliabilitySignal {
  dispatchRiskLevel: DispatchRiskLevel;
  dispatchConfidence: number;
  routingRecommendation: RoutingRecommendation;
  technicianLoadRecommendation: TechnicianLoadRecommendation;
  reliabilityWarning: string | null;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function computeDispatchRiskLevel(reliabilityScore: number): DispatchRiskLevel {
  if (reliabilityScore >= 85) return "LOW";
  if (reliabilityScore >= 65) return "MODERATE";
  if (reliabilityScore >= 40) return "HIGH";
  return "CRITICAL";
}

function computeRoutingRecommendation(level: DispatchRiskLevel): RoutingRecommendation {
  const map: Record<DispatchRiskLevel, RoutingRecommendation> = {
    LOW: "NORMAL",
    MODERATE: "CAUTION",
    HIGH: "LIMIT_ROUTING",
    CRITICAL: "AVOID_ZONE",
  };
  return map[level];
}

function computeTechnicianLoadRecommendation(level: DispatchRiskLevel): TechnicianLoadRecommendation {
  const map: Record<DispatchRiskLevel, TechnicianLoadRecommendation> = {
    LOW: "NORMAL",
    MODERATE: "NORMAL",
    HIGH: "REDUCE_LOAD",
    CRITICAL: "HALT_ASSIGNMENTS",
  };
  return map[level];
}

function computeDispatchConfidence(
  reliabilityScore: number,
  breachRisk: number,
  escalationRate: number,
): number {
  const raw =
    reliabilityScore * 0.4 +
    (100 - breachRisk) * 0.3 +
    (100 - escalationRate) * 0.3;
  return clamp(Math.round(raw));
}

function computeReliabilityWarning(
  level: DispatchRiskLevel,
  circuitBreakCount: number,
  zoneGuardrailCount: number,
): string | null {
  if (level === "CRITICAL") {
    return "Critical reliability degradation — dispatch routing should be avoided in affected zones";
  }
  if (level === "HIGH") {
    return "High reliability risk — consider limiting new assignments";
  }
  if (circuitBreakCount > 0) {
    return `Circuit breaker activated ${circuitBreakCount} time(s) in last 24h`;
  }
  if (zoneGuardrailCount > 2) {
    return `Zone guardrails triggered ${zoneGuardrailCount} time(s)`;
  }
  return null;
}

/**
 * Compute a dispatch reliability signal from reliability metrics.
 * Pure function — no side effects.
 */
export function computeDispatchReliabilitySignal(input: DispatchRiskInput): DispatchReliabilitySignal {
  const dispatchRiskLevel = computeDispatchRiskLevel(input.reliabilityScore);
  const routingRecommendation = computeRoutingRecommendation(dispatchRiskLevel);
  const technicianLoadRecommendation = computeTechnicianLoadRecommendation(dispatchRiskLevel);
  const dispatchConfidence = computeDispatchConfidence(
    input.reliabilityScore,
    input.breachRisk,
    input.escalationRate,
  );
  const reliabilityWarning = computeReliabilityWarning(
    dispatchRiskLevel,
    input.circuitBreakCount,
    input.zoneGuardrailCount,
  );

  return {
    dispatchRiskLevel,
    dispatchConfidence,
    routingRecommendation,
    technicianLoadRecommendation,
    reliabilityWarning,
  };
}
