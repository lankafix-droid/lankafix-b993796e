/**
 * LankaFix Category Reliability Engine — Pure Functions
 * Per-zone × per-category reliability scoring, risk assessment, shadow policy, and rollout eligibility.
 * No React, no Supabase, no Date.now(), no side effects. Deterministic.
 * Does NOT alter live dispatch, booking, or payment behavior.
 */

import type { DispatchRiskLevel } from "./reliabilityDispatchRiskEngine";
import type { ShadowPolicyMode } from "./reliabilityDispatchPolicySimulator";

export type CategoryVerdict = "STABLE" | "GUARDED" | "RISK" | "CRITICAL";
export type CategoryRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type CategoryRoutingRecommendation = "NORMAL" | "CAUTION" | "LIMIT_ROUTING" | "AVOID_CATEGORY";
export type CategoryTechnicianLoadRecommendation = "NORMAL" | "REDUCE_LOAD" | "HALT_ASSIGNMENTS";
export type CategoryRolloutReadiness = "NOT_READY" | "LIMITED" | "CONTROLLED" | "READY";
export type CategorySampleQuality = "HIGH" | "MEDIUM" | "LOW" | "PILOT_ESTIMATE";

export interface CategoryReliabilityInput {
  zoneId: string;
  categoryCode: string;
  bookingCount24h: number;
  successCount24h: number;
  escalationCount24h: number;
  failedHealingCount24h: number;
  circuitBreakCount24h: number;
  confidenceScore: number;
  breachRisk: number;
  impactScore: number;
}

export interface CategoryReliabilitySummary {
  zoneId: string;
  categoryCode: string;
  reliabilityScore: number;
  verdict: CategoryVerdict;
  riskLevel: CategoryRiskLevel;
  dispatchRiskLevel: DispatchRiskLevel;
  dispatchConfidence: number;
  routingRecommendation: CategoryRoutingRecommendation;
  technicianLoadRecommendation: CategoryTechnicianLoadRecommendation;
  shadowPolicyMode: ShadowPolicyMode;
  rolloutReadiness: CategoryRolloutReadiness;
  recommendedRolloutPercent: number;
  eligibleForZoneProtection: boolean;
  eligibleForCapacityCap: boolean;
  eligibleForBookingGuard: boolean;
  sampleQuality: CategorySampleQuality;
  warnings: string[];
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Compute per-category reliability score (0–100).
 * Weights: success 40%, escalation inverse 25%, circuit break 15%, confidence 10%, impact inverse 10%
 */
export function computeCategoryReliabilityScore(input: CategoryReliabilityInput): number {
  const { bookingCount24h, successCount24h, escalationCount24h, circuitBreakCount24h, confidenceScore, impactScore } = input;

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

export function computeCategoryVerdict(score: number): CategoryVerdict {
  if (score >= 85) return "STABLE";
  if (score >= 65) return "GUARDED";
  if (score >= 40) return "RISK";
  return "CRITICAL";
}

export function computeCategoryRiskLevel(score: number): CategoryRiskLevel {
  if (score >= 85) return "LOW";
  if (score >= 65) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

function computeCategoryDispatchRiskLevel(score: number): DispatchRiskLevel {
  if (score >= 85) return "LOW";
  if (score >= 65) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

function computeCategoryDispatchConfidence(score: number, breachRisk: number, escalationRate: number): number {
  const raw = score * 0.4 + (100 - breachRisk) * 0.3 + (100 - escalationRate) * 0.3;
  return clamp(raw);
}

function computeCategoryRoutingRecommendation(riskLevel: DispatchRiskLevel): CategoryRoutingRecommendation {
  const map: Record<DispatchRiskLevel, CategoryRoutingRecommendation> = {
    LOW: "NORMAL", MODERATE: "CAUTION", HIGH: "LIMIT_ROUTING", CRITICAL: "AVOID_CATEGORY",
  };
  return map[riskLevel];
}

function computeCategoryTechLoad(riskLevel: DispatchRiskLevel): CategoryTechnicianLoadRecommendation {
  const map: Record<DispatchRiskLevel, CategoryTechnicianLoadRecommendation> = {
    LOW: "NORMAL", MODERATE: "NORMAL", HIGH: "REDUCE_LOAD", CRITICAL: "HALT_ASSIGNMENTS",
  };
  return map[riskLevel];
}

function computeCategoryShadowPolicy(riskLevel: DispatchRiskLevel): ShadowPolicyMode {
  const map: Record<DispatchRiskLevel, ShadowPolicyMode> = {
    LOW: "NORMAL", MODERATE: "CAUTION", HIGH: "THROTTLE", CRITICAL: "PROTECT",
  };
  return map[riskLevel];
}

function computeCategoryRolloutReadiness(score: number, riskLevel: CategoryRiskLevel): CategoryRolloutReadiness {
  if (riskLevel === "CRITICAL" || score < 40) return "NOT_READY";
  if (riskLevel === "HIGH" || score < 65) return "LIMITED";
  if (riskLevel === "MODERATE" || score < 85) return "CONTROLLED";
  return "READY";
}

function computeCategoryRolloutPercent(readiness: CategoryRolloutReadiness): number {
  const map: Record<CategoryRolloutReadiness, number> = {
    NOT_READY: 0, LIMITED: 0, CONTROLLED: 10, READY: 25,
  };
  return map[readiness];
}

export function computeCategorySampleQuality(bookingCount24h: number): CategorySampleQuality {
  if (bookingCount24h >= 10) return "HIGH";
  if (bookingCount24h >= 5) return "MEDIUM";
  if (bookingCount24h >= 1) return "LOW";
  return "PILOT_ESTIMATE";
}

/**
 * Compute full per-category reliability summary. Pure, deterministic.
 */
export function computeCategoryReliability(input: CategoryReliabilityInput): CategoryReliabilitySummary {
  const score = computeCategoryReliabilityScore(input);
  const verdict = computeCategoryVerdict(score);
  const riskLevel = computeCategoryRiskLevel(score);
  const dispatchRiskLevel = computeCategoryDispatchRiskLevel(score);

  const escalationRate = input.bookingCount24h > 0
    ? (input.escalationCount24h / input.bookingCount24h) * 100
    : 0;

  const dispatchConfidence = computeCategoryDispatchConfidence(score, input.breachRisk, escalationRate);
  const routingRecommendation = computeCategoryRoutingRecommendation(dispatchRiskLevel);
  const technicianLoadRecommendation = computeCategoryTechLoad(dispatchRiskLevel);
  const shadowPolicyMode = computeCategoryShadowPolicy(dispatchRiskLevel);
  const rolloutReadiness = computeCategoryRolloutReadiness(score, riskLevel);
  const recommendedRolloutPercent = computeCategoryRolloutPercent(rolloutReadiness);
  const sampleQuality = computeCategorySampleQuality(input.bookingCount24h);

  const eligibleForZoneProtection = rolloutReadiness === "CONTROLLED" || rolloutReadiness === "READY";
  const eligibleForCapacityCap = rolloutReadiness === "CONTROLLED" || rolloutReadiness === "READY";
  const eligibleForBookingGuard = rolloutReadiness === "READY";

  const warnings: string[] = [];
  if (sampleQuality === "PILOT_ESTIMATE") warnings.push("No bookings in 24h — using pilot estimate");
  if (sampleQuality === "LOW") warnings.push("Low sample size — reliability score is provisional");
  if (input.circuitBreakCount24h > 0) warnings.push(`${input.circuitBreakCount24h} circuit break(s) detected in 24h`);
  if (riskLevel === "CRITICAL") warnings.push("Critical risk — category should not receive enforcement rollout");
  if (input.impactScore > 50 && riskLevel !== "LOW") warnings.push("Category risk higher than zone baseline");

  return {
    zoneId: input.zoneId,
    categoryCode: input.categoryCode,
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
 * Batch compute category reliability for multiple zone×category pairs. Pure.
 */
export function computeAllCategoryReliability(inputs: CategoryReliabilityInput[]): CategoryReliabilitySummary[] {
  return inputs.map(computeCategoryReliability);
}
