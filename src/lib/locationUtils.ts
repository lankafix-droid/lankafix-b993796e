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

/** Score distance for dispatch ranking (Sri Lankan traffic-aware) — V2 weight: 25 */
export function scoreDistance(distanceKm: number): number {
  if (distanceKm < 2) return 25;
  if (distanceKm < 5) return 22;
  if (distanceKm < 8) return 18;
  if (distanceKm < 12) return 12;
  if (distanceKm < 15) return 8;
  if (distanceKm < 25) return 4;
  return 0;
}

/** Sri Lankan dispatch defaults — V2 */
export const DISPATCH_DEFAULTS = {
  dispatchRadius: 15,
  emergencyRadius: 25,
  acceptWindow: 12,           // 12 seconds (V2)
  maxTechnicianJobs: 4,       // daily capacity default
  maxConcurrentJobs: 1,
  maxDispatchAttempts: 5,
  maxCandidates: 20,
  idleBoostMinutes: 30,       // idle > 30 min gets boost
  idleBoostPoints: 5,
  recentJobPenaltyThreshold: 5, // jobs today > 5 → penalty
  recentJobPenaltyPoints: 3,
  repeatCustomerBoost: 8,     // repeat customer match bonus
  subscriberBoost: 20,        // AMC subscriber priority
} as const;

/** Daily capacity by category */
export const CATEGORY_DAILY_CAPACITY: Record<string, number> = {
  AC: 4,
  CCTV: 3,
  IT: 6,
  MOBILE: 8,
  COPIER: 5,
  SOLAR: 2,
  SMART_HOME_OFFICE: 4,
  CONSUMER_ELEC: 5,
  PRINT_SUPPLIES: 10,
};
