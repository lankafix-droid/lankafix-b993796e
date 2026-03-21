/**
 * State Alignment Utilities
 * Ensures UI states are properly derived from DB states.
 * Prevents drift between frontend display and backend truth.
 */

import { mapBookingStatusToStage, type BookingLifecycleStage, LIFECYCLE_STAGES } from "@/lib/bookingLifecycleModel";

// ─── Onboarding State Alignment ─────────────────────────

export type OnboardingDbStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "suspended";

export interface OnboardingStateInfo {
  label: string;
  description: string;
  canEdit: boolean;
  showProgress: boolean;
  actionLabel: string | null;
  badgeColor: string;
}

export const ONBOARDING_STATE_MAP: Record<OnboardingDbStatus, OnboardingStateInfo> = {
  draft: {
    label: "In Progress",
    description: "Complete your application to get started.",
    canEdit: true,
    showProgress: true,
    actionLabel: "Continue Application",
    badgeColor: "bg-muted text-muted-foreground",
  },
  submitted: {
    label: "Submitted",
    description: "Your application is in our review queue. We'll get back to you shortly.",
    canEdit: false,
    showProgress: false,
    actionLabel: null,
    badgeColor: "bg-primary/10 text-primary",
  },
  under_review: {
    label: "Under Review",
    description: "A LankaFix team member is reviewing your application.",
    canEdit: false,
    showProgress: false,
    actionLabel: null,
    badgeColor: "bg-accent/10 text-accent",
  },
  approved: {
    label: "Approved",
    description: "Welcome to the LankaFix network! You can now receive job offers.",
    canEdit: false,
    showProgress: false,
    actionLabel: "Go to Dashboard",
    badgeColor: "bg-green-500/10 text-green-700",
  },
  rejected: {
    label: "Not Approved",
    description: "Your application wasn't approved this time. Contact support for details.",
    canEdit: false,
    showProgress: false,
    actionLabel: "Contact Support",
    badgeColor: "bg-destructive/10 text-destructive",
  },
  suspended: {
    label: "Suspended",
    description: "Your account has been temporarily suspended. Contact support.",
    canEdit: false,
    showProgress: false,
    actionLabel: "Contact Support",
    badgeColor: "bg-destructive/10 text-destructive",
  },
};

export function getOnboardingState(dbStatus: string): OnboardingStateInfo {
  return ONBOARDING_STATE_MAP[dbStatus as OnboardingDbStatus] ?? ONBOARDING_STATE_MAP.draft;
}

// ─── Booking State Guards ───────────────────────────────

/** Actions that are valid for each lifecycle stage */
const VALID_ACTIONS: Partial<Record<BookingLifecycleStage, string[]>> = {
  booking_submitted: ["cancel"],
  awaiting_operator_review: ["cancel"],
  awaiting_customer_confirmation: ["confirm", "cancel"],
  awaiting_quote_approval: ["approve_quote", "reject_quote"],
  scheduled: ["cancel", "reschedule"],
  awaiting_completion_confirmation: ["confirm_complete", "dispute"],
  completed: ["rate", "rebook"],
  cancelled: ["rebook"],
};

export function isActionValid(stage: BookingLifecycleStage, action: string): boolean {
  const allowed = VALID_ACTIONS[stage];
  if (!allowed) return false;
  return allowed.includes(action);
}

/** Derive display-safe booking summary from raw DB fields */
export function deriveBookingDisplayState(booking: {
  status: string;
  dispatch_status?: string | null;
  partner_id?: string | null;
  payment_status?: string | null;
  final_price_lkr?: number | null;
  estimated_price_lkr?: number | null;
}) {
  const stage = mapBookingStatusToStage(booking.status, booking.dispatch_status);
  const stageInfo = LIFECYCLE_STAGES[stage];

  return {
    stage,
    stageInfo,
    hasTechnician: !!booking.partner_id,
    isPaid: booking.payment_status === "paid",
    displayPrice: booking.final_price_lkr ?? booking.estimated_price_lkr ?? null,
    priceIsEstimate: !booking.final_price_lkr && !!booking.estimated_price_lkr,
    canCancel: isActionValid(stage, "cancel"),
    canRate: isActionValid(stage, "rate"),
    canRebook: isActionValid(stage, "rebook"),
  };
}
