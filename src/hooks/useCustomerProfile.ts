/**
 * useCustomerProfile — Production-grade profile hook with Phase-1 serviceability,
 * weighted completion, consent management, and category-aware booking readiness.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { checkServiceability, type ServiceabilityResult } from "@/lib/serviceabilityEngine";
import { getCategoryRules, checkEscalationRules as runEscalationRules, type AddressVerificationState } from "@/lib/categoryOnboardingConfig";

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
  verification_state: AddressVerificationState;
  admin_serviceability_override: boolean | null;
  created_at: string;
}

export interface BookingReadiness {
  ready: boolean;
  missing: string[];
  errors: string[];
  serviceability: ServiceabilityResult | null;
  escalations: { action: string; message: string; severity: string }[];
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

  const consentsQuery = useQuery({
    queryKey: ["customer-consents", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("consent_records")
        .select("consent_key, accepted")
        .eq("user_id", user.id)
        .eq("accepted", true);
      if (error) throw error;
      return (data || []).map(r => r.consent_key);
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
    onError: (err: any) => toast.error(err.message || "Failed to update profile"),
  });

  const saveAddress = useMutation({
    mutationFn: async (address: Omit<SavedAddress, "id" | "customer_id" | "created_at" | "verification_state" | "admin_serviceability_override">) => {
      if (!user) throw new Error("Not authenticated");
      let serviceZone: string | null = null;
      let phase1Serviceable = false;
      let verificationState: AddressVerificationState = "needs_verification";

      if (address.latitude && address.longitude) {
        const result = checkServiceability(address.latitude, address.longitude);
        serviceZone = result.serviceZone;
        phase1Serviceable = result.phase1Serviceable;
        verificationState = result.status === "inside" ? "verified_serviceable"
          : result.status === "edge" ? "edge_serviceable"
          : "outside_coverage";
      }

      const { error } = await supabase
        .from("customer_addresses")
        .insert({
          ...address,
          customer_id: user.id,
          service_zone: serviceZone,
          phase1_serviceable: phase1Serviceable,
          verification_state: verificationState,
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
      let extra: any = {};
      if (updates.latitude && updates.longitude) {
        const result = checkServiceability(updates.latitude, updates.longitude);
        extra.service_zone = result.serviceZone;
        extra.phase1_serviceable = result.phase1Serviceable;
        extra.verification_state = result.status === "inside" ? "verified_serviceable"
          : result.status === "edge" ? "edge_serviceable" : "outside_coverage";
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
      const addresses = addressesQuery.data || [];
      const target = addresses.find(a => a.id === addressId);
      if (target?.is_default && addresses.filter(a => a.phase1_serviceable).length <= 1) {
        throw new Error("Cannot delete your only serviceable default address. Add another address first.");
      }
      const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] }),
    onError: (err: any) => toast.error(err.message),
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (addressId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("set_default_address_safe", {
        _user_id: user.id,
        _address_id: addressId,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || "Failed to set default");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["customer-profile", user?.id] });
      toast.success("Default address updated");
    },
  });

  const recordConsent = useMutation({
    mutationFn: async (params: { consentType: string; consentKey: string; accepted: boolean; context?: any }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("consent_records").insert({
        user_id: user.id,
        consent_type: params.consentType,
        consent_key: params.consentKey,
        accepted: params.accepted,
        context: params.context || {},
      } as any);
      if (error) throw error;
      const flags = profileQuery.data?.consent_flags || {};
      await supabase
        .from("profiles")
        .update({ consent_flags: { ...flags, [params.consentKey]: params.accepted } } as any)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["customer-consents", user?.id] });
    },
  });

  // Derived state
  const p = profileQuery.data;
  const addresses = addressesQuery.data || [];
  const acceptedConsents = consentsQuery.data || [];
  const hasAddress = addresses.length > 0;
  const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
  const hasServiceableAddress = addresses.some(a =>
    a.phase1_serviceable || a.admin_serviceability_override
  );

  const missingFields: string[] = [];
  if (p) {
    if (!p.full_name) missingFields.push("full_name");
    if (!p.phone) missingFields.push("phone");
    if (!p.email) missingFields.push("email");
    if (!p.district) missingFields.push("district");
  }
  if (!hasAddress) missingFields.push("address");

  const completionPct = p
    ? Math.min(100,
        (p.full_name ? 15 : 0) + (p.email ? 15 : 0) + (p.phone ? 20 : 0) +
        (p.avatar_url ? 5 : 0) + (p.district ? 5 : 0) + (hasAddress ? 15 : 0) +
        (hasServiceableAddress ? 10 : 0) + (p.preferred_contact_method ? 5 : 0) +
        (p.onboarding_completed ? 10 : 0)
      )
    : 0;

  /** Category-aware booking readiness check */
  function getBookingReadiness(categoryCode?: string, categoryAnswers?: Record<string, any>): BookingReadiness {
    const missing: string[] = [];
    const errors: string[] = [];
    const escalations: { action: string; message: string; severity: string }[] = [];

    if (!user) missing.push("authentication");
    if (!p?.full_name) missing.push("full_name");
    if (!p?.phone) missing.push("phone");
    if (!hasAddress) missing.push("address");

    // Serviceability
    let serviceability: ServiceabilityResult | null = null;
    if (defaultAddr?.latitude && defaultAddr?.longitude) {
      serviceability = checkServiceability(defaultAddr.latitude, defaultAddr.longitude);
      if (!serviceability.phase1Serviceable && !defaultAddr.admin_serviceability_override) {
        errors.push("address_outside_coverage");
      }
    } else if (defaultAddr && !defaultAddr.admin_serviceability_override) {
      missing.push("address_coordinates");
    } else if (!hasServiceableAddress) {
      missing.push("serviceable_address");
    }

    // Address verification state
    if (defaultAddr?.verification_state === "needs_verification" && !defaultAddr.admin_serviceability_override) {
      missing.push("address_verification");
    }

    // Category rules
    if (categoryCode) {
      const rules = getCategoryRules(categoryCode);

      // Required profile fields
      for (const field of rules.requiredProfileFields) {
        if (!p?.[field as keyof CustomerProfile] && !missing.includes(field)) {
          missing.push(field);
        }
      }

      // Required address fields
      if (defaultAddr) {
        for (const field of rules.requiredAddressFields) {
          if (!defaultAddr[field as keyof SavedAddress]) {
            missing.push(`address_${field}`);
          }
        }
      }

      // Required consents
      for (const consentKey of rules.requiredConsents) {
        if (!acceptedConsents.includes(consentKey) && !(p?.consent_flags as any)?.[consentKey]) {
          missing.push(`consent:${consentKey}`);
        }
      }

      // Required category answers
      if (categoryAnswers) {
        const requiredFields = rules.fields.filter(f => f.required);
        for (const field of requiredFields) {
          // Skip conditional fields that shouldn't be visible
          if (field.showWhen && !field.showWhen.values.includes(categoryAnswers[field.showWhen.field])) continue;
          if (field.consentType) continue; // handled by consents above
          if (!categoryAnswers[field.key]) {
            missing.push(`category:${field.key}`);
          }
        }

        // Check escalation rules
        const { checkEscalationRules: checkRules } = await import("@/lib/categoryOnboardingConfig");
        const fired = checkRules(categoryCode, categoryAnswers);
        for (const rule of fired) {
          escalations.push({ action: rule.action, message: rule.message, severity: rule.severity });
        }
      }
    }

    return {
      ready: missing.length === 0 && errors.length === 0,
      missing,
      errors,
      serviceability,
      escalations,
    };
  }

  /** Validate booking readiness via backend RPC */
  async function validateBookingBackend(categoryCode: string, addressId?: string) {
    if (!user) return { ready: false, missing: ["authentication"], errors: [] };
    const { data, error } = await supabase.rpc("validate_booking_readiness", {
      _user_id: user.id,
      _category_code: categoryCode,
      _address_id: addressId || null,
    });
    if (error) throw error;
    return data as { ready: boolean; missing: string[]; errors: string[]; admin_override: boolean };
  }

  return {
    profile: profileQuery.data,
    addresses,
    acceptedConsents,
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
    validateBookingBackend,
  };
}
