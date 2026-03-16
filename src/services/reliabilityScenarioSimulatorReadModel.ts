/**
 * Reliability Scenario Simulator Read Model — V1
 * Fetches baseline from existing read models and runs simulation.
 * Read-only. Advisory-only.
 */

import { fetchPredictiveReliabilitySummary } from "@/services/predictiveReliabilityReadModel";
import { fetchGovernanceAutomationSummary, fetchGovernanceAttentionQueues } from "@/services/reliabilityGovernanceReadModel";
import { fetchReliabilityRolloutSummary, computeSnapshotFreshness, fetch30DaySnapshots } from "@/services/reliabilityReadModel";
import {
  simulateDemandShock, simulatePartnerLoss, simulateGovernanceStress,
  simulateRolloutExpansion, simulateOperatorLoadShift,
  computeScenarioSummary, generateScenarioComparison,
  type DemandShockResult, type PartnerLossResult, type GovernanceStressResult,
  type RolloutExpansionResult, type OperatorLoadShiftResult,
  type ScenarioSummary, type ScenarioComparison,
} from "@/engines/reliabilityScenarioSimulator";

export interface ScenarioBaseline {
  defaultZoneId: string;
  defaultCategoryCode: string;
  currentDemandPressure: number;
  currentAvailablePartners: number;
  currentBookingVolume7d: number;
  avgCompletionMinutes: number;
  overdueGovernanceActions: number;
  unownedCriticalActions: number;
  snapshotAgeHours: number;
  operatorWorkloadScore: number;
  currentRolloutPercent: number;
  currentGovernanceRisk: number;
  emergencyKillSwitch: boolean;
}

export async function fetchScenarioSimulatorBaseline(): Promise<ScenarioBaseline> {
  const [predictive, govSummary, queues, rollout, snapshots] = await Promise.all([
    fetchPredictiveReliabilitySummary().catch(() => null),
    fetchGovernanceAutomationSummary().catch(() => null),
    fetchGovernanceAttentionQueues().catch(() => ({ overdueActions: [], dueFollowUps: [], unownedCriticalActions: [] })),
    fetchReliabilityRolloutSummary().catch(() => null),
    fetch30DaySnapshots().catch(() => []),
  ]);

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const freshness = computeSnapshotFreshness(latest?.created_at || null);

  const topDemand = (predictive?.demandPressure || []).sort((a, b) => b.demandPressure - a.demandPressure)[0];
  const avgWorkload = (govSummary?.operatorLoads || []).length > 0
    ? Math.round((govSummary!.operatorLoads.reduce((s, l) => s + l.workloadScore, 0)) / govSummary!.operatorLoads.length)
    : 30;
  const topGovRisk = (predictive?.governanceRisk || []).sort((a, b) => b.governanceRiskScore - a.governanceRiskScore)[0];

  return {
    defaultZoneId: topDemand?.zoneId || "col_01",
    defaultCategoryCode: topDemand?.categoryCode || "AC",
    currentDemandPressure: topDemand?.demandPressure ?? 15,
    currentAvailablePartners: predictive?.partnersAtRisk !== undefined ? Math.max(5, 20 - predictive.partnersAtRisk) : 10,
    currentBookingVolume7d: 21,
    avgCompletionMinutes: 90,
    overdueGovernanceActions: queues.overdueActions.length,
    unownedCriticalActions: queues.unownedCriticalActions.length,
    snapshotAgeHours: freshness.ageHours,
    operatorWorkloadScore: avgWorkload,
    currentRolloutPercent: rollout?.effectiveRolloutPercent ?? 10,
    currentGovernanceRisk: topGovRisk?.governanceRiskScore ?? 15,
    emergencyKillSwitch: rollout?.emergencyKillSwitch ?? false,
  };
}

export interface ScenarioSimulationInput {
  zoneId: string;
  categoryCode: string;
  demandIncreasePercent: number;
  partnerLossCount: number;
  overdueIncrease: number;
  unownedCriticalIncrease: number;
  snapshotAgeHoursOverride?: number;
  proposedRolloutPercent: number;
  addedActions: number;
  resolvedActions: number;
}

export interface ScenarioSimulationResult {
  baseline: ScenarioBaseline;
  demandShock: DemandShockResult;
  partnerLoss: PartnerLossResult;
  governanceStress: GovernanceStressResult;
  rolloutExpansion: RolloutExpansionResult;
  operatorShift: OperatorLoadShiftResult;
  summary: ScenarioSummary;
  comparison: ScenarioComparison;
}

export function runReliabilityScenarioSimulation(
  baseline: ScenarioBaseline,
  input: ScenarioSimulationInput,
): ScenarioSimulationResult {
  const demandShock = simulateDemandShock({
    baseDemandPressure: baseline.currentDemandPressure,
    demandIncreasePercent: input.demandIncreasePercent,
    availablePartners: Math.max(0, baseline.currentAvailablePartners - input.partnerLossCount),
    avgCompletionMinutes: baseline.avgCompletionMinutes,
  });

  const partnerLoss = simulatePartnerLoss({
    currentAvailablePartners: baseline.currentAvailablePartners,
    partnerLossCount: input.partnerLossCount,
    bookingVolume7d: baseline.currentBookingVolume7d,
    currentDemandPressure: baseline.currentDemandPressure,
  });

  const snapshotAge = input.snapshotAgeHoursOverride ?? baseline.snapshotAgeHours;

  const governanceStress = simulateGovernanceStress({
    overdueGovernanceActions: baseline.overdueGovernanceActions + input.overdueIncrease,
    unownedCriticalActions: baseline.unownedCriticalActions + input.unownedCriticalIncrease,
    snapshotAgeHours: snapshotAge,
    operatorWorkloadScore: baseline.operatorWorkloadScore,
  });

  const rolloutExpansion = simulateRolloutExpansion({
    currentRolloutPercent: baseline.currentRolloutPercent,
    proposedRolloutPercent: input.proposedRolloutPercent,
    currentGovernanceRisk: baseline.currentGovernanceRisk,
    demandPressure: demandShock.newDemandPressure,
    snapshotAgeHours: snapshotAge,
    emergencyKillSwitch: baseline.emergencyKillSwitch,
  });

  const operatorShift = simulateOperatorLoadShift({
    currentWorkloadScore: baseline.operatorWorkloadScore,
    addedActions: input.addedActions,
    resolvedActions: input.resolvedActions,
    overdueActions: baseline.overdueGovernanceActions + input.overdueIncrease,
  });

  const summary = computeScenarioSummary({
    label: `${input.zoneId} × ${input.categoryCode}`,
    demandShock,
    partnerLoss,
    governanceStress,
    rolloutExpansion,
    operatorShift,
  });

  const comparison = generateScenarioComparison(
    {
      demandPressure: baseline.currentDemandPressure,
      governanceStress: baseline.currentGovernanceRisk,
      workloadScore: baseline.operatorWorkloadScore,
      rolloutPercent: baseline.currentRolloutPercent,
    },
    {
      demandPressure: demandShock.newDemandPressure,
      governanceStress: governanceStress.governanceStressScore,
      workloadScore: operatorShift.projectedWorkloadScore,
      rolloutPercent: input.proposedRolloutPercent,
    },
  );

  return { baseline, demandShock, partnerLoss, governanceStress, rolloutExpansion, operatorShift, summary, comparison };
}
