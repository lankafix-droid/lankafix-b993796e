/**
 * Phase-1 Serviceability Engine
 * Geo-fencing for Greater Colombo launch zones.
 * Determines whether an address is within LankaFix Phase-1 coverage.
 */

import { calculateDistance } from "./locationUtils";

/** Phase-1 service zones with center coordinates */
export const PHASE1_ZONES = [
  { code: "col_01", label: "Colombo 01 – Fort", lat: 6.9344, lng: 79.8428 },
  { code: "col_02", label: "Colombo 02 – Slave Island", lat: 6.9260, lng: 79.8530 },
  { code: "col_03", label: "Colombo 03 – Kollupitiya", lat: 6.9110, lng: 79.8530 },
  { code: "col_04", label: "Colombo 04 – Bambalapitiya", lat: 6.8960, lng: 79.8570 },
  { code: "col_05", label: "Colombo 05 – Havelock Town", lat: 6.8830, lng: 79.8620 },
  { code: "col_06", label: "Colombo 06 – Wellawatte", lat: 6.8730, lng: 79.8600 },
  { code: "col_07", label: "Colombo 07 – Cinnamon Gardens", lat: 6.9060, lng: 79.8640 },
  { code: "col_08", label: "Colombo 08 – Borella", lat: 6.9230, lng: 79.8750 },
  { code: "col_09", label: "Colombo 09 – Dematagoda", lat: 6.9390, lng: 79.8750 },
  { code: "col_10", label: "Colombo 10 – Maradana", lat: 6.9300, lng: 79.8630 },
  { code: "col_11", label: "Colombo 11 – Pettah", lat: 6.9400, lng: 79.8510 },
  { code: "col_12", label: "Colombo 12 – Hulftsdorp", lat: 6.9440, lng: 79.8600 },
  { code: "col_13", label: "Colombo 13 – Kotahena", lat: 6.9490, lng: 79.8590 },
  { code: "col_14", label: "Colombo 14 – Grandpass", lat: 6.9510, lng: 79.8680 },
  { code: "col_15", label: "Colombo 15 – Mattakkuliya", lat: 6.9580, lng: 79.8670 },
  { code: "rajagiriya", label: "Rajagiriya", lat: 6.9065, lng: 79.8985 },
  { code: "battaramulla", label: "Battaramulla", lat: 6.8970, lng: 79.9180 },
  { code: "nawala", label: "Nawala", lat: 6.8940, lng: 79.8890 },
  { code: "nugegoda", label: "Nugegoda", lat: 6.8720, lng: 79.8890 },
  { code: "dehiwala", label: "Dehiwala", lat: 6.8510, lng: 79.8650 },
  { code: "mount_lavinia", label: "Mount Lavinia", lat: 6.8380, lng: 79.8630 },
  { code: "thalawathugoda", label: "Thalawathugoda", lat: 6.8710, lng: 79.9240 },
  { code: "negombo", label: "Negombo", lat: 7.2110, lng: 79.8380 },
  { code: "wattala", label: "Wattala", lat: 6.9890, lng: 79.8910 },
  { code: "moratuwa", label: "Moratuwa", lat: 6.7730, lng: 79.8820 },
] as const;

export type ServiceabilityResult = {
  status: "inside" | "edge" | "outside";
  zone: typeof PHASE1_ZONES[number] | null;
  distanceToNearestZone: number;
  phase1Serviceable: boolean;
  serviceZone: string | null;
};

/** Max distance (km) from zone center to be considered "inside" */
const INSIDE_RADIUS_KM = 4;
/** Max distance for "edge" zone with travel surcharge */
const EDGE_RADIUS_KM = 8;

/**
 * Check if coordinates fall within Phase-1 coverage.
 */
export function checkServiceability(lat: number, lng: number): ServiceabilityResult {
  // Sri Lanka bounds check
  if (lat < 5.9 || lat > 9.9 || lng < 79.5 || lng > 81.9) {
    return { status: "outside", zone: null, distanceToNearestZone: 999, phase1Serviceable: false, serviceZone: null };
  }

  let closestZone: typeof PHASE1_ZONES[number] | null = null;
  let closestDist = Infinity;

  for (const zone of PHASE1_ZONES) {
    const dist = calculateDistance(lat, lng, zone.lat, zone.lng);
    if (dist < closestDist) {
      closestDist = dist;
      closestZone = zone;
    }
  }

  if (closestDist <= INSIDE_RADIUS_KM) {
    return {
      status: "inside",
      zone: closestZone,
      distanceToNearestZone: closestDist,
      phase1Serviceable: true,
      serviceZone: closestZone?.code ?? null,
    };
  }

  if (closestDist <= EDGE_RADIUS_KM) {
    return {
      status: "edge",
      zone: closestZone,
      distanceToNearestZone: closestDist,
      phase1Serviceable: true,
      serviceZone: closestZone?.code ?? null,
    };
  }

  return {
    status: "outside",
    zone: closestZone,
    distanceToNearestZone: closestDist,
    phase1Serviceable: false,
    serviceZone: null,
  };
}

/** Travel surcharge for edge zones */
export function getEdgeSurcharge(distanceKm: number): number {
  if (distanceKm <= INSIDE_RADIUS_KM) return 0;
  if (distanceKm <= 6) return 300;
  if (distanceKm <= EDGE_RADIUS_KM) return 800;
  return 0;
}

/** Friendly label for serviceability status */
export function getServiceabilityLabel(status: ServiceabilityResult["status"]): string {
  switch (status) {
    case "inside": return "Phase-1 Covered";
    case "edge": return "Extended Zone";
    case "outside": return "Outside Colombo Launch Zone";
  }
}
