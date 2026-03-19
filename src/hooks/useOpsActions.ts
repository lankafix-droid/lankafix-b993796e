/**
 * Phase 3+ — Audited Manual Override Actions for Ops
 * Every action writes to DB + job_timeline + automation_event_log via logOpsAction.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logOpsAction } from "@/engines/interventionEngine";

async function getCurrentUserId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id;
}

export async function opsReassignPartner(bookingId: string, newPartnerId: string) {
  const actorId = await getCurrentUserId();
  const { data: prev } = await supabase.from("bookings").select("partner_id, dispatch_status").eq("id", bookingId).single();

  const { error } = await supabase.from("bookings").update({
    partner_id: newPartnerId,
    assigned_at: new Date().toISOString(),
    dispatch_status: "accepted",
    assignment_mode: "ops_manual",
  }).eq("id", bookingId);
  if (error) throw error;

  await supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("status", "pending");

  await logOpsAction({
    booking_id: bookingId,
    action_type: "reassign_partner",
    actor_id: actorId,
    previous_state: prev?.partner_id || "none",
    new_state: newPartnerId,
    reason: `Reassigned to partner ${newPartnerId.slice(0, 8)}`,
  });

  toast({ title: "Partner reassigned" });
}

export async function opsEscalateBooking(bookingId: string, reason: string) {
  const actorId = await getCurrentUserId();
  const { data: prev } = await supabase.from("bookings").select("dispatch_status").eq("id", bookingId).single();

  await supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId);
  await supabase.from("dispatch_escalations").insert({
    booking_id: bookingId, reason: reason || "ops_manual_escalation", dispatch_rounds_attempted: 0,
  });

  await logOpsAction({
    booking_id: bookingId,
    action_type: "escalate_booking",
    actor_id: actorId,
    previous_state: prev?.dispatch_status || "unknown",
    new_state: "escalated",
    reason,
  });

  toast({ title: "Booking escalated" });
}

export async function opsCancelBooking(bookingId: string, reason: string) {
  const actorId = await getCurrentUserId();
  const { data: prev } = await supabase.from("bookings").select("status").eq("id", bookingId).single();

  await supabase.from("bookings").update({
    status: "cancelled", dispatch_status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: reason,
  }).eq("id", bookingId);
  await supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("status", "pending");

  await logOpsAction({
    booking_id: bookingId,
    action_type: "cancel_booking",
    actor_id: actorId,
    previous_state: prev?.status || "unknown",
    new_state: "cancelled",
    reason,
  });

  toast({ title: "Booking cancelled" });
}

export async function opsVerifyPayment(bookingId: string, method: string) {
  const actorId = await getCurrentUserId();

  await supabase.from("bookings").update({
    payment_status: "paid" as any, payment_method: method, paid_at: new Date().toISOString(),
  }).eq("id", bookingId);

  await logOpsAction({
    booking_id: bookingId,
    action_type: "verify_payment",
    actor_id: actorId,
    new_state: "paid",
    reason: `Payment manually verified: ${method}`,
  });

  toast({ title: "Payment verified" });
}

export async function opsResendAssignment(bookingId: string) {
  const actorId = await getCurrentUserId();

  const { error } = await supabase.functions.invoke("dispatch-orchestrator", {
    body: { booking_id: bookingId, force_round: 1 },
  });
  if (error) throw error;

  await logOpsAction({
    booking_id: bookingId,
    action_type: "resend_assignment",
    actor_id: actorId,
    reason: "Assignment notification resent by ops",
  });

  toast({ title: "Assignment resent" });
}

export async function opsMarkPartnerUnavailable(partnerId: string) {
  await supabase.from("partners").update({ availability_status: "offline" as any }).eq("id", partnerId);
  toast({ title: "Partner marked unavailable" });
}

export async function opsAddNote(bookingId: string, note: string) {
  const actorId = await getCurrentUserId();

  await logOpsAction({
    booking_id: bookingId,
    action_type: "add_note",
    actor_id: actorId,
    notes: note,
    reason: "Ops note added",
  });

  toast({ title: "Note added" });
}

export async function opsOpenQualityRecovery(bookingId: string, rating: number) {
  const actorId = await getCurrentUserId();

  await supabase.from("bookings").update({ under_mediation: true }).eq("id", bookingId);

  await logOpsAction({
    booking_id: bookingId,
    action_type: "open_low_rating_recovery",
    actor_id: actorId,
    reason: `Low rating (${rating}/5) — quality recovery initiated`,
    metadata: { rating },
  });

  toast({ title: "Quality recovery case opened" });
}

export async function opsRemindCustomer(bookingId: string, context: string) {
  const actorId = await getCurrentUserId();

  await logOpsAction({
    booking_id: bookingId,
    action_type: "remind_customer",
    actor_id: actorId,
    reason: `Customer reminder: ${context}`,
  });

  toast({ title: "Customer reminder logged" });
}
