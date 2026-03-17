/**
 * Booking Reminder State — Reusable state model for reminders.
 * Computes reminder eligibility and overdue status.
 * Advisory only — does not send or trigger anything.
 */

import { type ReminderRule, getRulesForStage } from "./bookingReminderRules";

export interface ReminderState {
  ruleKey: string;
  title: string;
  audience: "customer" | "operator";
  eligible: boolean;
  overdue: boolean;
  suppressed: boolean;
  suppressReason: string | null;
  recommendedSendTime: Date | null;
  lastSentAt: Date | null;
  nextEligibleAt: Date | null;
  sendCount: number;
  escalationRecommended: boolean;
  reason: string;
}

export interface ReminderContext {
  stage: string;
  stageEnteredAt: string;
  lastSentTimes?: Record<string, string>;
  sendCounts?: Record<string, number>;
  activeConditions?: string[];
}

/** Compute reminder states for a booking */
export function computeReminderStates(ctx: ReminderContext): ReminderState[] {
  const rules = getRulesForStage(ctx.stage);
  const now = Date.now();
  const stageStart = new Date(ctx.stageEnteredAt).getTime();
  const elapsed = (now - stageStart) / 60_000;
  const conditions = ctx.activeConditions || [];

  return rules.map((rule) => {
    const sendCount = ctx.sendCounts?.[rule.key] || 0;
    const lastSentStr = ctx.lastSentTimes?.[rule.key];
    const lastSentAt = lastSentStr ? new Date(lastSentStr) : null;

    // Check suppression
    const suppressMatch = rule.suppressConditions.find(c => conditions.includes(c));
    if (suppressMatch) {
      return buildState(rule, {
        eligible: false,
        overdue: false,
        suppressed: true,
        suppressReason: suppressMatch,
        sendCount,
        lastSentAt,
        reason: `Suppressed: ${suppressMatch}`,
      });
    }

    // Max repeats exceeded
    if (sendCount >= rule.maxRepeats) {
      return buildState(rule, {
        eligible: false,
        overdue: false,
        suppressed: true,
        suppressReason: "max_repeats_reached",
        sendCount,
        lastSentAt,
        escalationRecommended: true,
        reason: "Maximum reminders sent — escalation recommended",
      });
    }

    // Not yet eligible
    if (sendCount === 0 && elapsed < rule.earliestSendMinutes) {
      const sendTime = new Date(stageStart + rule.earliestSendMinutes * 60_000);
      return buildState(rule, {
        eligible: false,
        overdue: false,
        suppressed: false,
        sendCount,
        lastSentAt,
        recommendedSendTime: sendTime,
        nextEligibleAt: sendTime,
        reason: `First reminder in ${Math.ceil(rule.earliestSendMinutes - elapsed)} minutes`,
      });
    }

    // Check repeat interval
    if (lastSentAt) {
      const sinceLast = (now - lastSentAt.getTime()) / 60_000;
      if (sinceLast < rule.repeatIntervalMinutes) {
        const nextAt = new Date(lastSentAt.getTime() + rule.repeatIntervalMinutes * 60_000);
        return buildState(rule, {
          eligible: false,
          overdue: false,
          suppressed: false,
          sendCount,
          lastSentAt,
          nextEligibleAt: nextAt,
          reason: `Cool-down: next in ${Math.ceil(rule.repeatIntervalMinutes - sinceLast)} minutes`,
        });
      }
    }

    // Eligible now
    const isOverdue = elapsed > rule.earliestSendMinutes * 2;
    const escalation = sendCount >= rule.escalationThreshold;

    return buildState(rule, {
      eligible: true,
      overdue: isOverdue,
      suppressed: false,
      sendCount,
      lastSentAt,
      recommendedSendTime: new Date(),
      escalationRecommended: escalation,
      reason: isOverdue ? "Overdue — immediate follow-up recommended" : "Ready to send",
    });
  });
}

function buildState(
  rule: ReminderRule,
  overrides: Partial<ReminderState>
): ReminderState {
  return {
    ruleKey: rule.key,
    title: rule.title,
    audience: rule.audience,
    eligible: false,
    overdue: false,
    suppressed: false,
    suppressReason: null,
    recommendedSendTime: null,
    lastSentAt: null,
    nextEligibleAt: null,
    sendCount: 0,
    escalationRecommended: false,
    reason: "",
    ...overrides,
  };
}

/** Get the highest-priority eligible reminder for customer */
export function getActiveCustomerReminder(ctx: ReminderContext): ReminderState | null {
  const states = computeReminderStates(ctx);
  return states.find(s => s.audience === "customer" && s.eligible) || null;
}

/** Get all operator-facing reminders */
export function getOperatorReminders(ctx: ReminderContext): ReminderState[] {
  return computeReminderStates(ctx).filter(s => s.audience === "operator");
}
