/**
 * Phase 3+ — Audited Manual Override Actions for Ops
 *
 * ASSIGN vs REASSIGN are distinct:
 *   - opsAssignPartner: first-time partner assignment (no prior partner)
 *   - opsReassignPartner: replaces an existing/failed partner
 *
 * Every action:
 *   1. Performs the DB mutation
 *   2. Logs to job_timeline + automation_event_log via logOpsAction
 *   3. Returns a typed InterventionResult
 *
 * Critical actions (cancel, verify_payment) will THROW if audit logging fails.
 * See interventionEngine.ts for criticality levels.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logOpsAction, logOpsEvent, logContactAttempt, type InterventionResult } from "@/engines/interventionEngine";

async function getCurrentUserId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id;
}

// ── ASSIGN PARTNER (first-time assignment, no prior partner) ──
export async function opsAssignPartner(bookingId: string, partnerId: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();
  const { data: prev } = await supabase.from("bookings").select("partner_id, dispatch_status").eq("id", bookingId).single();

  const { error } = await supabase.from("bookings").update({
    partner_id: partnerId,
    assigned_at: new Date().toISOString(),
    dispatch_status: "accepted",
    assignment_mode: "ops_manual",
  }).eq("id", bookingId);
  if (error) throw error;

  await logOpsAction({
    booking_id: bookingId,
    action_type: "assign_partner",
    actor_id: actorId,
    previous_state: prev?.partner_id || "none",
    new_state: partnerId,
    reason: `First-time assignment to partner ${partnerId.slice(0, 8)}`,
  });
  logOpsEvent("ops_assign_partner", bookingId, { partner_id: partnerId, actor_id: actorId });

  toast({ title: "Partner assigned" });
  return "pending_followup";
}

// ── REASSIGN PARTNER (replace existing/failed partner) ──
export async function opsReassignPartner(bookingId: string, newPartnerId: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();
  const { data: prev } = await supabase.from("bookings").select("partner_id, dispatch_status").eq("id", bookingId).single();

  const { error } = await supabase.from("bookings").update({
    partner_id: newPartnerId,
    assigned_at: new Date().toISOString(),
    dispatch_status: "accepted",
    assignment_mode: "ops_manual",
  }).eq("id", bookingId);
  if (error) throw error;

  // Expire pending offers for the old partner
  await supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("status", "pending");

  await logOpsAction({
    booking_id: bookingId,
    action_type: "reassign_partner",
    actor_id: actorId,
    previous_state: prev?.partner_id || "none",
    new_state: newPartnerId,
    reason: `Reassigned from ${(prev?.partner_id || "none").slice(0, 8)} to ${newPartnerId.slice(0, 8)}`,
    metadata: { previous_partner_id: prev?.partner_id },
  });
  logOpsEvent("ops_reassign_partner", bookingId, { previous_partner: prev?.partner_id, new_partner: newPartnerId, actor_id: actorId });

  toast({ title: "Partner reassigned" });
  return "pending_followup";
}

export async function opsEscalateBooking(bookingId: string, reason: string): Promise<InterventionResult> {
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
  logOpsEvent("ops_escalate_booking", bookingId, { reason, actor_id: actorId });

  toast({ title: "Booking escalated" });
  return "escalated";
}

// CRITICAL action — audit logging MUST succeed or action throws
export async function opsCancelBooking(bookingId: string, reason: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();
  const { data: prev } = await supabase.from("bookings").select("status").eq("id", bookingId).single();

  // Log FIRST — if this throws, the cancel is blocked
  await logOpsAction({
    booking_id: bookingId,
    action_type: "cancel_booking",
    actor_id: actorId,
    previous_state: prev?.status || "unknown",
    new_state: "cancelled",
    reason,
  });

  await supabase.from("bookings").update({
    status: "cancelled", dispatch_status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: reason,
  }).eq("id", bookingId);
  await supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("status", "pending");

  logOpsEvent("ops_cancel_booking", bookingId, { reason, actor_id: actorId });

  toast({ title: "Booking cancelled" });
  return "resolved";
}

// CRITICAL action — audit logging MUST succeed or action throws
export async function opsVerifyPayment(bookingId: string, method: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();

  // Log FIRST — if this throws, verify is blocked
  await logOpsAction({
    booking_id: bookingId,
    action_type: "verify_payment",
    actor_id: actorId,
    new_state: "paid",
    reason: `Payment manually verified: ${method}`,
  });

  await supabase.from("bookings").update({
    payment_status: "paid" as any, payment_method: method, paid_at: new Date().toISOString(),
  }).eq("id", bookingId);

  logOpsEvent("ops_verify_payment", bookingId, { method, actor_id: actorId });

  toast({ title: "Payment verified" });
  return "resolved";
}

export async function opsResendAssignment(bookingId: string): Promise<InterventionResult> {
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
  logOpsEvent("ops_resend_assignment", bookingId, { actor_id: actorId });

  toast({ title: "Assignment resent" });
  return "pending_followup";
}

export async function opsMarkPartnerUnavailable(partnerId: string) {
  await supabase.from("partners").update({ availability_status: "offline" as any }).eq("id", partnerId);
  toast({ title: "Partner marked unavailable" });
}

export async function opsAddNote(bookingId: string, note: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();

  await logOpsAction({
    booking_id: bookingId,
    action_type: "add_note",
    actor_id: actorId,
    notes: note,
    reason: "Ops note added",
  });

  toast({ title: "Note added" });
  return "needs_review";
}

export async function opsOpenQualityRecovery(bookingId: string, rating: number): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();

  await supabase.from("bookings").update({ under_mediation: true }).eq("id", bookingId);

  await logOpsAction({
    booking_id: bookingId,
    action_type: "open_low_rating_recovery",
    actor_id: actorId,
    reason: `Low rating (${rating}/5) — quality recovery initiated`,
    metadata: { rating },
  });
  logOpsEvent("low_rating_recovery_opened", bookingId, { rating, actor_id: actorId });

  toast({ title: "Quality recovery case opened" });
  return "needs_review";
}

export async function opsRemindCustomer(bookingId: string, context: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();

  await logOpsAction({
    booking_id: bookingId,
    action_type: "remind_customer",
    actor_id: actorId,
    reason: `Customer reminder: ${context}`,
  });
  logOpsEvent("ops_remind_customer", bookingId, { context, actor_id: actorId });

  toast({ title: "Customer reminder logged" });
  return "pending_followup";
}

export async function opsCallContact(bookingId: string, targetType: "customer" | "partner"): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();
  await logContactAttempt({ bookingId, actorId, targetType, contactMethod: "call" });
  logOpsEvent("ops_contact_attempt", bookingId, { target: targetType, method: "call", actor_id: actorId });
  toast({ title: `${targetType === "customer" ? "Customer" : "Partner"} call logged` });
  return "pending_followup";
}

export async function opsPaymentFollowup(bookingId: string, note: string): Promise<InterventionResult> {
  const actorId = await getCurrentUserId();
  await logOpsAction({
    booking_id: bookingId,
    action_type: "payment_followup",
    actor_id: actorId,
    reason: `Payment follow-up: ${note || "standard follow-up"}`,
  });
  logOpsEvent("payment_followup_sent", bookingId, { actor_id: actorId });
  toast({ title: "Payment follow-up logged" });
  return "pending_followup";
}

// ══════════════════════════════════════════════════════════════
// CENTRAL ACTION DISPATCHER
// ══════════════════════════════════════════════════════════════
// Maps UI action keys to executable functions.
// ASSIGN and REASSIGN are distinct paths.

export async function executeAction(
  actionKey: string,
  bookingId: string,
  params: Record<string, string> = {}
): Promise<InterventionResult> {
  logOpsEvent("recommended_action_executed", bookingId, { action_key: actionKey });

  switch (actionKey) {
    case "assign":
      if (!params.partnerId) throw new Error("Partner ID required for assignment");
      return opsAssignPartner(bookingId, params.partnerId);
    case "reassign":
      if (!params.partnerId) throw new Error("Partner ID required for reassignment");
      return opsReassignPartner(bookingId, params.partnerId);
    case "resend":
      return opsResendAssignment(bookingId);
    case "escalate":
      return opsEscalateBooking(bookingId, params.reason || "Ops escalation");
    case "cancel":
      if (!params.reason) throw new Error("Reason required for cancellation");
      return opsCancelBooking(bookingId, params.reason);
    case "verify_payment":
      return opsVerifyPayment(bookingId, params.method || "cash_collected");
    case "note":
      return opsAddNote(bookingId, params.note || "");
    case "remind_customer":
      return opsRemindCustomer(bookingId, params.reason || "Follow-up reminder");
    case "quality_recovery":
      return opsOpenQualityRecovery(bookingId, Number(params.rating) || 0);
    case "call_customer":
      return opsCallContact(bookingId, "customer");
    case "call_partner":
      return opsCallContact(bookingId, "partner");
    case "payment_followup":
      return opsPaymentFollowup(bookingId, params.note || "");
    default:
      return opsAddNote(bookingId, `Action: ${actionKey} — ${params.note || "no details"}`);
  }
}
