/**
 * LankaFix Smart Dispatch Engine V2
 * Weighted scoring, capability filtering, zone-aware assignment,
 * fairness algorithm, SLA prediction, weather demand, repeat customer matching.
 */
import type { CategoryCode, TechnicianInfo, BookingState, ProviderTier } from "@/types/booking";
import { PROVIDER_TIER_PRIORITY } from "@/types/booking";
import { MOCK_PARTNERS, MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { COLOMBO_ZONES_DATA, getNeighborZones } from "@/data/colomboZones";
import { calculateDistance, scoreDistance, DISPATCH_DEFAULTS, CATEGORY_DAILY_CAPACITY } from "@/lib/locationUtils";
import { calculateETA, detectTrafficLevel, type TrafficLevel } from "@/lib/etaEngine";
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
  profileStrength: number;
  experienceYears: number;
  slaComplianceRate: number;
  jobsCompletedToday: number;
  lastJobCompletedAt: string | null;
  lastIdleSince: string | null;
}

/** Mock capabilities keyed by technician ID */
export const TECHNICIAN_CAPABILITIES: Record<string, TechnicianCapabilities> = {
  T001: { technicianId: "T001", skills: ["HVAC", "gas_topup", "compressor"], tools: ["HVAC_kit", "pressure_gauge", "vacuum_pump"], vehicleType: "van", certifications: ["HVAC_cert", "safety_cert"], acceptanceRate: 92, completionRate: 98, avgResponseMinutes: 22, profileStrength: 90, experienceYears: 8, slaComplianceRate: 95, jobsCompletedToday: 2, lastJobCompletedAt: new Date(Date.now() - 3600000).toISOString(), lastIdleSince: new Date(Date.now() - 1800000).toISOString() },
  T002: { technicianId: "T002", skills: ["CCTV_install", "networking", "DVR_config"], tools: ["drill_kit", "cable_tester", "crimping_tool"], vehicleType: "car", certifications: ["security_cert"], acceptanceRate: 95, completionRate: 99, avgResponseMinutes: 15, profileStrength: 95, experienceYears: 10, slaComplianceRate: 98, jobsCompletedToday: 1, lastJobCompletedAt: new Date(Date.now() - 7200000).toISOString(), lastIdleSince: new Date(Date.now() - 5400000).toISOString() },
  T003: { technicianId: "T003", skills: ["micro_soldering", "screen_repair", "battery_replace"], tools: ["soldering_station", "heat_gun", "pry_tools"], vehicleType: "motorcycle", certifications: ["mobile_repair_cert"], acceptanceRate: 88, completionRate: 95, avgResponseMinutes: 25, profileStrength: 78, experienceYears: 5, slaComplianceRate: 88, jobsCompletedToday: 3, lastJobCompletedAt: new Date(Date.now() - 900000).toISOString(), lastIdleSince: null },
  T004: { technicianId: "T004", skills: ["networking", "OS_install", "printer_setup"], tools: ["network_toolkit", "USB_toolkit"], vehicleType: "car", certifications: ["CompTIA_A+"], acceptanceRate: 80, completionRate: 92, avgResponseMinutes: 30, profileStrength: 72, experienceYears: 6, slaComplianceRate: 82, jobsCompletedToday: 4, lastJobCompletedAt: new Date(Date.now() - 600000).toISOString(), lastIdleSince: null },
  T005: { technicianId: "T005", skills: ["solar_install", "inverter_repair", "rooftop_work"], tools: ["multimeter", "solar_tester", "safety_harness"], vehicleType: "van", certifications: ["solar_cert", "height_safety"], acceptanceRate: 94, completionRate: 97, avgResponseMinutes: 20, profileStrength: 92, experienceYears: 9, slaComplianceRate: 96, jobsCompletedToday: 1, lastJobCompletedAt: new Date(Date.now() - 14400000).toISOString(), lastIdleSince: new Date(Date.now() - 7200000).toISOString() },
  T006: { technicianId: "T006", skills: ["HVAC", "gas_topup"], tools: ["HVAC_kit", "pressure_gauge"], vehicleType: "motorcycle", certifications: [], acceptanceRate: 85, completionRate: 90, avgResponseMinutes: 35, profileStrength: 55, experienceYears: 3, slaComplianceRate: 78, jobsCompletedToday: 0, lastJobCompletedAt: null, lastIdleSince: new Date(Date.now() - 10800000).toISOString() },
  T007: { technicianId: "T007", skills: ["copier_repair", "toner_replace", "printer_setup"], tools: ["printer_toolkit", "toner_vacuum"], vehicleType: "car", certifications: ["printer_cert"], acceptanceRate: 91, completionRate: 96, avgResponseMinutes: 18, profileStrength: 85, experienceYears: 7, slaComplianceRate: 93, jobsCompletedToday: 2, lastJobCompletedAt: new Date(Date.now() - 5400000).toISOString(), lastIdleSince: new Date(Date.now() - 3600000).toISOString() },
  T008: { technicianId: "T008", skills: ["CCTV_install", "smart_home", "solar_basic"], tools: ["drill_kit", "smart_config_kit"], vehicleType: "car", certifications: ["security_cert", "smart_home_cert"], acceptanceRate: 89, completionRate: 94, avgResponseMinutes: 24, profileStrength: 80, experienceYears: 5, slaComplianceRate: 87, jobsCompletedToday: 1, lastJobCompletedAt: new Date(Date.now() - 10800000).toISOString(), lastIdleSince: new Date(Date.now() - 9000000).toISOString() },
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

// ── V2 Scoring Weights (total = 100) ─────────────────────────
const WEIGHTS_V2 = {
  skillMatch: 30,
  distance: 25,
  rating: 15,
  availability: 10,
  workload: 10,
  slaReliability: 5,
  idleTime: 5,
};

// ── Surge Pricing ─────────────────────────────────────────────
export interface SurgeCondition {
  active: boolean;
  reason: string;
  multiplier: number;
}

export function detectSurgeConditions(category: CategoryCode): SurgeCondition {
  const hour = new Date().getHours();
  // Simulate weather-based surges
  const temp = 28 + Math.random() * 8; // 28-36°C simulated

  if (category === "AC" && temp > 33) {
    return { active: true, reason: "High temperature — AC demand surge", multiplier: 1.1 };
  }

  // Peak hour surge
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
    return { active: true, reason: "Peak hour demand", multiplier: 1.1 };
  }

  return { active: false, reason: "", multiplier: 1.0 };
}

// ── Weather Demand Intelligence ───────────────────────────────
export type WeatherCondition = "clear" | "hot" | "rain" | "storm";

export function detectWeatherDemand(): { weather: WeatherCondition; affectedCategories: CategoryCode[]; demandMultiplier: number } {
  // Simulated — in production, integrate with weather API
  const rand = Math.random();
  if (rand < 0.3) return { weather: "hot", affectedCategories: ["AC"], demandMultiplier: 1.3 };
  if (rand < 0.5) return { weather: "rain", affectedCategories: ["IT", "CONSUMER_ELEC"], demandMultiplier: 1.2 };
  return { weather: "clear", affectedCategories: [], demandMultiplier: 1.0 };
}

// ── Core Functions ────────────────────────────────────────────

export function findEligiblePartners(zoneId: string, category: CategoryCode) {
  return MOCK_PARTNERS.filter(
    (p) => p.categories.includes(category) && p.coverageZones.includes(zoneId)
  );
}

export function findEligibleTechnicians(partnerId: string, category: CategoryCode) {
  return MOCK_TECHNICIANS.filter(
    (t) => t.partnerId === partnerId && t.specializations.includes(category)
  );
}

/** Filter by capabilities, capacity, and SLA compliance */
export function filterTechniciansByCapabilities(
  technicians: TechnicianInfo[],
  category: CategoryCode,
  isEmergency: boolean
): TechnicianInfo[] {
  const requiredTools = CATEGORY_TOOL_REQUIREMENTS[category] || [];
  const dailyCap = CATEGORY_DAILY_CAPACITY[category] ?? DISPATCH_DEFAULTS.maxTechnicianJobs;

  return technicians.filter((t) => {
    if (t.availabilityStatus === "offline") return false;

    const caps = TECHNICIAN_CAPABILITIES[t.technicianId || ""];

    // Daily capacity check (emergency bypasses)
    if (!isEmergency && caps && caps.jobsCompletedToday >= dailyCap) return false;

    // Concurrent jobs check
    if (!isEmergency && (t.activeJobsCount ?? 0) >= DISPATCH_DEFAULTS.maxConcurrentJobs) return false;

    // Emergency: bypass SLA-violating technicians
    if (isEmergency && caps && caps.slaComplianceRate < 80) return false;

    // Check tools
    if (caps && requiredTools.length > 0) {
      const hasTools = requiredTools.every((tool) => caps.tools.includes(tool));
      if (!hasTools) return false;
    }

    return true;
  });
}

function getZoneGeo(zoneId: string): { lat: number; lng: number } | null {
  const zone = COLOMBO_ZONES_DATA.find((z) => z.id === zoneId);
  return zone?.geo || null;
}

function getTechGeo(tech: TechnicianInfo): { lat: number; lng: number } | null {
  if (!tech.currentZoneId) return null;
  return getZoneGeo(tech.currentZoneId);
}

// ── Dispatch Score ────────────────────────────────────────────

export interface DispatchScore {
  tech: TechnicianInfo;
  totalScore: number;
  distanceKm: number;
  etaMinutes: number;
  trafficLevel: TrafficLevel;
  slaRiskLevel: "safe" | "at_risk" | "will_breach";
  breakdown: {
    skillMatch: number;
    distance: number;
    rating: number;
    availability: number;
    workload: number;
    slaReliability: number;
    idleTime: number;
  };
  bonuses: {
    tierBonus: number;
    emergencyBonus: number;
    repeatCustomerBonus: number;
    subscriberBonus: number;
    fairnessAdjustment: number;
  };
}

/** Dispatch event log entry */
export interface DispatchEventLog {
  technicianId: string;
  dispatchScore: number;
  dispatchRank: number;
  dispatchTime: string;
  technicianResponse: "pending" | "accepted" | "rejected" | "timeout";
  dispatchOutcome: "assigned" | "passed" | "failed";
  etaMinutes: number;
  distanceKm: number;
}

/** Calculate V2 dispatch score for a single technician */
export function calculateTechnicianScore(
  tech: TechnicianInfo,
  customerZoneId: string,
  isEmergency: boolean,
  options?: {
    previousTechId?: string; // for repeat customer matching
    isSubscriber?: boolean;
    slaTargetMinutes?: number;
  }
): DispatchScore {
  const caps = TECHNICIAN_CAPABILITIES[tech.technicianId || ""];
  const customerGeo = getZoneGeo(customerZoneId);
  const techGeo = getTechGeo(tech);
  const traffic = detectTrafficLevel();

  // Distance
  let distanceKm = 8;
  if (customerGeo && techGeo) {
    distanceKm = calculateDistance(customerGeo.lat, customerGeo.lng, techGeo.lat, techGeo.lng);
  }

  // ETA
  const etaMinutes = calculateETA(distanceKm, traffic);

  // SLA Risk
  const slaTarget = options?.slaTargetMinutes ?? 60;
  let slaRiskLevel: "safe" | "at_risk" | "will_breach" = "safe";
  if (etaMinutes > slaTarget) slaRiskLevel = "will_breach";
  else if (etaMinutes > slaTarget * 0.75) slaRiskLevel = "at_risk";

  // ── Score components ──

  // Skill match (0-30)
  const skillMatch = tech.specializations?.includes(tech.specializations?.[0] || "") ? WEIGHTS_V2.skillMatch : 0;
  // Simplified: if technician was filtered to this category, they have skill match
  const skillScore = WEIGHTS_V2.skillMatch;

  // Distance (0-25)
  const distScore = scoreDistance(distanceKm);

  // Rating (0-15)
  const ratingScore = Math.round((tech.rating / 5) * WEIGHTS_V2.rating);

  // Availability (0-10)
  let availScore = 0;
  if (tech.availabilityStatus === "available") availScore = WEIGHTS_V2.availability;
  else if (tech.availabilityStatus === "busy") availScore = Math.round(WEIGHTS_V2.availability * 0.4);

  // Workload (0-10)
  const jobs = tech.activeJobsCount ?? 0;
  const workloadScore = jobs === 0 ? WEIGHTS_V2.workload : jobs <= 1 ? Math.round(WEIGHTS_V2.workload * 0.7) : Math.round(WEIGHTS_V2.workload * 0.2);

  // SLA reliability (0-5)
  const slaRate = caps?.slaComplianceRate ?? 80;
  const slaScore = Math.round((slaRate / 100) * WEIGHTS_V2.slaReliability);

  // Idle time (0-5)
  let idleScore = 0;
  if (caps?.lastIdleSince) {
    const idleMs = Date.now() - new Date(caps.lastIdleSince).getTime();
    const idleMins = idleMs / 60000;
    if (idleMins >= DISPATCH_DEFAULTS.idleBoostMinutes) {
      idleScore = WEIGHTS_V2.idleTime; // full idle boost
    } else if (idleMins >= 15) {
      idleScore = Math.round(WEIGHTS_V2.idleTime * 0.5);
    }
  }

  const breakdown = {
    skillMatch: skillScore,
    distance: distScore,
    rating: ratingScore,
    availability: availScore,
    workload: workloadScore,
    slaReliability: slaScore,
    idleTime: idleScore,
  };

  let totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  // ── Bonuses ──

  // Tier priority
  const techTier: ProviderTier = (tech as any).tier || "verified";
  const tierBonus = PROVIDER_TIER_PRIORITY[techTier] || 0;
  totalScore += tierBonus;

  // Emergency boost
  let emergencyBonus = 0;
  if (isEmergency && tech.availabilityStatus === "available" && distanceKm < 5) {
    emergencyBonus = 15;
    totalScore += emergencyBonus;
  }

  // Repeat customer matching
  let repeatCustomerBonus = 0;
  if (options?.previousTechId && tech.technicianId === options.previousTechId) {
    repeatCustomerBonus = DISPATCH_DEFAULTS.repeatCustomerBoost;
    totalScore += repeatCustomerBonus;
  }

  // Subscriber boost
  let subscriberBonus = 0;
  if (options?.isSubscriber) {
    subscriberBonus = DISPATCH_DEFAULTS.subscriberBoost;
    totalScore += subscriberBonus;
  }

  // Fairness: penalize over-worked, boost idle
  let fairnessAdjustment = 0;
  if (caps) {
    if (caps.jobsCompletedToday > DISPATCH_DEFAULTS.recentJobPenaltyThreshold) {
      fairnessAdjustment = -DISPATCH_DEFAULTS.recentJobPenaltyPoints;
    } else if (caps.jobsCompletedToday === 0 && caps.lastIdleSince) {
      fairnessAdjustment = DISPATCH_DEFAULTS.idleBoostPoints;
    }
  }
  totalScore += fairnessAdjustment;

  return {
    tech,
    totalScore: Math.min(Math.max(totalScore, 0), 100),
    distanceKm,
    etaMinutes,
    trafficLevel: traffic,
    slaRiskLevel,
    breakdown,
    bonuses: { tierBonus, emergencyBonus, repeatCustomerBonus, subscriberBonus, fairnessAdjustment },
  };
}

/** Rank technicians by V2 dispatch score */
export function rankTechnicians(
  technicians: TechnicianInfo[],
  customerZoneId: string,
  isEmergency: boolean,
  options?: { previousTechId?: string; isSubscriber?: boolean; slaTargetMinutes?: number }
): DispatchScore[] {
  return technicians
    .map((t) => calculateTechnicianScore(t, customerZoneId, isEmergency, options))
    .filter((s) => s.slaRiskLevel !== "will_breach" || isEmergency) // Skip SLA-breaching unless emergency
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, DISPATCH_DEFAULTS.maxCandidates);
}

// ── Dispatch Result ───────────────────────────────────────────

export interface DispatchResult {
  ranked: DispatchScore[];
  bestMatch: DispatchScore | null;
  eligiblePartners: typeof MOCK_PARTNERS;
  nearbyTechCount: number;
  requiresPartnerConfirmation: boolean;
  extendedCoverage: boolean;
  etaRange: string;
  surgeCondition: SurgeCondition;
  weatherDemand: ReturnType<typeof detectWeatherDemand>;
  eventLog: DispatchEventLog[];
}

/** Full V2 dispatch pipeline */
export function runDispatch(
  booking: Pick<BookingState, "categoryCode" | "zone" | "isEmergency">,
  options?: { previousTechId?: string; isSubscriber?: boolean; slaTargetMinutes?: number }
): DispatchResult {
  const zoneData = COLOMBO_ZONES_DATA.find(
    (z) => z.label === booking.zone || z.id === booking.zone || z.area === booking.zone
  );
  const zoneId = zoneData?.id || "";
  const radius = booking.isEmergency ? DISPATCH_DEFAULTS.emergencyRadius : DISPATCH_DEFAULTS.dispatchRadius;

  track("dispatch_v2_started", { category: booking.categoryCode, zone: booking.zone });

  const surgeCondition = detectSurgeConditions(booking.categoryCode);
  const weatherDemand = detectWeatherDemand();

  // 1. Find eligible partners — primary zone
  let partners = findEligiblePartners(zoneId, booking.categoryCode);
  let extendedCoverage = false;

  // Extended zone search using neighbor mapping
  if (partners.length === 0) {
    const neighbors = getNeighborZones(zoneId);
    for (const neighborId of neighbors) {
      const neighborPartners = findEligiblePartners(neighborId, booking.categoryCode);
      partners.push(...neighborPartners);
    }
    if (partners.length > 0) extendedCoverage = true;
  }

  // If still none, expand to all
  if (partners.length === 0) {
    partners = MOCK_PARTNERS.filter((p) => p.categories.includes(booking.categoryCode));
    extendedCoverage = true;
  }

  // 2. Gather technicians
  let allTechs: TechnicianInfo[] = [];
  for (const partner of partners) {
    const techs = findEligibleTechnicians(partner.id, booking.categoryCode);
    allTechs.push(...techs);
  }

  // 3. Filter by capabilities
  allTechs = filterTechniciansByCapabilities(allTechs, booking.categoryCode, booking.isEmergency);

  // 4. Rank with V2 scoring
  const ranked = rankTechnicians(allTechs, zoneId, booking.isEmergency, options);

  // 5. Filter by radius
  const withinRadius = ranked.filter((r) => r.distanceKm <= radius);
  const nearbyTechCount = withinRadius.length;

  const bestMatch = withinRadius[0] || ranked[0] || null;

  if (bestMatch && !withinRadius.includes(bestMatch)) {
    extendedCoverage = true;
  }

  const requiresPartnerConfirmation =
    bestMatch?.tech.availabilityStatus === "busy" || (bestMatch?.tech.activeJobsCount ?? 0) >= 3;

  // ETA range
  let etaRange = "within 24 hours";
  if (bestMatch) {
    if (bestMatch.etaMinutes <= 15) etaRange = "within 15 minutes";
    else if (bestMatch.etaMinutes <= 30) etaRange = "within 30 minutes";
    else if (bestMatch.etaMinutes <= 60) etaRange = "within 1 hour";
    else if (bestMatch.etaMinutes <= 120) etaRange = "within 2 hours";
    else etaRange = "today";
  }

  // Build dispatch event log
  const eventLog: DispatchEventLog[] = ranked.map((r, i) => ({
    technicianId: r.tech.technicianId || "",
    dispatchScore: r.totalScore,
    dispatchRank: i + 1,
    dispatchTime: new Date().toISOString(),
    technicianResponse: i === 0 ? "pending" : "pending",
    dispatchOutcome: i === 0 ? "assigned" : "passed",
    etaMinutes: r.etaMinutes,
    distanceKm: r.distanceKm,
  }));

  if (bestMatch) {
    track("dispatch_v2_success", {
      category: booking.categoryCode,
      technicianId: bestMatch.tech.technicianId,
      score: bestMatch.totalScore,
      distanceKm: bestMatch.distanceKm,
      etaMinutes: bestMatch.etaMinutes,
      slaRisk: bestMatch.slaRiskLevel,
      surgeActive: surgeCondition.active,
    });
  } else {
    track("dispatch_v2_failed", { category: booking.categoryCode, zone: booking.zone });
  }

  return {
    ranked: withinRadius.length > 0 ? withinRadius : ranked,
    bestMatch,
    eligiblePartners: partners,
    nearbyTechCount,
    requiresPartnerConfirmation,
    extendedCoverage,
    etaRange,
    surgeCondition,
    weatherDemand,
    eventLog,
  };
}

/** Get profile strength for a technician */
export function getProfileStrength(techId: string): number {
  return TECHNICIAN_CAPABILITIES[techId]?.profileStrength ?? 0;
}

/** Get V2 performance metrics for a technician */
export function getTechPerformanceMetrics(techId: string) {
  const caps = TECHNICIAN_CAPABILITIES[techId];
  if (!caps) return null;
  return {
    acceptanceRate: caps.acceptanceRate,
    completionRate: caps.completionRate,
    avgResponseMinutes: caps.avgResponseMinutes,
    profileStrength: caps.profileStrength,
    experienceYears: caps.experienceYears,
    slaComplianceRate: caps.slaComplianceRate,
    jobsCompletedToday: caps.jobsCompletedToday,
  };
}

/** Technician performance index (composite) */
export function calculatePerformanceIndex(techId: string): number {
  const caps = TECHNICIAN_CAPABILITIES[techId];
  if (!caps) return 50;
  return Math.round(
    (caps.acceptanceRate * 0.2) +
    (caps.completionRate * 0.3) +
    (caps.slaComplianceRate * 0.3) +
    ((100 - Math.min(caps.avgResponseMinutes, 60) / 60 * 100) * 0.2)
  );
}
