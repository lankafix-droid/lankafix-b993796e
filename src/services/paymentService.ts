/**
 * LankaFix Payment Service
 * Lightweight payment tracking — no gateway integration yet.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CreatePaymentOpts {
  bookingId: string;
  userId: string;
  amount: number;
  paymentType: "diagnostic" | "quote" | "completion";
}

/**
 * Insert a payment record with status "pending".
 * Fire-and-forget safe — returns null on failure instead of throwing.
 */
export async function createPaymentRecord(opts: CreatePaymentOpts): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: opts.bookingId,
        customer_id: opts.userId,
        amount_lkr: opts.amount,
        payment_type: opts.paymentType,
        payment_status: "pending",
      } as any)
      .select("id")
      .single();

    if (error) {
      console.warn("[PaymentService] Insert failed:", error.message);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.warn("[PaymentService] Unexpected error:", e);
    return null;
  }
}

/**
 * Fetch the latest payment record for a booking.
 */
export async function getPaymentForBooking(bookingId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, payment_status, payment_type, amount_lkr, paid_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[PaymentService] Fetch failed:", error.message);
    return null;
  }
  return data;
}
