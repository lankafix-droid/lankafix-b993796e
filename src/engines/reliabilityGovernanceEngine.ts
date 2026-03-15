/**
 * LankaFix Reliability Governance Engine — Pure Functions
 * Computes executive-grade reliability scoring and SLO compliance.
 * Zero React/Supabase dependencies. Deterministic.
 */

import type { HealingStats, HealingSystemStatus } from "./selfHealingEngine";

export type ReliabilityVerdict = "STABLE" | "GUARDED" | "RISK" | "CRITICAL";
export type SLOStatus = "compliant" | "watch" | "breach";

export interface ReliabilityGovernanceResult {
  reliabilityScore: number; // 0–100
  verdict: ReliabilityVerdict;
  sloStatus: SLOStatus;
}

export interface ZoneReliabilityResult {
  zoneId: string;
  reliabilityScore: number;
  verdict: ReliabilityVerdict;
  riskLevel: string;
}

// SLO targets (hardcoded benchmarks)
export const SLO_SUCCESS_RATE_TARGET = 95;
export const SLO_ESCALATION_RATE_MAX = 10;
export const SLO_CIRCUIT_BREAK_MAX_PER_24H = 1;

/**
 * Compute reliability score (0–100) with weighted components.
 * Weights: success 40%, escalation inverse 25%, circuit break 15%, confidence 10%, auto-mode stability 10%
 */
export function computeReliabilityScore(
  stats: HealingStats,
  circuitBreakCount24h: number,
  confidenceScore: number,
  autoModeHalted: boolean,
): number {
  // Success rate component (40%)
  const successComponent = stats.successRate * 0.4;

  // Escalation rate inverse (25%) — lower is better
  const escalationInverse = Math.max(0, 100 - stats.escalationRate);
  const escalationComponent = escalationInverse * 0.25;

  // Circuit break frequency (15%) — 0 breaks = 100%, each break reduces
  const circuitScore = Math.max(0, 100 - circuitBreakCount24h * 33);
  const circuitComponent = circuitScore * 0.15;

  // Confidence (10%)
  const confidenceComponent = confidenceScore * 0.10;

  // Auto-mode stability (10%) — halted = 0
  const autoModeComponent = autoModeHalted ? 0 : 10;

  return Math.max(0, Math.min(100,
    Math.round(successComponent + escalationComponent + circuitComponent + confidenceComponent + autoModeComponent)
  ));
}

/**
 * Determine executive verdict from reliability score.
 */
export function computeVerdict(reliabilityScore: number): ReliabilityVerdict {
  if (reliabilityScore >= 85) return "STABLE";
  if (reliabilityScore >= 65) return "GUARDED";
  if (reliabilityScore >= 40) return "RISK";
  return "CRITICAL";
}

/**
 * Determine SLO compliance status.
 */
export function computeSLOStatus(
  stats: HealingStats,
  circuitBreakCount24h: number,
): SLOStatus {
  const successBreached = stats.successRate < SLO_SUCCESS_RATE_TARGET;
  const escalationBreached = stats.escalationRate > SLO_ESCALATION_RATE_MAX;
  const circuitBreached = circuitBreakCount24h > SLO_CIRCUIT_BREAK_MAX_PER_24H;

  const breachCount = [successBreached, escalationBreached, circuitBreached].filter(Boolean).length;

  if (breachCount >= 2) return "breach";
  if (breachCount === 1) return "watch";
  return "compliant";
}

/**
 * Full governance computation.
 */
export function computeGovernance(
  stats: HealingStats,
  circuitBreakCount24h: number,
  confidenceScore: number,
  autoModeHalted: boolean,
): ReliabilityGovernanceResult {
  const reliabilityScore = computeReliabilityScore(stats, circuitBreakCount24h, confidenceScore, autoModeHalted);
  const verdict = computeVerdict(reliabilityScore);
  const sloStatus = computeSLOStatus(stats, circuitBreakCount24h);

  return { reliabilityScore, verdict, sloStatus };
}

/**
 * Compute per-zone reliability result.
 */
export function computeZoneReliability(
  zoneId: string,
  stats: HealingStats,
  circuitBreakCount24h: number,
  confidenceScore: number,
  autoModeHalted: boolean,
): ZoneReliabilityResult {
  const reliabilityScore = computeReliabilityScore(stats, circuitBreakCount24h, confidenceScore, autoModeHalted);
  const verdict = computeVerdict(reliabilityScore);

  const riskLevel =
    reliabilityScore >= 85 ? "low" :
    reliabilityScore >= 65 ? "moderate" :
    reliabilityScore >= 40 ? "high" :
    "critical";

  return { zoneId, reliabilityScore, verdict, riskLevel };
}
