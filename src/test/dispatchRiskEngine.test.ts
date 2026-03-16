import { describe, it, expect } from "vitest";
import { computeDispatchReliabilitySignal, type DispatchRiskInput } from "@/engines/reliabilityDispatchRiskEngine";

function makeInput(overrides: Partial<DispatchRiskInput> = {}): DispatchRiskInput {
  return {
    reliabilityScore: 90,
    riskProbability: 10,
    breachRisk: 5,
    compositeImpact: 10,
    escalationRate: 2,
    circuitBreakCount: 0,
    zoneGuardrailCount: 0,
    ...overrides,
  };
}

describe("reliabilityDispatchRiskEngine", () => {
  it("LOW risk scenario", () => {
    const signal = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 90 }));
    expect(signal.dispatchRiskLevel).toBe("LOW");
    expect(signal.routingRecommendation).toBe("NORMAL");
    expect(signal.technicianLoadRecommendation).toBe("NORMAL");
    expect(signal.dispatchConfidence).toBeGreaterThanOrEqual(80);
    expect(signal.reliabilityWarning).toBeNull();
  });

  it("MODERATE risk scenario", () => {
    const signal = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 72, breachRisk: 20, escalationRate: 10 }));
    expect(signal.dispatchRiskLevel).toBe("MODERATE");
    expect(signal.routingRecommendation).toBe("CAUTION");
    expect(signal.technicianLoadRecommendation).toBe("NORMAL");
  });

  it("HIGH risk scenario", () => {
    const signal = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 50, breachRisk: 40, escalationRate: 25 }));
    expect(signal.dispatchRiskLevel).toBe("HIGH");
    expect(signal.routingRecommendation).toBe("LIMIT_ROUTING");
    expect(signal.technicianLoadRecommendation).toBe("REDUCE_LOAD");
    expect(signal.reliabilityWarning).toBeTruthy();
  });

  it("CRITICAL risk scenario", () => {
    const signal = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 30, breachRisk: 70, escalationRate: 50 }));
    expect(signal.dispatchRiskLevel).toBe("CRITICAL");
    expect(signal.routingRecommendation).toBe("AVOID_ZONE");
    expect(signal.technicianLoadRecommendation).toBe("HALT_ASSIGNMENTS");
    expect(signal.reliabilityWarning).toContain("Critical");
  });

  it("confidence is clamped 0–100", () => {
    const low = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 0, breachRisk: 100, escalationRate: 100 }));
    expect(low.dispatchConfidence).toBe(0);
    const high = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 100, breachRisk: 0, escalationRate: 0 }));
    expect(high.dispatchConfidence).toBe(100);
  });

  it("circuit breaker warning when count > 0 and level is LOW/MODERATE", () => {
    const signal = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 90, circuitBreakCount: 2 }));
    expect(signal.reliabilityWarning).toContain("Circuit breaker");
  });

  it("zone guardrail warning when count > 2 and level is LOW/MODERATE", () => {
    const signal = computeDispatchReliabilitySignal(makeInput({ reliabilityScore: 90, zoneGuardrailCount: 3 }));
    expect(signal.reliabilityWarning).toContain("Zone guardrails");
  });
});
