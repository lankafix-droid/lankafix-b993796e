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
  sloTargets: {
    healingSuccessRate: "≥ 95%",
    escalationRate: "≤ 10%",
    circuitBreaksPerDay: "≤ 1",
  },
  chaosScenarios: [
    "payment_gateway_failure",
    "dispatch_blackout",
    "partner_dropout",
    "booking_surge",
    "escalation_storm",
  ],
  reliabilityCapabilities: [
    "Deterministic time injection",
    "Stable tie-breaking",
    "Confidence integrity guards",
    "Idempotency fingerprints",
    "Order-independent predictive warnings",
    "Circuit breaker protection",
    "Non-destructive chaos simulation",
    "SLO compliance tracking",
    "24h reliability timeline",
    "Predictive reliability risk forecasting",
    "Reliability governance scoring",
    "Zone-level reliability intelligence",
    "Immutable reliability snapshot ledger",
    "Automated governance enforcement",
    "Executive reliability verdict",
    "SLA contract tier computation",
    "Incident impact quantification",
    "Cost-of-failure estimation",
    "Board-grade reliability reporting",
    "Multi-zone reliability heatmap",
  ],
  governanceEngine: {
    weights: {
      healingSuccessRate: "40%",
      escalationRateInverse: "25%",
      circuitBreakFrequency: "15%",
      confidenceScore: "10%",
      autoModeStability: "10%",
    },
    verdictThresholds: {
      STABLE: "≥ 85",
      GUARDED: "65–84",
      RISK: "40–64",
      CRITICAL: "< 40",
    },
  },
  predictiveReliability: {
    riskInputs: [
      "Escalation trend slope",
      "Failure growth rate",
      "Circuit breaker clustering",
      "Confidence degradation velocity",
    ],
    governanceTriggering: {
      riskProbabilityThreshold: 75,
      consecutiveEscalationWindows: 2,
      circuitBreaksIn12h: 2,
    },
  },
  slaEngine: {
    tiers: {
      platinum: "≥ 95 reliabilityScore",
      gold: "≥ 85",
      standard: "≥ 70",
      at_risk: "< 70",
    },
    breachRiskFactors: [
      "Inverse reliability score (40%)",
      "Circuit break count penalty (3%/break, max 30%)",
      "Error budget depletion (40% weight)",
    ],
  },
  incidentImpactModel: {
    operationalWeights: {
      escalationRate: "2x multiplier, max 60",
      zoneGuardrails: "8 per guardrail, max 40",
    },
    reputationalWeights: {
      riskProbability: "60% factor",
      budgetRunway: "40% factor (30-day horizon)",
    },
    compositeBlend: "55% operational + 45% reputational",
  },
  costOfFailureModel: {
    dailyFormula: "volume × value × (escalationRate / 100)",
    projectionFormula: "volume × value × max(current, projected) × 30",
    severityThresholds: {
      minimal: "< 100,000 LKR",
      material: "100,000–499,999 LKR",
      severe: "≥ 500,000 LKR",
    },
  },
  purityGuarantees: [
    "No React imports in engine",
    "No Supabase imports in engine",
    "No side effects",
    "No reliance on caller order",
    "All time-sensitive functions accept optional now parameter",
  ],
  testCoverage: {
    totalTests: "60+ (expanding with SLA/impact/cost suites)",
    suites: [
      "Healing Stats", "Confidence Score + Integrity Guards", "System Status",
      "Circuit Breaker", "Auto-Mode Halt", "Retry Caps", "Predictive Warnings",
      "Root Cause Insights", "Idempotency Fingerprint", "Boundary & Rounding",
      "Root Cause Tie-Breaking", "Stability Envelope", "Deterministic Phase Stress",
      "SLA Tier Boundaries", "Incident Impact Boundaries", "Cost-of-Failure Math",
    ],
  },
};

console.log(JSON.stringify(report, null, 2));
