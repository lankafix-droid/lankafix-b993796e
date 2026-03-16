import { describe, it, expect } from "vitest";
import { computeRolloutPolicy, type RolloutPolicyInput } from "@/engines/reliabilityRolloutPolicyEngine";

function makeInput(overrides: Partial<RolloutPolicyInput> = {}): RolloutPolicyInput {
  return {
    reliabilityScore: 90,
    dispatchRiskLevel: "LOW",
    shadowPolicyMode: "NORMAL",
    breachRisk: 10,
    escalationRate: 5,
    dispatchConfidence: 85,
    zoneCountReady: 10,
    activePartnerCount: 20,
    ...overrides,
  };
}

describe("reliabilityRolloutPolicyEngine", () => {
  it("CRITICAL → NOT_READY / OBSERVE_ONLY / 0%", () => {
    const r = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "CRITICAL", reliabilityScore: 30 }));
    expect(r.rolloutReadiness).toBe("NOT_READY");
    expect(r.recommendedMode).toBe("OBSERVE_ONLY");
    expect(r.recommendedRolloutPercent).toBe(0);
  });

  it("HIGH → LIMITED / SHADOW_ONLY / 0%", () => {
    const r = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "HIGH", reliabilityScore: 55 }));
    expect(r.rolloutReadiness).toBe("LIMITED");
    expect(r.recommendedMode).toBe("SHADOW_ONLY");
    expect(r.recommendedRolloutPercent).toBe(0);
  });

  it("MODERATE + score 75 → CONTROLLED / PILOT_ENFORCEMENT / 10%", () => {
    const r = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "MODERATE", reliabilityScore: 75 }));
    expect(r.rolloutReadiness).toBe("CONTROLLED");
    expect(r.recommendedMode).toBe("PILOT_ENFORCEMENT");
    expect(r.recommendedRolloutPercent).toBe(10);
  });

  it("LOW + score 85 → READY / PILOT_ENFORCEMENT / 25%", () => {
    const r = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "LOW", reliabilityScore: 88, breachRisk: 20 }));
    expect(r.rolloutReadiness).toBe("READY");
    expect(r.recommendedMode).toBe("PILOT_ENFORCEMENT");
    expect(r.recommendedRolloutPercent).toBe(25);
  });

  it("LOW + score 92 + low breachRisk → READY / BROAD_ENFORCEMENT / 50%", () => {
    const r = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "LOW", reliabilityScore: 95, breachRisk: 10 }));
    expect(r.rolloutReadiness).toBe("READY");
    expect(r.recommendedMode).toBe("BROAD_ENFORCEMENT");
    expect(r.recommendedRolloutPercent).toBe(50);
  });

  it("recommendedRolloutPercent never exceeds 50", () => {
    const scenarios: Partial<RolloutPolicyInput>[] = [
      { dispatchRiskLevel: "LOW", reliabilityScore: 100, breachRisk: 0 },
      { dispatchRiskLevel: "LOW", reliabilityScore: 99, breachRisk: 5 },
      { dispatchRiskLevel: "MODERATE", reliabilityScore: 80 },
      { dispatchRiskLevel: "CRITICAL", reliabilityScore: 10 },
    ];
    for (const s of scenarios) {
      const r = computeRolloutPolicy(makeInput(s));
      expect(r.recommendedRolloutPercent).toBeLessThanOrEqual(50);
    }
  });

  it("rolloutReason exists and is deterministic", () => {
    const a = computeRolloutPolicy(makeInput());
    const b = computeRolloutPolicy(makeInput());
    expect(a.rolloutReason).toBeTruthy();
    expect(a.rolloutReason.length).toBeGreaterThan(10);
    expect(a.rolloutReason).toBe(b.rolloutReason);
  });

  it("same input returns same output (deterministic)", () => {
    const input = makeInput({ dispatchRiskLevel: "MODERATE", reliabilityScore: 72 });
    const a = computeRolloutPolicy(input);
    const b = computeRolloutPolicy(input);
    expect(a).toEqual(b);
  });

  it("all enforce flags false in NOT_READY / LIMITED", () => {
    const critical = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "CRITICAL" }));
    expect(critical.enforceZoneProtectionEligible).toBe(false);
    expect(critical.enforceCapacityCapEligible).toBe(false);
    expect(critical.enforceBookingGuardEligible).toBe(false);

    const high = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "HIGH" }));
    expect(high.enforceZoneProtectionEligible).toBe(false);
    expect(high.enforceCapacityCapEligible).toBe(false);
    expect(high.enforceBookingGuardEligible).toBe(false);
  });

  it("booking guard only eligible in highest safe tier (BROAD_ENFORCEMENT)", () => {
    // PILOT_ENFORCEMENT should not have booking guard
    const pilot = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "LOW", reliabilityScore: 88, breachRisk: 20 }));
    expect(pilot.enforceBookingGuardEligible).toBe(false);

    // BROAD_ENFORCEMENT should have booking guard
    const broad = computeRolloutPolicy(makeInput({ dispatchRiskLevel: "LOW", reliabilityScore: 95, breachRisk: 10 }));
    expect(broad.enforceBookingGuardEligible).toBe(true);
  });
});
