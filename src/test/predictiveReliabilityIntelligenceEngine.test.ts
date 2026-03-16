import { describe, it, expect } from "vitest";
import {
  predictZoneCategoryReliability,
  detectPartnerReliabilityDecay,
  detectDemandPressureRisk,
  computeGovernanceRiskScore,
  generatePredictiveGovernanceSignals,
  type ReliabilitySnapshot,
  type PartnerReliabilityRecord,
  type DemandPressureInput,
} from "@/engines/predictiveReliabilityIntelligenceEngine";

describe("predictZoneCategoryReliability", () => {
  it("returns stable with no snapshots", () => {
    const result = predictZoneCategoryReliability([], "col_01", "AC");
    expect(result.trend).toBe("stable");
    expect(result.riskLevel).toBe("moderate"); // default 85
    expect(result.currentReliability).toBe(85);
  });

  it("detects declining trend", () => {
    const snaps: ReliabilitySnapshot[] = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2025, 0, i + 1).toISOString(),
      zoneId: "col_01",
      categoryCode: "AC",
      reliabilityScore: 95 - i * 3,
      successRate: 95 - i * 3,
      escalationRate: i,
    }));
    const result = predictZoneCategoryReliability(snaps, "col_01", "AC");
    expect(result.trend).toBe("declining");
    expect(result.predictedReliability3Days).toBeLessThan(result.currentReliability);
  });

  it("detects improving trend", () => {
    const snaps: ReliabilitySnapshot[] = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2025, 0, i + 1).toISOString(),
      zoneId: "col_02",
      categoryCode: "plumbing",
      reliabilityScore: 60 + i * 3,
      successRate: 60 + i * 3,
      escalationRate: 10 - i,
    }));
    const result = predictZoneCategoryReliability(snaps, "col_02", "plumbing");
    expect(result.trend).toBe("improving");
    expect(result.predictedReliability7Days).toBeGreaterThanOrEqual(result.currentReliability);
  });

  it("classifies critical risk for low predicted scores", () => {
    const snaps: ReliabilitySnapshot[] = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2025, 0, i + 1).toISOString(),
      zoneId: "col_03",
      categoryCode: "electrical",
      reliabilityScore: 70 - i * 4,
      successRate: 70 - i * 4,
      escalationRate: i * 2,
    }));
    const result = predictZoneCategoryReliability(snaps, "col_03", "electrical");
    expect(["high", "critical"]).toContain(result.riskLevel);
  });

  it("is deterministic", () => {
    const snaps: ReliabilitySnapshot[] = [
      { date: "2025-01-01", zoneId: "col_01", categoryCode: "AC", reliabilityScore: 90, successRate: 90, escalationRate: 5 },
      { date: "2025-01-02", zoneId: "col_01", categoryCode: "AC", reliabilityScore: 88, successRate: 88, escalationRate: 6 },
    ];
    const r1 = predictZoneCategoryReliability(snaps, "col_01", "AC");
    const r2 = predictZoneCategoryReliability(snaps, "col_01", "AC");
    expect(r1).toEqual(r2);
  });

  it("clamps predictions to 0-100", () => {
    const snaps: ReliabilitySnapshot[] = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(2025, 0, i + 1).toISOString(),
      zoneId: "col_01",
      categoryCode: "AC",
      reliabilityScore: 10 - i * 5,
      successRate: 10,
      escalationRate: 50,
    }));
    const result = predictZoneCategoryReliability(snaps, "col_01", "AC");
    expect(result.predictedReliability3Days).toBeGreaterThanOrEqual(0);
    expect(result.predictedReliability7Days).toBeGreaterThanOrEqual(0);
    expect(result.predictedReliability7Days).toBeLessThanOrEqual(100);
  });
});

describe("detectPartnerReliabilityDecay", () => {
  it("returns empty for stable partners", () => {
    const records: PartnerReliabilityRecord[] = [{
      partnerId: "p1", partnerName: "Test", categoryCode: "AC", zoneId: "col_01",
      reliabilityScores: [{ date: "2025-01-01", score: 90 }, { date: "2025-01-14", score: 89 }],
      completedJobs14d: 10, escalationCount14d: 0,
    }];
    expect(detectPartnerReliabilityDecay(records)).toHaveLength(0);
  });

  it("detects significant drop", () => {
    const records: PartnerReliabilityRecord[] = [{
      partnerId: "p1", partnerName: "Decay Partner", categoryCode: "AC", zoneId: "col_01",
      reliabilityScores: [
        { date: "2025-01-01", score: 95 },
        { date: "2025-01-03", score: 93 },
        { date: "2025-01-05", score: 90 },
        { date: "2025-01-10", score: 82 },
        { date: "2025-01-12", score: 78 },
        { date: "2025-01-14", score: 75 },
      ],
      completedJobs14d: 20, escalationCount14d: 5,
    }];
    const signals = detectPartnerReliabilityDecay(records);
    expect(signals.length).toBe(1);
    expect(signals[0].reliabilityDrop).toBeGreaterThan(5);
    expect(signals[0].riskLevel).not.toBe("low");
  });

  it("sorts by biggest drop first", () => {
    const records: PartnerReliabilityRecord[] = [
      {
        partnerId: "p1", partnerName: "Small Drop", categoryCode: "AC", zoneId: "col_01",
        reliabilityScores: [{ date: "2025-01-01", score: 90 }, { date: "2025-01-14", score: 84 }],
        completedJobs14d: 10, escalationCount14d: 1,
      },
      {
        partnerId: "p2", partnerName: "Big Drop", categoryCode: "AC", zoneId: "col_01",
        reliabilityScores: [{ date: "2025-01-01", score: 95 }, { date: "2025-01-14", score: 70 }],
        completedJobs14d: 10, escalationCount14d: 3,
      },
    ];
    const signals = detectPartnerReliabilityDecay(records);
    expect(signals[0].partnerId).toBe("p2");
  });
});

describe("detectDemandPressureRisk", () => {
  it("returns low risk when supply exceeds demand", () => {
    const inputs: DemandPressureInput[] = [{
      zoneId: "col_01", categoryCode: "AC",
      bookingVolume7d: 7, bookingVolume14d: 14,
      availablePartners: 5, avgCompletionMinutes: 90,
    }];
    const signals = detectDemandPressureRisk(inputs);
    expect(signals[0].riskLevel).toBe("low");
  });

  it("returns high risk when demand exceeds supply", () => {
    const inputs: DemandPressureInput[] = [{
      zoneId: "col_01", categoryCode: "AC",
      bookingVolume7d: 70, bookingVolume14d: 100,
      availablePartners: 2, avgCompletionMinutes: 90,
    }];
    const signals = detectDemandPressureRisk(inputs);
    expect(["high", "critical"]).toContain(signals[0].riskLevel);
    expect(signals[0].demandPressure).toBeGreaterThan(50);
  });

  it("predicts service delay when overloaded", () => {
    const inputs: DemandPressureInput[] = [{
      zoneId: "col_01", categoryCode: "AC",
      bookingVolume7d: 42, bookingVolume14d: 70,
      availablePartners: 1, avgCompletionMinutes: 60,
    }];
    const signals = detectDemandPressureRisk(inputs);
    expect(signals[0].predictedServiceDelayMinutes).toBeGreaterThan(0);
  });
});

describe("computeGovernanceRiskScore", () => {
  it("returns LOW for healthy inputs", () => {
    const result = computeGovernanceRiskScore({
      zoneId: "col_01", categoryCode: "AC",
      reliabilityTrendSlope: 0.5, overdueGovernanceActions: 0,
      partnerChurnRisk: 0, demandPressure: 10, operatorWorkloadScore: 20,
    });
    expect(result.level).toBe("LOW");
    expect(result.governanceRiskScore).toBeLessThan(25);
  });

  it("returns HIGH/CRITICAL for degraded inputs", () => {
    const result = computeGovernanceRiskScore({
      zoneId: "col_01", categoryCode: "AC",
      reliabilityTrendSlope: -5, overdueGovernanceActions: 8,
      partnerChurnRisk: 70, demandPressure: 80, operatorWorkloadScore: 90,
    });
    expect(["HIGH", "CRITICAL"]).toContain(result.level);
    expect(result.governanceRiskScore).toBeGreaterThan(40);
  });

  it("includes factors in output", () => {
    const result = computeGovernanceRiskScore({
      zoneId: "col_01", categoryCode: "AC",
      reliabilityTrendSlope: -3, overdueGovernanceActions: 5,
      partnerChurnRisk: 60, demandPressure: 60, operatorWorkloadScore: 70,
    });
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("clamps score 0-100", () => {
    const result = computeGovernanceRiskScore({
      zoneId: "col_01", categoryCode: "AC",
      reliabilityTrendSlope: -100, overdueGovernanceActions: 100,
      partnerChurnRisk: 100, demandPressure: 100, operatorWorkloadScore: 100,
    });
    expect(result.governanceRiskScore).toBeLessThanOrEqual(100);
    expect(result.governanceRiskScore).toBeGreaterThanOrEqual(0);
  });
});

describe("generatePredictiveGovernanceSignals", () => {
  it("returns all signal types", () => {
    const result = generatePredictiveGovernanceSignals({
      snapshots: [],
      zones: ["col_01"],
      categories: ["AC"],
      partnerRecords: [],
      demandInputs: [],
      governanceInputs: [],
    });
    expect(result.reliabilityPredictions).toBeDefined();
    expect(result.partnerDecaySignals).toBeDefined();
    expect(result.demandPressureSignals).toBeDefined();
    expect(result.governanceRiskScores).toBeDefined();
  });

  it("is deterministic for identical inputs", () => {
    const params = {
      snapshots: [
        { date: "2025-01-01", zoneId: "col_01", categoryCode: "AC", reliabilityScore: 90, successRate: 90, escalationRate: 5 },
      ],
      zones: ["col_01"],
      categories: ["AC"],
      partnerRecords: [],
      demandInputs: [],
      governanceInputs: [],
    };
    const r1 = generatePredictiveGovernanceSignals(params);
    const r2 = generatePredictiveGovernanceSignals(params);
    expect(r1).toEqual(r2);
  });
});
