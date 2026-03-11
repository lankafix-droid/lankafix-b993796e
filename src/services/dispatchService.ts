/**
 * LankaFix Dispatch Service
 * Client-side dispatch trigger and provider action handlers.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger the dispatch engine for a newly created booking.
 * Called after successful booking creation for operational categories.
 */
export async function triggerDispatch(bookingId: string): Promise<{
  success: boolean;
  error?: string;
  dispatchStatus?: string;
}> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/dispatch-engine`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Dispatch failed" };
    }

    return {
      success: true,
      dispatchStatus: data.dispatch_status,
    };
  } catch (e) {
    console.warn("[DispatchService] Trigger failed:", e);
    return { success: false, error: "Network error" };
  }
}

/**
 * Provider accepts a job offer.
 */
export async function acceptJob(bookingId: string, partnerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/dispatch-accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          partner_id: partnerId,
          action: "accept",
        }),
      }
    );

    const data = await res.json();
    return { success: data.success || false, error: data.error };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
}

/**
 * Provider declines a job offer.
 */
export async function declineJob(bookingId: string, partnerId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/dispatch-accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          partner_id: partnerId,
          action: "decline",
          decline_reason: reason,
        }),
      }
    );

    const data = await res.json();
    return { success: data.success || false, error: data.error };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
}

/**
 * Provider updates job status (start travel, arrived, start work).
 */
export async function updateJobStatus(
  bookingId: string,
  partnerId: string,
  action: "start_travel" | "arrived" | "start_work"
): Promise<{ success: boolean; error?: string }> {
  const statusMap = {
    start_travel: { status: "tech_en_route" as const, note: "Technician is on the way" },
    arrived: { status: "arrived" as const, note: "Technician has arrived at location" },
    start_work: { status: "inspection_started" as const, note: "Inspection/work has started" },
  };

  const { status, note } = statusMap[action];

  try {
    const updateFields: Record<string, unknown> = { status };
    if (action === "arrived") updateFields.actual_arrival_at = new Date().toISOString();
    if (action === "start_work") updateFields.started_at = new Date().toISOString();

    const [bookingRes, timelineRes] = await Promise.all([
      supabase.from("bookings").update(updateFields).eq("id", bookingId),
      supabase.from("job_timeline").insert({
        booking_id: bookingId,
        status,
        actor: "partner",
        note,
        metadata: { partner_id: partnerId, action },
      }),
    ]);

    if (bookingRes.error) throw bookingRes.error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to update status" };
  }
}

/**
 * Start repair after quote approval.
 */
export async function startRepair(bookingId: string, partnerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [bookingRes] = await Promise.all([
      supabase.from("bookings").update({ status: "repair_started" as any }).eq("id", bookingId),
      supabase.from("job_timeline").insert({
        booking_id: bookingId,
        status: "repair_started",
        actor: "partner",
        note: "Repair work has started",
        metadata: { partner_id: partnerId },
      }),
    ]);
    if (bookingRes.error) throw bookingRes.error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to start repair" };
  }
}

/**
 * Complete repair.
 */
export async function completeRepair(bookingId: string, partnerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const [bookingRes] = await Promise.all([
      supabase.from("bookings").update({ status: "completed" as any, completed_at: now }).eq("id", bookingId),
      supabase.from("job_timeline").insert({
        booking_id: bookingId,
        status: "completed",
        actor: "partner",
        note: "Repair completed successfully",
        metadata: { partner_id: partnerId },
      }),
      supabase.from("notification_events").insert({
        event_type: "repair_completed",
        booking_id: bookingId,
        partner_id: partnerId,
      }),
    ]);
    if (bookingRes.error) throw bookingRes.error;

    // Fire fraud detection check (non-blocking)
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`https://${projectId}.supabase.co/functions/v1/fraud-detection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": anonKey, "Authorization": `Bearer ${anonKey}` },
      body: JSON.stringify({ booking_id: bookingId, check_type: "completion" }),
    }).catch(() => {}); // non-blocking

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to complete repair" };
  }
}

/**
 * Record payment for a completed job.
 */
export async function recordPayment(
  bookingId: string,
  quoteId: string,
  amountLkr: number,
  method: "cash" | "bank_transfer" | "online"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;

    const { error } = await supabase.from("payments").insert({
      booking_id: bookingId,
      quote_id: quoteId,
      amount_lkr: amountLkr,
      customer_id: userId || bookingId, // fallback
      payment_type: "service",
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: method,
    });
    if (error) throw error;

    await supabase.from("bookings").update({
      payment_status: "paid" as any,
      payment_method: method,
      final_price_lkr: amountLkr,
    }).eq("id", bookingId);

    await supabase.from("job_timeline").insert({
      booking_id: bookingId,
      status: "payment_recorded",
      actor: "partner",
      note: `Payment of LKR ${amountLkr.toLocaleString()} recorded (${method})`,
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to record payment" };
  }
}
