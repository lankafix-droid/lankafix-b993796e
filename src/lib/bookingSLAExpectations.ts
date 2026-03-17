/**
 * Booking SLA Expectations — Advisory-only expectation windows.
 * Never guarantees exact times. Uses expectation ranges only.
 * Does not modify booking state.
 */

import type { BookingLifecycleStage } from "./bookingLifecycleModel";

export interface SLAExpectation {
  stage: BookingLifecycleStage;
  label: string;
  expectedWindow: string;
  description: string;
  delayMessage: string;
  /** Minutes — lower bound of expected window */
  minMinutes: number;
  /** Minutes — upper bound of expected window */
  maxMinutes: number;
}

export const SLA_EXPECTATIONS: Partial<Record<BookingLifecycleStage, SLAExpectation>> = {
  booking_submitted: {
    stage: "booking_submitted",
    label: "Operator Review",
    expectedWindow: "15–30 minutes",
    description: "A LankaFix operator will review your booking shortly.",
    delayMessage: "Review is taking a bit longer. Our team is working on it.",
    minMinutes: 15,
    maxMinutes: 30,
  },
  awaiting_operator_review: {
    stage: "awaiting_operator_review",
    label: "Operator Review",
    expectedWindow: "15–30 minutes",
    description: "Your booking is being reviewed by our team.",
    delayMessage: "Our team is still reviewing — you'll hear from us shortly.",
    minMinutes: 15,
    maxMinutes: 30,
  },
  awaiting_partner_selection: {
    stage: "awaiting_partner_selection",
    label: "Technician Matching",
    expectedWindow: "10–45 minutes",
    description: "We're finding the best verified technician for your job.",
    delayMessage: "Technician matching may take longer in your area. We're expanding the search.",
    minMinutes: 10,
    maxMinutes: 45,
  },
  awaiting_partner_response: {
    stage: "awaiting_partner_response",
    label: "Technician Response",
    expectedWindow: "5–15 minutes",
    description: "A matched technician is reviewing your request.",
    delayMessage: "Your technician is taking longer to respond. LankaFix is following up.",
    minMinutes: 5,
    maxMinutes: 15,
  },
  awaiting_quote: {
    stage: "awaiting_quote",
    label: "Quote Preparation",
    expectedWindow: "30–90 minutes",
    description: "The technician is preparing a detailed quote after inspection.",
    delayMessage: "Your quote is delayed. Our team is coordinating with the technician.",
    minMinutes: 30,
    maxMinutes: 90,
  },
  awaiting_quote_approval: {
    stage: "awaiting_quote_approval",
    label: "Your Approval",
    expectedWindow: "At your convenience",
    description: "Take your time reviewing — nothing proceeds without your approval.",
    delayMessage: "Reminder: your quote is ready for review when you're ready.",
    minMinutes: 0,
    maxMinutes: 0,
  },
  escalated: {
    stage: "escalated",
    label: "Senior Review",
    expectedWindow: "1–2 hours",
    description: "A senior operator is personally reviewing your case.",
    delayMessage: "A senior operator usually follows up within 1–2 hours.",
    minMinutes: 60,
    maxMinutes: 120,
  },
  dispute_opened: {
    stage: "dispute_opened",
    label: "Mediation Review",
    expectedWindow: "2–4 hours",
    description: "Our mediation team is reviewing your concern.",
    delayMessage: "Dispute reviews are handled carefully. You'll hear from us soon.",
    minMinutes: 120,
    maxMinutes: 240,
  },
};

/** Get SLA expectation for a lifecycle stage, or null if none defined */
export function getSLAExpectation(stage: BookingLifecycleStage): SLAExpectation | null {
  return SLA_EXPECTATIONS[stage] || null;
}

/** Check if booking is likely delayed based on stage entry time */
export function isLikelyDelayed(stage: BookingLifecycleStage, stageEnteredAt?: string | null): boolean {
  const sla = SLA_EXPECTATIONS[stage];
  if (!sla || !stageEnteredAt || sla.maxMinutes === 0) return false;
  const elapsed = (Date.now() - new Date(stageEnteredAt).getTime()) / 60_000;
  return elapsed > sla.maxMinutes;
}
