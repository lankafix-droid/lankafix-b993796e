/**
 * LankaFix Reliability Rollout Policy Engine
 * Pure function. No React, no Supabase, no Date.now(), no side effects.
 * Determines rollout readiness and recommended enforcement mode
 * based on current reliability posture signals.
 * Does NOT alter live dispatch or marketplace behavior.
 */

import type { DispatchRiskLevel } from "./reliabilityDispatchRiskEngine";
import type { ShadowPolicyMode } from "./reliabilityDispatchPolicySimulator";

export type RolloutReadiness = "NOT_READY" | "LIMITED" | "CONTROLLED" | "READY";
export type RecommendedMode = "OBSERVE_ONLY" | "SHADOW_ONLY" | "PILOT_ENFORCEMENT" | "BROAD_ENFORCEMENT";

export interface RolloutPolicyInput {
  reliabilityScore: number;
  dispatchRiskLevel: DispatchRiskLevel;
  shadowPolicyMode: ShadowPolicyMode;
  breachRisk: number;
  escalationRate: number;
  dispatchConfidence: number;
  zoneCountReady: number;
  activePartnerCount: number;
}

export interface RolloutPolicyResult {
  rolloutReadiness: RolloutReadiness;
  recommendedMode: RecommendedMode;
  recommendedRolloutPercent: number;
  enforceZoneProtectionEligible: boolean;
  enforceCapacityCapEligible: boolean;
  enforceBookingGuardEligible: boolean;
  rolloutReason: string;
}

const ROLLOUT_REASONS: Record<string, string> = {
  NOT_READY: "Critical reliability degradation detected. System not ready for any enforcement rollout.",
  LIMITED: "Reliability below safe threshold. Shadow-mode observation recommended; no enforcement eligible.",
  CONTROLLED_PILOT: "Reliability at controlled level. Eligible for tightly scoped pilot enforcement of zone protection only.",
  READY_PILOT: "Reliability in healthy range. Eligible for pilot enforcement with zone protection and capacity caps.",
  READY_BROAD: "Reliability strong with low breach risk. Safe candidate for broader enforcement trial under kill-switch supervision.",
};

/**
 * Compute rollout policy recommendation.
 * Pure function — deterministic, no side effects.
 */
export function computeRolloutPolicy(input: RolloutPolicyInput): RolloutPolicyResult {
  const { reliabilityScore, dispatchRiskLevel, breachRisk } = input;

  // CRITICAL → NOT_READY
  if (dispatchRiskLevel === "CRITICAL") {
    return {
      rolloutReadiness: "NOT_READY",
      recommendedMode: "OBSERVE_ONLY",
      recommendedRolloutPercent: 0,
      enforceZoneProtectionEligible: false,
      enforceCapacityCapEligible: false,
      enforceBookingGuardEligible: false,
      rolloutReason: ROLLOUT_REASONS.NOT_READY,
    };
  }

  // HIGH → LIMITED
  if (dispatchRiskLevel === "HIGH") {
    return {
      rolloutReadiness: "LIMITED",
      recommendedMode: "SHADOW_ONLY",
      recommendedRolloutPercent: 0,
      enforceZoneProtectionEligible: false,
      enforceCapacityCapEligible: false,
      enforceBookingGuardEligible: false,
      rolloutReason: ROLLOUT_REASONS.LIMITED,
    };
  }

  // MODERATE + adequate score → CONTROLLED
  if (dispatchRiskLevel === "MODERATE" && reliabilityScore >= 70) {
    return {
      rolloutReadiness: "CONTROLLED",
      recommendedMode: "PILOT_ENFORCEMENT",
      recommendedRolloutPercent: 10,
      enforceZoneProtectionEligible: true,
      enforceCapacityCapEligible: false,
      enforceBookingGuardEligible: false,
      rolloutReason: ROLLOUT_REASONS.CONTROLLED_PILOT,
    };
  }

  // MODERATE but low score → LIMITED
  if (dispatchRiskLevel === "MODERATE") {
    return {
      rolloutReadiness: "LIMITED",
      recommendedMode: "SHADOW_ONLY",
      recommendedRolloutPercent: 0,
      enforceZoneProtectionEligible: false,
      enforceCapacityCapEligible: false,
      enforceBookingGuardEligible: false,
      rolloutReason: ROLLOUT_REASONS.LIMITED,
    };
  }

  // LOW + score >= 92 + breachRisk <= 15 → BROAD
  if (reliabilityScore >= 92 && breachRisk <= 15) {
    return {
      rolloutReadiness: "READY",
      recommendedMode: "BROAD_ENFORCEMENT",
      recommendedRolloutPercent: 50,
      enforceZoneProtectionEligible: true,
      enforceCapacityCapEligible: true,
      enforceBookingGuardEligible: true,
      rolloutReason: ROLLOUT_REASONS.READY_BROAD,
    };
  }

  // LOW + score >= 85 → PILOT
  if (reliabilityScore >= 85) {
    return {
      rolloutReadiness: "READY",
      recommendedMode: "PILOT_ENFORCEMENT",
      recommendedRolloutPercent: 25,
      enforceZoneProtectionEligible: true,
      enforceCapacityCapEligible: true,
      enforceBookingGuardEligible: false,
      rolloutReason: ROLLOUT_REASONS.READY_PILOT,
    };
  }

  // LOW but score < 85 → CONTROLLED
  return {
    rolloutReadiness: "CONTROLLED",
    recommendedMode: "PILOT_ENFORCEMENT",
    recommendedRolloutPercent: 10,
    enforceZoneProtectionEligible: true,
    enforceCapacityCapEligible: false,
    enforceBookingGuardEligible: false,
    rolloutReason: ROLLOUT_REASONS.CONTROLLED_PILOT,
  };
}
