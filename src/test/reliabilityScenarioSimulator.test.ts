import { describe, it, expect } from "vitest";
import {
  simulateDemandShock, simulatePartnerLoss, simulateGovernanceStress,
  simulateRolloutExpansion, simulateOperatorLoadShift,
  computeScenarioSummary, generateScenarioComparison,
} from "@/engines/reliabilityScenarioSimulator";

describe("simulateDemandShock", () => {
  it("raises demand pressure with increase", () => {
    const r = simulateDemandShock({ baseDemandPressure: 30, demandIncreasePercent: 50, availablePartners: 5, avgCompletionMinutes: 90 });
    expect(r.newDemandPressure).toBeGreaterThan(30);
    expect(r.riskLevel).toBeDefined();
  });

  it("clamps to 0-100", () => {
    const r = simulateDemandShock({ baseDemandPressure: 90, demandIncreasePercent: 200, availablePartners: 1, avgCompletionMinutes: 90 });
    expect(r.newDemandPressure).toBeLessThanOrEqual(100);
    expect(r.newDemandPressure).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic", () => {
    const input = { baseDemandPressure: 40, demandIncreasePercent: 30, availablePartners: 5, avgCompletionMinutes: 90 };
    expect(simulateDemandShock(input)).toEqual(simulateDemandShock(input));
  });
});

describe("simulatePartnerLoss", () => {
  it("reduces partners and raises pressure", () => {
    const r = simulatePartnerLoss({ currentAvailablePartners: 10, partnerLossCount: 5, bookingVolume7d: 42, currentDemandPressure: 30 });
    expect(r.newAvailablePartners).toBe(5);
    expect(r.serviceCapacityDropPercent).toBe(50);
  });

  it("handles total partner loss", () => {
    const r = simulatePartnerLoss({ currentAvailablePartners: 3, partnerLossCount: 5, bookingVolume7d: 21, currentDemandPressure: 20 });
    expect(r.newAvailablePartners).toBe(0);
    expect(r.newDemandPressure).toBe(100);
    expect(r.riskLevel).toBe("critical");
  });
});

describe("simulateGovernanceStress", () => {
  it("returns LOW for clean state", () => {
    const r = simulateGovernanceStress({ overdueGovernanceActions: 0, unownedCriticalActions: 0, snapshotAgeHours: 2, operatorWorkloadScore: 20 });
    expect(r.attentionLevel).toBe("LOW");
    expect(r.blockers).toHaveLength(0);
  });

  it("rises with overdue and stale snapshot", () => {
    const r = simulateGovernanceStress({ overdueGovernanceActions: 8, unownedCriticalActions: 3, snapshotAgeHours: 30, operatorWorkloadScore: 85 });
    expect(r.governanceStressScore).toBeGreaterThan(40);
    expect(r.blockers.length).toBeGreaterThan(0);
  });
});

describe("simulateRolloutExpansion", () => {
  it("blocks with kill switch", () => {
    const r = simulateRolloutExpansion({ currentRolloutPercent: 10, proposedRolloutPercent: 20, currentGovernanceRisk: 10, demandPressure: 10, snapshotAgeHours: 2, emergencyKillSwitch: true });
    expect(r.expansionAllowed).toBe(false);
  });

  it("warns above safe ceiling", () => {
    const r = simulateRolloutExpansion({ currentRolloutPercent: 10, proposedRolloutPercent: 50, currentGovernanceRisk: 10, demandPressure: 10, snapshotAgeHours: 2, emergencyKillSwitch: false });
    expect(r.warnings.some(w => w.includes("exceeds safe ceiling"))).toBe(true);
  });

  it("allows safe expansion", () => {
    const r = simulateRolloutExpansion({ currentRolloutPercent: 10, proposedRolloutPercent: 15, currentGovernanceRisk: 10, demandPressure: 20, snapshotAgeHours: 2, emergencyKillSwitch: false });
    expect(r.expansionAllowed).toBe(true);
  });

  it("blocks with stale snapshot + high risk", () => {
    const r = simulateRolloutExpansion({ currentRolloutPercent: 10, proposedRolloutPercent: 15, currentGovernanceRisk: 60, demandPressure: 30, snapshotAgeHours: 30, emergencyKillSwitch: false });
    expect(r.expansionAllowed).toBe(false);
  });
});

describe("simulateOperatorLoadShift", () => {
  it("increases with added actions", () => {
    const r = simulateOperatorLoadShift({ currentWorkloadScore: 40, addedActions: 5, resolvedActions: 0, overdueActions: 2 });
    expect(r.projectedWorkloadScore).toBeGreaterThan(40);
  });

  it("decreases with resolved actions", () => {
    const r = simulateOperatorLoadShift({ currentWorkloadScore: 60, addedActions: 0, resolvedActions: 5, overdueActions: 0 });
    expect(r.projectedWorkloadScore).toBeLessThan(60);
  });

  it("clamps to 0-100", () => {
    const r = simulateOperatorLoadShift({ currentWorkloadScore: 90, addedActions: 20, resolvedActions: 0, overdueActions: 10 });
    expect(r.projectedWorkloadScore).toBeLessThanOrEqual(100);
  });
});

describe("computeScenarioSummary", () => {
  it("returns manageable for low risk", () => {
    const r = computeScenarioSummary({ label: "Test" });
    expect(r.outcomeHeadline).toContain("manageable");
    expect(r.netRiskDelta).toBe(0);
  });

  it("returns deterministic output", () => {
    const input = {
      label: "Test",
      demandShock: { newDemandPressure: 80, predictedDelayMinutes: 20, riskLevel: "high" as const },
    };
    expect(computeScenarioSummary(input)).toEqual(computeScenarioSummary(input));
  });
});

describe("generateScenarioComparison", () => {
  it("shows worsened when metrics deteriorate", () => {
    const r = generateScenarioComparison(
      { demandPressure: 20, governanceStress: 10, workloadScore: 30, rolloutPercent: 10 },
      { demandPressure: 60, governanceStress: 50, workloadScore: 70, rolloutPercent: 25 },
    );
    expect(r.status).toBe("worsened");
    expect(r.demandDelta).toBeGreaterThan(0);
  });

  it("shows improved when metrics improve", () => {
    const r = generateScenarioComparison(
      { demandPressure: 60, governanceStress: 50, workloadScore: 70, rolloutPercent: 20 },
      { demandPressure: 20, governanceStress: 15, workloadScore: 30, rolloutPercent: 10 },
    );
    expect(r.status).toBe("improved");
  });

  it("shows unchanged for minimal delta", () => {
    const r = generateScenarioComparison(
      { demandPressure: 30, governanceStress: 20, workloadScore: 40, rolloutPercent: 10 },
      { demandPressure: 31, governanceStress: 20, workloadScore: 40, rolloutPercent: 10 },
    );
    expect(r.status).toBe("unchanged");
  });
});
