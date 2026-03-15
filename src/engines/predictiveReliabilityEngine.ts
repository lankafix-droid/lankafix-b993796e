/**
 * LankaFix Predictive Reliability Engine — Pure Functions
 * Projects reliability risk based on healing trend data.
 * Zero React/Supabase dependencies. Deterministic with optional `now`.
 */

import type { HealingStats } from "./selfHealingEngine";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface ReliabilityRiskForecast {
  riskProbability: number; // 0–100
  projectedEscalationRate: number;
  projectedSuccessRate: number;
  projectedConfidence: number;
  riskLevel: RiskLevel;
}

export interface TrendWindow {
  successRate: number;
  escalationRate: number;
  circuitBreakCount: number;
  confidence: number;
  timestamp: number;
}

/**
 * Compute escalation trend slope from ordered windows.
 * Positive slope = worsening. Uses simple linear regression.
 */
export function computeTrendSlope(windows: TrendWindow[], field: keyof Pick<TrendWindow, "escalationRate" | "successRate" | "confidence">): number {
  if (windows.length < 2) return 0;
  const n = windows.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += windows[i][field];
    sumXY += i * windows[i][field];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Count circuit breaker activations within a time window.
 */
export function countCircuitBreaks(windows: TrendWindow[]): number {
  return windows.reduce((sum, w) => sum + w.circuitBreakCount, 0);
}

/**
 * Check if escalation slope is rising for N consecutive windows.
 */
export function isEscalationRising(windows: TrendWindow[], consecutiveCount: number = 2): boolean {
  if (windows.length < consecutiveCount + 1) return false;
  let risingCount = 0;
  for (let i = 1; i < windows.length; i++) {
    if (windows[i].escalationRate > windows[i - 1].escalationRate) {
      risingCount++;
      if (risingCount >= consecutiveCount) return true;
    } else {
      risingCount = 0;
    }
  }
  return false;
}

/**
 * Project 6h/24h reliability risk based on trend windows.
 * Deterministic — no side effects.
 */
export function computeRiskForecast(
  windows: TrendWindow[],
  currentStats: HealingStats,
  currentConfidence: number,
): ReliabilityRiskForecast {
  if (windows.length === 0) {
    return {
      riskProbability: 0,
      projectedEscalationRate: currentStats.escalationRate,
      projectedSuccessRate: currentStats.successRate,
      projectedConfidence: currentConfidence,
      riskLevel: "low",
    };
  }

  const escalationSlope = computeTrendSlope(windows, "escalationRate");
  const successSlope = computeTrendSlope(windows, "successRate");
  const confidenceSlope = computeTrendSlope(windows, "confidence");
  const circuitBreaks = countCircuitBreaks(windows);

  // Project 6h forward (assuming ~1 window per hour, 6 steps)
  const projectedEscalationRate = Math.max(0, Math.min(100,
    Math.round(currentStats.escalationRate + escalationSlope * 6)
  ));
  const projectedSuccessRate = Math.max(0, Math.min(100,
    Math.round(currentStats.successRate + successSlope * 6)
  ));
  const projectedConfidence = Math.max(0, Math.min(100,
    Math.round(currentConfidence + confidenceSlope * 6)
  ));

  // Risk probability scoring
  let riskScore = 0;

  // Escalation trend contribution (0–40)
  if (escalationSlope > 0) riskScore += Math.min(40, Math.round(escalationSlope * 15));

  // Success rate degradation (0–30)
  if (successSlope < 0) riskScore += Math.min(30, Math.round(Math.abs(successSlope) * 12));

  // Circuit breaker clustering (0–20)
  riskScore += Math.min(20, circuitBreaks * 7);

  // Confidence degradation velocity (0–10)
  if (confidenceSlope < 0) riskScore += Math.min(10, Math.round(Math.abs(confidenceSlope) * 5));

  const riskProbability = Math.max(0, Math.min(100, riskScore));

  const riskLevel: RiskLevel =
    riskProbability >= 75 ? "critical" :
    riskProbability >= 50 ? "high" :
    riskProbability >= 25 ? "moderate" :
    "low";

  return {
    riskProbability,
    projectedEscalationRate,
    projectedSuccessRate,
    projectedConfidence,
    riskLevel,
  };
}

/**
 * Determine if automated governance enforcement should trigger.
 * Returns true if predictive risk warrants incident creation.
 */
export function shouldTriggerGovernanceIncident(
  forecast: ReliabilityRiskForecast,
  windows: TrendWindow[],
  circuitBreakCountLast12h: number,
): boolean {
  // Condition 1: Projected risk ≥ 75%
  if (forecast.riskProbability >= 75) return true;

  // Condition 2: Escalation slope rising 2 consecutive windows
  if (isEscalationRising(windows, 2) && forecast.riskProbability >= 50) return true;

  // Condition 3: Circuit break triggered twice in 12h
  if (circuitBreakCountLast12h >= 2) return true;

  return false;
}
