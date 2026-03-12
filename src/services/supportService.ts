/**
 * Support Service for LankaFix
 * Handles support case CRUD for booking-related issues.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SupportCase {
  id: string;
  booking_id: string | null;
  user_id: string;
  issue_type: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
}

export const CUSTOMER_ISSUE_TYPES = [
  { value: "technician_late", label: "Technician is late" },
  { value: "technician_no_show", label: "Technician didn't show up" },
  { value: "pricing_dispute", label: "Pricing dispute" },
  { value: "service_quality_issue", label: "Service quality issue" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
];

export const PARTNER_ISSUE_TYPES = [
  { value: "customer_not_available", label: "Customer not available" },
  { value: "location_issue", label: "Location issue" },
  { value: "job_complexity_mismatch", label: "Job complexity mismatch" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "other", label: "Other" },
];

export async function createSupportCase(opts: {
  bookingId: string;
  userId: string;
  issueType: string;
  description: string;
  priority?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("support_cases" as any)
    .insert({
      booking_id: opts.bookingId,
      user_id: opts.userId,
      issue_type: opts.issueType,
      description: opts.description,
      priority: opts.priority || (opts.issueType === "safety_concern" ? "high" : "normal"),
      status: "open",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: (data as any)?.id };
}

export async function getSupportCases(filters?: {
  status?: string;
  limit?: number;
}): Promise<SupportCase[]> {
  let query = supabase
    .from("support_cases" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 100);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[SupportService] Fetch failed:", error.message);
    return [];
  }
  return (data as unknown as SupportCase[]) || [];
}

export async function assignSupportCase(caseId: string, assignedTo: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from("support_cases" as any)
    .update({ assigned_to: assignedTo, status: "in_progress" })
    .eq("id", caseId);
  return { success: !error };
}

export async function resolveSupportCase(caseId: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from("support_cases" as any)
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", caseId);
  return { success: !error };
}
