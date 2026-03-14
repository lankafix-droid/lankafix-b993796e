/**
 * LankaFix — DB-first hooks for technician job views.
 * Replaces Zustand bookingStore dependency for technician pages.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentPartner } from "./useCurrentPartner";

export function useTechnicianJobs() {
  const { data: partner, isLoading: partnerLoading } = useCurrentPartner();

  const bookingsQuery = useQuery({
    queryKey: ["technician-jobs", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!partner?.id,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const offersQuery = useQuery({
    queryKey: ["technician-pending-offers", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase
        .from("dispatch_offers")
        .select("*, bookings(id, category_code, service_type, zone_code, is_emergency, estimated_price_lkr, service_mode, created_at, status)")
        .eq("partner_id", partner.id)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter out offers linked to cancelled/completed bookings
      return (data || []).filter((o: any) => {
        const bs = o.bookings?.status;
        return !bs || !["completed", "cancelled", "no_show"].includes(bs);
      });
    },
    enabled: !!partner?.id,
    refetchInterval: 10_000,
  });

  return {
    partner,
    partnerLoading,
    bookings: bookingsQuery.data || [],
    offers: offersQuery.data || [],
    isLoading: partnerLoading || bookingsQuery.isLoading,
  };
}

export function useTechnicianJobDetail(jobId: string | undefined) {
  const { data: partner } = useCurrentPartner();

  const bookingQuery = useQuery({
    queryKey: ["technician-job-detail", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    refetchInterval: 10_000,
  });

  const timelineQuery = useQuery({
    queryKey: ["technician-job-timeline", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("job_timeline")
        .select("*")
        .eq("booking_id", jobId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  const quotesQuery = useQuery({
    queryKey: ["technician-job-quotes", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("booking_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  return {
    partner,
    booking: bookingQuery.data,
    timeline: timelineQuery.data || [],
    quotes: quotesQuery.data || [],
    isLoading: bookingQuery.isLoading,
    refetchAll: () => {
      bookingQuery.refetch();
      timelineQuery.refetch();
      quotesQuery.refetch();
    },
  };
}
