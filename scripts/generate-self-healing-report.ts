/**
 * LankaFix Self-Healing Engine — Reliability Report Generator
 * Outputs structured JSON for investor & audit traceability.
 * Run: npx tsx scripts/generate-self-healing-report.ts
 */

import {
  SELF_HEALING_ENGINE_VERSION,
  CIRCUIT_BREAKER_WINDOW_MS,
  CIRCUIT_BREAKER_ESCALATION_LIMIT,
  CIRCUIT_BREAKER_PAYMENT_LIMIT,
  ESCALATION_RATE_HALT_THRESHOLD,
} from "../src/engines/selfHealingEngine";

import {
  MAX_BOOKING_RETRIES,
  MAX_DISPATCH_RETRIES,
  MAX_PAYMENT_RETRIES,
  MAX_AUTOMATION_RETRIES,
  COOLDOWN_MINUTES,
} from "../src/config/selfHealingConfig";

const report = {
  engineVersion: SELF_HEALING_ENGINE_VERSION,
  generatedAt: new Date().toISOString(),
  retryLimits: {
    booking: MAX_BOOKING_RETRIES,
    dispatch: MAX_DISPATCH_RETRIES,
    payment: MAX_PAYMENT_RETRIES,
    automation: MAX_AUTOMATION_RETRIES,
  },
  cooldownMinutes: COOLDOWN_MINUTES,
  circuitBreaker: {
    windowMs: CIRCUIT_BREAKER_WINDOW_MS,
    escalationLimit: CIRCUIT_BREAKER_ESCALATION_LIMIT,
    paymentEscalationLimit: CIRCUIT_BREAKER_PAYMENT_LIMIT,
  },
  confidenceCaps: {
    circuitBroken: 40,
    escalationMode: 50,
  },
  escalationRateHaltThreshold: ESCALATION_RATE_HALT_THRESHOLD,
  autoModeHaltLogic: "Halts when circuitBroken === true OR escalationRate > ESCALATION_RATE_HALT_THRESHOLD",
  purityGuarantees: [
    "No React imports",
    "No Supabase imports",
    "No side effects",
    "No reliance on caller order",
    "All time-sensitive functions accept optional now parameter",
  ],
  testCoverage: {
    totalTests: 60,
    suites: [
      "Healing Stats", "Confidence Score + Integrity Guards", "System Status",
      "Circuit Breaker", "Auto-Mode Halt", "Retry Caps", "Predictive Warnings",
      "Root Cause Insights", "Idempotency Fingerprint", "Boundary & Rounding",
      "Root Cause Tie-Breaking", "Stability Envelope", "Deterministic Phase Stress",
    ],
  },
};

console.log(JSON.stringify(report, null, 2));
