/**
 * LankaFix Trust Engine
 * Re-exports trust score computation and refund eligibility from brand/trustSystem.
 * Also provides additional trust-related utilities.
 */
export { computeTrustScore, getRefundEligibility } from "@/brand/trustSystem";

import type { BookingState } from "@/types/booking";

/** Get trust level label from score */
export function getTrustLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-success" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 40) return { label: "Fair", color: "text-warning" };
  return { label: "Building", color: "text-muted-foreground" };
}

/** Get trust milestones with completion status */
export function getTrustMilestones(booking: BookingState) {
  return [
    { key: "tech_assigned", label: "Technician Assigned", done: !!booking.technician, points: 15 },
    { key: "partner_verified", label: "Partner Verified", done: !!booking.technician, points: 10 },
    { key: "timeline_active", label: "Timeline Logged", done: booking.timelineEvents.length > 0, points: 10 },
    { key: "otp_start", label: "Start OTP Verified", done: !!booking.startOtpVerifiedAt, points: 20 },
    { key: "otp_completion", label: "Completion OTP Verified", done: !!booking.completionOtpVerifiedAt, points: 20 },
    { key: "evidence", label: "After Photo Uploaded", done: booking.photos.some((p) => p.type === "after"), points: 10 },
    { key: "payment", label: "Payment Completed", done: booking.payments.completion?.status === "paid", points: 10 },
    { key: "quote", label: "Quote Approved", done: !booking.pricing.quoteRequired || !!booking.quote?.selectedOptionId, points: 5 },
  ];
}
