/**
 * useAIConsentSync — Syncs AI consent preferences with backend for authenticated users.
 * Falls back to localStorage for unauthenticated users.
 * Non-blocking, silent sync. Advisory only.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAIConsent, setAIConsent, type AIConsentState } from "@/services/aiConsentService";

/**
 * Call this hook once (e.g. in App or settings page) to sync consent.
 * It hydrates from local first, then silently syncs with backend.
 */
export function useAIConsentSync() {
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;

    const sync = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Not authenticated, local-only

        // Try to load from backend profile metadata
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const serverPrefsRaw = (profile as any)?.ai_preferences;
        if (serverPrefsRaw && typeof serverPrefsRaw === "object") {
          // Server has preferences — merge with local (server wins for conflicts)
          const serverPrefs = serverPrefsRaw as Partial<AIConsentState>;
          const local = getAIConsent();

          // If server is newer, use server values
          if (serverPrefs.updated_at && serverPrefs.updated_at > local.updated_at) {
            setAIConsent(serverPrefs);
          } else {
            // Local is newer — push to server
            await pushConsentToServer(user.id, local);
          }
        } else {
          // No server preferences — push local to server
          const local = getAIConsent();
          await pushConsentToServer(user.id, local);
        }

        syncedRef.current = true;
      } catch {
        // Silent — consent sync should never block UX
      }
    };

    sync();
  }, []);
}

/** Push local consent to backend (fire-and-forget) */
async function pushConsentToServer(userId: string, consent: AIConsentState) {
  try {
    await supabase
      .from("profiles")
      .update({ ai_preferences: consent as any })
      .eq("user_id", userId);
  } catch {
    // Silent — local is the fallback
  }
}

/** Save consent locally and sync to server if authenticated */
export async function saveAndSyncConsent(updates: Partial<AIConsentState>) {
  const updated = setAIConsent(updates);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await pushConsentToServer(user.id, updated);
    }
  } catch {
    // Silent
  }
  return updated;
}
