/**
 * Hook to manage service evidence for a booking.
 * Handles CRUD with Supabase service_evidence table + photo upload via Storage.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MAINTENANCE_INTERVALS, getEvidenceRule } from "@/config/evidenceRules";
import { getServiceTypeWarranty, getServiceTypeReminderMonths } from "@/config/serviceTypeWarranty";

export interface ServiceEvidenceData {
  id: string;
  booking_id: string;
  partner_id: string | null;
  customer_id: string | null;
  uploaded_by_user_id: string | null;
  uploaded_by_role: string | null;
  category_code: string | null;
  device_id: string | null;
  before_photos: string[];
  before_notes: string | null;
  before_uploaded_at: string | null;
  after_photos: string[];
  after_notes: string | null;
  after_uploaded_at: string | null;
  completion_notes: string | null;
  technician_notes: string | null;
  customer_confirmed: boolean;
  customer_confirmed_at: string | null;
  customer_dispute: boolean;
  dispute_reason: string | null;
  dispute_opened_at: string | null;
  dispute_resolved_at: string | null;
  photo_consent: string;
  service_verified: boolean;
  evidence_required: boolean;
  min_before_photos: number;
  min_after_photos: number;
  warranty_activated: boolean;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_text: string | null;
  maintenance_due_date: string | null;
  visibility_mode: string;
  privacy_flags: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/** Compute warranty dates — service-type-aware with category fallback */
function computeWarranty(categoryCode: string, serviceType?: string | null): { startDate: string; endDate: string; text: string } {
  const now = new Date();
  const start = now.toISOString();

  // Try service-type-specific warranty first
  const stWarranty = getServiceTypeWarranty(serviceType);
  if (stWarranty) {
    const end = new Date(now.getTime() + stWarranty.durationDays * 86400000);
    return { startDate: start, endDate: end.toISOString(), text: stWarranty.text };
  }

  // Fallback to category defaults
  let durationDays = 30;
  let text = "30-day service warranty";
  switch (categoryCode) {
    case "MOBILE": durationDays = 60; text = "60-day screen/battery repair warranty"; break;
    case "IT": durationDays = 30; text = "30-day hardware/network warranty. Software: 14 days"; break;
    case "CONSUMER_ELEC": durationDays = 90; text = "90-day major repair warranty. Minor: 30 days"; break;
    case "AC": durationDays = 90; text = "90-day AC repair warranty — covers labour + parts"; break;
    case "ELECTRICAL": durationDays = 60; text = "60-day electrical repair warranty"; break;
    case "CCTV": case "SMART_HOME_OFFICE": case "HOME_SECURITY": durationDays = 90; text = "90-day installation & configuration warranty"; break;
    case "PLUMBING": durationDays = 30; text = "30-day plumbing service warranty"; break;
    case "SOLAR": case "POWER_BACKUP": durationDays = 90; text = "90-day installation warranty"; break;
    case "COPIER": durationDays = 30; text = "30-day copier/printer service warranty"; break;
    case "APPLIANCE_INSTALL": durationDays = 60; text = "60-day appliance installation warranty"; break;
  }
  const end = new Date(now.getTime() + durationDays * 86400000);
  return { startDate: start, endDate: end.toISOString(), text };
}

/** Compute maintenance reminder date — service-type-aware */
function computeMaintenanceDue(categoryCode: string, serviceType?: string | null): string | null {
  // Check service-type override first
  const stMonths = getServiceTypeReminderMonths(serviceType);
  if (stMonths === null) return null; // explicitly no reminder
  if (stMonths !== undefined) {
    const due = new Date();
    due.setMonth(due.getMonth() + stMonths);
    return due.toISOString();
  }
  // Category fallback
  const months = (MAINTENANCE_INTERVALS as Record<string, number>)[categoryCode];
  if (!months) return null;
  const due = new Date();
  due.setMonth(due.getMonth() + months);
  return due.toISOString();
}

/** Upload a photo file to Supabase Storage and return the path */
export async function uploadEvidencePhoto(
  file: File,
  bookingId: string,
  phase: "before" | "after"
): Promise<string | null> {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(file.type)) {
    toast.error("Only JPEG, PNG, or WebP images allowed");
    return null;
  }
  if (file.size > maxSize) {
    toast.error("Photo must be under 10MB");
    return null;
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${bookingId}/${phase}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("service-evidence")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) {
    console.error("Upload failed:", error);
    toast.error("Photo upload failed — please retry");
    return null;
  }
  return path;
}

/** Delete a photo from storage */
export async function deleteEvidencePhoto(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from("service-evidence").remove([path]);
  if (error) {
    console.error("Delete failed:", error);
    toast.error("Failed to remove photo");
    return false;
  }
  return true;
}

/** Get a signed URL for a storage path */
export async function getEvidencePhotoUrl(path: string): Promise<string> {
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage
    .from("service-evidence")
    .createSignedUrl(path, 3600);
  return data?.signedUrl || path;
}

/** Check if mandatory evidence is complete for a booking */
export function isEvidenceComplete(evidence: ServiceEvidenceData | null, categoryCode: string): boolean {
  const rule = getEvidenceRule(categoryCode);
  if (!evidence) return !rule.requiresBefore && !rule.requiresAfter;
  const beforeOk = !rule.requiresBefore || (evidence.before_photos?.length ?? 0) >= rule.minBeforePhotos;
  const afterOk = !rule.requiresAfter || (evidence.after_photos?.length ?? 0) >= rule.minAfterPhotos;
  return beforeOk && afterOk;
}

function parseEvidence(data: any): ServiceEvidenceData {
  return {
    ...data,
    before_photos: (data.before_photos as any) || [],
    after_photos: (data.after_photos as any) || [],
    privacy_flags: (data.privacy_flags as any) || {},
  } as ServiceEvidenceData;
}

export function useServiceEvidence(bookingId: string | undefined) {
  const [evidence, setEvidence] = useState<ServiceEvidenceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvidence = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    const { data } = await supabase
      .from("service_evidence")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (data) setEvidence(parseEvidence(data));
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  /** Upsert with correct ownership — does NOT blindly overwrite customer_id/partner_id */
  const upsertEvidence = useCallback(async (updates: Partial<ServiceEvidenceData>) => {
    if (!bookingId) return;
    const { data: { user } } = await supabase.auth.getUser();

    // Build payload without overwriting existing ownership fields
    const payload: any = {
      booking_id: bookingId,
      uploaded_by_user_id: user?.id ?? null,
      ...updates,
    };

    // Only set customer_id if explicitly passed; otherwise let DB keep existing
    if (!('customer_id' in updates)) {
      // For first insert, set from auth; for update, don't touch
      if (!evidence) {
        payload.customer_id = user?.id ?? null;
      } else {
        delete payload.customer_id;
      }
    }

    const { data, error } = await supabase
      .from("service_evidence")
      .upsert(payload, { onConflict: "booking_id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to update evidence:", error);
      toast.error("Failed to save evidence");
      return null;
    }
    setEvidence(parseEvidence(data));
    return data;
  }, [bookingId, evidence]);

  /** Customer confirms service — activates warranty and schedules reminder */
  const confirmService = useCallback(async (categoryCode?: string, serviceType?: string | null) => {
    const warranty = categoryCode ? computeWarranty(categoryCode, serviceType) : null;
    const maintenanceDue = categoryCode ? computeMaintenanceDue(categoryCode, serviceType) : null;

    return upsertEvidence({
      customer_confirmed: true,
      customer_confirmed_at: new Date().toISOString(),
      service_verified: true,
      uploaded_by_role: "customer",
      warranty_activated: !!warranty,
      warranty_start_date: warranty?.startDate ?? null,
      warranty_end_date: warranty?.endDate ?? null,
      warranty_text: warranty?.text ?? null,
      maintenance_due_date: maintenanceDue,
    } as any);
  }, [upsertEvidence]);

  /** Customer opens dispute — also creates support case & incident */
  const openDispute = useCallback(async (reason: string) => {
    const result = await upsertEvidence({
      customer_dispute: true,
      dispute_reason: reason,
      dispute_opened_at: new Date().toISOString(),
      uploaded_by_role: "customer",
    } as any);

    if (!result) return null;

    // Auto-create support case
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("support_cases" as any).insert({
        booking_id: bookingId,
        reported_by: user?.id,
        reporter_role: "customer",
        issue_type: "dispute",
        description: `Service dispute: ${reason}`,
        priority: "high",
        status: "open",
      } as any);
    } catch (e) {
      console.warn("Support case creation failed (table may not exist):", e);
    }

    // Auto-create incident event for ops visibility — standardized taxonomy
    try {
      await supabase.from("automation_event_log").insert({
        event_type: "service_dispute_opened",
        severity: "high",
        trigger_reason: `Customer dispute: ${reason}`,
        action_taken: "support_case_created",
        booking_id: bookingId,
        customer_id: evidence?.customer_id ?? null,
        metadata: { category: "trust_service_proof", dispute_reason: reason },
      } as any);
    } catch (e) {
      console.warn("Incident log failed:", e);
    }

    return result;
  }, [upsertEvidence, bookingId, evidence]);

  return {
    evidence,
    loading,
    refresh: fetchEvidence,
    upsertEvidence,
    confirmService,
    openDispute,
  };
}
