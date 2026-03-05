/**
 * LankaFix Smart Dispatch Engine
 * Weighted scoring, capability filtering, and zone-aware technician assignment.
 */
import type { CategoryCode, TechnicianInfo, BookingState, ProviderTier } from "@/types/booking";
import { PROVIDER_TIER_PRIORITY } from "@/types/booking";
import { MOCK_PARTNERS, MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { calculateDistance, scoreDistance, DISPATCH_DEFAULTS } from "@/lib/locationUtils";
import { track } from "@/lib/analytics";

// ── Technician Capability Extensions ──────────────────────────
export interface TechnicianCapabilities {
  technicianId: string;
  skills: string[];
  tools: string[];
  vehicleType: "motorcycle" | "car" | "van" | "none";
  certifications: string[];
  acceptanceRate: number;
  completionRate: number;
  avgResponseMinutes: number;
  profileStrength: number; // 0-100
  experienceYears: number;
}

/** Mock capabilities keyed by technician ID */
export const TECHNICIAN_CAPABILITIES: Record<string, TechnicianCapabilities> = {
  T001: { technicianId: "T001", skills: ["HVAC", "gas_topup", "compressor"], tools: ["HVAC_kit", "pressure_gauge", "vacuum_pump"], vehicleType: "van", certifications: ["HVAC_cert", "safety_cert"], acceptanceRate: 92, completionRate: 98, avgResponseMinutes: 22, profileStrength: 90, experienceYears: 8 },
  T002: { technicianId: "T002", skills: ["CCTV_install", "networking", "DVR_config"], tools: ["drill_kit", "cable_tester", "crimping_tool"], vehicleType: "car", certifications: ["security_cert"], acceptanceRate: 95, completionRate: 99, avgResponseMinutes: 15, profileStrength: 95, experienceYears: 10 },
  T003: { technicianId: "T003", skills: ["micro_soldering", "screen_repair", "battery_replace"], tools: ["soldering_station", "heat_gun", "pry_tools"], vehicleType: "motorcycle", certifications: ["mobile_repair_cert"], acceptanceRate: 88, completionRate: 95, avgResponseMinutes: 25, profileStrength: 78, experienceYears: 5 },
  T004: { technicianId: "T004", skills: ["networking", "OS_install", "printer_setup"], tools: ["network_toolkit", "USB_toolkit"], vehicleType: "car", certifications: ["CompTIA_A+"], acceptanceRate: 80, completionRate: 92, avgResponseMinutes: 30, profileStrength: 72, experienceYears: 6 },
  T005: { technicianId: "T005", skills: ["solar_install", "inverter_repair", "rooftop_work"], tools: ["multimeter", "solar_tester", "safety_harness"], vehicleType: "van", certifications: ["solar_cert", "height_safety"], acceptanceRate: 94, completionRate: 97, avgResponseMinutes: 20, profileStrength: 92, experienceYears: 9 },
  T006: { technicianId: "T006", skills: ["HVAC", "gas_topup"], tools: ["HVAC_kit", "pressure_gauge"], vehicleType: "motorcycle", certifications: [], acceptanceRate: 85, completionRate: 90, avgResponseMinutes: 35, profileStrength: 55, experienceYears: 3 },
  T007: { technicianId: "T007", skills: ["copier_repair", "toner_replace", "printer_setup"], tools: ["printer_toolkit", "toner_vacuum"], vehicleType: "car", certifications: ["printer_cert"], acceptanceRate: 91, completionRate: 96, avgResponseMinutes: 18, profileStrength: 85, experienceYears: 7 },
  T008: { technicianId: "T008", skills: ["CCTV_install", "smart_home", "solar_basic"], tools: ["drill_kit", "smart_config_kit"], vehicleType: "car", certifications: ["security_cert", "smart_home_cert"], acceptanceRate: 89, completionRate: 94, avgResponseMinutes: 24, profileStrength: 80, experienceYears: 5 },
};

/** Category → required tool sets */
const CATEGORY_TOOL_REQUIREMENTS: Partial<Record<CategoryCode, string[]>> = {
  AC: ["HVAC_kit"],
  CCTV: ["drill_kit"],
  SOLAR: ["solar_tester", "safety_harness"],
  MOBILE: ["soldering_station"],
  IT: ["network_toolkit"],
  COPIER: ["printer_toolkit"],
  SMART_HOME_OFFICE: ["drill_kit"],
};

// ── Scoring Weights ───────────────────────────────────────────
const WEIGHTS = {
  distance: 25,
  rating: 20,
  availability: 15,
  workload: 10,
  experience: 10,
  acceptanceRate: 10,
  profileStrength: 10,
};

// ── Core Functions ────────────────────────────────────────────

/** Find partners that serve the given zone and category */
export function findEligiblePartners(zoneId: string, category: CategoryCode) {
  return MOCK_PARTNERS.filter(
    (p) => p.categories.includes(category) && p.coverageZones.includes(zoneId)
  );
}

/** Find technicians under a partner for a category */
export function findEligibleTechnicians(partnerId: string, category: CategoryCode) {
  return MOCK_TECHNICIANS.filter(
    (t) => t.partnerId === partnerId && t.specializations.includes(category)
  );
}

/** Filter technicians by capability (tools, skills, availability) */
export function filterTechniciansByCapabilities(
  technicians: TechnicianInfo[],
  category: CategoryCode,
  isEmergency: boolean
): TechnicianInfo[] {
  const requiredTools = CATEGORY_TOOL_REQUIREMENTS[category] || [];

  return technicians.filter((t) => {
    // Must be online
    if (t.availabilityStatus === "offline") return false;

    // Check workload (emergency bypasses)
    if (!isEmergency && (t.activeJobsCount ?? 0) >= DISPATCH_DEFAULTS.maxTechnicianJobs) return false;

    // Check tools
    const caps = TECHNICIAN_CAPABILITIES[t.technicianId || ""];
    if (caps && requiredTools.length > 0) {
      const hasTools = requiredTools.every((tool) => caps.tools.includes(tool));
      if (!hasTools) return false;
    }

    return true;
  });
}

/** Get geo coordinates for a zone */
function getZoneGeo(zoneId: string): { lat: number; lng: number } | null {
  const zone = COLOMBO_ZONES_DATA.find((z) => z.id === zoneId);
  return zone?.geo || null;
}

/** Get geo for a technician's current zone */
function getTechGeo(tech: TechnicianInfo): { lat: number; lng: number } | null {
  if (!tech.currentZoneId) return null;
  return getZoneGeo(tech.currentZoneId);
}

export interface DispatchScore {
  tech: TechnicianInfo;
  totalScore: number;
  distanceKm: number;
  breakdown: {
    distance: number;
    rating: number;
    availability: number;
    workload: number;
    experience: number;
    acceptanceRate: number;
    profileStrength: number;
  };
}

/** Calculate dispatch score for a single technician */
export function calculateTechnicianScore(
  tech: TechnicianInfo,
  customerZoneId: string,
  isEmergency: boolean
): DispatchScore {
  const caps = TECHNICIAN_CAPABILITIES[tech.technicianId || ""];
  const customerGeo = getZoneGeo(customerZoneId);
  const techGeo = getTechGeo(tech);

  // Distance
  let distanceKm = 8; // fallback
  if (customerGeo && techGeo) {
    distanceKm = calculateDistance(customerGeo.lat, customerGeo.lng, techGeo.lat, techGeo.lng);
  }
  const distScore = scoreDistance(distanceKm);

  // Rating (0-20)
  const ratingScore = Math.round((tech.rating / 5) * WEIGHTS.rating);

  // Availability (0-15)
  let availScore = 0;
  if (tech.availabilityStatus === "available") availScore = WEIGHTS.availability;
  else if (tech.availabilityStatus === "busy") availScore = Math.round(WEIGHTS.availability * 0.4);

  // Workload (0-10)
  const jobs = tech.activeJobsCount ?? 0;
  const workloadScore = jobs === 0 ? WEIGHTS.workload : jobs <= 2 ? Math.round(WEIGHTS.workload * 0.6) : Math.round(WEIGHTS.workload * 0.2);

  // Experience (0-10)
  const years = caps?.experienceYears ?? 3;
  const expScore = Math.min(Math.round((years / 10) * WEIGHTS.experience), WEIGHTS.experience);

  // Acceptance rate (0-10)
  const accRate = caps?.acceptanceRate ?? 80;
  const accScore = Math.round((accRate / 100) * WEIGHTS.acceptanceRate);

  // Profile strength (0-10)
  const profStrength = caps?.profileStrength ?? 50;
  const profScore = Math.round((profStrength / 100) * WEIGHTS.profileStrength);

  const breakdown = {
    distance: distScore,
    rating: ratingScore,
    availability: availScore,
    workload: workloadScore,
    experience: expScore,
    acceptanceRate: accScore,
    profileStrength: profScore,
  };

  let totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  // Emergency boost for nearby available techs
  if (isEmergency && tech.availabilityStatus === "available" && distanceKm < 5) {
    totalScore += 15;
  }

  return { tech, totalScore: Math.min(totalScore, 100), distanceKm, breakdown };
}

/** Rank technicians by dispatch score (top N) */
export function rankTechnicians(
  technicians: TechnicianInfo[],
  customerZoneId: string,
  isEmergency: boolean
): DispatchScore[] {
  return technicians
    .map((t) => calculateTechnicianScore(t, customerZoneId, isEmergency))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, DISPATCH_DEFAULTS.maxCandidates);
}

export interface DispatchResult {
  ranked: DispatchScore[];
  bestMatch: DispatchScore | null;
  eligiblePartners: typeof MOCK_PARTNERS;
  nearbyTechCount: number;
  requiresPartnerConfirmation: boolean;
  extendedCoverage: boolean;
  etaRange: string;
}

/** Full dispatch pipeline: find → filter → rank → recommend */
export function runDispatch(
  booking: Pick<BookingState, "categoryCode" | "zone" | "isEmergency">
): DispatchResult {
  const zoneData = COLOMBO_ZONES_DATA.find(
    (z) => z.label === booking.zone || z.id === booking.zone || z.area === booking.zone
  );
  const zoneId = zoneData?.id || "";
  const radius = booking.isEmergency ? DISPATCH_DEFAULTS.emergencyRadius : DISPATCH_DEFAULTS.dispatchRadius;

  track("dispatch_started", { category: booking.categoryCode, zone: booking.zone });

  // 1. Find eligible partners
  let partners = findEligiblePartners(zoneId, booking.categoryCode);
  let extendedCoverage = false;

  // If no partners in zone, expand to all partners serving the category
  if (partners.length === 0) {
    partners = MOCK_PARTNERS.filter((p) => p.categories.includes(booking.categoryCode));
    extendedCoverage = true;
  }

  // 2. Gather technicians from eligible partners
  let allTechs: TechnicianInfo[] = [];
  for (const partner of partners) {
    const techs = findEligibleTechnicians(partner.id, booking.categoryCode);
    allTechs.push(...techs);
  }

  // 3. Filter by capabilities
  allTechs = filterTechniciansByCapabilities(allTechs, booking.categoryCode, booking.isEmergency);

  // 4. Rank
  const ranked = rankTechnicians(allTechs, zoneId, booking.isEmergency);

  // 5. Filter by radius
  const withinRadius = ranked.filter((r) => r.distanceKm <= radius);
  const nearbyTechCount = withinRadius.length;

  const bestMatch = withinRadius[0] || ranked[0] || null;

  if (bestMatch && !withinRadius.includes(bestMatch)) {
    extendedCoverage = true;
    track("extended_coverage_applied", { category: booking.categoryCode, zone: booking.zone });
  }

  const requiresPartnerConfirmation =
    bestMatch?.tech.availabilityStatus === "busy" || (bestMatch?.tech.activeJobsCount ?? 0) >= 3;

  // ETA range
  let etaRange = "within 24 hours";
  if (bestMatch) {
    if (bestMatch.distanceKm < 3) etaRange = "within 30 minutes";
    else if (bestMatch.distanceKm < 8) etaRange = "within 1 hour";
    else if (bestMatch.distanceKm < 15) etaRange = "today";
  }

  if (bestMatch) {
    track("dispatch_success", {
      category: booking.categoryCode,
      technicianId: bestMatch.tech.technicianId,
      score: bestMatch.totalScore,
      distanceKm: bestMatch.distanceKm,
    });
  } else {
    track("dispatch_failed", { category: booking.categoryCode, zone: booking.zone });
  }

  return { ranked: withinRadius.length > 0 ? withinRadius : ranked, bestMatch, eligiblePartners: partners, nearbyTechCount, requiresPartnerConfirmation, extendedCoverage, etaRange };
}

/** Get profile strength for a technician */
export function getProfileStrength(techId: string): number {
  return TECHNICIAN_CAPABILITIES[techId]?.profileStrength ?? 0;
}

/** Get performance metrics for a technician */
export function getTechPerformanceMetrics(techId: string) {
  const caps = TECHNICIAN_CAPABILITIES[techId];
  if (!caps) return null;
  return {
    acceptanceRate: caps.acceptanceRate,
    completionRate: caps.completionRate,
    avgResponseMinutes: caps.avgResponseMinutes,
    profileStrength: caps.profileStrength,
    experienceYears: caps.experienceYears,
  };
}
