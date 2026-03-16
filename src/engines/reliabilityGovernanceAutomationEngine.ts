/**
 * Reliability Governance Automation Engine — V4
 * Pure deterministic functions. No React, no Supabase, no side effects.
 * Advisory-only: generates recommendations, never executes marketplace changes.
 */

import type { AgingInfo, FollowUpInfo } from "@/utils/operatorAgingUtils";
import { computeAging, computeFollowUp } from "@/utils/operatorAgingUtils";

// ── Types ──

export interface GovernanceAction {
  id: string;
  created_at: string;
  updated_at: string;
  action_type: string;
  action_title: string;
  status: string;
  priority: string;
  owner_name: string | null;
  owner_role: string | null;
  note: string;
  decision_summary: string | null;
  resolved_at: string | null;
  source_zone_id: string | null;
  source_category_code: string | null;
  metadata: any;
}

export interface ShiftNote {
  note: string;
  operator: string;
  timestamp: string;
}

export interface DailySummary {
  open: number;
  critical: number;
  inReview: number;
  resolvedToday: number;
  decisionsToday: number;
}

export type AttentionLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface ShiftReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  recommendation: string;
}

export interface GovernanceDigest {
  overdueCount: number;
  dueTodayCount: number;
  unownedCriticalCount: number;
  blockedRolloutItems: number;
  recommendedAttentionLevel: AttentionLevel;
  digestLines: string[];
}

export interface OperatorLoad {
  ownerName: string;
  totalActive: number;
  overdue: number;
  critical: number;
  followupsDue: number;
  resolvedToday: number;
  workloadScore: number;
}

export interface GovernanceRecommendation {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export interface AutomationCandidate {
  actionId: string;
  actionTitle: string;
  suggestion: string;
  reason: string;
}

// ── Helpers ──

const ACTIVE_STATUSES = ["open", "acknowledged", "in_review", "waiting"];

function isActive(a: GovernanceAction): boolean {
  return ACTIVE_STATUSES.includes(a.status);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── Engine Functions ──

/** 1. Return all active actions that are overdue or critical based on aging rules */
export function computeOverdueActions(actions: GovernanceAction[], now?: number): GovernanceAction[] {
  return actions.filter(a => {
    if (!isActive(a)) return false;
    const aging = computeAging(a.status, a.created_at);
    return aging.level === "overdue" || aging.level === "critical";
  });
}

/** 2. Return actions where follow-up is today or overdue */
export function computeDueFollowUps(actions: GovernanceAction[]): GovernanceAction[] {
  return actions.filter(a => {
    if (!isActive(a)) return false;
    const fu = computeFollowUp(a.metadata);
    return fu != null && (fu.level === "today" || fu.level === "overdue");
  });
}

/** 3. Return active critical/high priority actions with no owner */
export function computeUnownedCriticalActions(actions: GovernanceAction[]): GovernanceAction[] {
  return actions.filter(a =>
    isActive(a) &&
    !a.owner_name &&
    (a.priority === "critical" || a.priority === "high")
  );
}

/** 4. Compute shift readiness */
export function computeShiftReadiness(
  actions: GovernanceAction[],
  latestShiftNote: ShiftNote | null,
  summary: DailySummary | null,
): ShiftReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const unownedCritical = computeUnownedCriticalActions(actions);
  if (unownedCritical.length > 0) {
    blockers.push(`${unownedCritical.length} critical/high priority action(s) have no owner`);
  }

  const overdue = computeOverdueActions(actions);
  if (overdue.length >= 5) {
    blockers.push(`${overdue.length} overdue actions require attention`);
  } else if (overdue.length > 0) {
    warnings.push(`${overdue.length} overdue action(s) present`);
  }

  if (!latestShiftNote) {
    warnings.push("No shift handover note has been recorded");
  }

  const dueFollowUps = computeDueFollowUps(actions);
  if (dueFollowUps.length >= 3) {
    warnings.push(`${dueFollowUps.length} follow-ups due today`);
  }

  const ready = blockers.length === 0;
  let recommendation: string;
  if (blockers.length > 0) {
    recommendation = "Resolve blockers before proceeding with operational tasks";
  } else if (warnings.length > 0) {
    recommendation = "Address warnings to maintain operational readiness";
  } else {
    recommendation = "Shift is ready for normal operations";
  }

  return { ready, blockers, warnings, recommendation };
}

/** 5. Compute governance digest */
export function computeGovernanceDigest(
  actions: GovernanceAction[],
  summary: DailySummary | null,
): GovernanceDigest {
  const overdue = computeOverdueActions(actions);
  const dueToday = computeDueFollowUps(actions);
  const unownedCritical = computeUnownedCriticalActions(actions);
  const blockedRollout = actions.filter(a =>
    isActive(a) && a.action_type === "blocked_item_escalation"
  ).length;

  const overdueCount = overdue.length;
  const dueTodayCount = dueToday.length;
  const unownedCriticalCount = unownedCritical.length;

  let recommendedAttentionLevel: AttentionLevel = "LOW";
  if (unownedCriticalCount > 0 || overdueCount >= 5) {
    recommendedAttentionLevel = "CRITICAL";
  } else if (overdueCount >= 3 || blockedRollout >= 2) {
    recommendedAttentionLevel = "HIGH";
  } else if (overdueCount > 0 || dueTodayCount > 0) {
    recommendedAttentionLevel = "MODERATE";
  }

  const digestLines: string[] = [];
  if (overdueCount > 0) digestLines.push(`${overdueCount} action(s) are overdue and need attention`);
  if (dueTodayCount > 0) digestLines.push(`${dueTodayCount} follow-up(s) are due today`);
  if (unownedCriticalCount > 0) digestLines.push(`${unownedCriticalCount} critical action(s) have no owner assigned`);
  if (blockedRollout > 0) digestLines.push(`${blockedRollout} blocked rollout item(s) require resolution`);
  if (summary) {
    if (summary.resolvedToday > 0) digestLines.push(`${summary.resolvedToday} action(s) resolved today`);
    if (summary.decisionsToday > 0) digestLines.push(`${summary.decisionsToday} decision(s) logged today`);
  }
  if (digestLines.length === 0) digestLines.push("All governance indicators are within normal range");

  return { overdueCount, dueTodayCount, unownedCriticalCount, blockedRolloutItems: blockedRollout, recommendedAttentionLevel, digestLines };
}

/** 6. Compute per-operator load */
export function computeOperatorLoad(actions: GovernanceAction[]): OperatorLoad[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const ownerMap = new Map<string, GovernanceAction[]>();
  for (const a of actions) {
    const name = a.owner_name || "Unassigned";
    if (!ownerMap.has(name)) ownerMap.set(name, []);
    ownerMap.get(name)!.push(a);
  }

  const results: OperatorLoad[] = [];
  for (const [ownerName, owned] of ownerMap) {
    const active = owned.filter(isActive);
    const overdue = active.filter(a => {
      const aging = computeAging(a.status, a.created_at);
      return aging.level === "overdue" || aging.level === "critical";
    }).length;
    const critical = active.filter(a => a.priority === "critical").length;
    const followupsDue = active.filter(a => {
      const fu = computeFollowUp(a.metadata);
      return fu != null && (fu.level === "today" || fu.level === "overdue");
    }).length;
    const resolvedToday = owned.filter(a =>
      a.status === "resolved" && a.resolved_at && a.resolved_at >= todayISO
    ).length;

    // Workload score: 0-100. Higher = more loaded.
    const workloadScore = clamp(
      active.length * 10 + overdue * 15 + critical * 20 + followupsDue * 5 - resolvedToday * 5,
      0, 100
    );

    results.push({ ownerName, totalActive: active.length, overdue, critical, followupsDue, resolvedToday, workloadScore });
  }

  return results.sort((a, b) => b.workloadScore - a.workloadScore);
}

/** 7. Compute governance recommendations */
export function computeGovernanceRecommendations(
  actions: GovernanceAction[],
  shiftNote: ShiftNote | null,
  snapshotFreshness?: string,
): GovernanceRecommendation[] {
  const recs: GovernanceRecommendation[] = [];
  let id = 0;

  const unowned = computeUnownedCriticalActions(actions);
  if (unowned.length > 0) {
    recs.push({
      id: String(++id),
      severity: "critical",
      title: "Assign owners to critical actions",
      description: `${unowned.length} critical/high priority action(s) have no owner. Assign operators to ensure accountability.`,
    });
  }

  if (snapshotFreshness === "stale" || snapshotFreshness === "expired") {
    recs.push({
      id: String(++id),
      severity: "warning",
      title: "Refresh stale reliability snapshot",
      description: "The latest reliability snapshot is outdated. Refresh to ensure governance decisions use current data.",
    });
  }

  const overdue = computeOverdueActions(actions);
  if (overdue.length > 0) {
    recs.push({
      id: String(++id),
      severity: overdue.length >= 5 ? "critical" : "warning",
      title: "Resolve overdue reviews before rollout discussion",
      description: `${overdue.length} overdue action(s) should be resolved before considering pilot expansion.`,
    });
  }

  if (!shiftNote) {
    recs.push({
      id: String(++id),
      severity: "info",
      title: "Complete shift handover note",
      description: "Record a shift handover note to ensure continuity between operator shifts.",
    });
  }

  const blocked = actions.filter(a => isActive(a) && a.action_type === "blocked_item_escalation");
  if (blocked.length > 0) {
    recs.push({
      id: String(++id),
      severity: "warning",
      title: "Clear blocked queue before pilot expansion",
      description: `${blocked.length} blocked item(s) require resolution before considering expansion.`,
    });
  }

  return recs;
}

/** 8. Compute advisory automation candidates (suggestions only) */
export function computeAutomationCandidates(actions: GovernanceAction[]): AutomationCandidate[] {
  const candidates: AutomationCandidate[] = [];

  for (const a of actions) {
    if (!isActive(a)) continue;

    const aging = computeAging(a.status, a.created_at);

    // Suggest reminding owner for overdue items with an owner
    if ((aging.level === "overdue" || aging.level === "critical") && a.owner_name) {
      candidates.push({
        actionId: a.id,
        actionTitle: a.action_title,
        suggestion: "Remind owner",
        reason: `Action is ${aging.ageLabel} and assigned to ${a.owner_name}`,
      });
    }

    // Suggest escalation for critical items with no recent note
    if (aging.level === "critical" && a.priority !== "critical") {
      candidates.push({
        actionId: a.id,
        actionTitle: a.action_title,
        suggestion: "Escalate stale action",
        reason: `Action has been open for ${aging.ageLabel} without reaching critical priority`,
      });
    }

    // Suggest follow-up review for due items
    const fu = computeFollowUp(a.metadata);
    if (fu && fu.level === "today") {
      candidates.push({
        actionId: a.id,
        actionTitle: a.action_title,
        suggestion: "Review follow-up today",
        reason: `Follow-up scheduled for today`,
      });
    }

    // Suggest management review for unowned critical
    if (!a.owner_name && a.priority === "critical") {
      candidates.push({
        actionId: a.id,
        actionTitle: a.action_title,
        suggestion: "Management review suggested",
        reason: "Critical action has no owner assigned",
      });
    }
  }

  return candidates;
}
