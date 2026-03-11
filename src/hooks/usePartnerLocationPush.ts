/**
 * LankaFix — Hook for partner location push (used in technician portal).
 * Starts/stops GPS polling when partner is en-route.
 */
import { useEffect, useRef, useCallback } from "react";
import { pushPartnerLocation } from "./useTechnicianTracking";

const PUSH_INTERVAL_MS = 20_000; // 20 seconds

/**
 * Automatically pushes location every 20s when active.
 * Only active when isActive=true (typically tech_en_route status).
 */
export function usePartnerLocationPush(
  partnerId: string | undefined,
  bookingId: string | undefined,
  isActive: boolean
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushLocation = useCallback(async () => {
    if (!partnerId) return;
    const result = await pushPartnerLocation(partnerId, bookingId);
    if (!result.success) {
      console.warn("[LocationPush] Failed:", result.error);
    }
  }, [partnerId, bookingId]);

  useEffect(() => {
    if (!isActive || !partnerId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Push immediately on start
    pushLocation();

    // Then poll
    intervalRef.current = setInterval(pushLocation, PUSH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, partnerId, pushLocation]);
}
