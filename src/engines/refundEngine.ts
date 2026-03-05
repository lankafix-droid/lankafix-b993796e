/**
 * LankaFix Refund Engine
 * Full refund lifecycle: create, approve, reject, max refundable.
 */
export { getRefundEligibility } from "@/brand/trustSystem";

import type { BookingState, RefundRequest, RefundStatusDetailed } from "@/types/booking";

export interface RefundResult {
  success: boolean;
  refundAmount: number;
  message: string;
}

export function calculateRefundAmount(booking: BookingState, percent: number): number {
  const deposit = booking.payments.deposit;
  if (!deposit || deposit.status !== "paid") return 0;
  return Math.round(deposit.amount * (percent / 100));
}

export function getMaxRefundableAmount(booking: BookingState): number {
  const collected = booking.finance?.collectedAmount || 0;
  if (collected === 0) return 0;

  // Before dispatch: full refund
  if (booking.dispatchStatus === "pending") return collected;
  // After dispatch but before arrival
  if (booking.dispatchStatus === "dispatched") return Math.round(collected * 0.7);
  // After inspection / quote rejection with deposit
  if (booking.status === "quote_rejected") return Math.round(collected * 0.5);
  // After completion: no refund via this path
  if (booking.status === "completed" || booking.status === "rated") return 0;

  return Math.round(collected * 0.5);
}

export function shouldHoldSettlement(booking: BookingState): boolean {
  return (booking.refundRequests || []).some(
    (r) => r.status === "requested" || r.status === "approved" || r.status === "processing"
  );
}

export function createRefundRequest(
  bookingId: string,
  reason: string,
  amount: number,
  requestedBy: "customer" | "ops" = "customer"
): RefundRequest {
  const now = new Date().toISOString();
  return {
    id: `REF-${Date.now().toString(36).toUpperCase()}`,
    bookingId,
    requestedBy,
    reason,
    requestedAmount: amount,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  };
}

export function approveRefundRequest(request: RefundRequest, approvedAmount: number): RefundRequest {
  return {
    ...request,
    approvedAmount,
    status: "approved",
    updatedAt: new Date().toISOString(),
  };
}

export function rejectRefundRequest(request: RefundRequest): RefundRequest {
  return {
    ...request,
    status: "rejected",
    updatedAt: new Date().toISOString(),
  };
}

/** Customer-friendly refund status message */
export function getRefundStatusMessage(status: RefundStatusDetailed): string {
  switch (status) {
    case "none": return "";
    case "requested": return "Refund under review";
    case "approved": return "Refund approved — processing";
    case "processing": return "Refund being processed";
    case "completed": return "Refund completed";
    case "rejected": return "Refund request not eligible";
    default: return "";
  }
}
