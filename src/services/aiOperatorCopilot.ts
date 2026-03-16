/**
 * AI Operator Copilot
 * Provides internal AI suggestions for operators.
 * Advisory only — never auto-executes.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";

export interface OperatorSuggestion {
  id: string;
  type: "assign_owner" | "follow_up" | "refresh_snapshot" | "review_partner" | "escalate" | "rebalance_workload";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: AIConfidenceEnvelope;
  actionLabel: string;
  targetRoute?: string;
}

interface OperatorContext {
  overdueActions: number;
  unownedCritical: number;
  snapshotAgeHours: number;
  partnerFlagCount: number;
  operatorWorkloadScore: number;
  pendingEscalations: number;
}

/** Generate operator suggestions based on current context */
export function generateOperatorSuggestions(ctx: OperatorContext): OperatorSuggestion[] {
  const suggestions: OperatorSuggestion[] = [];

  if (ctx.unownedCritical > 0) {
    suggestions.push({
      id: "assign_unowned",
      type: "assign_owner",
      title: `${ctx.unownedCritical} critical actions need owners`,
      description: "Assign operators to unowned critical governance actions immediately.",
      priority: "critical",
      confidence: createConfidenceEnvelope(95, ["unowned_critical"]),
      actionLabel: "Assign Owners",
      targetRoute: "/ops/action-center",
    });
  }

  if (ctx.overdueActions > 3) {
    suggestions.push({
      id: "follow_up_overdue",
      type: "follow_up",
      title: `${ctx.overdueActions} overdue actions`,
      description: "Follow up on overdue governance actions to prevent drift.",
      priority: "high",
      confidence: createConfidenceEnvelope(85, ["overdue_actions"]),
      actionLabel: "Review Overdue",
      targetRoute: "/ops/operations-board",
    });
  }

  if (ctx.snapshotAgeHours > 6) {
    suggestions.push({
      id: "refresh_snapshot",
      type: "refresh_snapshot",
      title: "Snapshot is stale",
      description: `Data is ${Math.round(ctx.snapshotAgeHours)}h old. Refresh for accurate decisions.`,
      priority: ctx.snapshotAgeHours > 12 ? "high" : "medium",
      confidence: createConfidenceEnvelope(90, ["stale_snapshot"]),
      actionLabel: "Refresh Data",
    });
  }

  if (ctx.partnerFlagCount > 0) {
    suggestions.push({
      id: "review_flagged",
      type: "review_partner",
      title: `${ctx.partnerFlagCount} partners flagged for review`,
      description: "Review quality flags and take appropriate advisory action.",
      priority: "medium",
      confidence: createConfidenceEnvelope(70, ["partner_flags"]),
      actionLabel: "Review Partners",
    });
  }

  if (ctx.operatorWorkloadScore > 80) {
    suggestions.push({
      id: "rebalance_workload",
      type: "rebalance_workload",
      title: "Operator workload elevated",
      description: "Consider redistributing actions across the team.",
      priority: "medium",
      confidence: createConfidenceEnvelope(65, ["high_workload"]),
      actionLabel: "View Workload",
      targetRoute: "/ops/operations-board",
    });
  }

  if (ctx.pendingEscalations > 0) {
    suggestions.push({
      id: "handle_escalations",
      type: "escalate",
      title: `${ctx.pendingEscalations} pending escalations`,
      description: "Handle escalated issues before they impact customers.",
      priority: "high",
      confidence: createConfidenceEnvelope(88, ["pending_escalations"]),
      actionLabel: "Handle Escalations",
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
