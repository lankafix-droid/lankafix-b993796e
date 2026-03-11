/**
 * LankaFix — React hooks for partner data from Lovable Cloud
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerRow {
  id: string;
  full_name: string;
  business_name: string | null;
  phone_number: string;
  profile_photo_url: string | null;
  verification_status: "pending" | "verified" | "suspended";
  rating_average: number;
  completed_jobs_count: number;
  categories_supported: string[];
  specializations: string[];
  brand_specializations: string[];
  experience_years: number;
  base_latitude: number | null;
  base_longitude: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  current_job_count: number | null;
  service_zones: string[];
  availability_status: "online" | "offline" | "busy";
  emergency_available: boolean;
  active_job_id: string | null;
  strike_count: number;
  average_response_time_minutes: number;
  vehicle_type: string;
  acceptance_rate: number | null;
  cancellation_rate: number | null;
  on_time_rate: number | null;
  quote_approval_rate: number | null;
  performance_score: number | null;
  email: string | null;
  nic_number: string | null;
  provider_type: string | null;
  previous_company: string | null;
  tools_declared: string[] | null;
}

/** Fetch all verified, online/busy partners */
export function useOnlinePartners(category?: string) {
  return useQuery({
    queryKey: ["partners", "online", category],
    queryFn: async () => {
      let q = supabase
        .from("partners")
        .select("*")
        .eq("verification_status", "verified")
        .in("availability_status", ["online", "busy"]);

      if (category) {
        q = q.contains("categories_supported", [category]);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PartnerRow[];
    },
    refetchInterval: 20_000, // Auto-refresh every 20s
    staleTime: 10_000,
  });
}

/** Fetch all partners (for ops dashboard) */
export function useAllPartners() {
  return useQuery({
    queryKey: ["partners", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("rating_average", { ascending: false });
      if (error) throw error;
      return (data || []) as PartnerRow[];
    },
    staleTime: 30_000,
  });
}

/** Fetch service zones */
export function useServiceZones() {
  return useQuery({
    queryKey: ["service_zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_zones")
        .select("*")
        .eq("is_active", true)
        .order("zone_name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000 * 5, // Cache 5 minutes
  });
}
