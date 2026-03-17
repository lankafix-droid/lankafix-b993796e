/**
 * Notification Orchestrator — Future-ready decision layer.
 * Determines channel, timing, and suppression for notifications.
 * Does NOT deliver messages. Logic layer only.
 */

export type NotificationChannel = "in_app" | "push" | "whatsapp" | "sms" | "operator_task";

export interface NotificationDecision {
  shouldSend: boolean;
  channel: NotificationChannel;
  reason: string;
  suppressedBy?: string;
  preferHumanFollowUp: boolean;
  priority: number;
}

export interface OrchestrationContext {
  reminderKey: string;
  audience: "customer" | "operator";
  sendCount: number;
  lastActivityAt?: string | null;
  hasActiveDispute: boolean;
  hasActiveSupportCase: boolean;
  isEscalated: boolean;
  operatorContactedRecently: boolean;
  bookingStage: string;
}

/** Communication priority rules (Phase 11) */
const PRIORITY_OVERRIDES: Record<string, number> = {
  dispute_review_pending: 1,
  escalated_booking_update: 2,
  quote_approval_pending: 3,
  completion_confirmation_pending: 4,
  technician_delayed: 3,
  no_technician_found: 4,
  partner_not_responding: 2,
  rating_pending: 6,
  abandoned_booking: 7,
};

/** Decide whether and how to send a notification */
export function orchestrate(ctx: OrchestrationContext): NotificationDecision {
  const priority = PRIORITY_OVERRIDES[ctx.reminderKey] ?? 5;

  // Rule 1: Human support / dispute messaging overrides reminders
  if (ctx.hasActiveDispute && !["dispute_review_pending"].includes(ctx.reminderKey)) {
    return {
      shouldSend: false,
      channel: "in_app",
      reason: "Active dispute — suppressing non-dispute reminders",
      suppressedBy: "active_dispute",
      preferHumanFollowUp: true,
      priority,
    };
  }

  // Rule 2: Escalation messaging overrides generic waiting
  if (ctx.isEscalated && !["escalated_booking_update", "dispute_review_pending"].includes(ctx.reminderKey)) {
    return {
      shouldSend: false,
      channel: "in_app",
      reason: "Escalated booking — only escalation reminders active",
      suppressedBy: "escalation_active",
      preferHumanFollowUp: true,
      priority,
    };
  }

  // Rule 3: Operator recently contacted — prefer human follow-up
  if (ctx.operatorContactedRecently && ctx.audience === "customer") {
    return {
      shouldSend: false,
      channel: "in_app",
      reason: "Operator recently contacted customer — awaiting response",
      suppressedBy: "operator_contacted",
      preferHumanFollowUp: false,
      priority,
    };
  }

  // Rule 4: Recent customer activity — suppress for cooldown
  if (ctx.lastActivityAt) {
    const sinceActivity = (Date.now() - new Date(ctx.lastActivityAt).getTime()) / 60_000;
    if (sinceActivity < 10) {
      return {
        shouldSend: false,
        channel: "in_app",
        reason: "Customer recently active — suppressing for cooldown",
        suppressedBy: "recent_activity",
        preferHumanFollowUp: false,
        priority,
      };
    }
  }

  // Choose channel based on audience and send count
  const channel = selectChannel(ctx);

  // After multiple sends, prefer human follow-up
  const preferHuman = ctx.sendCount >= 2;

  return {
    shouldSend: true,
    channel,
    reason: preferHuman ? "Multiple reminders sent — human follow-up recommended" : "Ready to send",
    preferHumanFollowUp: preferHuman,
    priority,
  };
}

function selectChannel(ctx: OrchestrationContext): NotificationChannel {
  if (ctx.audience === "operator") return "operator_task";

  // Progressive channel escalation
  if (ctx.sendCount === 0) return "in_app";
  if (ctx.sendCount === 1) return "push";
  if (ctx.sendCount >= 2) return "whatsapp";

  return "in_app";
}

/** Check if any notification should be suppressed due to active support */
export function shouldSuppressAll(ctx: { hasActiveDispute: boolean; hasActiveSupportCase: boolean }): boolean {
  return ctx.hasActiveDispute && ctx.hasActiveSupportCase;
}
