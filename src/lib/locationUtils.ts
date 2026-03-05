/**
 * LankaFix Location Utilities
 * Haversine distance calculation and zone-aware helpers for Sri Lankan dispatch.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine formula — returns distance in km between two geo points */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
}

/** Score distance for dispatch ranking (Sri Lankan traffic-aware) */
export function scoreDistance(distanceKm: number): number {
  if (distanceKm < 3) return 25;
  if (distanceKm < 8) return 20;
  if (distanceKm < 15) return 10;
  return 0;
}

/** Sri Lankan dispatch defaults */
export const DISPATCH_DEFAULTS = {
  dispatchRadius: 15,
  emergencyRadius: 25,
  acceptWindow: 60,
  maxTechnicianJobs: 3,
  maxDispatchAttempts: 5,
  maxCandidates: 20,
} as const;
