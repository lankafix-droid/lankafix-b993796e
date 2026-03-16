import { describe, it, expect } from "vitest";
import {
  computeInterventionScore,
  computePriorityInterventions,
  computeRecommendedSequence,
  computeRolloutGuardAdvice,
  computePrescriptiveSummary,
  type WorkbenchInput,
  type RolloutGuardInput,
} from "@/engines/prescriptiveInterventionWorkbenchEngine";

const EMPTY_INPUT: WorkbenchInput = {
  governanceRiskZones: [],
  predictedDeclines: [],
  demandPressureSignals: [],
  partnerDecaySignals: [],
  overdueActions: [],
  unownedCriticalActions: [],
  snapshotAgeHours: 1,
  operatorLoads: [],
  rolloutAllowed: true,
  rolloutCeilingPercent: 20,
  emergencyKillSwitch: false,
};

describe("computeInterventionScore", () => {
  it("returns 0 for all-zero inputs", () => {
    expect(computeInterventionScore({
      governanceRisk: 0, predictiveDecline: 0, demandPressure: 0,
      partnerDecay: 0, overdueGovernance: 0, unownedCritical: 0, snapshotAgeHours: 0,
    })).toBe(0);
  });

  it("increases with worse governance/predictive/demand", () => {
    const low = computeInterventionScore({
      governanceRisk: 10, predictiveDecline: 10, demandPressure: 10,
      partnerDecay: 10, overdueGovernance: 0, unownedCritical: 0, snapshotAgeHours: 1,
    });
    const high = computeInterventionScore({
      governanceRisk: 80, predictiveDecline: 80, demandPressure: 80,
      partnerDecay: 80, overdueGovernance: 5, unownedCritical: 3, snapshotAgeHours: 30,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("clamps to 0-100", () => {
    const score = computeInterventionScore({
      governanceRisk: 200, predictiveDecline: 200, demandPressure: 200,
      partnerDecay: 200, overdueGovernance: 100, unownedCritical: 100, snapshotAgeHours: 100,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("returns identical output for identical input", () => {
    const input = {
      governanceRisk: 45, predictiveDecline: 30, demandPressure: 55,
      partnerDecay: 20, overdueGovernance: 3, unownedCritical: 2, snapshotAgeHours: 15,
    };
    expect(computeInterventionScore(input)).toBe(computeInterventionScore(input));
  });
});

describe("computePriorityInterventions", () => {
  it("returns empty for clean input", () => {
    const result = computePriorityInterventions(EMPTY_INPUT);
    expect(result.topInterventions).toHaveLength(0);
    expect(result.avoidNow).toHaveLength(0);
    expect(result.quickWins).toHaveLength(0);
  });

  it("top interventions sorted descending by priorityScore", () => {
    const input: WorkbenchInput = {
      ...EMPTY_INPUT,
      governanceRiskZones: [
        { zoneId: "z1", categoryCode: "AC", score: 80, level: "HIGH", factors: ["f1"] },
        { zoneId: "z2", categoryCode: "AC", score: 40, level: "MODERATE", factors: ["f2"] },
      ],
    };
    const result = computePriorityInterventions(input);
    for (let i = 1; i < result.topInterventions.length; i++) {
      expect(result.topInterventions[i - 1].priorityScore).toBeGreaterThanOrEqual(result.topInterventions[i].priorityScore);
    }
  });

  it("quick wins are low effort + medium/high impact", () => {
    const input: WorkbenchInput = {
      ...EMPTY_INPUT,
      partnerDecaySignals: [
        { partnerId: "p1", partnerName: "Test", categoryCode: "AC", zoneId: "z1", reliabilityDrop: 12, riskLevel: "moderate" },
      ],
      snapshotAgeHours: 15,
    };
    const result = computePriorityInterventions(input);
    for (const qw of result.quickWins) {
      expect(qw.estimatedEffort).toBe("low");
      expect(["medium", "high"]).toContain(qw.estimatedImpact);
    }
  });

  it("avoid-now includes kill switch", () => {
    const input: WorkbenchInput = { ...EMPTY_INPUT, emergencyKillSwitch: true };
    const result = computePriorityInterventions(input);
    expect(result.avoidNow.some(a => a.id.includes("killswitch"))).toBe(true);
  });

  it("avoid-now includes rollout blocked", () => {
    const input: WorkbenchInput = { ...EMPTY_INPUT, rolloutAllowed: false };
    const result = computePriorityInterventions(input);
    expect(result.avoidNow.some(a => a.actionType === "defer_rollout")).toBe(true);
  });

  it("unowned critical creates assign_owner", () => {
    const input: WorkbenchInput = {
      ...EMPTY_INPUT,
      unownedCriticalActions: [{ id: "a1", title: "Test" }],
    };
    const result = computePriorityInterventions(input);
    expect(result.topInterventions.some(i => i.actionType === "assign_owner")).toBe(true);
  });

  it("stale snapshot creates refresh_snapshot", () => {
    const input: WorkbenchInput = { ...EMPTY_INPUT, snapshotAgeHours: 30 };
    const result = computePriorityInterventions(input);
    const all = [...result.topInterventions, ...result.quickWins];
    expect(all.some(i => i.actionType === "refresh_snapshot")).toBe(true);
  });
});

describe("computeRecommendedSequence", () => {
  it("places urgent items into immediate", () => {
    const items = [
      { id: "1", title: "T", scopeType: "governance" as const, priorityScore: 90, urgency: "critical" as const, actionType: "assign_owner" as const, recommendation: "", reason: [], confidence: 90, estimatedImpact: "high" as const, estimatedEffort: "low" as const },
      { id: "2", title: "T2", scopeType: "governance" as const, priorityScore: 20, urgency: "low" as const, actionType: "refresh_snapshot" as const, recommendation: "", reason: [], confidence: 50, estimatedImpact: "medium" as const, estimatedEffort: "low" as const },
    ];
    const seq = computeRecommendedSequence(items);
    expect(seq.immediate.some(i => i.id === "1")).toBe(true);
    expect(seq.immediate.some(i => i.id === "2")).toBe(false);
  });

  it("returns empty for no interventions", () => {
    const seq = computeRecommendedSequence([]);
    expect(seq.immediate).toHaveLength(0);
    expect(seq.thisShift).toHaveLength(0);
    expect(seq.thisWeek).toHaveLength(0);
  });
});

describe("computeRolloutGuardAdvice", () => {
  it("blocks on kill switch", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [], snapshotAgeHours: 1, highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0, emergencyKillSwitch: true, currentRolloutCeiling: 20,
    });
    expect(result.rolloutAllowed).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("reduces ceiling under critical demand pressure", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [], snapshotAgeHours: 1, highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 3, emergencyKillSwitch: false, currentRolloutCeiling: 30,
    });
    expect(result.recommendedCeilingPercent).toBeLessThan(30);
  });

  it("never exceeds current ceiling", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [], snapshotAgeHours: 1, highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 0, emergencyKillSwitch: false, currentRolloutCeiling: 15,
    });
    expect(result.recommendedCeilingPercent).toBeLessThanOrEqual(15);
  });

  it("blocks when 3+ critical demand zones", () => {
    const result = computeRolloutGuardAdvice({
      governanceBlockers: [], snapshotAgeHours: 1, highGovernanceRiskCount: 0,
      criticalDemandPressureCount: 3, emergencyKillSwitch: false, currentRolloutCeiling: 30,
    });
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});

describe("computePrescriptiveSummary", () => {
  it("returns stable headline when empty", () => {
    const result = computePrescriptiveSummary({
      interventions: { topInterventions: [], avoidNow: [], quickWins: [] },
      sequence: { immediate: [], thisShift: [], thisWeek: [] },
      rolloutGuard: { rolloutAllowed: true, recommendedCeilingPercent: 20, advice: "", blockers: [] },
      snapshotAgeHours: 1,
    });
    expect(result.headline).toContain("stable");
  });

  it("returns deterministic output", () => {
    const input = {
      interventions: { topInterventions: [], avoidNow: [], quickWins: [] },
      sequence: { immediate: [], thisShift: [], thisWeek: [] },
      rolloutGuard: { rolloutAllowed: true, recommendedCeilingPercent: 20, advice: "ok", blockers: [] },
      snapshotAgeHours: 5,
    };
    const a = computePrescriptiveSummary(input);
    const b = computePrescriptiveSummary(input);
    expect(a).toEqual(b);
  });
});
