import { describe, it, expect } from "vitest";
import {
  computeCategoryReliability,
  computeCategoryReliabilityScore,
  computeCategoryVerdict,
  computeCategoryRiskLevel,
  computeCategorySampleQuality,
  computeAllCategoryReliability,
  type CategoryReliabilityInput,
} from "@/engines/categoryReliabilityEngine";

function makeInput(overrides: Partial<CategoryReliabilityInput> = {}): CategoryReliabilityInput {
  return {
    zoneId: "col_01",
    categoryCode: "AC",
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

describe("categoryReliabilityEngine", () => {
  it("stable category produces STABLE verdict and LOW risk", () => {
    const result = computeCategoryReliability(makeInput());
    expect(result.verdict).toBe("STABLE");
    expect(result.riskLevel).toBe("LOW");
    expect(result.reliabilityScore).toBeGreaterThanOrEqual(85);
    expect(result.dispatchRiskLevel).toBe("LOW");
    expect(result.shadowPolicyMode).toBe("NORMAL");
    expect(result.rolloutReadiness).toBe("READY");
    expect(result.eligibleForBookingGuard).toBe(true);
    expect(result.categoryCode).toBe("AC");
    expect(result.zoneId).toBe("col_01");
  });

  it("guarded category with moderate escalations", () => {
    const result = computeCategoryReliability(makeInput({
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

  it("high-risk category with failures", () => {
    const result = computeCategoryReliability(makeInput({
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

  it("critical category", () => {
    const result = computeCategoryReliability(makeInput({
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
    const result = computeCategoryReliability(makeInput({
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
    const result = computeCategoryReliability(makeInput());
    expect(result.rolloutReadiness).toBe("READY");
    expect(result.recommendedRolloutPercent).toBe(25);
    expect(result.eligibleForZoneProtection).toBe(true);
  });

  it("dispatch advisory mapping is consistent", () => {
    const stable = computeCategoryReliability(makeInput());
    expect(stable.routingRecommendation).toBe("NORMAL");
    expect(stable.technicianLoadRecommendation).toBe("NORMAL");

    const critical = computeCategoryReliability(makeInput({
      bookingCount24h: 10, successCount24h: 1, escalationCount24h: 7,
      circuitBreakCount24h: 3, confidenceScore: 10, impactScore: 95,
    }));
    expect(critical.routingRecommendation).toBe("AVOID_CATEGORY");
    expect(critical.technicianLoadRecommendation).toBe("HALT_ASSIGNMENTS");
  });

  it("shadow policy mode mapping", () => {
    const low = computeCategoryReliability(makeInput());
    expect(low.shadowPolicyMode).toBe("NORMAL");

    const high = computeCategoryReliability(makeInput({
      bookingCount24h: 10, successCount24h: 5, escalationCount24h: 3,
      circuitBreakCount24h: 1, confidenceScore: 50, impactScore: 60,
    }));
    expect(["CAUTION", "THROTTLE"]).toContain(high.shadowPolicyMode);
  });

  it("clamping keeps score within 0-100", () => {
    const score1 = computeCategoryReliabilityScore(makeInput({ confidenceScore: 200, impactScore: -50 }));
    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score1).toBeLessThanOrEqual(100);
  });

  it("deterministic output for same input", () => {
    const input = makeInput();
    const r1 = computeCategoryReliability(input);
    const r2 = computeCategoryReliability(input);
    expect(r1).toEqual(r2);
  });

  it("sample quality reflects booking volume", () => {
    expect(computeCategorySampleQuality(0)).toBe("PILOT_ESTIMATE");
    expect(computeCategorySampleQuality(2)).toBe("LOW");
    expect(computeCategorySampleQuality(7)).toBe("MEDIUM");
    expect(computeCategorySampleQuality(15)).toBe("HIGH");
  });

  it("batch computation works", () => {
    const results = computeAllCategoryReliability([
      makeInput({ zoneId: "a", categoryCode: "AC" }),
      makeInput({ zoneId: "b", categoryCode: "MOBILE" }),
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].zoneId).toBe("a");
    expect(results[0].categoryCode).toBe("AC");
    expect(results[1].zoneId).toBe("b");
    expect(results[1].categoryCode).toBe("MOBILE");
  });

  it("zero bookings uses pilot estimate", () => {
    const result = computeCategoryReliability(makeInput({ bookingCount24h: 0, successCount24h: 0 }));
    expect(result.sampleQuality).toBe("PILOT_ESTIMATE");
    expect(result.warnings).toContain("No bookings in 24h — using pilot estimate");
    expect(result.reliabilityScore).toBeGreaterThanOrEqual(0);
  });

  it("circuit break warnings are included", () => {
    const result = computeCategoryReliability(makeInput({ circuitBreakCount24h: 2 }));
    expect(result.warnings.some(w => w.includes("circuit break"))).toBe(true);
  });

  it("critical category blocked even in otherwise healthy zone context", () => {
    // Zone is healthy (high confidence) but category has terrible metrics
    const result = computeCategoryReliability(makeInput({
      confidenceScore: 95,
      bookingCount24h: 10,
      successCount24h: 1,
      escalationCount24h: 8,
      circuitBreakCount24h: 2,
      breachRisk: 70,
      impactScore: 85,
    }));
    expect(result.verdict).toBe("CRITICAL");
    expect(result.rolloutReadiness).toBe("NOT_READY");
    expect(result.eligibleForBookingGuard).toBe(false);
  });
});
