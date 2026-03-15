/**
 * LankaFix Payment Lifecycle Service
 * Standardized payment state machine with event logging.
 * Extends existing paymentService without replacing it.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Canonical Payment States ──
export type PaymentState =
  | "pending"
  | "deposit_paid"
  | "paid"
  | "failed"
  | "refunded"
  | "partial_refund"
  | "cash_collected"
  | "payment_verified";

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  pending: "Payment Pending",
  deposit_paid: "Deposit Paid",
  paid: "Paid",
  failed: "Payment Failed",
  refunded: "Refunded",
  partial_refund: "Partially Refunded",
  cash_collected: "Cash Collected",
  payment_verified: "Payment Verified",
};

export const PAYMENT_STATE_COLORS: Record<PaymentState, { bg: string; text: string }> = {
  pending: { bg: "bg-warning/10 border-warning/20", text: "text-warning" },
  deposit_paid: { bg: "bg-primary/10 border-primary/20", text: "text-primary" },
  paid: { bg: "bg-success/10 border-success/20", text: "text-success" },
  failed: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive" },
  refunded: { bg: "bg-muted border-border", text: "text-muted-foreground" },
  partial_refund: { bg: "bg-warning/10 border-warning/20", text: "text-warning" },
  cash_collected: { bg: "bg-success/10 border-success/20", text: "text-success" },
  payment_verified: { bg: "bg-success/10 border-success/20", text: "text-success" },
};

// ── Payment Event Types ──
export type PaymentEventType =
  | "payment_initiated"
  | "payment_pending"
  | "payment_confirmed"
  | "cash_collected"
  | "payment_failed"
  | "refund_issued"
  | "deposit_received"
  | "payment_verified";

/**
 * Log a payment lifecycle event to job_timeline.
 * Reuses existing timeline table — no new audit tables needed.
 */
export async function logPaymentEvent(opts: {
  bookingId: string;
  eventType: PaymentEventType;
  actor?: string;
  note?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await supabase.from("job_timeline").insert({
      booking_id: opts.bookingId,
      status: opts.eventType,
      actor: opts.actor || "payment_system",
      note: opts.note || PAYMENT_EVENT_NOTES[opts.eventType],
      metadata: opts.metadata || {},
    });
  } catch (e) {
    console.warn("[PaymentLifecycle] Event log failed:", e);
  }
}

const PAYMENT_EVENT_NOTES: Record<PaymentEventType, string> = {
  payment_initiated: "Payment process initiated",
  payment_pending: "Payment awaiting confirmation",
  payment_confirmed: "Payment confirmed and recorded",
  cash_collected: "Cash payment collected by technician",
  payment_failed: "Payment attempt failed",
  refund_issued: "Refund processed for customer",
  deposit_received: "Deposit payment received",
  payment_verified: "Payment verified by operations",
};

/**
 * Transition payment to a new state with event logging.
 */
export async function transitionPaymentState(opts: {
  paymentId: string;
  bookingId: string;
  newState: PaymentState;
  actor?: string;
  transactionRef?: string;
}): Promise<boolean> {
  const updateData: Record<string, any> = {
    payment_status: opts.newState,
  };

  if (["paid", "cash_collected", "payment_verified"].includes(opts.newState)) {
    updateData.paid_at = new Date().toISOString();
  }
  if (opts.transactionRef) {
    updateData.transaction_ref = opts.transactionRef;
  }

  const { error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", opts.paymentId);

  if (error) {
    console.warn("[PaymentLifecycle] State transition failed:", error.message);
    return false;
  }

  // Map state to event type
  const eventMap: Partial<Record<PaymentState, PaymentEventType>> = {
    pending: "payment_pending",
    paid: "payment_confirmed",
    failed: "payment_failed",
    refunded: "refund_issued",
    cash_collected: "cash_collected",
    deposit_paid: "deposit_received",
    payment_verified: "payment_verified",
  };

  const eventType = eventMap[opts.newState];
  if (eventType) {
    await logPaymentEvent({
      bookingId: opts.bookingId,
      eventType,
      actor: opts.actor || "system",
      metadata: { payment_id: opts.paymentId, new_state: opts.newState },
    });
  }

  // Also update booking payment_status for consistency
  await supabase.from("bookings").update({
    payment_status: opts.newState as any,
  }).eq("id", opts.bookingId);

  return true;
}

/**
 * Record cash collection by technician.
 */
export async function recordCashCollection(opts: {
  bookingId: string;
  amountLkr: number;
  collectedBy: string;
}): Promise<boolean> {
  // Find existing payment record
  const { data: payment } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", opts.bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payment) {
    return transitionPaymentState({
      paymentId: payment.id,
      bookingId: opts.bookingId,
      newState: "cash_collected",
      actor: opts.collectedBy,
    });
  }

  // No payment record — create one
  const { data: created, error } = await supabase
    .from("payments")
    .insert({
      booking_id: opts.bookingId,
      customer_id: opts.collectedBy, // will be corrected by booking lookup
      amount_lkr: opts.amountLkr,
      payment_type: "completion",
      payment_status: "cash_collected",
      paid_at: new Date().toISOString(),
    } as any)
    .select("id")
    .single();

  if (error) {
    console.warn("[PaymentLifecycle] Cash record failed:", error.message);
    return false;
  }

  await logPaymentEvent({
    bookingId: opts.bookingId,
    eventType: "cash_collected",
    actor: opts.collectedBy,
    metadata: { amount_lkr: opts.amountLkr },
  });

  return true;
}
