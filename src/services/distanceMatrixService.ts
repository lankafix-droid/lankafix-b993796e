/**
 * LankaFix — Distance Matrix client helper
 * Calls the server-side distance-matrix edge function for real Google-powered ETA.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DistanceMatrixResult {
  distance_meters: number;
  distance_text: string;
  duration_seconds: number;
  duration_text: string;
  duration_in_traffic_seconds: number | null;
  duration_in_traffic_text: string | null;
  origin: string;
  destination: string;
}

/**
 * Get real driving distance & duration between two points via Google Distance Matrix.
 * Falls back to null if unavailable.
 */
export async function getDistanceMatrix(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: "driving" | "walking" | "bicycling" = "driving"
): Promise<DistanceMatrixResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("distance-matrix", {
      body: {
        origins: `${originLat},${originLng}`,
        destinations: `${destLat},${destLng}`,
        mode,
      },
    });

    if (error || !data || data.error) {
      console.warn("[DistanceMatrix] API error:", error || data?.error);
      return null;
    }

    return data as DistanceMatrixResult;
  } catch (err) {
    console.warn("[DistanceMatrix] Failed:", err);
    return null;
  }
}
