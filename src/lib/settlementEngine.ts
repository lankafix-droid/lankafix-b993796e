/**
 * LankaFix Settlement Engine
 * Computes settlement breakdown, partner wallet, and technician earnings.
 */
import type {
  BookingState, SettlementBreakdown, SettlementStatus,
  ProviderWalletSummary, TechnicianEarningSummary,
} from "@/types/booking";
import { getPaymentRules } from "./paymentRules";

export function computeSettlementForBooking(booking: BookingState): SettlementBreakdown {
  const finance = booking.finance;
  if (!finance) {
    return {
      grossAmount: 0, depositCollected: 0, balanceCollected: 0,
      refundAmount: 0, netCollected: 0, lankafixCommission: 0,
      partnerShare: 0, technicianShare: 0,
      settlementStatus: "not_ready",
    };
  }

  const rules = getPaymentRules(
    booking.categoryCode,
    finance.totalApprovedAmount,
    booking.isEmergency,
    booking.pricing.quoteRequired
  );

  const grossAmount = finance.totalApprovedAmount;
  const depositCollected = finance.depositAmount > 0 && finance.paymentStatus !== "unpaid"
    ? finance.depositAmount : 0;
  const balanceCollected = finance.collectedAmount - depositCollected;
  const refundAmount = finance.refundAmount;
  const netCollected = finance.collectedAmount - refundAmount;

  const commissionRate = rules.settlementCommissionPercent / 100;
  const techRate = rules.technicianSharePercent / 100;

  const lankafixCommission = Math.round(netCollected * commissionRate);
  const providerGross = netCollected - lankafixCommission;
  const technicianShare = Math.round(providerGross * techRate);
  const partnerShare = providerGross - technicianShare;

  // Determine settlement status
  let settlementStatus: SettlementStatus = "not_ready";

  const isCompleted = booking.status === "completed" || booking.status === "rated";
  const hasPayment = finance.collectedAmount > 0 || finance.collectionMode === "cash_on_completion";
  const otpVerified = !!booking.completionOtpVerifiedAt;
  const quoteOk = !booking.pricing.quoteRequired || !!booking.quote?.selectedOptionId;
  const hasActiveRefund = (booking.refundRequests || []).some(
    (r) => r.status === "requested" || r.status === "approved" || r.status === "processing"
  );

  if (hasActiveRefund) {
    settlementStatus = "held";
  } else if (isCompleted && hasPayment && otpVerified && quoteOk) {
    if (finance.settlement?.settlementStatus === "settled") {
      settlementStatus = "settled";
    } else {
      settlementStatus = "pending";
    }
  }

  return {
    grossAmount,
    depositCollected,
    balanceCollected: Math.max(0, balanceCollected),
    refundAmount,
    netCollected: Math.max(0, netCollected),
    lankafixCommission,
    partnerShare,
    technicianShare,
    settlementStatus,
  };
}

export function computePartnerWallet(
  bookings: BookingState[],
  partnerId: string
): ProviderWalletSummary {
  const partnerBookings = bookings.filter(
    (b) => b.technician?.partnerId === partnerId && b.finance
  );

  let pendingSettlement = 0;
  let releasedSettlement = 0;
  let totalCommission = 0;
  let heldAmount = 0;
  let refundAdj = 0;

  for (const b of partnerBookings) {
    const s = computeSettlementForBooking(b);
    totalCommission += s.lankafixCommission;
    refundAdj += s.refundAmount;

    if (s.settlementStatus === "settled") {
      releasedSettlement += s.partnerShare;
    } else if (s.settlementStatus === "pending" || s.settlementStatus === "processing") {
      pendingSettlement += s.partnerShare;
    } else if (s.settlementStatus === "held") {
      heldAmount += s.partnerShare;
    }
  }

  return {
    partnerId,
    pendingSettlement,
    releasedSettlement,
    totalCommissionGenerated: totalCommission,
    heldAmount,
    refundAdjustments: refundAdj,
  };
}

export function computeTechnicianEarnings(
  bookings: BookingState[],
  technicianId: string
): TechnicianEarningSummary {
  const techBookings = bookings.filter(
    (b) => b.technician?.technicianId === technicianId && b.finance
  );

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let today = 0, week = 0, month = 0, pending = 0, released = 0;

  for (const b of techBookings) {
    const s = computeSettlementForBooking(b);
    const created = new Date(b.createdAt);

    if (s.settlementStatus === "settled") {
      released += s.technicianShare;
      if (b.createdAt.startsWith(todayStr)) today += s.technicianShare;
      if (created >= weekAgo) week += s.technicianShare;
      if (created >= monthAgo) month += s.technicianShare;
    } else if (s.settlementStatus === "pending" || s.settlementStatus === "processing") {
      pending += s.technicianShare;
      if (b.createdAt.startsWith(todayStr)) today += s.technicianShare;
      if (created >= weekAgo) week += s.technicianShare;
      if (created >= monthAgo) month += s.technicianShare;
    }
  }

  return { technicianId, today, week, month, pending, released };
}
