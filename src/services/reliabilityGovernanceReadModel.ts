/**
 * Reliability Governance Read Model — V4
 * Fetches data from existing services and runs through governance automation engine.
 * Read-only. Advisory-only.
 */

import {
  fetchOperatorActions,
  fetchDailySummary,
  fetchResolvedHistory,
  type OperatorAction,
} from "@/services/operatorActionsService";
import {
  fetchLiveEnterpriseSummary,
  fetchReliabilityRolloutSummary,
  fetch30DaySnapshots,
  computeSnapshotFreshness,
} from "@/services/reliabilityReadModel";
import {
  computeOverdueActions,
  computeDueFollowUps,
  computeUnownedCriticalActions,
  computeShiftReadiness,
  computeGovernanceDigest,
  computeOperatorLoad,
  computeGovernanceRecommendations,
  computeAutomationCandidates,
  type GovernanceAction,
  type ShiftNote,
  type GovernanceDigest,
  type ShiftReadiness,
  type GovernanceRecommendation,
  type AutomationCandidate,
  type OperatorLoad,
} from "@/engines/reliabilityGovernanceAutomationEngine";

const SHIFT_NOTE_KEY = "lankafix_shift_handover_note";

function loadShiftNote(): ShiftNote | null {
  try {
    const raw = localStorage.getItem(SHIFT_NOTE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function toGovernanceActions(actions: OperatorAction[]): GovernanceAction[] {
  return actions as GovernanceAction[];
}

export interface GovernanceAutomationSummary {
  digest: GovernanceDigest;
  shiftReadiness: ShiftReadiness;
  recommendations: GovernanceRecommendation[];
  automationCandidates: AutomationCandidate[];
  operatorLoads: OperatorLoad[];
  snapshotFreshness: string;
  snapshotAgeHours: number;
}

export async function fetchGovernanceAutomationSummary(): Promise<GovernanceAutomationSummary> {
  const [allActive, summary, snapshots] = await Promise.all([
    fetchOperatorActions({ status: ["open", "acknowledged", "in_review", "waiting"] }),
    fetchDailySummary(),
    fetch30DaySnapshots(),
  ]);

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const freshness = computeSnapshotFreshness(latest?.created_at || null);
  const shiftNote = loadShiftNote();
  const govActions = toGovernanceActions(allActive);

  const digest = computeGovernanceDigest(govActions, summary);
  const shiftReadiness = computeShiftReadiness(govActions, shiftNote, summary);
  const recommendations = computeGovernanceRecommendations(govActions, shiftNote, freshness.freshness);
  const automationCandidates = computeAutomationCandidates(govActions);
  const operatorLoads = computeOperatorLoad(govActions);

  return {
    digest,
    shiftReadiness,
    recommendations,
    automationCandidates,
    operatorLoads,
    snapshotFreshness: freshness.freshness,
    snapshotAgeHours: freshness.ageHours,
  };
}

export interface OperatorLeaderboardEntry extends OperatorLoad {}

export async function fetchOperatorLeaderboard(): Promise<OperatorLeaderboardEntry[]> {
  const allActions = await fetchOperatorActions({});
  return computeOperatorLoad(toGovernanceActions(allActions));
}

export interface GovernanceAttentionQueues {
  overdueActions: OperatorAction[];
  dueFollowUps: OperatorAction[];
  unownedCriticalActions: OperatorAction[];
}

export async function fetchGovernanceAttentionQueues(): Promise<GovernanceAttentionQueues> {
  const allActive = await fetchOperatorActions({ status: ["open", "acknowledged", "in_review", "waiting"] });
  const govActions = toGovernanceActions(allActive);
  return {
    overdueActions: computeOverdueActions(govActions) as unknown as OperatorAction[],
    dueFollowUps: computeDueFollowUps(govActions) as unknown as OperatorAction[],
    unownedCriticalActions: computeUnownedCriticalActions(govActions) as unknown as OperatorAction[],
  };
}
