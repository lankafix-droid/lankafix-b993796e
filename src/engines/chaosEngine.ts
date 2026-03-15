/**
 * LankaFix Chaos Engine — Pure Simulation Functions
 * Memory-only chaos scenarios for reliability testing.
 * Zero DB mutations. Zero React/Supabase dependencies.
 */

import type { HealingStats, HealingSystemStatus } from "./selfHealingEngine";

// ── Chaos Scenario Types ──
export type ChaosScenario =
  | "payment_gateway_failure"
  | "dispatch_blackout"
  | "partner_dropout"
  | "booking_surge"
  | "escalation_storm";

export interface ChaosState {
  active: boolean;
  scenario: ChaosScenario;
  activatedAt: number;
  expiresAt: number;
}

export interface ChaosInflation {
  additionalFailures: number;
  additionalEscalations: number;
  additionalPaymentFailures: number;
  forceCircuitBreaker: boolean;
}

// ── Scenario Definitions ──
const SCENARIO_INFLATIONS: Record<ChaosScenario, ChaosInflation> = {
  payment_gateway_failure: {
    additionalFailures: 5,
    additionalEscalations: 3,
    additionalPaymentFailures: 4,
    forceCircuitBreaker: false,
  },
  dispatch_blackout: {
    additionalFailures: 8,
    additionalEscalations: 4,
    additionalPaymentFailures: 0,
    forceCircuitBreaker: false,
  },
  partner_dropout: {
    additionalFailures: 6,
    additionalEscalations: 5,
    additionalPaymentFailures: 0,
    forceCircuitBreaker: false,
  },
  booking_surge: {
    additionalFailures: 10,
    additionalEscalations: 2,
    additionalPaymentFailures: 1,
    forceCircuitBreaker: false,
  },
  escalation_storm: {
    additionalFailures: 3,
    additionalEscalations: 12,
    additionalPaymentFailures: 2,
    forceCircuitBreaker: true,
  },
};

export const DEFAULT_CHAOS_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const CHAOS_SCENARIO_LABELS: Record<ChaosScenario, string> = {
  payment_gateway_failure: "Payment Gateway Failure",
  dispatch_blackout: "Dispatch Blackout",
  partner_dropout: "Partner Dropout Wave",
  booking_surge: "Booking Surge",
  escalation_storm: "Escalation Storm",
};

export const CHAOS_SCENARIO_DESCRIPTIONS: Record<ChaosScenario, string> = {
  payment_gateway_failure: "Simulates payment processing failures causing cascading escalations",
  dispatch_blackout: "Simulates complete dispatch system unavailability",
  partner_dropout: "Simulates multiple partners going offline simultaneously",
  booking_surge: "Simulates unexpected booking volume spike overwhelming the system",
  escalation_storm: "Simulates rapid escalation cascade triggering circuit breaker",
};

// ── Pure Functions ──

export function isChaosExpired(state: ChaosState, now: number = Date.now()): boolean {
  return now >= state.expiresAt;
}

export function createChaosState(
  scenario: ChaosScenario,
  now: number = Date.now(),
  timeoutMs: number = DEFAULT_CHAOS_TIMEOUT_MS,
): ChaosState {
  return {
    active: true,
    scenario,
    activatedAt: now,
    expiresAt: now + timeoutMs,
  };
}

export function getScenarioInflation(scenario: ChaosScenario): ChaosInflation {
  return SCENARIO_INFLATIONS[scenario];
}

export function inflateStats(stats: HealingStats, inflation: ChaosInflation): HealingStats {
  const failedCount = stats.failedCount + inflation.additionalFailures;
  const escalatedCount = stats.escalatedCount + inflation.additionalEscalations;
  const totalActions = stats.totalActions + inflation.additionalFailures + inflation.additionalEscalations;
  const successRate = totalActions > 0 ? Math.round((stats.successCount / totalActions) * 100) : 100;
  const escalationRate = totalActions > 0 ? Math.round((escalatedCount / totalActions) * 100) : 0;

  return {
    successCount: stats.successCount,
    failedCount,
    escalatedCount,
    totalActions,
    successRate,
    escalationRate,
  };
}

export function getRemainingSeconds(state: ChaosState, now: number = Date.now()): number {
  return Math.max(0, Math.round((state.expiresAt - now) / 1000));
}

export const ALL_CHAOS_SCENARIOS: ChaosScenario[] = [
  "payment_gateway_failure",
  "dispatch_blackout",
  "partner_dropout",
  "booking_surge",
  "escalation_storm",
];
