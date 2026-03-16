/**
 * LankaFix Reliability Dispatch Policy Simulator — Shadow Mode
 * Pure function. No React, no Supabase, no Date.now(), no side effects.
 * Simulates what dispatch policy WOULD enforce under current reliability conditions.
 * Does NOT alter live dispatch behavior.
 */

import type { DispatchRiskLevel } from "./reliabilityDispatchRiskEngine";

export type ShadowPolicyMode = "NORMAL" | "CAUTION" | "THROTTLE" | "PROTECT";
export type SimulatedRoutingAction = "NO_CHANGE" | "SOFT_LIMIT" | "REDUCE_ASSIGNMENTS" | "AVOID_NEW_ROUTING";
export type SimulatedCapacityAction = "NORMAL" | "REDUCE_NEW_LOAD" | "FREEZE_LOW_PRIORITY" | "EMERGENCY_ONLY";
export type SimulatedBookingIntakeAdvisory = "OPEN" | "MONITOR" | "SOFT_GUARD" | "RESTRICT";

export interface DispatchPolicySimulationInput {
  dispatchRiskLevel: DispatchRiskLevel;
  routingRecommendation: string;
  technicianLoadRecommendation: string;
  dispatchConfidence: number;
  reliabilityScore: number;
  breachRisk: number;
  escalationRate: number;
  zoneGuardrailCount: number;
}

export interface DispatchPolicySimulationResult {
  shadowPolicyMode: ShadowPolicyMode;
  simulatedRoutingAction: SimulatedRoutingAction;
  simulatedCapacityAction: SimulatedCapacityAction;
  simulatedZoneProtection: boolean;
  simulatedPartnerLoadCapPercent: number;
  simulatedBookingIntakeAdvisory: SimulatedBookingIntakeAdvisory;
  policyReason: string;
}

interface PolicyPreset {
  shadowPolicyMode: ShadowPolicyMode;
  simulatedRoutingAction: SimulatedRoutingAction;
  simulatedCapacityAction: SimulatedCapacityAction;
  simulatedZoneProtection: boolean;
  simulatedPartnerLoadCapPercent: number;
  simulatedBookingIntakeAdvisory: SimulatedBookingIntakeAdvisory;
}

const POLICY_PRESETS: Record<DispatchRiskLevel, PolicyPreset> = {
  LOW: {
    shadowPolicyMode: "NORMAL",
    simulatedRoutingAction: "NO_CHANGE",
    simulatedCapacityAction: "NORMAL",
    simulatedZoneProtection: false,
    simulatedPartnerLoadCapPercent: 100,
    simulatedBookingIntakeAdvisory: "OPEN",
  },
  MODERATE: {
    shadowPolicyMode: "CAUTION",
    simulatedRoutingAction: "SOFT_LIMIT",
    simulatedCapacityAction: "NORMAL",
    simulatedZoneProtection: false,
    simulatedPartnerLoadCapPercent: 90,
    simulatedBookingIntakeAdvisory: "MONITOR",
  },
  HIGH: {
    shadowPolicyMode: "THROTTLE",
    simulatedRoutingAction: "REDUCE_ASSIGNMENTS",
    simulatedCapacityAction: "REDUCE_NEW_LOAD",
    simulatedZoneProtection: true,
    simulatedPartnerLoadCapPercent: 70,
    simulatedBookingIntakeAdvisory: "SOFT_GUARD",
  },
  CRITICAL: {
    shadowPolicyMode: "PROTECT",
    simulatedRoutingAction: "AVOID_NEW_ROUTING",
    simulatedCapacityAction: "EMERGENCY_ONLY",
    simulatedZoneProtection: true,
    simulatedPartnerLoadCapPercent: 40,
    simulatedBookingIntakeAdvisory: "RESTRICT",
  },
};

const POLICY_REASONS: Record<DispatchRiskLevel, string> = {
  LOW: "Reliability within safe operating range. No dispatch policy adjustments recommended.",
  MODERATE: "Reliability showing early degradation signals. Shadow policy recommends cautious monitoring of dispatch load.",
  HIGH: "Reliability score below safe operating threshold. Shadow policy recommends reduced assignments and zone protection.",
  CRITICAL: "Critical reliability degradation detected. Shadow policy recommends protected dispatch mode with emergency-only intake.",
};

/**
 * Simulate dispatch policy based on current reliability risk signals.
 * Pure function — deterministic, no side effects.
 */
export function simulateDispatchPolicy(input: DispatchPolicySimulationInput): DispatchPolicySimulationResult {
  const preset = POLICY_PRESETS[input.dispatchRiskLevel];
  return {
    ...preset,
    policyReason: POLICY_REASONS[input.dispatchRiskLevel],
  };
}
