/**
 * LankaFix Reliability Action Center Engine — Pure Functions
 * Computes operator recommendations, hotspots, rollout candidates, and trust status.
 * No React, no Supabase, no side effects. Deterministic.
 * Advisory-only — does NOT alter live marketplace behavior.
 */

import type { CategoryReliabilitySummary } from "./categoryReliabilityEngine";
import type { ZoneReliabilitySummary } from "./zoneReliabilityEngine";
import type { SnapshotFreshness } from "@/services/reliabilityReadModel";

export interface ActionCenterInput {
  reliabilityScore: number;
  verdict: string;
  slaTier: string;
  breachRisk: number;
  dispatchRiskLevel: string;
  rolloutReadiness: string;
  emergencyKillSwitch: boolean;
  snapshotFreshness: SnapshotFreshness;
  snapshotAgeHours: number;
  allCategorySummaries: CategoryReliabilitySummary[];
  zoneReliability: ZoneReliabilitySummary[];
}

export interface ActionCenterResult {
  topHotspots: CategoryReliabilitySummary[];
  rolloutCandidates: CategoryReliabilitySummary[];
  blockedItems: CategoryReliabilitySummary[];
  operatorSummary: string[];
  trustStatus: TrustStatus;
}

export interface TrustStatus {
  freshness: SnapshotFreshness;
  label: string;
  trustworthy: boolean;
  recommendation: string;
}

/**
 * Compute trust status from snapshot freshness.
 */
export function computeTrustStatus(freshness: SnapshotFreshness, ageHours: number): TrustStatus {
  switch (freshness) {
    case "healthy":
      return { freshness, label: "Fresh", trustworthy: true, recommendation: "Snapshot data is current and reliable for board discussion" };
    case "watch":
      return { freshness, label: "Watch", trustworthy: true, recommendation: "Snapshot aging — consider refreshing before critical decisions" };
    case "stale":
      return { freshness, label: "Stale", trustworthy: false, recommendation: "Snapshot freshness is stale — refresh reliability record before decisions" };
    case "none":
    default:
      return { freshness: "none", label: "No Data", trustworthy: false, recommendation: "No snapshots available — archive data cannot be trusted" };
  }
}

/**
 * Compute top hotspots — worst zone×category by score.
 */
export function computeTopHotspots(summaries: CategoryReliabilitySummary[], limit = 5): CategoryReliabilitySummary[] {
  return [...summaries].sort((a, b) => a.reliabilityScore - b.reliabilityScore).slice(0, limit);
}

/**
 * Compute best rollout candidates — CONTROLLED or READY, sorted best first.
 */
export function computeRolloutCandidates(summaries: CategoryReliabilitySummary[], limit = 5): CategoryReliabilitySummary[] {
  return [...summaries]
    .filter(s => s.rolloutReadiness === "CONTROLLED" || s.rolloutReadiness === "READY")
    .filter(s => s.sampleQuality !== "PILOT_ESTIMATE")
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
    .slice(0, limit);
}

/**
 * Compute blocked / unsafe items.
 */
export function computeBlockedItems(summaries: CategoryReliabilitySummary[]): CategoryReliabilitySummary[] {
  return [...summaries]
    .filter(s =>
      s.riskLevel === "CRITICAL" ||
      s.riskLevel === "HIGH" ||
      s.rolloutReadiness === "NOT_READY"
    )
    .sort((a, b) => a.reliabilityScore - b.reliabilityScore);
}

/**
 * Generate deterministic operator recommendations.
 */
export function computeOperatorSummary(input: ActionCenterInput): string[] {
  const recommendations: string[] = [];

  if (input.emergencyKillSwitch) {
    recommendations.push("Kill switch is active — all rollout planning is blocked");
    return recommendations;
  }

  // Snapshot trust
  if (input.snapshotFreshness === "stale") {
    recommendations.push("Snapshot freshness is stale — refresh reliability record before decisions");
  } else if (input.snapshotFreshness === "none") {
    recommendations.push("No snapshots recorded — establish baseline before rollout discussion");
  }

  // Overall posture
  if (input.verdict === "CRITICAL") {
    recommendations.push("System reliability is critical — keep all rollout in observation mode");
  } else if (input.verdict === "RISK") {
    recommendations.push("System reliability is degraded — proceed with extreme caution");
  } else if (input.verdict === "GUARDED") {
    recommendations.push("System reliability is guarded — controlled pilot only in healthiest clusters");
  } else if (input.verdict === "STABLE") {
    recommendations.push("System reliability is stable — controlled rollout candidates are eligible");
  }

  // Rollout readiness
  if (input.rolloutReadiness === "NOT_READY" || input.rolloutReadiness === "LIMITED") {
    recommendations.push("Rollout readiness insufficient — keep rollout in observation mode");
  }

  // Category-level insights
  const criticalCategories = input.allCategorySummaries.filter(s => s.riskLevel === "CRITICAL");
  const highRiskCategories = input.allCategorySummaries.filter(s => s.riskLevel === "HIGH");
  const readyCandidates = input.allCategorySummaries.filter(s =>
    (s.rolloutReadiness === "CONTROLLED" || s.rolloutReadiness === "READY") &&
    s.sampleQuality !== "PILOT_ESTIMATE"
  );

  if (criticalCategories.length > 0) {
    recommendations.push(`Exclude ${criticalCategories.length} critical-risk category combination(s) from any rollout discussion`);
  }
  if (highRiskCategories.length > 0) {
    recommendations.push(`${highRiskCategories.length} high-risk category combination(s) should remain shadow-only`);
  }

  // Shadow policy
  const protectZones = input.zoneReliability.filter(z => z.shadowPolicyMode === "PROTECT" || z.shadowPolicyMode === "THROTTLE");
  if (protectZones.length > 0) {
    recommendations.push(`Shadow policy indicates PROTECT/THROTTLE posture in ${protectZones.length} zone(s)`);
  }

  if (readyCandidates.length > 0) {
    recommendations.push(`Proceed only with controlled pilot in ${readyCandidates.length} healthiest category cluster(s)`);
  } else {
    recommendations.push("No category combinations currently meet controlled rollout criteria");
  }

  return recommendations;
}

/**
 * Full action center computation. Pure, deterministic.
 */
export function computeActionCenter(input: ActionCenterInput): ActionCenterResult {
  const trustStatus = computeTrustStatus(input.snapshotFreshness, input.snapshotAgeHours);
  const topHotspots = computeTopHotspots(input.allCategorySummaries);
  const rolloutCandidates = computeRolloutCandidates(input.allCategorySummaries);
  const blockedItems = computeBlockedItems(input.allCategorySummaries);
  const operatorSummary = computeOperatorSummary(input);

  return { topHotspots, rolloutCandidates, blockedItems, operatorSummary, trustStatus };
}
