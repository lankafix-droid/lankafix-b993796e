/**
 * Hook to manage service evidence for a booking.
 * Handles CRUD with Supabase service_evidence table.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServiceEvidenceData {
  id: string;
  booking_id: string;
  partner_id: string | null;
  customer_id: string | null;
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
  created_at: string;
  updated_at: string;
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
    } as ServiceEvidenceData);
    return data;
  }, [bookingId]);

  const confirmService = useCallback(async () => {
    return upsertEvidence({
      customer_confirmed: true,
      customer_confirmed_at: new Date().toISOString(),
      service_verified: true,
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
