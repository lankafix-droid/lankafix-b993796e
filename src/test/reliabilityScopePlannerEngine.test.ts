import { describe, it, expect } from "vitest";
import { computeScopePlan, type ScopePlannerInput } from "@/engines/reliabilityScopePlannerEngine";

function makeInput(overrides: Partial<ScopePlannerInput> = {}): ScopePlannerInput {
  return {
    reliabilityScore: 90,
    dispatchRiskLevel: "LOW",
    rolloutReadiness: "READY",
    recommendedMode: "PILOT_ENFORCEMENT",
    recommendedRolloutPercent: 25,
    emergencyKillSwitch: false,
    availableZones: ["col_01", "col_02", "col_03"],
    availableCategories: ["AC", "MOBILE", "IT"],
    activePartnerCount: 10,
    selectedZones: ["col_01"],
    selectedCategories: ["AC"],
    selectedPartnerTier: "all",
    selectedTimeWindow: "all_day",
    requestedRolloutPercent: 20,
    ...overrides,
  };
}

describe("reliabilityScopePlannerEngine", () => {
  it("kill switch active → BLOCKED / 0%", () => {
    const result = computeScopePlan(makeInput({ emergencyKillSwitch: true }));
    expect(result.plannerStatus).toBe("BLOCKED");
    expect(result.effectiveRolloutPercent).toBe(0);
    expect(result.zoneEligibilityMap.every(z => !z.eligible)).toBe(true);
    expect(result.categoryEligibilityMap.every(c => !c.eligible)).toBe(true);
  });

  it("NOT_READY → OBSERVE_ONLY / 0%", () => {
    const result = computeScopePlan(makeInput({ rolloutReadiness: "NOT_READY", dispatchRiskLevel: "CRITICAL" }));
    expect(result.plannerStatus).toBe("OBSERVE_ONLY");
    expect(result.effectiveRolloutPercent).toBe(0);
  });

  it("LIMITED → OBSERVE_ONLY / 0%", () => {
    const result = computeScopePlan(makeInput({ rolloutReadiness: "LIMITED", dispatchRiskLevel: "HIGH" }));
    expect(result.plannerStatus).toBe("OBSERVE_ONLY");
    expect(result.effectiveRolloutPercent).toBe(0);
  });

  it("CONTROLLED + request 20% → capped to 10%", () => {
    const result = computeScopePlan(makeInput({
      rolloutReadiness: "CONTROLLED",
      recommendedMode: "PILOT_ENFORCEMENT",
      requestedRolloutPercent: 20,
    }));
    expect(result.plannerStatus).toBe("CONTROLLED_PILOT");
    expect(result.effectiveRolloutPercent).toBe(10);
  });

  it("READY + PILOT_ENFORCEMENT + request 40% → capped to 25%", () => {
    const result = computeScopePlan(makeInput({
      rolloutReadiness: "READY",
      recommendedMode: "PILOT_ENFORCEMENT",
      requestedRolloutPercent: 40,
    }));
    expect(result.plannerStatus).toBe("PILOT_READY");
    expect(result.effectiveRolloutPercent).toBe(25);
  });

  it("READY + BROAD_ENFORCEMENT + request 60% → capped to 50%", () => {
    const result = computeScopePlan(makeInput({
      rolloutReadiness: "READY",
      recommendedMode: "BROAD_ENFORCEMENT",
      requestedRolloutPercent: 60,
    }));
    expect(result.plannerStatus).toBe("BROAD_READY");
    expect(result.effectiveRolloutPercent).toBe(50);
  });

  it("no zones selected → warning present", () => {
    const result = computeScopePlan(makeInput({ selectedZones: [] }));
    expect(result.rolloutWarnings.some(w => w.includes("No zones"))).toBe(true);
  });

  it("no categories selected → warning present", () => {
    const result = computeScopePlan(makeInput({ selectedCategories: [] }));
    expect(result.rolloutWarnings.some(w => w.includes("No categories"))).toBe(true);
  });

  it("selected zones eligible only when available", () => {
    const result = computeScopePlan(makeInput({
      selectedZones: ["col_01", "col_99"],
      availableZones: ["col_01", "col_02"],
    }));
    const col01 = result.zoneEligibilityMap.find(z => z.zoneId === "col_01");
    const col99 = result.zoneEligibilityMap.find(z => z.zoneId === "col_99");
    expect(col01?.eligible).toBe(true);
    expect(col99?.eligible).toBe(false);
  });

  it("deterministic output for same input", () => {
    const input = makeInput();
    const a = computeScopePlan(input);
    const b = computeScopePlan(input);
    expect(a).toEqual(b);
  });
});
