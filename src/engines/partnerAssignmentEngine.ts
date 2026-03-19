/**
 * Partner Assignment Engine
 * Handles lead → partner assignment with SLA tracking and reassignment logic.
 * Advisory-only: operators approve all assignments.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCEPT_WINDOW_MINUTES = 10;

export interface AssignmentResult {
  success: boolean;
  leadId: string;
  partnerId?: string;
  error?: string;
}

/** Assign a partner to a lead with SLA tracking */
export async function assignPartnerToLead(
  leadId: string,
  partnerId: string,
  partnerName: string
): Promise<AssignmentResult> {
  const now = new Date();
  const acceptBy = new Date(now.getTime() + ACCEPT_WINDOW_MINUTES * 60000);

  const { error } = await supabase
    .from("leads" as any)
    .update({
      assigned_partner_id: partnerId,
      status: "assigned",
      assignment_sent_at: now.toISOString(),
      accept_by: acceptBy.toISOString(),
      assignment_attempt: 1,
    } as any)
    .eq("id", leadId);

  if (error) {
    toast.error(`Assignment failed: ${error.message}`);
    return { success: false, leadId, error: error.message };
  }

  toast.success(`Assigned to ${partnerName}`);
  return { success: true, leadId, partnerId };
}

/** Reassign a lead to a different partner */
export async function reassignLead(
  leadId: string,
  newPartnerId: string,
  newPartnerName: string,
  previousPartnerId: string
): Promise<AssignmentResult> {
  const now = new Date();
  const acceptBy = new Date(now.getTime() + ACCEPT_WINDOW_MINUTES * 60000);

  // Get current attempt count
  const { data: lead } = await supabase
    .from("leads" as any)
    .select("assignment_attempt")
    .eq("id", leadId)
    .single();

  const attempt = ((lead as any)?.assignment_attempt || 0) + 1;

  const { error } = await supabase
    .from("leads" as any)
    .update({
      assigned_partner_id: newPartnerId,
      reassigned_from_partner_id: previousPartnerId,
      status: "assigned",
      assignment_sent_at: now.toISOString(),
      accept_by: acceptBy.toISOString(),
      assignment_attempt: attempt,
    } as any)
    .eq("id", leadId);

  if (error) {
    toast.error(`Reassignment failed: ${error.message}`);
    return { success: false, leadId, error: error.message };
  }

  toast.success(`Reassigned to ${newPartnerName} (attempt ${attempt})`);
  return { success: true, leadId, partnerId: newPartnerId };
}

/** Convert a qualified lead into a booking */
export async function convertLeadToBooking(
  leadId: string,
  categoryCode: string,
  partnerId: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  // Create booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      category_code: categoryCode,
      partner_id: partnerId,
      status: "pending",
      assignment_mode: "ops_manual",
      dispatch_mode: "manual",
      booking_source: "demand_conversion",
    })
    .select("id")
    .single();

  if (bookingErr) {
    toast.error(`Booking creation failed: ${bookingErr.message}`);
    return { success: false, error: bookingErr.message };
  }

  // Link booking to lead
  await supabase
    .from("leads" as any)
    .update({
      booking_id: booking.id,
      status: "converted",
    } as any)
    .eq("id", leadId);

  toast.success("Lead converted to booking");
  return { success: true, bookingId: booking.id };
}
