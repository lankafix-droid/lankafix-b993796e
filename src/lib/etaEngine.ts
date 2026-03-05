/**
 * LankaFix ETA Engine
 * Estimates travel time with Sri Lankan traffic multipliers.
 */

export type TrafficLevel = "normal" | "peak" | "rain";

const TRAFFIC_MULTIPLIERS: Record<TrafficLevel, number> = {
  normal: 1.3,
  peak: 1.6,
  rain: 1.8,
};

/** Base travel time from distance (Sri Lankan road conditions) */
function getBaseMinutes(distanceKm: number): number {
  if (distanceKm < 3) return 10;
  if (distanceKm < 8) return 20;
  if (distanceKm < 15) return 40;
  return 60 + Math.round((distanceKm - 15) * 3);
}

/** Calculate ETA in minutes with traffic adjustment */
export function calculateETA(distanceKm: number, trafficLevel: TrafficLevel = "normal"): number {
  const base = getBaseMinutes(distanceKm);
  const multiplier = TRAFFIC_MULTIPLIERS[trafficLevel];
  return Math.round(base * multiplier);
}

/** Get a human-friendly ETA range string */
export function getETARange(etaMinutes: number): string {
  if (etaMinutes <= 15) return "within 15 minutes";
  if (etaMinutes <= 30) return "within 30 minutes";
  if (etaMinutes <= 60) return "within 1 hour";
  if (etaMinutes <= 120) return "within 2 hours";
  return "within 24 hours";
}

/** Detect current traffic level based on time of day */
export function detectTrafficLevel(): TrafficLevel {
  const hour = new Date().getHours();
  // Colombo peak hours: 7-9 AM, 5-7 PM
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) return "peak";
  return "normal";
}

/** Get traffic level label */
export function getTrafficLabel(level: TrafficLevel): string {
  switch (level) {
    case "normal": return "Normal traffic";
    case "peak": return "Peak hour traffic";
    case "rain": return "Rainy conditions";
  }
}
