/**
 * Hook to get the current authenticated user's partner record from Supabase.
 * Used across all partner-facing pages to replace MOCK_PARTNERS[0].
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerRow } from "./usePartners";

export function useCurrentPartner() {
  return useQuery({
    queryKey: ["current-partner"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as PartnerRow | null;
    },
    staleTime: 30_000,
  });
}

export function usePartnerBookings(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partner-bookings", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!partnerId,
    staleTime: 15_000,
  });
}

export function usePartnerQuotes(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partner-quotes", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("quotes")
        .select("*, bookings(category_code, service_type, zone_code)")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!partnerId,
    staleTime: 15_000,
  });
}

export function usePartnerSettlements(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partner-settlements", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("partner_settlements")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!partnerId,
    staleTime: 30_000,
  });
}
