/**
 * LankaFix Receipt Engine
 * Generates receipt data objects for deposit, balance, and full invoice.
 */
import type { BookingState } from "@/types/booking";

export interface ReceiptData {
  type: "deposit" | "balance" | "invoice";
  receiptId: string;
  bookingRef: string;
  date: string;
  serviceName: string;
  categoryName: string;
  zone: string;
  amount: number;
  method: string;
  reference?: string;
  laborBreakdown: { description: string; amount: number }[];
  partsBreakdown: { description: string; amount: number }[];
  warranty?: { labor: string; parts: string };
  technicianName?: string;
  totalAmount: number;
}

export function generateReceiptData(
  booking: BookingState,
  type: "deposit" | "balance" | "invoice"
): ReceiptData {
  const now = new Date().toISOString();
  const receiptId = `RCT-${booking.jobId}-${type.charAt(0).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;

  const selectedOption = booking.quote?.options?.find(
    (o) => o.id === booking.quote?.selectedOptionId
  );

  let amount = 0;
  let method = "N/A";
  let reference: string | undefined;

  if (type === "deposit") {
    amount = booking.finance?.depositAmount || booking.payments.deposit?.amount || 0;
    method = booking.finance?.collectionMode || booking.payments.deposit?.method || "cash";
    reference = booking.finance?.latestReceiptRef || booking.payments.deposit?.reference;
  } else if (type === "balance") {
    amount = (booking.finance?.collectedAmount || 0) - (booking.finance?.depositAmount || 0);
    method = booking.finance?.collectionMode || "cash";
    reference = booking.finance?.latestReceiptRef;
  } else {
    amount = booking.finance?.totalApprovedAmount || selectedOption?.totals.total || 0;
    method = booking.finance?.collectionMode || "cash";
  }

  const laborBreakdown = selectedOption?.laborItems.map((i) => ({
    description: i.description, amount: i.amount,
  })) || [];

  const partsBreakdown = selectedOption?.partsItems.map((i) => ({
    description: i.description, amount: i.amount,
  })) || [];

  const warranty = selectedOption ? {
    labor: selectedOption.warranty.labor,
    parts: selectedOption.warranty.parts,
  } : undefined;

  return {
    type,
    receiptId,
    bookingRef: booking.jobId,
    date: now,
    serviceName: booking.serviceName,
    categoryName: booking.categoryName,
    zone: booking.zone,
    amount,
    method: method === "cash_on_completion" ? "Cash" : method === "bank_transfer" ? "Bank Transfer" : method || "Cash",
    reference,
    laborBreakdown,
    partsBreakdown,
    warranty,
    technicianName: booking.technician?.name,
    totalAmount: booking.finance?.totalApprovedAmount || amount,
  };
}
