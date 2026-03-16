/**
 * Reliability Governance Read Model — V5
 * Fetches data from existing services and runs through governance automation engine.
 * Read-only except for explicit operator quick actions.
 * Advisory-only. No marketplace mutation.
 */

import {
  fetchOperatorActions,
  fetchDailySummary,
  fetchResolvedHistory,
  createOperatorAction,
  updateOperatorAction,
  type OperatorAction,
  type CreateActionInput,
} from "@/services/operatorActionsService";
import {
  fetchLiveEnterpriseSummary,
  fetchReliabilityRolloutSummary,
  fetch30DaySnapshots,
  computeSnapshotFreshness,
  type EnterpriseReliabilitySummary,
  type ReliabilityRolloutSummary,
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
  enterprise: EnterpriseReliabilitySummary | null;
  rollout: ReliabilityRolloutSummary | null;
  shiftNote: ShiftNote | null;
}

export async function fetchGovernanceAutomationSummary(): Promise<GovernanceAutomationSummary> {
  const [allActive, summary, snapshots, enterprise, rollout] = await Promise.all([
    fetchOperatorActions({ status: ["open", "acknowledged", "in_review", "waiting"] }),
    fetchDailySummary(),
    fetch30DaySnapshots(),
    fetchLiveEnterpriseSummary().catch(() => null),
    fetchReliabilityRolloutSummary().catch(() => null),
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
    enterprise,
    rollout,
    shiftNote,
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

/** Create a governance quick action — only creates operator action records */
export async function createGovernanceQuickAction(input: CreateActionInput): Promise<OperatorAction | null> {
  return createOperatorAction(input);
}

/** Append a governance note to an existing operator action */
export async function appendGovernanceNote(actionId: string, note: string): Promise<void> {
  await updateOperatorAction(actionId, { note });
}
