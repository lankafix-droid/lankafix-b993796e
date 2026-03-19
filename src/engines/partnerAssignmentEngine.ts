/**
 * Partner Assignment Engine — LankaFix
 *
 * SOURCE OF TRUTH FLOW:
 *   demand_request → classify-demand → lead → assignment → booking
 *
 * All assignment operations use lead.id as the primary key.
 * Never pass demand_request_id where lead_id is expected.
 *
 * Advisory-only: operators approve all assignments (Phase 1).
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCEPT_WINDOW_MINUTES = 10;
const MAX_ASSIGNMENT_ATTEMPTS = 5;

export interface AssignmentResult {
  success: boolean;
  /** Always a lead.id — never a demand_request_id */
  leadId: string;
  partnerId?: string;
  error?: string;
}

// ── Assignment ──

/**
 * Assign a partner to a LEAD (not a demand_request).
 * Sets accept_by deadline and records assignment in history.
 */
export async function assignPartnerToLead(
  leadId: string,
  partnerId: string,
  partnerName: string,
  operatorNotes?: string
): Promise<AssignmentResult> {
  const now = new Date();
  const acceptBy = new Date(now.getTime() + ACCEPT_WINDOW_MINUTES * 60000);

  // Fetch current lead state for history tracking
  const { data: existingLead } = await supabase
    .from("leads" as any)
    .select("assignment_attempt, assignment_history")
    .eq("id", leadId)
    .single();

  const currentAttempt = ((existingLead as any)?.assignment_attempt || 0) + 1;
  const history = ((existingLead as any)?.assignment_history || []) as any[];

  // Append to assignment history for audit trail
  history.push({
    attempt: currentAttempt,
    partner_id: partnerId,
    partner_name: partnerName,
    assigned_at: now.toISOString(),
    accept_by: acceptBy.toISOString(),
    operator_notes: operatorNotes || null,
  });

  const { error } = await supabase
    .from("leads" as any)
    .update({
      assigned_partner_id: partnerId,
      status: "assigned",
      partner_response_status: "pending",
      partner_response_at: null,
      rejection_reason: null,
      assignment_sent_at: now.toISOString(),
      accept_by: acceptBy.toISOString(),
      assignment_attempt: currentAttempt,
      assignment_history: history,
      routing_status: "awaiting_response",
      operator_notes: operatorNotes || (existingLead as any)?.operator_notes || null,
    } as any)
    .eq("id", leadId);

  if (error) {
    toast.error(`Assignment failed: ${error.message}`);
    return { success: false, leadId, error: error.message };
  }

  // Log analytics event
  await supabase.from("notification_events").insert({
    event_type: "lead_partner_assigned",
    metadata: {
      lead_id: leadId,
      partner_id: partnerId,
      partner_name: partnerName,
      attempt: currentAttempt,
    },
  });

  toast.success(`Assigned to ${partnerName} (attempt ${currentAttempt})`);
  return { success: true, leadId, partnerId };
}

// ── Partner Accept / Reject ──

/** Partner accepts an assigned lead */
export async function partnerAcceptLead(
  leadId: string,
  partnerId: string
): Promise<AssignmentResult> {
  const now = new Date();

  const { error } = await supabase
    .from("leads" as any)
    .update({
      partner_response_status: "accepted",
      partner_response_at: now.toISOString(),
      accepted_by_partner_id: partnerId,
      status: "accepted",
      routing_status: "accepted",
    } as any)
    .eq("id", leadId)
    .eq("assigned_partner_id", partnerId);

  if (error) {
    return { success: false, leadId, error: error.message };
  }

  await supabase.from("notification_events").insert({
    event_type: "lead_partner_accepted",
    metadata: { lead_id: leadId, partner_id: partnerId },
  });

  toast.success("Partner accepted the assignment");
  return { success: true, leadId, partnerId };
}

/** Partner rejects an assigned lead */
export async function partnerRejectLead(
  leadId: string,
  partnerId: string,
  reason: string
): Promise<AssignmentResult> {
  const now = new Date();

  // Update lead: mark rejection but keep routable
  const { error } = await supabase
    .from("leads" as any)
    .update({
      partner_response_status: "rejected",
      partner_response_at: now.toISOString(),
      rejection_reason: reason,
      assigned_partner_id: null,
      routing_status: "needs_reassignment",
      status: "qualified", // Return to routable state
    } as any)
    .eq("id", leadId)
    .eq("assigned_partner_id", partnerId);

  if (error) {
    return { success: false, leadId, error: error.message };
  }

  await supabase.from("notification_events").insert({
    event_type: "lead_partner_rejected",
    metadata: { lead_id: leadId, partner_id: partnerId, reason },
  });

  toast.info("Partner rejected — lead returned to queue for reassignment");
  return { success: true, leadId };
}

// ── Reassignment ──

/**
 * Reassign a lead to a different partner.
 * Preserves the full assignment history for audit.
 */
export async function reassignLead(
  leadId: string,
  newPartnerId: string,
  newPartnerName: string,
  previousPartnerId: string,
  reason?: string
): Promise<AssignmentResult> {
  // Fetch current state
  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assignment_attempt, assignment_history")
    .eq("id", leadId)
    .single();

  const currentAttempt = ((lead as any)?.assignment_attempt || 0);

  if (currentAttempt >= MAX_ASSIGNMENT_ATTEMPTS) {
    // Escalate to operator review
    await supabase
      .from("leads" as any)
      .update({
        routing_status: "routing_failed",
        status: "qualified",
        operator_notes: `Max reassignment attempts (${MAX_ASSIGNMENT_ATTEMPTS}) reached. Manual intervention required.`,
      } as any)
      .eq("id", leadId);

    toast.error("Max reassignment attempts reached — escalated to operator review");
    return { success: false, leadId, error: "max_attempts_reached" };
  }

  // Record reassignment in history
  const history = ((lead as any)?.assignment_history || []) as any[];
  if (previousPartnerId) {
    // Mark previous assignment as reassigned
    const lastEntry = history[history.length - 1];
    if (lastEntry) {
      lastEntry.outcome = "reassigned";
      lastEntry.reassignment_reason = reason || "timeout_or_manual";
    }
  }

  return assignPartnerToLead(leadId, newPartnerId, newPartnerName, reason);
}

/**
 * Handle assignment timeout: mark as expired and prepare for reassignment.
 * Called by timeout checker or operator manually.
 */
export async function expireAssignment(leadId: string): Promise<void> {
  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assigned_partner_id, assignment_history")
    .eq("id", leadId)
    .single();

  if (!lead) return;

  const history = ((lead as any)?.assignment_history || []) as any[];
  const lastEntry = history[history.length - 1];
  if (lastEntry) {
    lastEntry.outcome = "expired";
    lastEntry.expired_at = new Date().toISOString();
  }

  await supabase
    .from("leads" as any)
    .update({
      partner_response_status: "expired",
      assigned_partner_id: null,
      routing_status: "needs_reassignment",
      status: "qualified",
      assignment_history: history,
    } as any)
    .eq("id", leadId);

  await supabase.from("notification_events").insert({
    event_type: "lead_assignment_expired",
    metadata: { lead_id: leadId, partner_id: (lead as any).assigned_partner_id },
  });
}

// ── Operator Manual Controls ──

/** Operator marks lead as "no suitable partner" */
export async function markNoSupply(leadId: string, notes: string): Promise<void> {
  await supabase
    .from("leads" as any)
    .update({
      routing_status: "no_supply",
      status: "qualified",
      operator_notes: notes,
    } as any)
    .eq("id", leadId);
  toast.info("Marked as no supply — lead held for follow-up");
}

/** Operator puts a lead on hold */
export async function holdLead(leadId: string, reason: string): Promise<void> {
  await supabase
    .from("leads" as any)
    .update({
      routing_status: "on_hold",
      operator_hold_reason: reason,
    } as any)
    .eq("id", leadId);
  toast.info("Lead placed on hold");
}

// ── Lead → Booking Conversion (hardened) ──

/**
 * Convert a qualified, partner-accepted lead into a booking.
 * Carries forward full metadata from demand_request → lead → booking.
 */
export async function convertLeadToBooking(
  leadId: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  // Fetch lead with all context
  const { data: lead, error: fetchErr } = await supabase
    .from("leads" as any)
    .select("*")
    .eq("id", leadId)
    .single();

  if (fetchErr || !lead) {
    toast.error("Lead not found");
    return { success: false, error: "lead_not_found" };
  }

  const l = lead as any;

  // Validation: must have an accepted partner
  if (!l.accepted_by_partner_id && !l.assigned_partner_id) {
    toast.error("Cannot convert — no partner assigned/accepted");
    return { success: false, error: "no_partner" };
  }

  const partnerId = l.accepted_by_partner_id || l.assigned_partner_id;

  // Create booking with full metadata carried forward
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert([{
      category_code: l.category_code,
      partner_id: partnerId,
      status: "awaiting_partner_confirmation" as const,
      assignment_mode: "ops_manual",
      dispatch_mode: "manual",
      booking_source: "demand_conversion",
      zone_code: l.zone_code || null,
      notes: [
        l.description,
        l.customer_name ? `Customer: ${l.customer_name}` : null,
        l.customer_phone ? `Phone: ${l.customer_phone}` : null,
        l.customer_location ? `Location: ${l.customer_location}` : null,
        l.operator_notes ? `Ops: ${l.operator_notes}` : null,
      ].filter(Boolean).join("\n"),
    }])
    .select("id")
    .single();

  if (bookingErr) {
    toast.error(`Booking creation failed: ${bookingErr.message}`);
    return { success: false, error: bookingErr.message };
  }

  // Link booking to lead and mark converted
  await supabase
    .from("leads" as any)
    .update({
      booking_id: booking.id,
      status: "converted",
      routing_status: "converted",
    } as any)
    .eq("id", leadId);

  // Also update the source demand_request if linked
  if (l.demand_request_id) {
    await supabase
      .from("demand_requests" as any)
      .update({ status: "converted", outcome: "converted" } as any)
      .eq("id", l.demand_request_id);
  }

  // Analytics
  await supabase.from("notification_events").insert({
    event_type: "lead_converted_to_booking",
    metadata: {
      lead_id: leadId,
      booking_id: booking.id,
      partner_id: partnerId,
      demand_request_id: l.demand_request_id,
      category_code: l.category_code,
      zone_code: l.zone_code,
    },
  });

  toast.success("Lead converted to booking");
  return { success: true, bookingId: booking.id };
}

// ── WhatsApp Message Payloads ──

export function buildPartnerAssignmentMessage(
  partnerName: string,
  categoryName: string,
  location: string | null,
  customerName: string | null
): string {
  return [
    `🚀 New Job Assignment — LankaFix`,
    ``,
    `Hi ${partnerName},`,
    ``,
    `Category: ${categoryName}`,
    location ? `Location: ${location}` : null,
    customerName ? `Customer: ${customerName}` : null,
    ``,
    `👉 Accept or Reject in the LankaFix Partner Portal`,
    `⏱ You have ${ACCEPT_WINDOW_MINUTES} minutes to respond.`,
  ].filter(Boolean).join("\n");
}

export function buildReassignmentMessage(
  partnerName: string,
  categoryName: string,
  reason: string
): string {
  return [
    `🔄 Reassigned Job — LankaFix`,
    ``,
    `Hi ${partnerName},`,
    `A ${categoryName} job has been reassigned to you.`,
    reason ? `Reason: ${reason}` : null,
    ``,
    `👉 Accept or Reject in the LankaFix Partner Portal`,
    `⏱ You have ${ACCEPT_WINDOW_MINUTES} minutes to respond.`,
  ].filter(Boolean).join("\n");
}
