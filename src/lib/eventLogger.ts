/**
 * Phase 7 — Critical Event Logger
 * Structured lifecycle event logging for operational visibility.
 */
import { supabase } from "@/integrations/supabase/client";

export type LifecycleEvent =
  | "booking_created"
  | "dispatch_triggered"
  | "partner_offer_sent"
  | "partner_accepted"
  | "quote_submitted"
  | "quote_approved"
  | "job_completed"
  | "settlement_created"
  | "dispatch_failed"
  | "consultation_requested";

interface EventPayload {
  event: LifecycleEvent;
  bookingId: string;
  categoryCode: string;
  dispatchMode?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a structured lifecycle event.
 * Writes to job_timeline for audit and console for debugging.
 * Non-blocking — never throws.
 */
export async function logLifecycleEvent(payload: EventPayload): Promise<void> {
  const timestamp = new Date().toISOString();

  // Console log with structured format
  console.info(
    `[Lifecycle] ${payload.event} | booking=${payload.bookingId.slice(0, 8)} | category=${payload.categoryCode} | dispatch_mode=${payload.dispatchMode || "n/a"} | ts=${timestamp}`
  );

  // Persist to job_timeline
  try {
    await supabase.from("job_timeline").insert({
      booking_id: payload.bookingId,
      status: payload.event,
      actor: "system",
      note: formatEventNote(payload),
      metadata: {
        ...payload.metadata,
        category_code: payload.categoryCode,
        dispatch_mode: payload.dispatchMode,
        logged_at: timestamp,
      },
    });
  } catch (e) {
    console.warn("[EventLogger] Failed to persist lifecycle event:", e);
  }
}

function formatEventNote(payload: EventPayload): string {
  const notes: Record<LifecycleEvent, string> = {
    booking_created: `Booking created for ${payload.categoryCode}`,
    dispatch_triggered: `Dispatch triggered (${payload.dispatchMode || "auto"})`,
    partner_offer_sent: "Job offer sent to partner",
    partner_accepted: "Partner accepted the job",
    quote_submitted: "Quote submitted for customer review",
    quote_approved: "Customer approved the quote",
    job_completed: "Job marked as completed",
    settlement_created: "Partner settlement record created",
    dispatch_failed: "Dispatch failed — no providers found",
    consultation_requested: `Consultation request for ${payload.categoryCode}`,
  };
  return notes[payload.event] || payload.event;
}
