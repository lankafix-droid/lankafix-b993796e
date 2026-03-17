/**
 * Reminder Escalation Bridge — Converts reminder decisions to operator tasks.
 * When automated reminders exceed thresholds, creates human follow-up tasks.
 */

import type { CallbackTaskType } from "@/types/reminderJobs";
import type { ReminderState } from "@/lib/bookingReminderState";
import { insertCallbackTask } from "@/services/operatorTaskFactory";

interface EscalationMapping {
  reminderKey: string;
  taskType: CallbackTaskType;
  title: string;
  reasonTemplate: string;
  priority: "low" | "normal" | "high" | "urgent";
  dueInMinutes: number;
}

const ESCALATION_MAP: EscalationMapping[] = [
  {
    reminderKey: "quote_approval_pending",
    taskType: "call_customer",
    title: "Call customer about pending quote",
    reasonTemplate: "Quote approval reminder exceeded threshold — customer may need help deciding",
    priority: "high",
    dueInMinutes: 30,
  },
  {
    reminderKey: "technician_delayed",
    taskType: "follow_up_technician",
    title: "Follow up on technician delay",
    reasonTemplate: "Technician delayed repeatedly — customer waiting",
    priority: "high",
    dueInMinutes: 15,
  },
  {
    reminderKey: "no_technician_found",
    taskType: "senior_review_required",
    title: "No technician found — senior review",
    reasonTemplate: "No technician found after extended search — needs manual intervention",
    priority: "urgent",
    dueInMinutes: 15,
  },
  {
    reminderKey: "completion_confirmation_pending",
    taskType: "confirm_completion_issue",
    title: "Follow up on completion confirmation",
    reasonTemplate: "Completion not confirmed after multiple reminders — customer may have an issue",
    priority: "high",
    dueInMinutes: 60,
  },
  {
    reminderKey: "dispute_review_pending",
    taskType: "dispute_follow_up",
    title: "Dispute follow-up required",
    reasonTemplate: "Dispute under review — customer needs update",
    priority: "urgent",
    dueInMinutes: 30,
  },
  {
    reminderKey: "partner_not_responding",
    taskType: "follow_up_technician",
    title: "Technician not responding — follow up",
    reasonTemplate: "Partner not responding to dispatch offers",
    priority: "high",
    dueInMinutes: 10,
  },
  {
    reminderKey: "escalated_booking_update",
    taskType: "senior_review_required",
    title: "Escalated booking needs attention",
    reasonTemplate: "Escalated booking awaiting senior operator action",
    priority: "urgent",
    dueInMinutes: 30,
  },
];

/** Check if a reminder state should escalate to an operator task */
export function shouldEscalateToTask(state: ReminderState): boolean {
  return state.escalationRecommended && !state.suppressed;
}

/** Convert an escalated reminder into an operator callback task */
export async function escalateReminderToTask(
  bookingId: string,
  state: ReminderState
): Promise<void> {
  const mapping = ESCALATION_MAP.find(m => m.reminderKey === state.ruleKey);
  if (!mapping) return;

  await insertCallbackTask({
    bookingId,
    taskType: mapping.taskType,
    title: mapping.title,
    reason: mapping.reasonTemplate,
    priority: mapping.priority,
    dueInMinutes: mapping.dueInMinutes,
    reminderKey: state.ruleKey,
  });
}

/** Process all reminder states and escalate where needed */
export async function processEscalations(
  bookingId: string,
  states: ReminderState[]
): Promise<number> {
  let escalated = 0;
  for (const state of states) {
    if (shouldEscalateToTask(state)) {
      await escalateReminderToTask(bookingId, state);
      escalated++;
    }
  }
  return escalated;
}
