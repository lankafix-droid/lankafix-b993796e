/**
 * LankaFix — Real-time technician location tracking hook.
 * Polls partner's current_latitude/longitude from DB for customer view.
 * Only active during travel-related statuses (tech_en_route).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateETA, detectTrafficLevel } from "@/lib/etaEngine";
import type { TrafficLevel } from "@/lib/etaEngine";
import { isProductionMode } from "@/config/productionMode";

export interface LiveTrackingData {
  technicianLat: number | null;
  technicianLng: number | null;
  customerLat: number | null;
  customerLng: number | null;
  distanceKm: number;
  etaMinutes: number;
  etaRange: string;
  trafficLevel: TrafficLevel;
  lastPingAt: string | null;
  isLive: boolean;
  partnerName: string;
  partnerRating: number;
  vehicleType: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getETARange(etaMinutes: number): string {
  if (etaMinutes <= 10) return "~10 minutes";
  if (etaMinutes <= 15) return "10-15 minutes";
  if (etaMinutes <= 25) return "15-25 minutes";
  if (etaMinutes <= 40) return "25-40 minutes";
  if (etaMinutes <= 60) return "40-60 minutes";
  return "1+ hours";
}

/** Statuses where live tracking polling is active */
const TRACKABLE_STATUSES = ["tech_en_route"];

/**
 * Poll technician location for a booking that is tech_en_route.
 * Stops polling when status changes away from travel state.
 */
export function useTechnicianTracking(
  bookingId: string | undefined,
  partnerId: string | null | undefined,
  bookingStatus?: string
) {
  const isTrackable = bookingStatus ? TRACKABLE_STATUSES.includes(bookingStatus) : true;

  return useQuery<LiveTrackingData | null>({
    queryKey: ["technician-tracking", bookingId, partnerId],
    queryFn: async () => {
      if (!bookingId || !partnerId) return null;

      const [partnerRes, bookingRes] = await Promise.all([
        supabase
          .from("partners")
          .select("current_latitude, current_longitude, last_location_ping_at, full_name, rating_average, vehicle_type")
          .eq("id", partnerId)
          .single(),
        supabase
          .from("bookings")
          .select("customer_latitude, customer_longitude")
          .eq("id", bookingId)
          .single(),
      ]);

      if (partnerRes.error || !partnerRes.data) return null;

      const partner = partnerRes.data;
      const booking = bookingRes.data;

      const techLat = partner.current_latitude;
      const techLng = partner.current_longitude;
      const custLat = booking?.customer_latitude ?? null;
      const custLng = booking?.customer_longitude ?? null;

      const lastPing = partner.last_location_ping_at;
      const isLive = lastPing ? (Date.now() - new Date(lastPing).getTime()) < 120_000 : false;

      let distanceKm = 0;
      let etaMinutes = 0;
      const traffic = detectTrafficLevel();

      if (techLat && techLng && custLat && custLng) {
        distanceKm = Math.round(haversineKm(techLat, techLng, custLat, custLng) * 10) / 10;
        etaMinutes = calculateETA(distanceKm, traffic);
      }

      return {
        technicianLat: techLat,
        technicianLng: techLng,
        customerLat: custLat,
        customerLng: custLng,
        distanceKm,
        etaMinutes,
        etaRange: getETARange(etaMinutes),
        trafficLevel: traffic,
        lastPingAt: lastPing,
        isLive,
        partnerName: partner.full_name || "Technician",
        partnerRating: partner.rating_average || 0,
        vehicleType: partner.vehicle_type || "motorcycle",
      };
    },
    enabled: !!bookingId && !!partnerId && isTrackable,
    refetchInterval: isTrackable ? 15_000 : false, // Only poll during travel
    staleTime: 10_000,
  });
}

/**
 * Push location from partner's device using browser Geolocation API.
 * In production mode, ONLY real GPS is used. Simulated fallback is dev-only.
 */
export async function pushPartnerLocation(
  partnerId: string,
  bookingId?: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // In production, fail cleanly. In dev, allow simulation.
      if (isProductionMode()) {
        resolve({ success: false, error: "Geolocation not supported" });
        return;
      }
      console.warn("[LocationPush] No geolocation, using dev simulation");
      simulateLocationPush(partnerId, bookingId).then(resolve);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const session = await supabase.auth.getSession();

          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/partner-location-push`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": anonKey,
                "Authorization": `Bearer ${session.data.session?.access_token || anonKey}`,
              },
              body: JSON.stringify({
                partner_id: partnerId,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                booking_id: bookingId,
              }),
            }
          );

          const data = await res.json();
          resolve({ success: res.ok, error: data.error });
        } catch (e: any) {
          resolve({ success: false, error: e.message });
        }
      },
      (err) => {
        // In production — no fallback, fail cleanly
        if (isProductionMode()) {
          console.warn("[LocationPush] Geolocation denied in production:", err.message);
          resolve({ success: false, error: `Geolocation denied: ${err.message}` });
          return;
        }
        // Dev/demo only — simulated fallback
        console.warn("[LocationPush] Geolocation failed, using DEV simulated fallback:", err.message);
        simulateLocationPush(partnerId, bookingId).then(resolve);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  });
}

/**
 * Simulated location push — ONLY available in demo/dev mode.
 * Uses random Colombo coordinates with slight drift.
 */
async function simulateLocationPush(
  partnerId: string,
  bookingId?: string
): Promise<{ success: boolean; error?: string }> {
  if (isProductionMode()) {
    return { success: false, error: "Simulated location not available in production" };
  }

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = await supabase.auth.getSession();

    const baseLat = 6.9271 + (Math.random() - 0.5) * 0.04;
    const baseLng = 79.8612 + (Math.random() - 0.5) * 0.04;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/partner-location-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${session.data.session?.access_token || anonKey}`,
        },
        body: JSON.stringify({
          partner_id: partnerId,
          latitude: baseLat,
          longitude: baseLng,
          accuracy: 15,
          booking_id: bookingId,
        }),
      }
    );

    const data = await res.json();
    return { success: res.ok, error: data.error };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
