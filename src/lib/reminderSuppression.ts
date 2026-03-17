/**
 * Reminder Suppression / Cool-Down Logic
 * Ensures LankaFix never feels spammy.
 * Advisory only — does not modify state.
 */

export interface SuppressionContext {
  reminderKey: string;
  lastSentAt?: string | null;
  customerLastActiveAt?: string | null;
  bookingCurrentStage: string;
  bookingPreviousStage?: string | null;
  disputeOpen: boolean;
  supportCaseOpen: boolean;
  operatorMarkedContacted: boolean;
  customerActed: boolean;
}

export interface SuppressionResult {
  suppressed: boolean;
  reason: string;
}

/** Default cool-down window in minutes */
const COOL_DOWN_MINUTES = 30;

/** Evaluate whether a reminder should be suppressed */
export function evaluateSuppression(ctx: SuppressionContext): SuppressionResult {
  // Rule 1: No duplicate inside cool-down window
  if (ctx.lastSentAt) {
    const elapsed = (Date.now() - new Date(ctx.lastSentAt).getTime()) / 60_000;
    if (elapsed < COOL_DOWN_MINUTES) {
      return { suppressed: true, reason: `Cool-down active (${Math.ceil(COOL_DOWN_MINUTES - elapsed)}m remaining)` };
    }
  }

  // Rule 2: Customer already acted
  if (ctx.customerActed) {
    return { suppressed: true, reason: "Customer has already taken action" };
  }

  // Rule 3: Booking moved to a new stage
  if (ctx.bookingPreviousStage && ctx.bookingCurrentStage !== ctx.bookingPreviousStage) {
    return { suppressed: true, reason: "Booking has progressed to a new stage" };
  }

  // Rule 4: Support or dispute already open
  if (ctx.disputeOpen) {
    return { suppressed: true, reason: "Active dispute — reminders paused" };
  }
  if (ctx.supportCaseOpen) {
    return { suppressed: true, reason: "Support case open — reminders paused" };
  }

  // Rule 5: Operator manually marked "customer contacted"
  if (ctx.operatorMarkedContacted) {
    return { suppressed: true, reason: "Operator has contacted the customer directly" };
  }

  // Rule 6: Customer recently active (within 15 min)
  if (ctx.customerLastActiveAt) {
    const sinceActive = (Date.now() - new Date(ctx.customerLastActiveAt).getTime()) / 60_000;
    if (sinceActive < 15) {
      return { suppressed: true, reason: "Customer recently active on the platform" };
    }
  }

  return { suppressed: false, reason: "No suppression conditions met" };
}

/** Check if a batch of reminders should all be suppressed */
export function shouldSuppressBatch(ctx: {
  disputeOpen: boolean;
  supportCaseOpen: boolean;
  operatorMarkedContacted: boolean;
}): boolean {
  return ctx.disputeOpen || (ctx.supportCaseOpen && ctx.operatorMarkedContacted);
}
