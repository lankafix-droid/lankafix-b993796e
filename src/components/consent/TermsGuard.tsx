/**
 * TermsGuard — wraps the app and shows ConsentGate if the
 * authenticated user hasn't accepted the current terms version.
 * Unauthenticated users pass through freely.
 */
import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, useTermsStatus } from "@/hooks/useTermsAcceptance";
import ConsentGate from "@/components/consent/ConsentGate";

export default function TermsGuard({ children }: { children: ReactNode }) {
  const { userId, role, isLoading: roleLoading } = useUserRole();
  const { data: termsStatus, isLoading: termsLoading } = useTermsStatus(userId, role);

  // Not logged in → pass through (public pages work fine)
  if (!userId) return <>{children}</>;

  // Still loading role or terms status
  if (roleLoading || termsLoading) return null;

  // Terms not yet accepted → show consent gate
  if (termsStatus && !termsStatus.accepted) {
    return (
      <ConsentGate
        userId={userId}
        role={role}
        onAccepted={() => {
          // Query will auto-invalidate via the mutation, triggering re-render
        }}
      />
    );
  }

  return <>{children}</>;
}
