/**
 * Customer Recovery Signals — Soft recovery for incomplete journeys.
 * Advisory recommendations only. Does not trigger actions.
 */

export type RecoveryScenario =
  | "booking_draft_abandoned"
  | "quote_approval_ignored"
  | "tracker_opened_repeatedly"
  | "completion_not_confirmed"
  | "rating_not_submitted";

export interface RecoverySignal {
  scenario: RecoveryScenario;
  detected: boolean;
  recommendation: "gentle_reminder" | "show_support_cta" | "escalate_to_human" | "suppress";
  reason: string;
  suggestedMessage: string;
  priority: number;
}

export interface RecoveryContext {
  bookingStage: string;
  stageEnteredAt: string;
  trackerOpenCount?: number;
  lastTrackerOpenAt?: string | null;
  customerLastActiveAt?: string | null;
  hasRated: boolean;
  quoteApproved: boolean;
  completionConfirmed: boolean;
  disputeOpen: boolean;
}

/** Analyze a booking for recovery signals */
export function analyzeRecoverySignals(ctx: RecoveryContext): RecoverySignal[] {
  const signals: RecoverySignal[] = [];
  const now = Date.now();
  const stageAge = (now - new Date(ctx.stageEnteredAt).getTime()) / 60_000;
  const recentlyActive = ctx.customerLastActiveAt
    ? (now - new Date(ctx.customerLastActiveAt).getTime()) / 60_000 < 30
    : false;

  // Booking draft abandoned
  if (ctx.bookingStage === "booking_submitted" && stageAge > 120) {
    signals.push({
      scenario: "booking_draft_abandoned",
      detected: true,
      recommendation: recentlyActive ? "suppress" : stageAge > 1440 ? "escalate_to_human" : "gentle_reminder",
      reason: stageAge > 1440
        ? "Booking submitted over 24 hours ago with no progress"
        : "Booking submitted over 2 hours ago with no progress",
      suggestedMessage: "You started a service request — ready to continue?",
      priority: 4,
    });
  }

  // Quote approval ignored
  if (["awaiting_quote_approval", "quote_ready"].includes(ctx.bookingStage) && !ctx.quoteApproved && stageAge > 60) {
    signals.push({
      scenario: "quote_approval_ignored",
      detected: true,
      recommendation: recentlyActive ? "suppress" : stageAge > 480 ? "escalate_to_human" : "gentle_reminder",
      reason: "Quote has been waiting for approval",
      suggestedMessage: "Your quote is ready for review. Take your time — nothing proceeds without your approval.",
      priority: 2,
    });
  }

  // Tracker opened many times during delay
  if ((ctx.trackerOpenCount || 0) >= 5 && ["awaiting_partner_selection", "awaiting_partner_response", "en_route"].includes(ctx.bookingStage)) {
    signals.push({
      scenario: "tracker_opened_repeatedly",
      detected: true,
      recommendation: "show_support_cta",
      reason: "Customer checking tracker frequently — may be anxious",
      suggestedMessage: "We're working on this. Need help? Our team is here for you.",
      priority: 2,
    });
  }

  // Completion not confirmed
  if (ctx.bookingStage === "awaiting_completion_confirmation" && !ctx.completionConfirmed && stageAge > 120) {
    signals.push({
      scenario: "completion_not_confirmed",
      detected: true,
      recommendation: recentlyActive ? "suppress" : "gentle_reminder",
      reason: "Service appears completed but customer hasn't confirmed",
      suggestedMessage: "Please confirm your service was completed satisfactorily.",
      priority: 3,
    });
  }

  // Rating not submitted
  if (ctx.bookingStage === "completed" && !ctx.hasRated && stageAge > 240) {
    signals.push({
      scenario: "rating_not_submitted",
      detected: true,
      recommendation: recentlyActive ? "suppress" : "gentle_reminder",
      reason: "Service completed but no rating submitted",
      suggestedMessage: "How was your service? Your rating helps other customers and improves our technicians.",
      priority: 5,
    });
  }

  return signals.sort((a, b) => a.priority - b.priority);
}

/** Get the most important recovery recommendation */
export function getTopRecoverySignal(ctx: RecoveryContext): RecoverySignal | null {
  const signals = analyzeRecoverySignals(ctx).filter(s => s.detected && s.recommendation !== "suppress");
  return signals[0] || null;
}
