/**
 * LankaFix Auth Hook
 * Provides current auth state via Supabase listener.
 * Handles post-OAuth redirect recovery: reads saved redirectTo from
 * sessionStorage and navigates after SIGNED_IN event.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

// ─── Redirect persistence helpers ────────────────────────────

const REDIRECT_STORAGE_KEY = "lankafix_auth_redirect";
const OAUTH_PENDING_KEY = "lankafix_oauth_pending";

/** Paths that should never be stored as redirect targets */
const BLOCKED_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Sanitize a redirect path: only allow internal, relative paths.
 * Returns "/" for anything invalid.
 */
function sanitizeRedirect(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length === 0) return "/";
  // Block external URLs (protocol-relative or absolute)
  if (trimmed.startsWith("//") || trimmed.includes("://")) return "/";
  // Must start with /
  if (!trimmed.startsWith("/")) return "/";
  // Block auth pages
  if (BLOCKED_PATHS.some(p => trimmed.startsWith(p))) return "/";
  return trimmed;
}

/** Save the desired post-login route (call before OAuth redirect) */
export function saveAuthRedirect(path: string) {
  const safe = sanitizeRedirect(path);
  if (safe !== "/") {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, safe);
  }
}

/** Read and clear the saved redirect path (consume once) */
function consumeAuthRedirect(): string {
  const saved = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
  return sanitizeRedirect(saved);
}

/** Check and clear the pending OAuth flag */
function consumeOAuthPending(): boolean {
  const pending = sessionStorage.getItem(OAUTH_PENDING_KEY);
  sessionStorage.removeItem(OAUTH_PENDING_KEY);
  return pending === "1";
}

// ─── Auth hook ───────────────────────────────────────────────

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);

      // Reset sign-in guard on sign-out or null session
      if (event === "SIGNED_OUT" || !newSession) {
        handledSignIn.current = false;
        return;
      }

      // Handle post-OAuth recovery: navigate + toast exactly once per sign-in
      if (event === "SIGNED_IN" && newSession && !handledSignIn.current) {
        handledSignIn.current = true;

        // Read both values before clearing anything
        const wasPending = consumeOAuthPending();
        const redirectTo = consumeAuthRedirect();

        if (wasPending) {
          // Defer to avoid calling navigate during render cycle
          setTimeout(() => {
            toast.success("Welcome to LankaFix!");
            if (window.location.pathname !== redirectTo) {
              window.location.replace(redirectTo);
            }
          }, 50);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
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
