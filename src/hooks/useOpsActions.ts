/**
 * Phase 3 — Manual Override Actions for Ops
 * All actions write to DB + job_timeline for auditability.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

async function timelineEntry(bookingId: string, status: string, note: string) {
  await supabase.from("job_timeline").insert({ booking_id: bookingId, status, actor: "ops", note });
}

export async function opsReassignPartner(bookingId: string, newPartnerId: string) {
  const { error } = await supabase.from("bookings").update({
    partner_id: newPartnerId,
    assigned_at: new Date().toISOString(),
    dispatch_status: "accepted",
    assignment_mode: "ops_manual",
  }).eq("id", bookingId);
  if (error) throw error;
  // Expire old pending offers
  await supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("status", "pending");
  await timelineEntry(bookingId, "ops_reassigned", `Reassigned to partner ${newPartnerId.slice(0, 8)}`);
  toast({ title: "Partner reassigned" });
}

export async function opsEscalateBooking(bookingId: string, reason: string) {
  await supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId);
  await supabase.from("dispatch_escalations").insert({
    booking_id: bookingId, reason: reason || "ops_manual_escalation", dispatch_rounds_attempted: 0,
  });
  await timelineEntry(bookingId, "dispatch_escalated", `Escalated: ${reason}`);
  toast({ title: "Booking escalated" });
}

export async function opsCancelBooking(bookingId: string, reason: string) {
  await supabase.from("bookings").update({
    status: "cancelled", dispatch_status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: reason,
  }).eq("id", bookingId);
  await supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("status", "pending");
  await timelineEntry(bookingId, "cancelled", `Cancelled by ops: ${reason}`);
  toast({ title: "Booking cancelled" });
}

export async function opsVerifyPayment(bookingId: string, method: string) {
  await supabase.from("bookings").update({
    payment_status: "paid" as any, payment_method: method, paid_at: new Date().toISOString(),
  }).eq("id", bookingId);
  await timelineEntry(bookingId, "payment_verified", `Payment manually verified: ${method}`);
  toast({ title: "Payment verified" });
}

export async function opsResendAssignment(bookingId: string) {
  const { error } = await supabase.functions.invoke("dispatch-orchestrator", {
    body: { booking_id: bookingId, force_round: 1 },
  });
  if (error) throw error;
  await timelineEntry(bookingId, "dispatch_resent", "Assignment notification resent by ops");
  toast({ title: "Assignment resent" });
}

export async function opsMarkPartnerUnavailable(partnerId: string) {
  await supabase.from("partners").update({ availability_status: "offline" as any }).eq("id", partnerId);
  toast({ title: "Partner marked unavailable" });
}

export async function opsAddNote(bookingId: string, note: string) {
  await timelineEntry(bookingId, "ops_note", note);
  toast({ title: "Note added" });
}
