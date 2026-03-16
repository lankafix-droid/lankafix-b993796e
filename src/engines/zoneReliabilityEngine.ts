/**
 * LankaFix Zone Reliability Engine — Pure Functions
 * Per-zone reliability scoring, risk assessment, shadow policy, and rollout eligibility.
 * No React, no Supabase, no Date.now(), no side effects. Deterministic.
 * Does NOT alter live dispatch, booking, or payment behavior.
 */

import type { DispatchRiskLevel } from "./reliabilityDispatchRiskEngine";
import type { ShadowPolicyMode } from "./reliabilityDispatchPolicySimulator";

export type ZoneVerdict = "STABLE" | "GUARDED" | "RISK" | "CRITICAL";
export type ZoneRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type ZoneRoutingRecommendation = "NORMAL" | "CAUTION" | "LIMIT_ROUTING" | "AVOID_ZONE";
export type ZoneTechnicianLoadRecommendation = "NORMAL" | "REDUCE_LOAD" | "HALT_ASSIGNMENTS";
export type ZoneRolloutReadiness = "NOT_READY" | "LIMITED" | "CONTROLLED" | "READY";
export type ZoneSampleQuality = "HIGH" | "MEDIUM" | "LOW" | "PILOT_ESTIMATE";

export interface ZoneReliabilityInput {
  zoneId: string;
  bookingCount24h: number;
  successCount24h: number;
  escalationCount24h: number;
  failedHealingCount24h: number;
  circuitBreakCount24h: number;
  confidenceScore: number;
  breachRisk: number;
  impactScore: number;
}

export interface ZoneReliabilitySummary {
  zoneId: string;
  reliabilityScore: number;
  verdict: ZoneVerdict;
  riskLevel: ZoneRiskLevel;
  dispatchRiskLevel: DispatchRiskLevel;
  dispatchConfidence: number;
  routingRecommendation: ZoneRoutingRecommendation;
  technicianLoadRecommendation: ZoneTechnicianLoadRecommendation;
  shadowPolicyMode: ShadowPolicyMode;
  rolloutReadiness: ZoneRolloutReadiness;
  recommendedRolloutPercent: number;
  eligibleForZoneProtection: boolean;
  eligibleForCapacityCap: boolean;
  eligibleForBookingGuard: boolean;
  sampleQuality: ZoneSampleQuality;
  warnings: string[];
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Compute per-zone reliability score (0–100).
 * Weights: success 40%, escalation inverse 25%, circuit break 15%, confidence 10%, impact inverse 10%
 */
export function computeZoneReliabilityScore(input: ZoneReliabilityInput): number {
  const { bookingCount24h, successCount24h, escalationCount24h, circuitBreakCount24h, confidenceScore, impactScore } = input;

  // If no bookings, return confidence-based default
  if (bookingCount24h === 0) {
    return clamp(confidenceScore * 0.9);
  }

  const successRate = (successCount24h / bookingCount24h) * 100;
  const escalationRate = (escalationCount24h / bookingCount24h) * 100;

  const successComponent = Math.min(100, successRate) * 0.4;
  const escalationInverse = Math.max(0, 100 - escalationRate);
  const escalationComponent = escalationInverse * 0.25;
  const circuitScore = Math.max(0, 100 - circuitBreakCount24h * 33);
  const circuitComponent = circuitScore * 0.15;
  const confidenceComponent = clamp(confidenceScore) * 0.1;
  const impactInverse = Math.max(0, 100 - impactScore);
  const impactComponent = impactInverse * 0.1;

  return clamp(successComponent + escalationComponent + circuitComponent + confidenceComponent + impactComponent);
}

export function computeZoneVerdict(score: number): ZoneVerdict {
  if (score >= 85) return "STABLE";
  if (score >= 65) return "GUARDED";
  if (score >= 40) return "RISK";
  return "CRITICAL";
}

export function computeZoneRiskLevel(score: number): ZoneRiskLevel {
  if (score >= 85) return "LOW";
  if (score >= 65) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

function computeZoneDispatchRiskLevel(score: number): DispatchRiskLevel {
  if (score >= 85) return "LOW";
  if (score >= 65) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

function computeZoneDispatchConfidence(score: number, breachRisk: number, escalationRate: number): number {
  const raw = score * 0.4 + (100 - breachRisk) * 0.3 + (100 - escalationRate) * 0.3;
  return clamp(raw);
}

function computeZoneRoutingRecommendation(riskLevel: DispatchRiskLevel): ZoneRoutingRecommendation {
  const map: Record<DispatchRiskLevel, ZoneRoutingRecommendation> = {
    LOW: "NORMAL", MODERATE: "CAUTION", HIGH: "LIMIT_ROUTING", CRITICAL: "AVOID_ZONE",
  };
  return map[riskLevel];
}

function computeZoneTechLoad(riskLevel: DispatchRiskLevel): ZoneTechnicianLoadRecommendation {
  const map: Record<DispatchRiskLevel, ZoneTechnicianLoadRecommendation> = {
    LOW: "NORMAL", MODERATE: "NORMAL", HIGH: "REDUCE_LOAD", CRITICAL: "HALT_ASSIGNMENTS",
  };
  return map[riskLevel];
}

function computeZoneShadowPolicy(riskLevel: DispatchRiskLevel): ShadowPolicyMode {
  const map: Record<DispatchRiskLevel, ShadowPolicyMode> = {
    LOW: "NORMAL", MODERATE: "CAUTION", HIGH: "THROTTLE", CRITICAL: "PROTECT",
  };
  return map[riskLevel];
}

function computeZoneRolloutReadiness(score: number, riskLevel: ZoneRiskLevel): ZoneRolloutReadiness {
  if (riskLevel === "CRITICAL" || score < 40) return "NOT_READY";
  if (riskLevel === "HIGH" || score < 65) return "LIMITED";
  if (riskLevel === "MODERATE" || score < 85) return "CONTROLLED";
  return "READY";
}

function computeZoneRolloutPercent(readiness: ZoneRolloutReadiness): number {
  const map: Record<ZoneRolloutReadiness, number> = {
    NOT_READY: 0, LIMITED: 0, CONTROLLED: 10, READY: 25,
  };
  return map[readiness];
}

export function computeZoneSampleQuality(bookingCount24h: number): ZoneSampleQuality {
  if (bookingCount24h >= 10) return "HIGH";
  if (bookingCount24h >= 5) return "MEDIUM";
  if (bookingCount24h >= 1) return "LOW";
  return "PILOT_ESTIMATE";
}

/**
 * Compute full per-zone reliability summary. Pure, deterministic.
 */
export function computeZoneReliability(input: ZoneReliabilityInput): ZoneReliabilitySummary {
  const score = computeZoneReliabilityScore(input);
  const verdict = computeZoneVerdict(score);
  const riskLevel = computeZoneRiskLevel(score);
  const dispatchRiskLevel = computeZoneDispatchRiskLevel(score);

  const escalationRate = input.bookingCount24h > 0
    ? (input.escalationCount24h / input.bookingCount24h) * 100
    : 0;

  const dispatchConfidence = computeZoneDispatchConfidence(score, input.breachRisk, escalationRate);
  const routingRecommendation = computeZoneRoutingRecommendation(dispatchRiskLevel);
  const technicianLoadRecommendation = computeZoneTechLoad(dispatchRiskLevel);
  const shadowPolicyMode = computeZoneShadowPolicy(dispatchRiskLevel);
  const rolloutReadiness = computeZoneRolloutReadiness(score, riskLevel);
  const recommendedRolloutPercent = computeZoneRolloutPercent(rolloutReadiness);
  const sampleQuality = computeZoneSampleQuality(input.bookingCount24h);

  // Eligibility
  const eligibleForZoneProtection = rolloutReadiness === "CONTROLLED" || rolloutReadiness === "READY";
  const eligibleForCapacityCap = rolloutReadiness === "CONTROLLED" || rolloutReadiness === "READY";
  const eligibleForBookingGuard = rolloutReadiness === "READY";

  // Warnings
  const warnings: string[] = [];
  if (sampleQuality === "PILOT_ESTIMATE") warnings.push("No bookings in 24h — using pilot estimate");
  if (sampleQuality === "LOW") warnings.push("Low sample size — reliability score is provisional");
  if (input.circuitBreakCount24h > 0) warnings.push(`${input.circuitBreakCount24h} circuit break(s) detected in 24h`);
  if (riskLevel === "CRITICAL") warnings.push("Critical risk — zone should not receive enforcement rollout");

  return {
    zoneId: input.zoneId,
    reliabilityScore: score,
    verdict,
    riskLevel,
    dispatchRiskLevel,
    dispatchConfidence,
    routingRecommendation,
    technicianLoadRecommendation,
    shadowPolicyMode,
    rolloutReadiness,
    recommendedRolloutPercent,
    eligibleForZoneProtection,
    eligibleForCapacityCap,
    eligibleForBookingGuard,
    sampleQuality,
    warnings,
  };
}

/**
 * Batch compute zone reliability for multiple zones. Pure.
 */
export function computeAllZoneReliability(inputs: ZoneReliabilityInput[]): ZoneReliabilitySummary[] {
  return inputs.map(computeZoneReliability);
}
