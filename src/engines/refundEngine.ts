/**
 * LankaFix Refund Engine
 * Re-exports refund eligibility from trustSystem and adds refund initiation logic.
 */
export { getRefundEligibility } from "@/brand/trustSystem";

import type { BookingState, PaymentIntent } from "@/types/booking";

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
