/**
 * LankaFix Self-Healing Engine — Enterprise-Grade Deterministic Test Suite
 * Validates: Retry caps, circuit breaker, auto-mode halt, predictive warnings,
 * confidence calculation, deterministic time, order independence, boundary cases,
 * stability envelope, idempotency fingerprints, confidence integrity guards.
 */
import { describe, it, expect } from "vitest";
import {
  computeHealingStats,
  computeHealingConfidence,
  computeSystemStatus,
  checkCircuitBreaker,
  computePredictiveWarnings,
  computeRootCauseInsights,
  shouldAutoModeHalt,
  isRetryAllowed,
  generateRecoveryFingerprint,
  CIRCUIT_BREAKER_ESCALATION_LIMIT,
  CIRCUIT_BREAKER_PAYMENT_LIMIT,
  ESCALATION_RATE_HALT_THRESHOLD,
  type HealingEventData,
  type HealingStats,
} from "@/engines/selfHealingEngine";
import { MAX_RETRIES } from "@/config/selfHealingConfig";

// ── Test helpers ──
const FIXED_NOW = new Date("2026-03-15T12:00:00Z").getTime();

function makeEvent(overrides: Partial<HealingEventData> = {}): HealingEventData {
  return {
    id: crypto.randomUUID(),
    entity_type: "booking",
    entity_id: crypto.randomUUID(),
    recovery_type: "stale_booking_reassignment",
    attempt_number: 1,
    status: "success",
    cooldown_until: null,
    metadata: {},
    created_at: new Date(FIXED_NOW - 1000).toISOString(), // 1s before FIXED_NOW
    ...overrides,
  };
}

function makeEvents(count: number, overrides: Partial<HealingEventData> = {}): HealingEventData[] {
  return Array.from({ length: count }, () => makeEvent(overrides));
}

function makeTimedEvent(minutesAgo: number, overrides: Partial<HealingEventData> = {}): HealingEventData {
  return makeEvent({
    created_at: new Date(FIXED_NOW - minutesAgo * 60 * 1000).toISOString(),
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════
// TEST SUITE 1: Healing Stats & Deterministic Time
// ═══════════════════════════════════════════════════

describe("Healing Stats Computation", () => {
  it("returns 100% success rate when no events", () => {
    const stats = computeHealingStats([], FIXED_NOW);
    expect(stats.successRate).toBe(100);
    expect(stats.escalationRate).toBe(0);
    expect(stats.totalActions).toBe(0);
  });

  it("correctly counts success/failed/escalated", () => {
    const events = [
      ...makeEvents(5, { status: "success" }),
      ...makeEvents(2, { status: "failed" }),
      ...makeEvents(1, { status: "escalated" }),
      ...makeEvents(3, { status: "skipped_cooldown" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.successCount).toBe(5);
    expect(stats.failedCount).toBe(2);
    expect(stats.escalatedCount).toBe(1);
    expect(stats.totalActions).toBe(8);
    expect(stats.successRate).toBe(63);
    expect(stats.escalationRate).toBe(13);
  });

  it("excludes events older than 24h using deterministic now", () => {
    const old = makeEvent({
      status: "failed",
      created_at: new Date(FIXED_NOW - 25 * 60 * 60 * 1000).toISOString(),
    });
    const recent = makeEvent({ status: "success" });
    const stats = computeHealingStats([old, recent], FIXED_NOW);
    expect(stats.failedCount).toBe(0);
    expect(stats.successCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 2: Confidence Score + Integrity Guards
// ═══════════════════════════════════════════════════

describe("Healing Confidence Score", () => {
  it("returns 100 when all successful, no failures", () => {
    const stats = computeHealingStats(makeEvents(10, { status: "success" }), FIXED_NOW);
    const confidence = computeHealingConfidence(stats);
    expect(confidence).toBe(100);
  });

  it("returns max 100 even with perfect stats", () => {
    const confidence = computeHealingConfidence({
      successCount: 100, failedCount: 0, escalatedCount: 0,
      totalActions: 100, successRate: 100, escalationRate: 0,
    });
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it("drops when failures exist", () => {
    const stats = computeHealingStats([
      ...makeEvents(7, { status: "success" }),
      ...makeEvents(3, { status: "failed" }),
    ], FIXED_NOW);
    const confidence = computeHealingConfidence(stats);
    expect(confidence).toBe(72);
  });

  it("drops significantly with high escalation rate", () => {
    const stats = computeHealingStats([
      ...makeEvents(3, { status: "success" }),
      ...makeEvents(7, { status: "escalated" }),
    ], FIXED_NOW);
    const confidence = computeHealingConfidence(stats);
    expect(confidence).toBe(37);
  });

  it("returns minimum 0, never negative", () => {
    const confidence = computeHealingConfidence({
      successCount: 0, failedCount: 100, escalatedCount: 100,
      totalActions: 100, successRate: 0, escalationRate: 100,
    });
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  // ── Confidence Integrity Guards ──
  it("caps confidence at 40 when circuit_broken", () => {
    const stats: HealingStats = {
      successCount: 100, failedCount: 0, escalatedCount: 0,
      totalActions: 100, successRate: 100, escalationRate: 0,
    };
    const confidence = computeHealingConfidence(stats, "circuit_broken");
    expect(confidence).toBe(40);
  });

  it("caps confidence at 50 when escalation_mode", () => {
    const stats: HealingStats = {
      successCount: 100, failedCount: 0, escalatedCount: 0,
      totalActions: 100, successRate: 100, escalationRate: 0,
    };
    const confidence = computeHealingConfidence(stats, "escalation_mode");
    expect(confidence).toBe(50);
  });

  it("does not cap when healthy or active_recovery", () => {
    const stats: HealingStats = {
      successCount: 100, failedCount: 0, escalatedCount: 0,
      totalActions: 100, successRate: 100, escalationRate: 0,
    };
    expect(computeHealingConfidence(stats, "healthy")).toBe(100);
    expect(computeHealingConfidence(stats, "active_recovery")).toBe(100);
  });

  it("confidence paradox prevented: circuit_broken forces low confidence", () => {
    // Even with 100% success rate, circuit_broken caps at 40
    const stats = computeHealingStats(makeEvents(50, { status: "success" }), FIXED_NOW);
    const status = computeSystemStatus(stats, true);
    expect(status).toBe("circuit_broken");
    const confidence = computeHealingConfidence(stats, status);
    expect(confidence).toBeLessThanOrEqual(40);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 3: System Status Transitions
// ═══════════════════════════════════════════════════

describe("System Status", () => {
  it("returns healthy when no events", () => {
    const stats = computeHealingStats([], FIXED_NOW);
    expect(computeSystemStatus(stats, false)).toBe("healthy");
  });

  it("returns active_recovery when events exist but rate ok", () => {
    const stats = computeHealingStats(makeEvents(5, { status: "success" }), FIXED_NOW);
    expect(computeSystemStatus(stats, false)).toBe("active_recovery");
  });

  it("returns escalation_mode when escalation rate exceeds threshold", () => {
    const events = [
      ...makeEvents(2, { status: "success" }),
      ...makeEvents(5, { status: "escalated" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.escalationRate).toBeGreaterThan(ESCALATION_RATE_HALT_THRESHOLD);
    expect(computeSystemStatus(stats, false)).toBe("escalation_mode");
  });

  it("returns circuit_broken when flag is set, regardless of stats", () => {
    const stats = computeHealingStats(makeEvents(5, { status: "success" }), FIXED_NOW);
    expect(computeSystemStatus(stats, true)).toBe("circuit_broken");
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 4: Circuit Breaker (deterministic time)
// ═══════════════════════════════════════════════════

describe("Circuit Breaker", () => {
  it("does not trip with few escalations", () => {
    const events = makeEvents(3, { status: "escalated" });
    expect(checkCircuitBreaker(events, FIXED_NOW)).toBe(false);
  });

  it("trips at exactly CIRCUIT_BREAKER_ESCALATION_LIMIT escalations", () => {
    const events = makeEvents(CIRCUIT_BREAKER_ESCALATION_LIMIT, { status: "escalated" });
    expect(checkCircuitBreaker(events, FIXED_NOW)).toBe(true);
  });

  it("trips at CIRCUIT_BREAKER_PAYMENT_LIMIT payment escalations", () => {
    const events = makeEvents(CIRCUIT_BREAKER_PAYMENT_LIMIT, {
      status: "escalated",
      entity_type: "payment",
    });
    expect(checkCircuitBreaker(events, FIXED_NOW)).toBe(true);
  });

  it("does not trip for payment escalations below limit", () => {
    const events = makeEvents(CIRCUIT_BREAKER_PAYMENT_LIMIT - 1, {
      status: "escalated",
      entity_type: "payment",
    });
    expect(checkCircuitBreaker(events, FIXED_NOW)).toBe(false);
  });

  it("ignores escalations outside the 30min window", () => {
    const oldEvents = makeEvents(10, {
      status: "escalated",
      created_at: new Date(FIXED_NOW - 31 * 60 * 1000).toISOString(),
    });
    expect(checkCircuitBreaker(oldEvents, FIXED_NOW)).toBe(false);
  });

  it("counts only escalations within window", () => {
    const events = [
      ...makeEvents(4, { status: "escalated" }),
      ...makeEvents(2, {
        status: "escalated",
        created_at: new Date(FIXED_NOW - 31 * 60 * 1000).toISOString(),
      }),
    ];
    expect(checkCircuitBreaker(events, FIXED_NOW)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 5: Auto-Mode Halt
// ═══════════════════════════════════════════════════

describe("Auto-Mode Halt", () => {
  it("does not halt at low escalation rate", () => {
    expect(shouldAutoModeHalt(10, false)).toBe(false);
  });

  it("halts when escalation rate exceeds threshold", () => {
    expect(shouldAutoModeHalt(ESCALATION_RATE_HALT_THRESHOLD + 1, false)).toBe(true);
  });

  it("halts when circuit is broken regardless of rate", () => {
    expect(shouldAutoModeHalt(0, true)).toBe(true);
  });

  it("does not halt at exactly threshold", () => {
    expect(shouldAutoModeHalt(ESCALATION_RATE_HALT_THRESHOLD, false)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 6: Retry Caps
// ═══════════════════════════════════════════════════

describe("Retry Caps", () => {
  it("allows retry when under limit", () => {
    expect(isRetryAllowed(0, MAX_RETRIES.booking, null, null)).toBe(true);
    expect(isRetryAllowed(2, MAX_RETRIES.booking, null, null)).toBe(true);
  });

  it("blocks retry at max limit", () => {
    expect(isRetryAllowed(MAX_RETRIES.booking, MAX_RETRIES.booking, null, null)).toBe(false);
  });

  it("blocks retry when escalated", () => {
    expect(isRetryAllowed(1, MAX_RETRIES.booking, null, "escalated")).toBe(false);
  });

  it("blocks retry during cooldown", () => {
    const future = new Date(FIXED_NOW + 5 * 60 * 1000).toISOString();
    expect(isRetryAllowed(1, MAX_RETRIES.booking, future, null)).toBe(false);
  });

  it("allows retry after cooldown expires", () => {
    const past = new Date(FIXED_NOW - 1000).toISOString();
    expect(isRetryAllowed(1, MAX_RETRIES.booking, past, null)).toBe(true);
  });

  it("respects payment retry limit (lower than booking)", () => {
    expect(MAX_RETRIES.payment).toBeLessThan(MAX_RETRIES.booking);
    expect(isRetryAllowed(MAX_RETRIES.payment, MAX_RETRIES.payment, null, null)).toBe(false);
    expect(isRetryAllowed(MAX_RETRIES.payment - 1, MAX_RETRIES.payment, null, null)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 7: Predictive Warnings (order-independent)
// ═══════════════════════════════════════════════════

describe("Predictive Warnings", () => {
  it("returns empty for fewer than 4 events", () => {
    expect(computePredictiveWarnings(makeEvents(3))).toEqual([]);
  });

  it("detects escalation trend when newer > older", () => {
    const events = [
      ...makeEvents(3, { status: "escalated", created_at: new Date(FIXED_NOW - 1000).toISOString() }),
      ...makeEvents(3, { status: "success", created_at: new Date(FIXED_NOW - 60000).toISOString() }),
    ];
    const warnings = computePredictiveWarnings(events);
    expect(warnings.some(w => w.metric === "escalation_trend")).toBe(true);
  });

  it("does not warn when escalation trend is stable", () => {
    const events = [
      makeEvent({ status: "escalated", created_at: new Date(FIXED_NOW - 1000).toISOString() }),
      makeEvent({ status: "success", created_at: new Date(FIXED_NOW - 2000).toISOString() }),
      makeEvent({ status: "escalated", created_at: new Date(FIXED_NOW - 3000).toISOString() }),
      makeEvent({ status: "success", created_at: new Date(FIXED_NOW - 4000).toISOString() }),
    ];
    const warnings = computePredictiveWarnings(events);
    expect(warnings.some(w => w.metric === "escalation_trend")).toBe(false);
  });

  it("detects payment instability", () => {
    const events = [
      ...makeEvents(3, { entity_type: "payment", status: "failed" }),
      ...makeEvents(3, { status: "success" }),
    ];
    const warnings = computePredictiveWarnings(events);
    expect(warnings.some(w => w.metric === "payment_health")).toBe(true);
  });

  it("does not warn on single payment failure", () => {
    const events = [
      makeEvent({ entity_type: "payment", status: "failed" }),
      ...makeEvents(5, { status: "success" }),
    ];
    const warnings = computePredictiveWarnings(events);
    expect(warnings.some(w => w.metric === "payment_health")).toBe(false);
  });

  it("produces consistent results regardless of input order", () => {
    const newer = makeEvents(3, {
      status: "escalated",
      created_at: new Date(FIXED_NOW - 1000).toISOString(),
    });
    const older = makeEvents(3, {
      status: "success",
      created_at: new Date(FIXED_NOW - 60000).toISOString(),
    });

    const ascending = [...older, ...newer]; // wrong order
    const descending = [...newer, ...older]; // correct order

    const w1 = computePredictiveWarnings(ascending);
    const w2 = computePredictiveWarnings(descending);

    expect(w1.map(w => w.metric).sort()).toEqual(w2.map(w => w.metric).sort());
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 8: Root Cause Insights (deterministic time)
// ═══════════════════════════════════════════════════

describe("Root Cause Insights", () => {
  it("returns null for empty events", () => {
    expect(computeRootCauseInsights([], FIXED_NOW)).toBeNull();
  });

  it("identifies top recovery type", () => {
    const events = [
      ...makeEvents(5, { recovery_type: "stale_booking_reassignment" }),
      ...makeEvents(2, { recovery_type: "payment_retry" }),
    ];
    const insights = computeRootCauseInsights(events, FIXED_NOW);
    expect(insights?.topRecoveryType?.type).toBe("stale_booking_reassignment");
    expect(insights?.topRecoveryType?.count).toBe(5);
  });

  it("identifies top failure reason", () => {
    const events = [
      ...makeEvents(4, { metadata: { reason: "Max retries exceeded" } }),
      ...makeEvents(1, { metadata: { reason: "Cooldown active" } }),
    ];
    const insights = computeRootCauseInsights(events, FIXED_NOW);
    expect(insights?.topReason?.reason).toBe("Max retries exceeded");
  });

  it("identifies most affected entity type", () => {
    const events = [
      ...makeEvents(3, { entity_type: "dispatch" }),
      ...makeEvents(6, { entity_type: "booking" }),
    ];
    const insights = computeRootCauseInsights(events, FIXED_NOW);
    expect(insights?.topEntity?.entity).toBe("booking");
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 9: Idempotency Fingerprint
// ═══════════════════════════════════════════════════

describe("Idempotency Fingerprint", () => {
  it("generates deterministic fingerprint", () => {
    const fp1 = generateRecoveryFingerprint("abc-123", "stale_booking_reassignment", 2);
    const fp2 = generateRecoveryFingerprint("abc-123", "stale_booking_reassignment", 2);
    expect(fp1).toBe(fp2);
    expect(fp1).toBe("abc-123::stale_booking_reassignment::2");
  });

  it("differs for different attempt numbers", () => {
    const fp1 = generateRecoveryFingerprint("abc-123", "payment_retry", 1);
    const fp2 = generateRecoveryFingerprint("abc-123", "payment_retry", 2);
    expect(fp1).not.toBe(fp2);
  });

  it("differs for different entity ids", () => {
    const fp1 = generateRecoveryFingerprint("entity-a", "payment_retry", 1);
    const fp2 = generateRecoveryFingerprint("entity-b", "payment_retry", 1);
    expect(fp1).not.toBe(fp2);
  });

  it("differs for different recovery types", () => {
    const fp1 = generateRecoveryFingerprint("abc-123", "payment_retry", 1);
    const fp2 = generateRecoveryFingerprint("abc-123", "stale_booking_reassignment", 1);
    expect(fp1).not.toBe(fp2);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 10: Boundary & Rounding Precision
// ═══════════════════════════════════════════════════

describe("Boundary & Rounding", () => {
  it("escalationRate exactly at threshold does NOT trigger escalation_mode", () => {
    // Need escalationRate to round to exactly 30
    // 3 escalated out of 10 total = 30%
    const events = [
      ...makeEvents(7, { status: "success" }),
      ...makeEvents(3, { status: "escalated" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.escalationRate).toBe(30);
    expect(computeSystemStatus(stats, false)).toBe("active_recovery"); // > not >=
  });

  it("escalationRate at threshold+1 triggers escalation_mode", () => {
    // 31% escalation
    // 10 escalated, 22 success → 32 total → 10/32 = 31.25% → rounds to 31
    const events = [
      ...makeEvents(22, { status: "success" }),
      ...makeEvents(10, { status: "escalated" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.escalationRate).toBeGreaterThan(30);
    expect(computeSystemStatus(stats, false)).toBe("escalation_mode");
  });

  it("successRate rounding: 5/8 = 62.5 rounds to 63", () => {
    const events = [
      ...makeEvents(5, { status: "success" }),
      ...makeEvents(3, { status: "failed" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.successRate).toBe(63);
  });

  it("successRate rounding: 5/9 = 55.55 rounds to 56", () => {
    const events = [
      ...makeEvents(5, { status: "success" }),
      ...makeEvents(4, { status: "failed" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.successRate).toBe(56);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 11: Stability Envelope — High Volume
// ═══════════════════════════════════════════════════

describe("Stability Envelope", () => {
  it("handles 1000 events without error", () => {
    const events = makeEvents(1000, { status: "success" });
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.totalActions).toBe(1000);
    expect(stats.successRate).toBe(100);

    const confidence = computeHealingConfidence(stats);
    expect(confidence).toBe(100);

    const warnings = computePredictiveWarnings(events);
    expect(warnings).toBeDefined();

    const insights = computeRootCauseInsights(events, FIXED_NOW);
    expect(insights).not.toBeNull();

    expect(checkCircuitBreaker(events, FIXED_NOW)).toBe(false);
  });

  it("handles 1000 mixed events correctly", () => {
    const events = [
      ...makeEvents(600, { status: "success" }),
      ...makeEvents(250, { status: "failed" }),
      ...makeEvents(100, { status: "escalated" }),
      ...makeEvents(50, { status: "skipped_cooldown" }),
    ];
    const stats = computeHealingStats(events, FIXED_NOW);
    expect(stats.totalActions).toBe(950); // excludes skipped_cooldown
    expect(stats.successRate).toBe(63); // 600/950
    expect(stats.escalationRate).toBe(11); // 100/950
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 12: Deterministic Phase Stress Simulation
// ═══════════════════════════════════════════════════

describe("Deterministic Phase Stress Simulation", () => {
  it("transitions correctly through 4 operational phases", () => {
    // Phase 1: Healthy → 10 successes
    const phase1 = makeEvents(10, { status: "success" });
    let stats = computeHealingStats(phase1, FIXED_NOW);
    let status = computeSystemStatus(stats, false);
    let confidence = computeHealingConfidence(stats, status);
    expect(status).toBe("active_recovery");
    expect(confidence).toBe(100);

    // Phase 2: Active Recovery with failures
    const phase2 = [
      ...makeEvents(5, { status: "success" }),
      ...makeEvents(3, { status: "failed" }),
      ...makeEvents(2, { status: "escalated" }),
    ];
    stats = computeHealingStats(phase2, FIXED_NOW);
    status = computeSystemStatus(stats, false);
    confidence = computeHealingConfidence(stats, status);
    expect(status).toBe("active_recovery");
    expect(confidence).toBeLessThan(100);
    expect(confidence).toBeGreaterThan(50);

    // Phase 3: Escalation mode — heavy escalations
    const phase3 = [
      ...makeEvents(2, { status: "success" }),
      ...makeEvents(8, { status: "escalated" }),
    ];
    stats = computeHealingStats(phase3, FIXED_NOW);
    status = computeSystemStatus(stats, false);
    confidence = computeHealingConfidence(stats, status);
    expect(status).toBe("escalation_mode");
    expect(confidence).toBeLessThanOrEqual(50); // capped by integrity guard

    // Phase 4: Circuit broken
    const phase4 = makeEvents(CIRCUIT_BREAKER_ESCALATION_LIMIT, { status: "escalated" });
    const broken = checkCircuitBreaker(phase4, FIXED_NOW);
    expect(broken).toBe(true);
    stats = computeHealingStats(phase4, FIXED_NOW);
    status = computeSystemStatus(stats, true);
    confidence = computeHealingConfidence(stats, status);
    expect(status).toBe("circuit_broken");
    expect(confidence).toBeLessThanOrEqual(40); // capped by integrity guard
    expect(shouldAutoModeHalt(stats.escalationRate, true)).toBe(true);
  });

  it("simulates payment-specific circuit break with full audit", () => {
    const paymentEscalations = makeEvents(CIRCUIT_BREAKER_PAYMENT_LIMIT, {
      status: "escalated",
      entity_type: "payment",
      recovery_type: "payment_retry",
    });
    expect(checkCircuitBreaker(paymentEscalations, FIXED_NOW)).toBe(true);

    const insights = computeRootCauseInsights(paymentEscalations, FIXED_NOW);
    expect(insights?.topEntity?.entity).toBe("payment");

    // Fingerprints are unique per event
    const fps = paymentEscalations.map(e =>
      generateRecoveryFingerprint(e.entity_id, e.recovery_type, e.attempt_number)
    );
    const uniqueFps = new Set(fps);
    expect(uniqueFps.size).toBe(fps.length);
  });
});
