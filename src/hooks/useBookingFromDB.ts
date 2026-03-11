/**
 * LankaFix — Fetch a real booking from the database for the tracker page.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DBBooking {
  id: string;
  customer_id: string;
  category_code: string;
  service_type: string | null;
  status: string;
  pricing_archetype: string;
  service_mode: string | null;
  is_emergency: boolean;
  device_details: Record<string, unknown>;
  customer_latitude: number | null;
  customer_longitude: number | null;
  customer_address: Record<string, unknown>;
  zone_code: string | null;
  estimated_price_lkr: number | null;
  final_price_lkr: number | null;
  notes: string | null;
  partner_id: string | null;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  booking_source: string | null;
  dispatch_status: string | null;
}

export interface DBTimelineEvent {
  id: string;
  booking_id: string;
  status: string;
  actor: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useBookingFromDB(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-db", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      return data as DBBooking;
    },
    enabled: !!bookingId && bookingId.length > 10,
    retry: 1,
    staleTime: 10_000,
    refetchInterval: 15_000, // Poll for dispatch updates
  });
}

export function useBookingTimeline(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-timeline", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from("job_timeline")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as DBTimelineEvent[];
    },
    enabled: !!bookingId && bookingId.length > 10,
    retry: 1,
    staleTime: 10_000,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as DBBooking[];
    },
    retry: 1,
    staleTime: 30_000,
  });
}
