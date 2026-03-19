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
import { getAcceptWindowMinutes, type ServiceArchetype } from "@/engines/archetypeTimeoutHelper";

const MAX_ASSIGNMENT_ATTEMPTS = 5;

export interface AssignmentResult {
  success: boolean;
  /** Always a lead.id — never a demand_request_id */
  leadId: string;
  partnerId?: string;
  error?: string;
}

// ── Assignment History Helper ──

interface AssignmentHistoryEntry {
  attempt: number;
  partner_id: string;
  partner_name: string;
  assigned_at: string;
  accept_by: string;
  response_status: "assigned" | "accepted" | "rejected" | "unavailable" | "expired" | "reassigned";
  response_at?: string | null;
  rejection_reason?: string | null;
  operator_notes?: string | null;
  reassigned_from_partner_id?: string | null;
  outcome?: string;
  reassignment_reason?: string;
  expired_at?: string;
}

function appendHistoryEntry(
  history: AssignmentHistoryEntry[],
  entry: Partial<AssignmentHistoryEntry> & Pick<AssignmentHistoryEntry, "attempt" | "partner_id" | "partner_name" | "assigned_at" | "accept_by">
): AssignmentHistoryEntry[] {
  return [...history, { response_status: "assigned", ...entry }];
}

// ── Assignment ──

/**
 * Assign a partner to a LEAD (not a demand_request).
 * Sets accept_by deadline (archetype-aware) and records assignment in history.
 */
export async function assignPartnerToLead(
  leadId: string,
  partnerId: string,
  partnerName: string,
  operatorNotes?: string,
  archetype?: ServiceArchetype
): Promise<AssignmentResult> {
  const now = new Date();
  const windowMinutes = getAcceptWindowMinutes(archetype);
  const acceptBy = new Date(now.getTime() + windowMinutes * 60000);

  // Fetch current lead state for history tracking
  const { data: existingLead } = await supabase
    .from("leads" as any)
    .select("assignment_attempt, assignment_history")
    .eq("id", leadId)
    .single();

  const currentAttempt = ((existingLead as any)?.assignment_attempt || 0) + 1;
  const history = ((existingLead as any)?.assignment_history || []) as AssignmentHistoryEntry[];

  // Append to assignment history for audit trail
  const updatedHistory = appendHistoryEntry(history, {
    attempt: currentAttempt,
    partner_id: partnerId,
    partner_name: partnerName,
    assigned_at: now.toISOString(),
    accept_by: acceptBy.toISOString(),
    response_status: "assigned",
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
      response_notes: null,
      assignment_sent_at: now.toISOString(),
      accept_by: acceptBy.toISOString(),
      assignment_attempt: currentAttempt,
      assignment_history: updatedHistory,
      routing_status: "awaiting_response",
      operator_notes: operatorNotes || (existingLead as any)?.operator_notes || null,
    } as any)
    .eq("id", leadId);

  if (error) {
    toast.error(`Assignment failed: ${error.message}`);
    return { success: false, leadId, error: error.message };
  }

  // Log analytics event
  await logRoutingEvent("lead_partner_assigned", {
    lead_id: leadId,
    partner_id: partnerId,
    partner_name: partnerName,
    attempt: currentAttempt,
    accept_window_minutes: windowMinutes,
    archetype: archetype || "unknown",
  });

  toast.success(`Assigned to ${partnerName} (attempt ${currentAttempt}, ${windowMinutes}m window)`);
  return { success: true, leadId, partnerId };
}

// ── Partner Accept / Reject / Unavailable ──

/** Partner accepts an assigned lead */
export async function partnerAcceptLead(
  leadId: string,
  partnerId: string
): Promise<AssignmentResult> {
  const now = new Date();

  // Fetch history to record acceptance
  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assignment_history")
    .eq("id", leadId)
    .single();

  const history = ((lead as any)?.assignment_history || []) as AssignmentHistoryEntry[];
  // Mark last entry as accepted
  if (history.length > 0) {
    const last = history[history.length - 1];
    last.response_status = "accepted";
    last.response_at = now.toISOString();
  }

  const { error } = await supabase
    .from("leads" as any)
    .update({
      partner_response_status: "accepted",
      partner_response_at: now.toISOString(),
      accepted_by_partner_id: partnerId,
      status: "accepted",
      routing_status: "accepted",
      assignment_history: history,
    } as any)
    .eq("id", leadId)
    .eq("assigned_partner_id", partnerId);

  if (error) {
    return { success: false, leadId, error: error.message };
  }

  await logRoutingEvent("lead_partner_accepted", { lead_id: leadId, partner_id: partnerId });
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

  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assignment_history")
    .eq("id", leadId)
    .single();

  const history = ((lead as any)?.assignment_history || []) as AssignmentHistoryEntry[];
  if (history.length > 0) {
    const last = history[history.length - 1];
    last.response_status = "rejected";
    last.response_at = now.toISOString();
    last.rejection_reason = reason;
  }

  const { error } = await supabase
    .from("leads" as any)
    .update({
      partner_response_status: "rejected",
      partner_response_at: now.toISOString(),
      rejection_reason: reason,
      assigned_partner_id: null,
      routing_status: "needs_reassignment",
      status: "qualified",
      assignment_history: history,
    } as any)
    .eq("id", leadId)
    .eq("assigned_partner_id", partnerId);

  if (error) {
    return { success: false, leadId, error: error.message };
  }

  await logRoutingEvent("lead_partner_rejected", { lead_id: leadId, partner_id: partnerId, reason });
  toast.info("Partner rejected — lead returned to queue for reassignment");
  return { success: true, leadId };
}

/**
 * Partner marks themselves temporarily unavailable for this assignment.
 * Lighter than a full rejection — doesn't count as a hard refusal.
 */
export async function partnerMarkUnavailable(
  leadId: string,
  partnerId: string,
  notes?: string
): Promise<AssignmentResult> {
  const now = new Date();

  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assignment_history")
    .eq("id", leadId)
    .single();

  const history = ((lead as any)?.assignment_history || []) as AssignmentHistoryEntry[];
  if (history.length > 0) {
    const last = history[history.length - 1];
    last.response_status = "unavailable";
    last.response_at = now.toISOString();
  }

  const { error } = await supabase
    .from("leads" as any)
    .update({
      partner_response_status: "unavailable",
      partner_response_at: now.toISOString(),
      response_notes: notes || "Temporarily unavailable",
      assigned_partner_id: null,
      routing_status: "needs_reassignment",
      status: "qualified",
      assignment_history: history,
    } as any)
    .eq("id", leadId)
    .eq("assigned_partner_id", partnerId);

  if (error) {
    return { success: false, leadId, error: error.message };
  }

  await logRoutingEvent("lead_partner_unavailable", { lead_id: leadId, partner_id: partnerId, notes });
  toast.info("Partner unavailable — lead returned to queue");
  return { success: true, leadId };
}

// ── Timeout / Expiry ──

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

  const history = ((lead as any)?.assignment_history || []) as AssignmentHistoryEntry[];
  if (history.length > 0) {
    const last = history[history.length - 1];
    last.response_status = "expired";
    last.expired_at = new Date().toISOString();
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

  await logRoutingEvent("lead_partner_expired", {
    lead_id: leadId,
    partner_id: (lead as any).assigned_partner_id,
  });
}

// ── Reassignment ──

/**
 * Reassign a lead to a different partner.
 * Excludes partners that already failed/expired for this lead.
 * Preserves the full assignment history for audit.
 */
export async function reassignLead(
  leadId: string,
  newPartnerId: string,
  newPartnerName: string,
  reason?: string,
  archetype?: ServiceArchetype
): Promise<AssignmentResult> {
  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assignment_attempt, assignment_history, assigned_partner_id")
    .eq("id", leadId)
    .single();

  const currentAttempt = (lead as any)?.assignment_attempt || 0;

  if (currentAttempt >= MAX_ASSIGNMENT_ATTEMPTS) {
    await supabase
      .from("leads" as any)
      .update({
        routing_status: "routing_failed",
        status: "qualified",
        operator_notes: `Max reassignment attempts (${MAX_ASSIGNMENT_ATTEMPTS}) reached. Manual intervention required.`,
      } as any)
      .eq("id", leadId);

    await logRoutingEvent("lead_no_supply", { lead_id: leadId, reason: "max_attempts_reached" });
    toast.error("Max reassignment attempts reached — escalated to operator review");
    return { success: false, leadId, error: "max_attempts_reached" };
  }

  // Mark previous assignment as reassigned in history
  const history = ((lead as any)?.assignment_history || []) as AssignmentHistoryEntry[];
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (!last.outcome) {
      last.outcome = "reassigned";
      last.reassignment_reason = reason || "timeout_or_manual";
    }
  }

  // Update history in DB before new assignment writes its own entry
  await supabase
    .from("leads" as any)
    .update({
      assignment_history: history,
      reassigned_from_partner_id: (lead as any)?.assigned_partner_id || null,
    } as any)
    .eq("id", leadId);

  await logRoutingEvent("lead_partner_reassigned", {
    lead_id: leadId,
    new_partner_id: newPartnerId,
    reason,
    attempt: currentAttempt + 1,
  });

  return assignPartnerToLead(leadId, newPartnerId, newPartnerName, reason, archetype);
}

/**
 * Get partner IDs that have already been tried (and failed) for this lead.
 * Used to exclude them from reassignment ranking.
 */
export function getExcludedPartnerIds(assignmentHistory: AssignmentHistoryEntry[] | null): string[] {
  if (!assignmentHistory) return [];
  return assignmentHistory
    .filter((h) => ["rejected", "unavailable", "expired", "reassigned"].includes(h.response_status) || h.outcome === "reassigned")
    .map((h) => h.partner_id);
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

  await logRoutingEvent("lead_no_supply", { lead_id: leadId, reason: notes });
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

  await logRoutingEvent("lead_converted_to_booking", {
    lead_id: leadId,
    booking_id: booking.id,
    partner_id: partnerId,
    demand_request_id: l.demand_request_id,
    category_code: l.category_code,
    zone_code: l.zone_code,
  });

  toast.success("Lead converted to booking");
  return { success: true, bookingId: booking.id };
}

// ── Analytics / Event Logging ──

async function logRoutingEvent(eventType: string, metadata: Record<string, unknown>) {
  await supabase.from("notification_events").insert([{
    event_type: eventType,
    metadata: metadata as any,
  }]);
}

// ── WhatsApp Message Payloads ──

export function buildPartnerAssignmentMessage(
  partnerName: string,
  categoryName: string,
  location: string | null,
  customerName: string | null,
  acceptWindowMinutes: number = 10
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
    `⏱ You have ${acceptWindowMinutes} minutes to respond.`,
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
  ].filter(Boolean).join("\n");
}

export function buildExpiredMessage(partnerName: string, categoryName: string): string {
  return [
    `⏰ Assignment Expired — LankaFix`,
    ``,
    `Hi ${partnerName},`,
    `Your ${categoryName} job assignment has expired as no response was received.`,
    `The job has been reassigned to another partner.`,
  ].filter(Boolean).join("\n");
}
