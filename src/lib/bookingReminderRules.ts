/**
 * Booking Reminder Rules — Advisory-only reminder engine.
 * Determines when follow-ups are needed for bookings.
 * Does NOT send reminders. Logic layer only.
 */

export type ReminderAudience = "customer" | "operator";

export interface ReminderRule {
  key: string;
  title: string;
  audience: ReminderAudience;
  /** Booking statuses / stages that trigger this reminder */
  triggerStages: string[];
  /** Minutes after stage entry before first reminder is eligible */
  earliestSendMinutes: number;
  /** Minutes between repeat reminders */
  repeatIntervalMinutes: number;
  /** Max number of reminders before escalation */
  maxRepeats: number;
  /** After this many repeats, recommend escalation */
  escalationThreshold: number;
  /** Conditions that suppress this reminder */
  suppressConditions: string[];
  /** Priority: 1 = highest */
  priority: number;
}

export const REMINDER_RULES: ReminderRule[] = [
  {
    key: "quote_approval_pending",
    title: "Quote Awaiting Your Approval",
    audience: "customer",
    triggerStages: ["awaiting_quote_approval", "quote_ready"],
    earliestSendMinutes: 30,
    repeatIntervalMinutes: 120,
    maxRepeats: 3,
    escalationThreshold: 2,
    suppressConditions: ["customer_recently_active", "dispute_open", "support_open"],
    priority: 1,
  },
  {
    key: "completion_confirmation_pending",
    title: "Please Confirm Service Completion",
    audience: "customer",
    triggerStages: ["awaiting_completion_confirmation"],
    earliestSendMinutes: 60,
    repeatIntervalMinutes: 240,
    maxRepeats: 3,
    escalationThreshold: 2,
    suppressConditions: ["customer_recently_active", "dispute_open"],
    priority: 2,
  },
  {
    key: "technician_delayed",
    title: "Technician Running Late",
    audience: "customer",
    triggerStages: ["en_route"],
    earliestSendMinutes: 15,
    repeatIntervalMinutes: 30,
    maxRepeats: 4,
    escalationThreshold: 3,
    suppressConditions: ["technician_arrived"],
    priority: 1,
  },
  {
    key: "no_technician_found",
    title: "Still Searching for Technician",
    audience: "customer",
    triggerStages: ["awaiting_partner_selection", "awaiting_partner_response"],
    earliestSendMinutes: 20,
    repeatIntervalMinutes: 30,
    maxRepeats: 4,
    escalationThreshold: 2,
    suppressConditions: ["partner_assigned", "escalated"],
    priority: 2,
  },
  {
    key: "partner_not_responding",
    title: "Technician Not Responding",
    audience: "operator",
    triggerStages: ["awaiting_partner_response"],
    earliestSendMinutes: 10,
    repeatIntervalMinutes: 15,
    maxRepeats: 3,
    escalationThreshold: 2,
    suppressConditions: ["partner_responded", "escalated"],
    priority: 1,
  },
  {
    key: "escalated_booking_update",
    title: "Escalated Booking Needs Attention",
    audience: "operator",
    triggerStages: ["escalated"],
    earliestSendMinutes: 30,
    repeatIntervalMinutes: 60,
    maxRepeats: 5,
    escalationThreshold: 3,
    suppressConditions: ["resolved", "dispute_open"],
    priority: 1,
  },
  {
    key: "dispute_review_pending",
    title: "Dispute Under Review",
    audience: "customer",
    triggerStages: ["dispute_opened"],
    earliestSendMinutes: 120,
    repeatIntervalMinutes: 240,
    maxRepeats: 2,
    escalationThreshold: 2,
    suppressConditions: ["dispute_resolved", "operator_contacted"],
    priority: 3,
  },
  {
    key: "abandoned_booking",
    title: "Continue Your Booking",
    audience: "customer",
    triggerStages: ["booking_submitted"],
    earliestSendMinutes: 60,
    repeatIntervalMinutes: 1440,
    maxRepeats: 2,
    escalationThreshold: 2,
    suppressConditions: ["booking_progressed", "cancelled"],
    priority: 4,
  },
  {
    key: "rating_pending",
    title: "Rate Your Experience",
    audience: "customer",
    triggerStages: ["completed"],
    earliestSendMinutes: 120,
    repeatIntervalMinutes: 1440,
    maxRepeats: 2,
    escalationThreshold: 3,
    suppressConditions: ["already_rated", "dispute_open"],
    priority: 5,
  },
];

/** Get applicable reminder rules for a given stage */
export function getRulesForStage(stage: string): ReminderRule[] {
  return REMINDER_RULES
    .filter(r => r.triggerStages.includes(stage))
    .sort((a, b) => a.priority - b.priority);
}

/** Get a specific reminder rule by key */
export function getReminderRule(key: string): ReminderRule | null {
  return REMINDER_RULES.find(r => r.key === key) || null;
}
