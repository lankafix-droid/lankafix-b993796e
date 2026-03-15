/**
 * LankaFix Self-Healing Engine — Controlled Stress Simulation Tests
 * Validates: Retry caps, circuit breaker, auto-mode halt, predictive warnings,
 * confidence calculation, root cause insights, system status transitions.
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
  CIRCUIT_BREAKER_ESCALATION_LIMIT,
  CIRCUIT_BREAKER_PAYMENT_LIMIT,
  ESCALATION_RATE_HALT_THRESHOLD,
  type HealingEventData,
} from "@/engines/selfHealingEngine";
import { MAX_RETRIES } from "@/config/selfHealingConfig";

// ── Test helpers ──
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
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvents(count: number, overrides: Partial<HealingEventData> = {}): HealingEventData[] {
  return Array.from({ length: count }, () => makeEvent(overrides));
}

// ═══════════════════════════════════════════════════
// TEST SUITE 1: Healing Stats & Confidence
// ═══════════════════════════════════════════════════

describe("Healing Stats Computation", () => {
  it("returns 100% success rate when no events", () => {
    const stats = computeHealingStats([]);
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
    const stats = computeHealingStats(events);
    expect(stats.successCount).toBe(5);
    expect(stats.failedCount).toBe(2);
    expect(stats.escalatedCount).toBe(1);
    // skipped_cooldown excluded from totalActions
    expect(stats.totalActions).toBe(8);
    expect(stats.successRate).toBe(63); // 5/8 = 62.5 → 63
    expect(stats.escalationRate).toBe(13); // 1/8 = 12.5 → 13
  });

  it("excludes events older than 24h", () => {
    const old = makeEvent({
      status: "failed",
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    });
    const recent = makeEvent({ status: "success" });
    const stats = computeHealingStats([old, recent]);
    expect(stats.failedCount).toBe(0);
    expect(stats.successCount).toBe(1);
  });
});

describe("Healing Confidence Score", () => {
  it("returns 100 when all successful, no failures", () => {
    const stats = computeHealingStats(makeEvents(10, { status: "success" }));
    const confidence = computeHealingConfidence(stats);
    // 100*0.6 + 100*0.3 + 10 = 60+30+10 = 100
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
    ]);
    const confidence = computeHealingConfidence(stats);
    // successRate=70, escalationRate=0, failedCount>0 → no +10 bonus
    // 70*0.6 + 100*0.3 + 0 = 42+30 = 72
    expect(confidence).toBe(72);
  });

  it("drops significantly with high escalation rate", () => {
    const stats = computeHealingStats([
      ...makeEvents(3, { status: "success" }),
      ...makeEvents(7, { status: "escalated" }),
    ]);
    const confidence = computeHealingConfidence(stats);
    // successRate=30, escalationRate=70, failedCount=0
    // 30*0.6 + 30*0.3 + 10 = 18+9+10 = 37
    expect(confidence).toBe(37);
  });

  it("returns minimum 0, never negative", () => {
    const confidence = computeHealingConfidence({
      successCount: 0, failedCount: 100, escalatedCount: 100,
      totalActions: 100, successRate: 0, escalationRate: 100,
    });
    expect(confidence).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 2: System Status Transitions
// ═══════════════════════════════════════════════════

describe("System Status", () => {
  it("returns healthy when no events", () => {
    const stats = computeHealingStats([]);
    expect(computeSystemStatus(stats, false)).toBe("healthy");
  });

  it("returns active_recovery when events exist but rate ok", () => {
    const stats = computeHealingStats(makeEvents(5, { status: "success" }));
    expect(computeSystemStatus(stats, false)).toBe("active_recovery");
  });

  it("returns escalation_mode when escalation rate exceeds threshold", () => {
    const events = [
      ...makeEvents(2, { status: "success" }),
      ...makeEvents(5, { status: "escalated" }),
    ];
    const stats = computeHealingStats(events);
    // escalation rate = 5/7 = 71% > 30%
    expect(stats.escalationRate).toBeGreaterThan(ESCALATION_RATE_HALT_THRESHOLD);
    expect(computeSystemStatus(stats, false)).toBe("escalation_mode");
  });

  it("returns circuit_broken when flag is set, regardless of stats", () => {
    const stats = computeHealingStats(makeEvents(5, { status: "success" }));
    expect(computeSystemStatus(stats, true)).toBe("circuit_broken");
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 3: Circuit Breaker
// ═══════════════════════════════════════════════════

describe("Circuit Breaker", () => {
  it("does not trip with few escalations", () => {
    const events = makeEvents(3, { status: "escalated" });
    expect(checkCircuitBreaker(events)).toBe(false);
  });

  it("trips at exactly CIRCUIT_BREAKER_ESCALATION_LIMIT escalations", () => {
    const events = makeEvents(CIRCUIT_BREAKER_ESCALATION_LIMIT, { status: "escalated" });
    expect(checkCircuitBreaker(events)).toBe(true);
  });

  it("trips at CIRCUIT_BREAKER_PAYMENT_LIMIT payment escalations", () => {
    const events = makeEvents(CIRCUIT_BREAKER_PAYMENT_LIMIT, {
      status: "escalated",
      entity_type: "payment",
    });
    expect(checkCircuitBreaker(events)).toBe(true);
  });

  it("does not trip for payment escalations below limit", () => {
    const events = makeEvents(CIRCUIT_BREAKER_PAYMENT_LIMIT - 1, {
      status: "escalated",
      entity_type: "payment",
    });
    expect(checkCircuitBreaker(events)).toBe(false);
  });

  it("ignores escalations outside the 30min window", () => {
    const oldEvents = makeEvents(10, {
      status: "escalated",
      created_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    });
    expect(checkCircuitBreaker(oldEvents)).toBe(false);
  });

  it("counts only escalations within window", () => {
    const now = Date.now();
    const events = [
      // 4 recent escalations (below limit of 5)
      ...makeEvents(4, { status: "escalated" }),
      // 2 old escalations (outside window)
      ...makeEvents(2, {
        status: "escalated",
        created_at: new Date(now - 31 * 60 * 1000).toISOString(),
      }),
    ];
    expect(checkCircuitBreaker(events, now)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 4: Auto-Mode Halt
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
// TEST SUITE 5: Retry Caps
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
    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    expect(isRetryAllowed(1, MAX_RETRIES.booking, future, null)).toBe(false);
  });

  it("allows retry after cooldown expires", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isRetryAllowed(1, MAX_RETRIES.booking, past, null)).toBe(true);
  });

  it("respects payment retry limit (lower than booking)", () => {
    expect(MAX_RETRIES.payment).toBeLessThan(MAX_RETRIES.booking);
    expect(isRetryAllowed(MAX_RETRIES.payment, MAX_RETRIES.payment, null, null)).toBe(false);
    expect(isRetryAllowed(MAX_RETRIES.payment - 1, MAX_RETRIES.payment, null, null)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 6: Predictive Warnings
// ═══════════════════════════════════════════════════

describe("Predictive Warnings", () => {
  it("returns empty for fewer than 4 events", () => {
    expect(computePredictiveWarnings(makeEvents(3))).toEqual([]);
  });

  it("detects escalation trend when newer > older", () => {
    // First half (newer): 3 escalated, second half (older): 0 escalated
    const events = [
      ...makeEvents(3, { status: "escalated" }),
      ...makeEvents(3, { status: "success" }),
    ];
    const warnings = computePredictiveWarnings(events);
    expect(warnings.some(w => w.metric === "escalation_trend")).toBe(true);
  });

  it("does not warn when escalation trend is stable", () => {
    // Equal escalations in both halves
    const events = [
      makeEvent({ status: "escalated" }),
      makeEvent({ status: "success" }),
      makeEvent({ status: "escalated" }),
      makeEvent({ status: "success" }),
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
});

// ═══════════════════════════════════════════════════
// TEST SUITE 7: Root Cause Insights
// ═══════════════════════════════════════════════════

describe("Root Cause Insights", () => {
  it("returns null for empty events", () => {
    expect(computeRootCauseInsights([])).toBeNull();
  });

  it("identifies top recovery type", () => {
    const events = [
      ...makeEvents(5, { recovery_type: "stale_booking_reassignment" }),
      ...makeEvents(2, { recovery_type: "payment_retry" }),
    ];
    const insights = computeRootCauseInsights(events);
    expect(insights?.topRecoveryType?.type).toBe("stale_booking_reassignment");
    expect(insights?.topRecoveryType?.count).toBe(5);
  });

  it("identifies top failure reason", () => {
    const events = [
      ...makeEvents(4, { metadata: { reason: "Max retries exceeded" } }),
      ...makeEvents(1, { metadata: { reason: "Cooldown active" } }),
    ];
    const insights = computeRootCauseInsights(events);
    expect(insights?.topReason?.reason).toBe("Max retries exceeded");
  });

  it("identifies most affected entity type", () => {
    const events = [
      ...makeEvents(3, { entity_type: "dispatch" }),
      ...makeEvents(6, { entity_type: "booking" }),
    ];
    const insights = computeRootCauseInsights(events);
    expect(insights?.topEntity?.entity).toBe("booking");
  });
});

// ═══════════════════════════════════════════════════
// TEST SUITE 8: Integrated Stress Scenario
// ═══════════════════════════════════════════════════

describe("Integrated Stress Scenario", () => {
  it("simulates escalating failure cascade", () => {
    // Phase 1: Normal operation - 10 successes
    const phase1 = makeEvents(10, { status: "success" });
    let stats = computeHealingStats(phase1);
    expect(stats.successRate).toBe(100);
    expect(computeSystemStatus(stats, false)).toBe("active_recovery");
    expect(computeHealingConfidence(stats)).toBe(100);

    // Phase 2: Failures start - 5 success, 3 failed, 2 escalated
    const phase2 = [
      ...makeEvents(5, { status: "success" }),
      ...makeEvents(3, { status: "failed" }),
      ...makeEvents(2, { status: "escalated" }),
    ];
    stats = computeHealingStats(phase2);
    let confidence = computeHealingConfidence(stats);
    expect(confidence).toBeLessThan(100);
    expect(confidence).toBeGreaterThan(30);

    // Phase 3: Heavy escalation - triggers circuit breaker
    const phase3 = makeEvents(CIRCUIT_BREAKER_ESCALATION_LIMIT, { status: "escalated" });
    expect(checkCircuitBreaker(phase3)).toBe(true);
    expect(computeSystemStatus(computeHealingStats(phase3), true)).toBe("circuit_broken");

    // Phase 4: After circuit break, auto-mode should halt
    expect(shouldAutoModeHalt(0, true)).toBe(true);
  });

  it("simulates payment-specific circuit break", () => {
    const paymentEscalations = makeEvents(CIRCUIT_BREAKER_PAYMENT_LIMIT, {
      status: "escalated",
      entity_type: "payment",
      recovery_type: "payment_retry",
    });
    // Even though total escalations < 5, payment limit triggers breaker
    expect(checkCircuitBreaker(paymentEscalations)).toBe(true);
    
    const insights = computeRootCauseInsights(paymentEscalations);
    expect(insights?.topEntity?.entity).toBe("payment");
  });
});
