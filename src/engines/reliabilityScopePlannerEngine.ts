/**
 * LankaFix Reliability Guardrails Scope Planner Engine
 * Pure function. No React, no Supabase, no Date.now(), no side effects.
 * Simulates scope planning for guardrail rollout — zones, categories, rollback triggers, success criteria.
 * Does NOT alter live dispatch or marketplace behavior.
 */

import type { DispatchRiskLevel } from "./reliabilityDispatchRiskEngine";
import type { RecommendedMode } from "./reliabilityRolloutPolicyEngine";

export type PlannerStatus = "BLOCKED" | "OBSERVE_ONLY" | "CONTROLLED_PILOT" | "PILOT_READY" | "BROAD_READY";
export type ScopeSafetyLevel = "SAFE" | "GUARDED" | "RESTRICTED" | "BLOCKED";
export type PartnerTier = "all" | "verified" | "top_rated" | "elite";
export type TimeWindow = "all_day" | "peak_hours" | "off_peak" | "emergency_only";

export interface ScopePlannerInput {
  reliabilityScore: number;
  dispatchRiskLevel: DispatchRiskLevel;
  rolloutReadiness: "NOT_READY" | "LIMITED" | "CONTROLLED" | "READY";
  recommendedMode: RecommendedMode;
  recommendedRolloutPercent: number;
  emergencyKillSwitch: boolean;
  availableZones: string[];
  availableCategories: string[];
  activePartnerCount: number;
  selectedZones: string[];
  selectedCategories: string[];
  selectedPartnerTier: PartnerTier;
  selectedTimeWindow: TimeWindow;
  requestedRolloutPercent: number;
}

export interface ZoneEligibility {
  zoneId: string;
  eligible: boolean;
  reason: string;
}

export interface CategoryEligibility {
  category: string;
  eligible: boolean;
  reason: string;
}

export interface ScopePlannerResult {
  plannerStatus: PlannerStatus;
  effectiveRolloutPercent: number;
  scopeSafetyLevel: ScopeSafetyLevel;
  zoneEligibilityMap: ZoneEligibility[];
  categoryEligibilityMap: CategoryEligibility[];
  rolloutWarnings: string[];
  rollbackTriggers: string[];
  successCriteria: string[];
  plannerRecommendation: string;
}

const ROLLBACK_TRIGGERS: string[] = [
  "Escalation rate rises above 15%",
  "Circuit breaker activation detected",
  "Breach risk exceeds 25%",
  "Emergency kill switch activated",
  "Dispatch confidence drops below 60%",
];

const SUCCESS_CRITERIA: string[] = [
  "Reliability score remains above 80 during pilot window",
  "Breach risk stays below 20%",
  "No circuit break events during pilot window",
  "Escalation rate remains below 10%",
  "Snapshot freshness remains healthy (< 24h)",
];

function computeSafetyLevel(plannerStatus: PlannerStatus): ScopeSafetyLevel {
  switch (plannerStatus) {
    case "BLOCKED": return "BLOCKED";
    case "OBSERVE_ONLY": return "RESTRICTED";
    case "CONTROLLED_PILOT": return "GUARDED";
    case "PILOT_READY":
    case "BROAD_READY": return "SAFE";
  }
}

function computeZoneEligibility(
  zones: string[],
  available: string[],
  dispatchRiskLevel: DispatchRiskLevel,
  plannerStatus: PlannerStatus,
): ZoneEligibility[] {
  return zones.map(zoneId => {
    if (plannerStatus === "BLOCKED" || plannerStatus === "OBSERVE_ONLY") {
      return { zoneId, eligible: false, reason: "System not ready for zone-level rollout" };
    }
    if (dispatchRiskLevel === "CRITICAL" || dispatchRiskLevel === "HIGH") {
      return { zoneId, eligible: false, reason: `Dispatch risk ${dispatchRiskLevel} blocks zone eligibility` };
    }
    if (!available.includes(zoneId)) {
      return { zoneId, eligible: false, reason: "Zone not in available zone list" };
    }
    return { zoneId, eligible: true, reason: "Zone eligible for pilot scope" };
  });
}

function computeCategoryEligibility(
  categories: string[],
  available: string[],
  plannerStatus: PlannerStatus,
): CategoryEligibility[] {
  return categories.map(category => {
    if (plannerStatus === "BLOCKED" || plannerStatus === "OBSERVE_ONLY") {
      return { category, eligible: false, reason: "System not ready for category-level rollout" };
    }
    if (!available.includes(category)) {
      return { category, eligible: false, reason: "Category not in available category list" };
    }
    return { category, eligible: true, reason: "Category eligible for pilot scope" };
  });
}

/**
 * Compute scope plan. Pure, deterministic, no side effects.
 */
export function computeScopePlan(input: ScopePlannerInput): ScopePlannerResult {
  const {
    dispatchRiskLevel, rolloutReadiness, recommendedMode,
    emergencyKillSwitch, availableZones, availableCategories,
    selectedZones, selectedCategories, requestedRolloutPercent,
  } = input;

  const warnings: string[] = [];

  // ── Kill switch → BLOCKED ──
  if (emergencyKillSwitch) {
    return {
      plannerStatus: "BLOCKED",
      effectiveRolloutPercent: 0,
      scopeSafetyLevel: "BLOCKED",
      zoneEligibilityMap: selectedZones.map(z => ({ zoneId: z, eligible: false, reason: "Kill switch active" })),
      categoryEligibilityMap: selectedCategories.map(c => ({ category: c, eligible: false, reason: "Kill switch active" })),
      rolloutWarnings: ["Emergency kill switch is active — all rollout planning blocked"],
      rollbackTriggers: ROLLBACK_TRIGGERS,
      successCriteria: SUCCESS_CRITERIA,
      plannerRecommendation: "Kill switch active. All rollout planning is blocked until the kill switch is deactivated.",
    };
  }

  // ── Derive planner status ──
  let plannerStatus: PlannerStatus;
  let maxPercent: number;

  if (rolloutReadiness === "NOT_READY" || rolloutReadiness === "LIMITED") {
    plannerStatus = "OBSERVE_ONLY";
    maxPercent = 0;
  } else if (rolloutReadiness === "CONTROLLED") {
    plannerStatus = "CONTROLLED_PILOT";
    maxPercent = 10;
  } else if (recommendedMode === "BROAD_ENFORCEMENT") {
    plannerStatus = "BROAD_READY";
    maxPercent = 50;
  } else {
    plannerStatus = "PILOT_READY";
    maxPercent = 25;
  }

  const effectiveRolloutPercent = Math.min(requestedRolloutPercent, maxPercent);

  // ── Warnings ──
  if (selectedZones.length === 0) {
    warnings.push("No zones selected — scope plan requires at least one zone");
  }
  if (selectedCategories.length === 0) {
    warnings.push("No categories selected — scope plan requires at least one category");
  }
  if (requestedRolloutPercent > maxPercent && maxPercent > 0) {
    warnings.push(`Requested ${requestedRolloutPercent}% exceeds safe cap of ${maxPercent}% — capped to ${effectiveRolloutPercent}%`);
  }

  // ── Zone + category eligibility ──
  const zoneEligibilityMap = computeZoneEligibility(selectedZones, availableZones, dispatchRiskLevel, plannerStatus);
  const categoryEligibilityMap = computeCategoryEligibility(selectedCategories, availableCategories, plannerStatus);

  // ── Recommendation ──
  const recommendations: Record<PlannerStatus, string> = {
    BLOCKED: "Kill switch active. All rollout planning is blocked.",
    OBSERVE_ONLY: "System reliability insufficient for rollout. Continue observation and shadow-mode monitoring.",
    CONTROLLED_PILOT: "Eligible for tightly controlled pilot. Select specific zones and categories, limit to 10% rollout.",
    PILOT_READY: "System ready for pilot enforcement. Zone protection and capacity caps eligible, up to 25% rollout.",
    BROAD_READY: "System ready for broader rollout. All controls eligible, up to 50% rollout under kill-switch supervision.",
  };

  return {
    plannerStatus,
    effectiveRolloutPercent,
    scopeSafetyLevel: computeSafetyLevel(plannerStatus),
    zoneEligibilityMap,
    categoryEligibilityMap,
    rolloutWarnings: warnings,
    rollbackTriggers: ROLLBACK_TRIGGERS,
    successCriteria: SUCCESS_CRITERIA,
    plannerRecommendation: recommendations[plannerStatus],
  };
}
