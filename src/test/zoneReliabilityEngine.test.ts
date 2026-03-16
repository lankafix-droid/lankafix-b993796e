import { describe, it, expect } from "vitest";
import {
  computeZoneReliability,
  computeZoneReliabilityScore,
  computeZoneVerdict,
  computeZoneRiskLevel,
  computeZoneSampleQuality,
  computeAllZoneReliability,
  type ZoneReliabilityInput,
} from "@/engines/zoneReliabilityEngine";

function makeInput(overrides: Partial<ZoneReliabilityInput> = {}): ZoneReliabilityInput {
  return {
    zoneId: "col_01",
    bookingCount24h: 20,
    successCount24h: 19,
    escalationCount24h: 0,
    failedHealingCount24h: 0,
    circuitBreakCount24h: 0,
    confidenceScore: 90,
    breachRisk: 5,
    impactScore: 10,
    ...overrides,
  };
}

describe("zoneReliabilityEngine", () => {
  it("stable zone produces STABLE verdict and LOW risk", () => {
    const result = computeZoneReliability(makeInput());
    expect(result.verdict).toBe("STABLE");
    expect(result.riskLevel).toBe("LOW");
    expect(result.reliabilityScore).toBeGreaterThanOrEqual(85);
    expect(result.dispatchRiskLevel).toBe("LOW");
    expect(result.shadowPolicyMode).toBe("NORMAL");
    expect(result.rolloutReadiness).toBe("READY");
    expect(result.eligibleForBookingGuard).toBe(true);
  });

  it("guarded zone with moderate escalations", () => {
    const result = computeZoneReliability(makeInput({
      bookingCount24h: 20,
      successCount24h: 15,
      escalationCount24h: 3,
      confidenceScore: 70,
      impactScore: 30,
    }));
    expect(result.verdict).toBe("GUARDED");
    expect(result.riskLevel).toBe("MODERATE");
    expect(result.shadowPolicyMode).toBe("CAUTION");
  });

  it("high-risk zone with failures", () => {
    const result = computeZoneReliability(makeInput({
      bookingCount24h: 10,
      successCount24h: 5,
      escalationCount24h: 3,
      failedHealingCount24h: 2,
      circuitBreakCount24h: 1,
      confidenceScore: 50,
      breachRisk: 40,
      impactScore: 60,
    }));
    expect(result.verdict).toBe("RISK");
    expect(result.riskLevel).toBe("HIGH");
    expect(result.dispatchRiskLevel).toBe("HIGH");
    expect(result.routingRecommendation).toBe("LIMIT_ROUTING");
    expect(result.rolloutReadiness).toBe("LIMITED");
  });

  it("critical zone", () => {
    const result = computeZoneReliability(makeInput({
      bookingCount24h: 10,
      successCount24h: 2,
      escalationCount24h: 6,
      circuitBreakCount24h: 3,
      confidenceScore: 20,
      breachRisk: 80,
      impactScore: 90,
    }));
    expect(result.verdict).toBe("CRITICAL");
    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.shadowPolicyMode).toBe("PROTECT");
    expect(result.rolloutReadiness).toBe("NOT_READY");
    expect(result.recommendedRolloutPercent).toBe(0);
    expect(result.eligibleForZoneProtection).toBe(false);
    expect(result.eligibleForCapacityCap).toBe(false);
    expect(result.eligibleForBookingGuard).toBe(false);
  });

  it("rollout blocked by poor reliability", () => {
    const result = computeZoneReliability(makeInput({
      bookingCount24h: 10,
      successCount24h: 3,
      escalationCount24h: 5,
      circuitBreakCount24h: 2,
      confidenceScore: 30,
      impactScore: 70,
    }));
    expect(result.rolloutReadiness).toBe("NOT_READY");
    expect(result.recommendedRolloutPercent).toBe(0);
  });

  it("rollout eligible under healthy reliability", () => {
    const result = computeZoneReliability(makeInput());
    expect(result.rolloutReadiness).toBe("READY");
    expect(result.recommendedRolloutPercent).toBe(25);
    expect(result.eligibleForZoneProtection).toBe(true);
  });

  it("dispatch advisory mapping is consistent", () => {
    const stable = computeZoneReliability(makeInput());
    expect(stable.routingRecommendation).toBe("NORMAL");
    expect(stable.technicianLoadRecommendation).toBe("NORMAL");

    const critical = computeZoneReliability(makeInput({
      bookingCount24h: 10, successCount24h: 1, escalationCount24h: 7,
      circuitBreakCount24h: 3, confidenceScore: 10, impactScore: 95,
    }));
    expect(critical.routingRecommendation).toBe("AVOID_ZONE");
    expect(critical.technicianLoadRecommendation).toBe("HALT_ASSIGNMENTS");
  });

  it("shadow policy mode mapping", () => {
    const low = computeZoneReliability(makeInput());
    expect(low.shadowPolicyMode).toBe("NORMAL");

    const high = computeZoneReliability(makeInput({
      bookingCount24h: 10, successCount24h: 5, escalationCount24h: 3,
      circuitBreakCount24h: 1, confidenceScore: 50, impactScore: 60,
    }));
    expect(["CAUTION", "THROTTLE"]).toContain(high.shadowPolicyMode);
  });

  it("clamping keeps score within 0-100", () => {
    const score1 = computeZoneReliabilityScore(makeInput({ confidenceScore: 200, impactScore: -50 }));
    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score1).toBeLessThanOrEqual(100);
  });

  it("deterministic output for same input", () => {
    const input = makeInput();
    const r1 = computeZoneReliability(input);
    const r2 = computeZoneReliability(input);
    expect(r1).toEqual(r2);
  });

  it("sample quality reflects booking volume", () => {
    expect(computeZoneSampleQuality(0)).toBe("PILOT_ESTIMATE");
    expect(computeZoneSampleQuality(2)).toBe("LOW");
    expect(computeZoneSampleQuality(7)).toBe("MEDIUM");
    expect(computeZoneSampleQuality(15)).toBe("HIGH");
  });

  it("batch computation works", () => {
    const results = computeAllZoneReliability([makeInput({ zoneId: "a" }), makeInput({ zoneId: "b" })]);
    expect(results).toHaveLength(2);
    expect(results[0].zoneId).toBe("a");
    expect(results[1].zoneId).toBe("b");
  });

  it("zero bookings uses pilot estimate", () => {
    const result = computeZoneReliability(makeInput({ bookingCount24h: 0, successCount24h: 0 }));
    expect(result.sampleQuality).toBe("PILOT_ESTIMATE");
    expect(result.warnings).toContain("No bookings in 24h — using pilot estimate");
    expect(result.reliabilityScore).toBeGreaterThanOrEqual(0);
  });

  it("circuit break warnings are included", () => {
    const result = computeZoneReliability(makeInput({ circuitBreakCount24h: 2 }));
    expect(result.warnings.some(w => w.includes("circuit break"))).toBe(true);
  });
});
