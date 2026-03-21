/**
 * useCustomerProfile — fetches and manages the customer profile with progressive completion tracking.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  district: string | null;
  preferred_contact_method: string | null;
  auth_providers: string[] | null;
  profile_completion_pct: number | null;
  onboarding_completed: boolean | null;
  default_address: any;
  ai_preferences: any;
  created_at: string;
  updated_at: string;
}

export interface SavedAddress {
  id: string;
  customer_id: string;
  label: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  district: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  zone_code: string | null;
  is_default: boolean | null;
  created_at: string;
}

export function useCustomerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as CustomerProfile;
    },
    enabled: !!user,
  });

  const addressesQuery = useQuery({
    queryKey: ["customer-addresses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", user.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as SavedAddress[];
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<CustomerProfile>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile", user?.id] });
      toast.success("Profile updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const saveAddress = useMutation({
    mutationFn: async (address: Omit<SavedAddress, "id" | "customer_id" | "created_at">) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("customer_addresses")
        .insert({ ...address, customer_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
      toast.success("Address saved");
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", addressId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
    },
  });

  // Calculate what fields are missing for progressive prompting
  const missingFields: string[] = [];
  const p = profileQuery.data;
  if (p) {
    if (!p.full_name) missingFields.push("full_name");
    if (!p.phone) missingFields.push("phone");
    if (!p.email) missingFields.push("email");
    if (!p.district) missingFields.push("district");
  }
  const hasAddress = (addressesQuery.data?.length ?? 0) > 0;
  if (!hasAddress) missingFields.push("address");

  const completionPct = p
    ? Math.min(100, 
        (p.full_name ? 15 : 0) +
        (p.email ? 15 : 0) +
        (p.phone ? 20 : 0) +
        (p.avatar_url ? 10 : 0) +
        (p.district ? 10 : 0) +
        (hasAddress ? 20 : 0) +
        (p.preferred_contact_method ? 10 : 0)
      )
    : 0;

  return {
    profile: profileQuery.data,
    addresses: addressesQuery.data || [],
    isLoading: profileQuery.isLoading,
    updateProfile,
    saveAddress,
    deleteAddress,
    missingFields,
    completionPct,
    hasAddress,
  };
}
