import { describe, it, expect } from "vitest";
import { simulateDispatchPolicy, type DispatchPolicySimulationInput } from "@/engines/reliabilityDispatchPolicySimulator";

function makeInput(overrides: Partial<DispatchPolicySimulationInput> = {}): DispatchPolicySimulationInput {
  return {
    dispatchRiskLevel: "LOW",
    routingRecommendation: "NORMAL",
    technicianLoadRecommendation: "NORMAL",
    dispatchConfidence: 90,
    reliabilityScore: 92,
    breachRisk: 5,
    escalationRate: 2,
    zoneGuardrailCount: 0,
    ...overrides,
  };
}

describe("reliabilityDispatchPolicySimulator", () => {
  it("LOW risk → NORMAL / NO_CHANGE / OPEN / 100", () => {
    const r = simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "LOW" }));
    expect(r.shadowPolicyMode).toBe("NORMAL");
    expect(r.simulatedRoutingAction).toBe("NO_CHANGE");
    expect(r.simulatedBookingIntakeAdvisory).toBe("OPEN");
    expect(r.simulatedPartnerLoadCapPercent).toBe(100);
  });

  it("MODERATE risk → CAUTION / SOFT_LIMIT / MONITOR / 90", () => {
    const r = simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "MODERATE" }));
    expect(r.shadowPolicyMode).toBe("CAUTION");
    expect(r.simulatedRoutingAction).toBe("SOFT_LIMIT");
    expect(r.simulatedBookingIntakeAdvisory).toBe("MONITOR");
    expect(r.simulatedPartnerLoadCapPercent).toBe(90);
  });

  it("HIGH risk → THROTTLE / REDUCE_ASSIGNMENTS / SOFT_GUARD / 70", () => {
    const r = simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "HIGH" }));
    expect(r.shadowPolicyMode).toBe("THROTTLE");
    expect(r.simulatedRoutingAction).toBe("REDUCE_ASSIGNMENTS");
    expect(r.simulatedBookingIntakeAdvisory).toBe("SOFT_GUARD");
    expect(r.simulatedPartnerLoadCapPercent).toBe(70);
  });

  it("CRITICAL risk → PROTECT / AVOID_NEW_ROUTING / RESTRICT / 40", () => {
    const r = simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "CRITICAL" }));
    expect(r.shadowPolicyMode).toBe("PROTECT");
    expect(r.simulatedRoutingAction).toBe("AVOID_NEW_ROUTING");
    expect(r.simulatedBookingIntakeAdvisory).toBe("RESTRICT");
    expect(r.simulatedPartnerLoadCapPercent).toBe(40);
  });

  it("zone protection true only for HIGH / CRITICAL", () => {
    expect(simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "LOW" })).simulatedZoneProtection).toBe(false);
    expect(simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "MODERATE" })).simulatedZoneProtection).toBe(false);
    expect(simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "HIGH" })).simulatedZoneProtection).toBe(true);
    expect(simulateDispatchPolicy(makeInput({ dispatchRiskLevel: "CRITICAL" })).simulatedZoneProtection).toBe(true);
  });

  it("policyReason exists and is non-empty", () => {
    for (const level of ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const) {
      const r = simulateDispatchPolicy(makeInput({ dispatchRiskLevel: level }));
      expect(r.policyReason).toBeTruthy();
      expect(r.policyReason.length).toBeGreaterThan(10);
    }
  });

  it("output deterministic for same input", () => {
    const input = makeInput({ dispatchRiskLevel: "HIGH" });
    const a = simulateDispatchPolicy(input);
    const b = simulateDispatchPolicy(input);
    expect(a).toEqual(b);
  });
});
