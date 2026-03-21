/**
 * useCustomerProfile — Enhanced profile hook with Phase-1 serviceability,
 * weighted completion engine, consent management, and booking readiness checks.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { checkServiceability, type ServiceabilityResult } from "@/lib/serviceabilityEngine";
import { getCategoryOnboarding, BASE_BOOKING_REQUIREMENTS } from "@/lib/categoryOnboardingConfig";

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
  phone_verified: boolean | null;
  email_verified: boolean | null;
  primary_address_id: string | null;
  serviceability_status: string | null;
  last_selected_service_category: string | null;
  consent_flags: Record<string, any> | null;
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
  service_zone: string | null;
  phase1_serviceable: boolean | null;
  floor_or_unit: string | null;
  parking_notes: string | null;
  access_notes: string | null;
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
      return data as unknown as CustomerProfile;
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
      return (data || []) as unknown as SavedAddress[];
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<CustomerProfile>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
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
      // Auto-determine serviceability
      let serviceZone: string | null = null;
      let phase1Serviceable = false;
      if (address.latitude && address.longitude) {
        const result = checkServiceability(address.latitude, address.longitude);
        serviceZone = result.serviceZone;
        phase1Serviceable = result.phase1Serviceable;
      }
      const { error } = await supabase
        .from("customer_addresses")
        .insert({
          ...address,
          customer_id: user.id,
          service_zone: serviceZone,
          phase1_serviceable: phase1Serviceable,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
      toast.success("Address saved");
    },
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavedAddress> & { id: string }) => {
      // Re-check serviceability if coordinates changed
      let extra: any = {};
      if (updates.latitude && updates.longitude) {
        const result = checkServiceability(updates.latitude, updates.longitude);
        extra.service_zone = result.serviceZone;
        extra.phase1_serviceable = result.phase1Serviceable;
      }
      const { error } = await supabase
        .from("customer_addresses")
        .update({ ...updates, ...extra } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
      toast.success("Address updated");
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

  const setDefaultAddress = useMutation({
    mutationFn: async (addressId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Unset all defaults first
      await supabase
        .from("customer_addresses")
        .update({ is_default: false } as any)
        .eq("customer_id", user.id);
      // Set the new default
      const { error } = await supabase
        .from("customer_addresses")
        .update({ is_default: true } as any)
        .eq("id", addressId);
      if (error) throw error;
      // Update profile primary_address_id
      await supabase
        .from("profiles")
        .update({ primary_address_id: addressId } as any)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["customer-profile", user?.id] });
      toast.success("Default address updated");
    },
  });

  // Record consent
  const recordConsent = useMutation({
    mutationFn: async (params: { consentType: string; consentKey: string; accepted: boolean; context?: any }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("consent_records")
        .insert({
          user_id: user.id,
          consent_type: params.consentType,
          consent_key: params.consentKey,
          accepted: params.accepted,
          context: params.context || {},
        } as any);
      if (error) throw error;
      // Also update consent_flags on profile
      const flags = profileQuery.data?.consent_flags || {};
      await supabase
        .from("profiles")
        .update({ consent_flags: { ...flags, [params.consentKey]: params.accepted } } as any)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile", user?.id] });
    },
  });

  // Calculate weighted completion
  const p = profileQuery.data;
  const addresses = addressesQuery.data || [];
  const hasAddress = addresses.length > 0;
  const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
  const hasServiceableAddress = addresses.some(a => a.phase1_serviceable);

  const missingFields: string[] = [];
  if (p) {
    if (!p.full_name) missingFields.push("full_name");
    if (!p.phone) missingFields.push("phone");
    if (!p.email) missingFields.push("email");
    if (!p.district) missingFields.push("district");
  }
  if (!hasAddress) missingFields.push("address");

  // Weighted completion
  const completionPct = p
    ? Math.min(100,
        (p.full_name ? 15 : 0) +
        (p.email ? 15 : 0) +
        (p.phone ? 20 : 0) +
        (p.avatar_url ? 5 : 0) +
        (p.district ? 5 : 0) +
        (hasAddress ? 15 : 0) +
        (hasServiceableAddress ? 10 : 0) +
        (p.preferred_contact_method ? 5 : 0) +
        (p.onboarding_completed ? 10 : 0)
      )
    : 0;

  // Booking readiness for a given category
  function getBookingReadiness(categoryCode?: string): {
    ready: boolean;
    missing: string[];
    serviceability: ServiceabilityResult | null;
  } {
    const missing: string[] = [];

    if (!user) missing.push("authentication");
    if (!p?.full_name) missing.push("full_name");
    if (!p?.phone) missing.push("phone");
    if (!hasAddress) missing.push("address");

    // Serviceability check
    let serviceability: ServiceabilityResult | null = null;
    if (defaultAddr?.latitude && defaultAddr?.longitude) {
      serviceability = checkServiceability(defaultAddr.latitude, defaultAddr.longitude);
      if (!serviceability.phase1Serviceable) missing.push("serviceable_address");
    } else if (!hasServiceableAddress) {
      missing.push("serviceable_address");
    }

    // Category-specific requirements
    if (categoryCode) {
      const catConfig = getCategoryOnboarding(categoryCode);
      if (catConfig) {
        const consentFlags = p?.consent_flags || {};
        for (const field of catConfig.fields) {
          if (field.required && field.consentType && !consentFlags[field.consentType]) {
            missing.push(`consent:${field.consentType}`);
          }
        }
      }
    }

    return { ready: missing.length === 0, missing, serviceability };
  }

  return {
    profile: profileQuery.data,
    addresses,
    isLoading: profileQuery.isLoading,
    updateProfile,
    saveAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    recordConsent,
    missingFields,
    completionPct,
    hasAddress,
    hasServiceableAddress,
    defaultAddress: defaultAddr ?? null,
    getBookingReadiness,
  };
}
