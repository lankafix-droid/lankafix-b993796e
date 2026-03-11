/**
 * Hook to check and record role-based terms acceptance.
 * Checks if the current user has accepted all required policy groups
 * for the current terms version.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

// Bump this when terms change materially — triggers re-acceptance
export const CURRENT_TERMS_VERSION = "1.0";

export const CUSTOMER_POLICY_GROUPS = [
  "customer_terms",
  "payment_commission_rules",
  "privacy_policy",
] as const;

export const PROVIDER_POLICY_GROUPS = [
  "provider_terms",
  "payment_commission_rules",
  "privacy_policy",
] as const;

export type UserRole = "customer" | "provider";

/** Detect whether current user is a provider (has a partners record) */
export function useUserRole() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const partnerQuery = useQuery({
    queryKey: ["user-role-check", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 60_000 * 10,
  });

  const isProvider = !!partnerQuery.data;
  const role: UserRole = isProvider ? "provider" : "customer";

  return { userId, role, isProvider, isLoading: partnerQuery.isLoading && !!userId };
}

/** Check if user has accepted all required policies for their role */
export function useTermsStatus(userId: string | null, role: UserRole) {
  const requiredGroups = role === "provider" ? PROVIDER_POLICY_GROUPS : CUSTOMER_POLICY_GROUPS;

  return useQuery({
    queryKey: ["terms-acceptance", userId, role, CURRENT_TERMS_VERSION],
    queryFn: async () => {
      if (!userId) return { accepted: false, missing: [...requiredGroups] };

      const { data, error } = await supabase
        .from("terms_acceptances")
        .select("policy_group")
        .eq("user_id", userId)
        .eq("terms_version", CURRENT_TERMS_VERSION)
        .in("policy_group", [...requiredGroups]);

      if (error) throw error;

      const acceptedGroups = new Set((data || []).map((r: any) => r.policy_group));
      const missing = requiredGroups.filter((g) => !acceptedGroups.has(g));

      return { accepted: missing.length === 0, missing };
    },
    enabled: !!userId,
    staleTime: 60_000 * 5,
  });
}

/** Record acceptance of all required policy groups */
export function useAcceptTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const groups = role === "provider" ? PROVIDER_POLICY_GROUPS : CUSTOMER_POLICY_GROUPS;

      const records = groups.map((pg) => ({
        user_id: userId,
        role,
        policy_group: pg,
        terms_version: CURRENT_TERMS_VERSION,
        platform_source: "web",
        session_info: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          screenWidth: window.innerWidth,
        },
      }));

      const { error } = await supabase
        .from("terms_acceptances")
        .upsert(records, { onConflict: "user_id,policy_group,terms_version" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms-acceptance"] });
    },
  });
}
