/**
 * Prescriptive Reliability Read Model — V1
 * Composes existing read models + prescriptive orchestrator.
 * Read-only. Advisory-only. No marketplace mutations.
 */

import { fetchPredictiveReliabilitySummary } from "@/services/predictiveReliabilityReadModel";
import { fetchGovernanceAutomationSummary, fetchGovernanceAttentionQueues } from "@/services/reliabilityGovernanceReadModel";
import { fetchReliabilityRolloutSummary, computeSnapshotFreshness, fetch30DaySnapshots } from "@/services/reliabilityReadModel";
import {
  computePriorityInterventions,
  computeRecommendedSequence,
  computeRolloutGuardAdvice,
  computePrescriptiveSummary,
  type PriorityInterventionsResult,
  type InterventionSequence,
  type RolloutGuardAdvice,
  type PrescriptiveSummary,
} from "@/engines/prescriptiveReliabilityOrchestrator";

export interface PrescriptiveReliabilityFullSummary {
  interventions: PriorityInterventionsResult;
  sequence: InterventionSequence;
  rolloutGuard: RolloutGuardAdvice;
  summary: PrescriptiveSummary;
}

export async function fetchPrescriptiveReliabilitySummary(): Promise<PrescriptiveReliabilityFullSummary> {
  const [predictive, govSummary, queues, rollout, snapshots] = await Promise.all([
    fetchPredictiveReliabilitySummary().catch(() => null),
    fetchGovernanceAutomationSummary().catch(() => null),
    fetchGovernanceAttentionQueues().catch(() => ({ overdueActions: [], dueFollowUps: [], unownedCriticalActions: [] })),
    fetchReliabilityRolloutSummary().catch(() => null),
    fetch30DaySnapshots().catch(() => []),
  ]);

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const freshness = computeSnapshotFreshness(latest?.created_at || null);

  const governanceRiskZones = (predictive?.governanceRisk || []).map(g => ({
    zoneId: g.zoneId,
    categoryCode: g.categoryCode,
    score: g.governanceRiskScore,
    level: g.level,
    factors: g.factors,
  }));

  const predictedDeclines = (predictive?.predictions || [])
    .filter(p => p.riskLevel !== "low" || p.trend === "declining")
    .map(p => ({
      zoneId: p.zoneId,
      categoryCode: p.categoryCode,
      currentReliability: p.currentReliability,
      predicted3d: p.predictedReliability3Days,
      predicted7d: p.predictedReliability7Days,
      trend: p.trend,
      riskLevel: p.riskLevel,
    }));

  const demandPressureSignals = (predictive?.demandPressure || []).map(d => ({
    zoneId: d.zoneId,
    categoryCode: d.categoryCode,
    demandPressure: d.demandPressure,
    riskLevel: d.riskLevel,
    supplyRatio: d.supplyRatio,
  }));

  const partnerDecaySignals = (predictive?.partnerDecay || []).map(s => ({
    partnerId: s.partnerId,
    partnerName: s.partnerName,
    categoryCode: s.categoryCode,
    zoneId: s.zoneId,
    reliabilityDrop: s.reliabilityDrop,
    riskLevel: s.riskLevel,
  }));

  const overdueActions = (queues.overdueActions || []).map(a => ({
    id: a.id,
    title: a.title,
    zone_code: a.zone_code ?? undefined,
    category_code: a.category_code ?? undefined,
    owner_name: a.owner_name ?? undefined,
  }));

  const unownedCriticalActions = (queues.unownedCriticalActions || []).map(a => ({
    id: a.id,
    title: a.title,
    zone_code: a.zone_code ?? undefined,
    category_code: a.category_code ?? undefined,
  }));

  const operatorLoads = (govSummary?.operatorLoads || []).map(o => ({
    ownerName: o.ownerName,
    workloadScore: o.workloadScore,
    overdue: o.overdue,
  }));

  const rolloutAllowed = rollout ? !rollout.emergencyKillSwitch : true;
  const rolloutCeilingPercent = rollout?.effectiveRolloutPercent ?? 50;
  const emergencyKillSwitch = rollout?.emergencyKillSwitch ?? false;

  const interventions = computePriorityInterventions({
    governanceRiskZones,
    predictedDeclines,
    demandPressureSignals,
    partnerDecaySignals,
    overdueActions,
    unownedCriticalActions,
    snapshotAgeHours: freshness.ageHours,
    operatorLoads,
    rolloutAllowed,
    rolloutCeilingPercent,
    emergencyKillSwitch,
  });

  const allInterventions = [
    ...interventions.topInterventions,
    ...interventions.quickWins,
  ];
  const sequence = computeRecommendedSequence(allInterventions);

  const governanceBlockers = govSummary?.shiftReadiness.status === "NOT_READY"
    ? (govSummary.shiftReadiness.blockers || [])
    : [];

  const rolloutGuard = computeRolloutGuardAdvice({
    governanceBlockers,
    snapshotAgeHours: freshness.ageHours,
    highGovernanceRiskCount: governanceRiskZones.filter(z => z.level === "HIGH" || z.level === "CRITICAL").length,
    criticalDemandPressureCount: demandPressureSignals.filter(d => d.riskLevel === "critical").length,
    emergencyKillSwitch,
    currentRolloutCeiling: rolloutCeilingPercent,
  });

  const summary = computePrescriptiveSummary({
    interventions,
    sequence,
    rolloutGuard,
    snapshotAgeHours: freshness.ageHours,
  });

  return { interventions, sequence, rolloutGuard, summary };
}
