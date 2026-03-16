/**
 * Prescriptive Intervention Workbench Read Model
 * Composes existing read models + workbench engine.
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
} from "@/engines/prescriptiveInterventionWorkbenchEngine";
import type { PrescriptiveIntervention } from "@/engines/prescriptiveInterventionWorkbenchEngine";
import {
  createOperatorAction,
  fetchOperatorActions,
  type CreateActionInput,
  type OperatorActionType,
} from "@/services/operatorActionsService";

export interface WorkbenchFullSummary {
  interventions: PriorityInterventionsResult;
  sequence: InterventionSequence;
  rolloutGuard: RolloutGuardAdvice;
  summary: PrescriptiveSummary;
}

export async function fetchPrescriptiveInterventionWorkbench(): Promise<WorkbenchFullSummary> {
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

// ── Create advisory operator action from intervention ──

const ACTION_TYPE_MAP: Record<string, OperatorActionType> = {
  assign_owner: "followup_task_created",
  review_hotspot: "hotspot_review_requested",
  defer_rollout: "rollout_decision_logged",
  protect_zone: "hotspot_acknowledged",
  refresh_snapshot: "snapshot_refresh_requested",
  rebalance_operator_load: "followup_task_created",
  review_partner_decay: "hotspot_review_requested",
  review_demand_pressure: "hotspot_review_requested",
  clear_overdue_queue: "followup_task_created",
  pilot_candidate: "rollout_candidate_review",
};

export async function createInterventionOperatorAction(
  intervention: PrescriptiveIntervention
): Promise<{ success: boolean; message: string }> {
  try {
    // Check for existing active action with same scope to avoid duplicates
    const existing = await fetchOperatorActions({
      status: ["open", "acknowledged", "in_review"],
    });

    const duplicate = existing.find(a => {
      if (intervention.zoneId && a.source_zone_id !== intervention.zoneId) return false;
      if (intervention.categoryCode && a.source_category_code !== intervention.categoryCode) return false;
      if (a.action_title === intervention.title) return true;
      return false;
    });

    if (duplicate) {
      return { success: false, message: "An active action already exists for this scope." };
    }

    const actionType = ACTION_TYPE_MAP[intervention.actionType] || "followup_task_created";

    const input: CreateActionInput = {
      action_type: actionType,
      action_title: intervention.title,
      source_context: "manual",
      source_zone_id: intervention.zoneId || null,
      source_category_code: intervention.categoryCode || null,
      source_severity: intervention.urgency === "critical" ? "CRITICAL" : intervention.urgency === "high" ? "HIGH" : "MODERATE",
      priority: intervention.urgency === "critical" ? "critical" : intervention.urgency === "high" ? "high" : "medium",
      note: intervention.recommendation,
      decision_summary: `Prescriptive workbench: ${intervention.reason.join("; ")}`,
      metadata: {
        source: "prescriptive_intervention_workbench",
        interventionId: intervention.id,
        actionType: intervention.actionType,
        priorityScore: intervention.priorityScore,
        confidence: intervention.confidence,
        estimatedImpact: intervention.estimatedImpact,
        estimatedEffort: intervention.estimatedEffort,
      },
    };

    await createOperatorAction(input);
    return { success: true, message: "Operator action created successfully." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to create action." };
  }
}
