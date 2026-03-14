/**
 * Hook to manage service evidence for a booking.
 * Handles CRUD with Supabase service_evidence table + photo upload via Storage.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MAINTENANCE_INTERVALS, getEvidenceRule } from "@/config/evidenceRules";

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

/** Compute warranty dates by category */
function computeWarranty(categoryCode: string): { startDate: string; endDate: string; text: string } {
  const now = new Date();
  const start = now.toISOString();
  let durationDays = 30;
  let text = "30-day service warranty";

  switch (categoryCode) {
    case "MOBILE":
      durationDays = 60;
      text = "60-day screen/battery repair warranty";
      break;
    case "IT":
      durationDays = 30;
      text = "30-day hardware/network warranty. Software: 14 days";
      break;
    case "CONSUMER_ELEC":
      durationDays = 90;
      text = "90-day major repair warranty. Minor: 30 days";
      break;
    case "AC":
      durationDays = 90;
      text = "90-day AC repair warranty — covers labour + parts";
      break;
    case "ELECTRICAL":
      durationDays = 60;
      text = "60-day electrical repair warranty";
      break;
    case "CCTV":
    case "SMART_HOME_OFFICE":
    case "HOME_SECURITY":
      durationDays = 90;
      text = "90-day installation & configuration warranty";
      break;
    case "PLUMBING":
      durationDays = 30;
      text = "30-day plumbing service warranty";
      break;
    case "SOLAR":
    case "POWER_BACKUP":
      durationDays = 90;
      text = "90-day installation warranty";
      break;
    case "COPIER":
      durationDays = 30;
      text = "30-day copier/printer service warranty";
      break;
    case "APPLIANCE_INSTALL":
      durationDays = 60;
      text = "60-day appliance installation warranty";
      break;
    default:
      break;
  }

  const end = new Date(now.getTime() + durationDays * 86400000);
  return { startDate: start, endDate: end.toISOString(), text };
}

/** Compute maintenance reminder date */
function computeMaintenanceDue(categoryCode: string): string | null {
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
  // Validate
  const maxSize = 10 * 1024 * 1024; // 10MB
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

/** Get a signed URL for a storage path */
export async function getEvidencePhotoUrl(path: string): Promise<string> {
  if (path.startsWith("http")) return path; // already a URL
  const { data } = await supabase.storage
    .from("service-evidence")
    .createSignedUrl(path, 3600); // 1 hour
  return data?.signedUrl || path;
}

export function useServiceEvidence(bookingId: string | undefined) {
  const [evidence, setEvidence] = useState<ServiceEvidenceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvidence = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_evidence")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (data) {
      setEvidence({
        ...data,
        before_photos: (data.before_photos as any) || [],
        after_photos: (data.after_photos as any) || [],
        privacy_flags: (data.privacy_flags as any) || {},
      } as ServiceEvidenceData);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const upsertEvidence = useCallback(async (updates: Partial<ServiceEvidenceData>) => {
    if (!bookingId) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("service_evidence")
      .upsert({
        booking_id: bookingId,
        customer_id: user?.id ?? null,
        uploaded_by_user_id: user?.id ?? null,
        ...updates,
      } as any, { onConflict: "booking_id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to update evidence:", error);
      toast.error("Failed to save evidence");
      return null;
    }

    setEvidence({
      ...data,
      before_photos: (data.before_photos as any) || [],
      after_photos: (data.after_photos as any) || [],
      privacy_flags: (data.privacy_flags as any) || {},
    } as ServiceEvidenceData);
    return data;
  }, [bookingId]);

  const confirmService = useCallback(async (categoryCode?: string) => {
    const warranty = categoryCode ? computeWarranty(categoryCode) : null;
    const maintenanceDue = categoryCode ? computeMaintenanceDue(categoryCode) : null;

    return upsertEvidence({
      customer_confirmed: true,
      customer_confirmed_at: new Date().toISOString(),
      service_verified: true,
      warranty_activated: !!warranty,
      warranty_start_date: warranty?.startDate ?? null,
      warranty_end_date: warranty?.endDate ?? null,
      warranty_text: warranty?.text ?? null,
      maintenance_due_date: maintenanceDue,
    } as any);
  }, [upsertEvidence]);

  const openDispute = useCallback(async (reason: string) => {
    return upsertEvidence({
      customer_dispute: true,
      dispute_reason: reason,
      dispute_opened_at: new Date().toISOString(),
    } as any);
  }, [upsertEvidence]);

  return {
    evidence,
    loading,
    refresh: fetchEvidence,
    upsertEvidence,
    confirmService,
    openDispute,
  };
}
