import { describe, it, expect } from "vitest";
import {
  computeInterventionScore,
  computePriorityInterventions,
  computeRecommendedSequence,
  computeRolloutGuardAdvice,
  computePrescriptiveSummary,
  type PriorityInterventionsInput,
} from "@/engines/prescriptiveReliabilityOrchestrator";

const EMPTY_INPUT: PriorityInterventionsInput = {
  governanceRiskZones: [],
  predictedDeclines: [],
  demandPressureSignals: [],
  partnerDecaySignals: [],
  overdueActions: [],
  unownedCriticalActions: [],
  snapshotAgeHours: 2,
  operatorLoads: [],
  rolloutAllowed: true,
  rolloutCeilingPercent: 50,
  emergencyKillSwitch: false,
};

describe("computeInterventionScore", () => {
  it("returns low score for healthy inputs", () => {
    const score = computeInterventionScore({
      governanceRisk: 5, predictiveDecline: 0, demandPressure: 10,
      partnerDecay: 0, overdueGovernance: 0, unownedCritical: 0,
      snapshotAgeHours: 1, operatorWorkload: 20, rolloutReadiness: 80,
    });
    expect(score).toBeLessThan(15);
  });

  it("returns high score for degraded inputs", () => {
    const score = computeInterventionScore({
      governanceRisk: 80, predictiveDecline: 70, demandPressure: 90,
      partnerDecay: 60, overdueGovernance: 8, unownedCritical: 5,
      snapshotAgeHours: 30, operatorWorkload: 90, rolloutReadiness: 10,
    });
    expect(score).toBeGreaterThan(60);
  });

  it("clamps to 0-100", () => {
    const score = computeInterventionScore({
      governanceRisk: 100, predictiveDecline: 100, demandPressure: 100,
      partnerDecay: 100, overdueGovernance: 50, unownedCritical: 50,
      snapshotAgeHours: 100, operatorWorkload: 100, rolloutReadiness: 0,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("computePriorityInterventions", () => {
  it("returns empty for clean state", () => {
    const result = computePriorityInterventions(EMPTY_INPUT);
    expect(result.topInterventions).toHaveLength(0);
    expect(result.avoidNow).toHaveLength(0);
    expect(result.quickWins).toHaveLength(0);
  });

  it("generates assign_owner for unowned critical", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      unownedCriticalActions: [
        { id: "a1", title: "Critical item" },
        { id: "a2", title: "Critical item 2" },
      ],
    });
    const assign = result.topInterventions.find(i => i.actionType === "assign_owner");
    expect(assign).toBeDefined();
    expect(assign!.urgency).toBe("critical");
  });

  it("generates refresh_snapshot for stale snapshot", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      snapshotAgeHours: 30,
    });
    const refresh = result.topInterventions.find(i => i.actionType === "refresh_snapshot");
    expect(refresh).toBeDefined();
  });

  it("generates review_demand_pressure for high demand", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      demandPressureSignals: [
        { zoneId: "col_01", categoryCode: "AC", demandPressure: 85, riskLevel: "critical", supplyRatio: 2.5 },
      ],
    });
    const demand = result.topInterventions.find(i => i.actionType === "review_demand_pressure");
    expect(demand).toBeDefined();
  });

  it("generates review_partner_decay for decaying partners", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      partnerDecaySignals: [
        { partnerId: "p1", partnerName: "Test", categoryCode: "AC", zoneId: "col_01", reliabilityDrop: 12, riskLevel: "high" },
      ],
    });
    const decay = result.topInterventions.find(i => i.actionType === "review_partner_decay");
    expect(decay).toBeDefined();
  });

  it("populates avoidNow when kill switch active", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      emergencyKillSwitch: true,
    });
    expect(result.avoidNow.length).toBeGreaterThan(0);
    expect(result.avoidNow[0].actionType).toBe("defer_rollout");
  });

  it("populates avoidNow when rollout blocked", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      rolloutAllowed: false,
    });
    expect(result.avoidNow.some(i => i.actionType === "defer_rollout")).toBe(true);
  });

  it("separates quick wins correctly", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      partnerDecaySignals: [
        { partnerId: "p1", partnerName: "A", categoryCode: "AC", zoneId: "col_01", reliabilityDrop: 6, riskLevel: "moderate" },
      ],
      snapshotAgeHours: 14,
    });
    // Low-effort items should appear in quickWins
    const quickIds = result.quickWins.map(q => q.id);
    const hasLowEffort = result.quickWins.every(q => q.estimatedEffort === "low");
    expect(hasLowEffort).toBe(true);
  });

  it("is deterministic", () => {
    const input = {
      ...EMPTY_INPUT,
      governanceRiskZones: [{ zoneId: "col_01", categoryCode: "AC", score: 60, level: "HIGH", factors: ["test"] }],
    };
    const r1 = computePriorityInterventions(input);
    const r2 = computePriorityInterventions(input);
    expect(r1).toEqual(r2);
  });
});

describe("computeRecommendedSequence", () => {
  it("returns empty for no interventions", () => {
    const seq = computeRecommendedSequence([]);
    expect(seq.immediate).toHaveLength(0);
    expect(seq.thisShift).toHaveLength(0);
    expect(seq.thisWeek).toHaveLength(0);
  });

  it("puts critical+low-effort in immediate", () => {
    const result = computePriorityInterventions({
      ...EMPTY_INPUT,
      unownedCriticalActions: [
        { id: "a1", title: "Critical" },
        { id: "a2", title: "Critical 2" },
        { id: "a3", title: "Critical 3" },
      ],
    });
    const allItems = [...result.topInterventions, ...result.quickWins];
    const seq = computeRecommendedSequence(allItems);
    expect(seq.immediate.some(i => i.urgency === "critical")).toBe(true);
  });
});

describe("computeRolloutGuardAdvice", () => {
  it("allows rollout when no blockers", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [],
      snapshotAgeHours: 2,
      highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0,
      emergencyKillSwitch: false,
      currentRolloutCeiling: 50,
    });
    expect(result.rolloutAllowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks rollout with kill switch", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [],
      snapshotAgeHours: 2,
      highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0,
      emergencyKillSwitch: true,
      currentRolloutCeiling: 50,
    });
    expect(result.rolloutAllowed).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("never exceeds advisory cap", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [],
      snapshotAgeHours: 2,
      highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0,
      emergencyKillSwitch: false,
      currentRolloutCeiling: 10,
    });
    expect(result.recommendedCeilingPercent).toBeLessThanOrEqual(10);
  });

  it("caps rollout when demand pressure is critical", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [],
      snapshotAgeHours: 2,
      highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 5,
      emergencyKillSwitch: false,
      currentRolloutCeiling: 50,
    });
    expect(result.recommendedCeilingPercent).toBeLessThan(50);
  });
});

describe("computePrescriptiveSummary", () => {
  it("generates stable headline for empty state", () => {
    const interventions = computePriorityInterventions(EMPTY_INPUT);
    const sequence = computeRecommendedSequence([]);
    const rolloutGuard = computeRolloutGuardAdvice({
      governanceBlockers: [], snapshotAgeHours: 2, highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0, emergencyKillSwitch: false, currentRolloutCeiling: 50,
    });
    const summary = computePrescriptiveSummary({ interventions, sequence, rolloutGuard, snapshotAgeHours: 2 });
    expect(summary.headline).toContain("stable");
    expect(summary.strongestSignal).toContain("No significant");
  });

  it("generates action headline when interventions exist", () => {
    const interventions = computePriorityInterventions({
      ...EMPTY_INPUT,
      unownedCriticalActions: [{ id: "a1", title: "Test" }, { id: "a2", title: "Test2" }, { id: "a3", title: "Test3" }],
      governanceRiskZones: [{ zoneId: "col_01", categoryCode: "AC", score: 70, level: "HIGH", factors: ["test"] }],
    });
    const allItems = [...interventions.topInterventions, ...interventions.quickWins];
    const sequence = computeRecommendedSequence(allItems);
    const rolloutGuard = computeRolloutGuardAdvice({
      governanceBlockers: [], snapshotAgeHours: 2, highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0, emergencyKillSwitch: false, currentRolloutCeiling: 50,
    });
    const summary = computePrescriptiveSummary({ interventions, sequence, rolloutGuard, snapshotAgeHours: 2 });
    expect(summary.headline).toContain("immediate");
  });
});
