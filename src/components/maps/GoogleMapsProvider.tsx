/**
 * LankaFix — Google Maps Provider
 * Fetches API key from backend, then loads Google Maps JS API.
 * Graceful degradation if key unavailable.
 */
import { LoadScript, Libraries } from "@react-google-maps/api";
import { ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LIBRARIES: Libraries = ["places"];

// Cache the key in memory after first fetch
let cachedKey: string | null = null;

interface Props {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(cachedKey);
  const [loading, setLoading] = useState(!cachedKey);

  useEffect(() => {
    if (cachedKey) return;
    supabase.functions
      .invoke("google-maps-config")
      .then(({ data }) => {
        const key = data?.key || null;
        cachedKey = key;
        setApiKey(key);
      })
      .catch(() => setApiKey(null))
      .finally(() => setLoading(false));
  }, []);

  // Still loading key — render children without maps
  if (loading || !apiKey) {
    return <>{children}</>;
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={LIBRARIES}>
      {children}
    </LoadScript>
  );
}

/** Check if Google Maps is loaded (for conditional rendering) */
export function useGoogleMapsLoaded(): boolean {
  return typeof google !== "undefined" && !!google.maps;
}
