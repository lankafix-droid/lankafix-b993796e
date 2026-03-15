/**
 * Deterministic tests for SLA, Incident Impact, and Cost-of-Failure engines.
 */
import { describe, it, expect } from "vitest";

import {
  computeSLATier,
  computeSLACompliance,
  computeBreachRisk,
  computeRecommendedAction,
  computeSLAContract,
} from "../engines/reliabilitySLAEngine";

import {
  computeOperationalImpact,
  computeReputationalRisk,
  computeIncidentImpact,
} from "../engines/incidentImpactModel";

import {
  computeCostOfFailure,
} from "../engines/reliabilityCostEngine";

// ── SLA Engine ──

describe("SLA Tier Boundaries", () => {
  it("returns platinum for score ≥ 95", () => {
    expect(computeSLATier(95)).toBe("platinum");
    expect(computeSLATier(100)).toBe("platinum");
  });

  it("returns gold for 85–94", () => {
    expect(computeSLATier(85)).toBe("gold");
    expect(computeSLATier(94)).toBe("gold");
  });

  it("returns standard for 70–84", () => {
    expect(computeSLATier(70)).toBe("standard");
    expect(computeSLATier(84)).toBe("standard");
  });

  it("returns at_risk for < 70", () => {
    expect(computeSLATier(69)).toBe("at_risk");
    expect(computeSLATier(0)).toBe("at_risk");
  });
});

describe("SLA Compliance", () => {
  it("returns 100 for perfect metrics", () => {
    expect(computeSLACompliance(100, 0)).toBe(100);
  });

  it("penalizes high escalation rate", () => {
    const result = computeSLACompliance(100, 50);
    expect(result).toBeLessThan(100);
  });

  it("clamps to 0–100", () => {
    expect(computeSLACompliance(0, 100)).toBeGreaterThanOrEqual(0);
    expect(computeSLACompliance(0, 100)).toBeLessThanOrEqual(100);
  });
});

describe("Breach Risk", () => {
  it("returns low risk for high reliability", () => {
    expect(computeBreachRisk(95, 0, 100)).toBeLessThan(10);
  });

  it("returns high risk for low reliability + depleted budget", () => {
    expect(computeBreachRisk(20, 10, 0)).toBeGreaterThan(50);
  });

  it("circuit breaks increase risk", () => {
    const low = computeBreachRisk(80, 0, 80);
    const high = computeBreachRisk(80, 10, 80);
    expect(high).toBeGreaterThan(low);
  });

  it("clamps output 0–100", () => {
    expect(computeBreachRisk(0, 100, 0)).toBeLessThanOrEqual(100);
    expect(computeBreachRisk(100, 0, 100)).toBeGreaterThanOrEqual(0);
  });
});

describe("Recommended Action", () => {
  it("returns intervention for at_risk", () => {
    expect(computeRecommendedAction("at_risk", 10)).toContain("Immediate");
  });

  it("returns breach warning for high risk", () => {
    expect(computeRecommendedAction("gold", 70)).toContain("breach risk");
  });

  it("returns standard monitoring for platinum low risk", () => {
    expect(computeRecommendedAction("platinum", 5)).toContain("standard monitoring");
  });
});

describe("Full SLA Contract", () => {
  it("returns complete result", () => {
    const result = computeSLAContract(96, 98, 2, 0, 90);
    expect(result.slaTier).toBe("platinum");
    expect(result.slaCompliancePercent).toBeGreaterThan(90);
    expect(result.breachRiskProbability).toBeLessThan(20);
    expect(result.recommendedAction).toBeTruthy();
  });
});

// ── Incident Impact Model ──

describe("Operational Impact", () => {
  it("returns 0 for zero inputs", () => {
    expect(computeOperationalImpact(0, 0)).toBe(0);
  });

  it("scales with escalation rate", () => {
    expect(computeOperationalImpact(30, 0)).toBeGreaterThan(computeOperationalImpact(10, 0));
  });

  it("scales with guardrail count", () => {
    expect(computeOperationalImpact(0, 5)).toBeGreaterThan(computeOperationalImpact(0, 1));
  });

  it("clamps to 100", () => {
    expect(computeOperationalImpact(100, 20)).toBeLessThanOrEqual(100);
  });
});

describe("Reputational Risk", () => {
  it("returns 0 for zero risk and high budget", () => {
    expect(computeReputationalRisk(0, 30)).toBe(0);
  });

  it("maxes out with high risk and zero budget", () => {
    expect(computeReputationalRisk(100, 0)).toBe(100);
  });

  it("clamps to 0–100", () => {
    expect(computeReputationalRisk(200, -5)).toBeLessThanOrEqual(100);
  });
});

describe("Composite Incident Impact", () => {
  it("returns low for healthy system", () => {
    const r = computeIncidentImpact(0, 0, 0, 30);
    expect(r.impactLevel).toBe("low");
    expect(r.compositeImpactScore).toBe(0);
  });

  it("returns critical for degraded system", () => {
    const r = computeIncidentImpact(50, 10, 100, 0);
    expect(r.impactLevel).toBe("critical");
  });

  it("composite is blend of operational + reputational", () => {
    const r = computeIncidentImpact(20, 2, 50, 15);
    expect(r.compositeImpactScore).toBeGreaterThanOrEqual(0);
    expect(r.compositeImpactScore).toBeLessThanOrEqual(100);
  });
});

// ── Cost-of-Failure Engine ──

describe("Cost of Failure", () => {
  it("returns zero for zero volume", () => {
    const r = computeCostOfFailure(0, 5000, 10, 15);
    expect(r.estimatedDailyRevenueAtRisk).toBe(0);
    expect(r.projected30DayExposure).toBe(0);
    expect(r.costSeverityLevel).toBe("minimal");
  });

  it("computes daily revenue at risk correctly", () => {
    // 100 bookings * 5000 LKR * 10% = 50,000
    const r = computeCostOfFailure(100, 5000, 10, 10);
    expect(r.estimatedDailyRevenueAtRisk).toBe(50000);
  });

  it("uses worst rate for 30-day projection", () => {
    const r = computeCostOfFailure(100, 5000, 5, 15);
    // projected is worse: 100 * 5000 * 15% * 30 = 22,500,000
    expect(r.projected30DayExposure).toBe(22500000);
  });

  it("returns severe for high exposure", () => {
    const r = computeCostOfFailure(100, 5000, 10, 10);
    expect(r.projected30DayExposure).toBe(15000000);
    expect(r.costSeverityLevel).toBe("severe");
  });

  it("returns minimal for low exposure", () => {
    const r = computeCostOfFailure(5, 1000, 1, 1);
    expect(r.costSeverityLevel).toBe("minimal");
  });

  it("handles negative inputs safely", () => {
    const r = computeCostOfFailure(-10, -500, -5, -5);
    expect(r.estimatedDailyRevenueAtRisk).toBe(0);
    expect(r.projected30DayExposure).toBe(0);
  });
});
