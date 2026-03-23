/**
 * LankaFix Auth Hook
 * Provides current auth state via Supabase listener.
 * Handles post-OAuth redirect recovery: reads saved redirectTo from
 * sessionStorage and navigates after SIGNED_IN event.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

/** Key used to persist the post-login redirect path across OAuth redirects */
const REDIRECT_STORAGE_KEY = "lankafix_auth_redirect";

/** Save the desired post-login route (call before OAuth redirect) */
export function saveAuthRedirect(path: string) {
  if (path && path !== "/login" && path !== "/signup") {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, path);
  }
}

/** Consume (read + clear) the saved redirect path */
function consumeAuthRedirect(): string {
  const saved = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
  return saved || "/";
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const handledSignIn = useRef(false);

  useEffect(() => {
    // Set up listener BEFORE getSession per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Handle post-OAuth recovery: navigate + toast exactly once per sign-in
      if (event === "SIGNED_IN" && session && !handledSignIn.current) {
        handledSignIn.current = true;
        // Use setTimeout to avoid calling navigate during render
        setTimeout(() => {
          const redirectTo = consumeAuthRedirect();
          // Only show welcome toast if coming from an OAuth redirect (page reload)
          // The saved redirect key existing means this was an OAuth flow
          if (redirectTo !== "/" || sessionStorage.getItem("lankafix_oauth_pending")) {
            sessionStorage.removeItem("lankafix_oauth_pending");
            toast.success("Welcome to LankaFix!");
            // Navigate via window.location for OAuth returns (no React Router context guaranteed)
            if (window.location.pathname !== redirectTo) {
              window.location.replace(redirectTo);
            }
          }
        }, 50);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
  };
}
