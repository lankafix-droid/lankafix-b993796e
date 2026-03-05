/**
 * LankaFix Matching Engine
 * Matches technicians to bookings based on specialization, zone, availability, rating, and workload.
 */
import type { TechnicianInfo, CategoryCode } from "@/types/booking";

interface MatchCandidate {
  tech: TechnicianInfo;
  score: number;
}

// Mock technician pool
const MOCK_TECHNICIANS: TechnicianInfo[] = [
  { technicianId: "T001", name: "Kasun Perera", partnerId: "P001", partnerName: "ColomboTech Solutions", rating: 4.8, jobsCompleted: 342, verifiedSince: "2024-01-15", specializations: ["AC", "HVAC", "CONSUMER_ELEC"], eta: "25 mins", currentZoneId: "col_07", availabilityStatus: "available", activeJobsCount: 1 },
  { technicianId: "T002", name: "Nadeesha Silva", partnerId: "P002", partnerName: "Lanka Service Pro", rating: 4.9, jobsCompleted: 567, verifiedSince: "2023-06-20", specializations: ["CCTV", "SMART_HOME_OFFICE", "IT"], eta: "18 mins", currentZoneId: "rajagiriya", availabilityStatus: "available", activeJobsCount: 0 },
  { technicianId: "T003", name: "Ruwan Fernando", partnerId: "P003", partnerName: "QuickFix Colombo", rating: 4.7, jobsCompleted: 218, verifiedSince: "2024-03-10", specializations: ["MOBILE", "CONSUMER_ELEC", "PRINT_SUPPLIES"], eta: "30 mins", currentZoneId: "nugegoda", availabilityStatus: "available", activeJobsCount: 2 },
  { technicianId: "T004", name: "Dinesh Jayawardena", partnerId: "P004", partnerName: "ProTech Lanka", rating: 4.6, jobsCompleted: 189, verifiedSince: "2024-05-01", specializations: ["IT", "COPIER", "PRINT_SUPPLIES"], eta: "35 mins", currentZoneId: "col_10", availabilityStatus: "busy", activeJobsCount: 3 },
  { technicianId: "T005", name: "Chaminda Bandara", partnerId: "P005", partnerName: "SmartFix Pvt Ltd", rating: 4.9, jobsCompleted: 412, verifiedSince: "2023-09-12", specializations: ["SOLAR", "SMART_HOME_OFFICE"], eta: "22 mins", currentZoneId: "battaramulla", availabilityStatus: "available", activeJobsCount: 1 },
  { technicianId: "T006", name: "Saman Kumara", partnerId: "P001", partnerName: "ColomboTech Solutions", rating: 4.5, jobsCompleted: 156, verifiedSince: "2024-07-01", specializations: ["AC", "CONSUMER_ELEC"], eta: "40 mins", currentZoneId: "maharagama", availabilityStatus: "available", activeJobsCount: 0 },
  { technicianId: "T007", name: "Priyantha de Silva", partnerId: "P003", partnerName: "QuickFix Colombo", rating: 4.8, jobsCompleted: 289, verifiedSince: "2024-02-14", specializations: ["COPIER", "PRINT_SUPPLIES", "IT"], eta: "20 mins", currentZoneId: "col_03", availabilityStatus: "available", activeJobsCount: 1 },
  { technicianId: "T008", name: "Nuwan Wickrama", partnerId: "P005", partnerName: "SmartFix Pvt Ltd", rating: 4.7, jobsCompleted: 198, verifiedSince: "2024-04-20", specializations: ["CCTV", "SMART_HOME_OFFICE", "SOLAR"], eta: "28 mins", currentZoneId: "kotte", availabilityStatus: "available", activeJobsCount: 1 },
];

function scoreSpecialization(tech: TechnicianInfo, categoryCode: CategoryCode): number {
  return tech.specializations.includes(categoryCode) ? 30 : 0;
}

function scoreZone(tech: TechnicianInfo, zoneId: string): number {
  if (!tech.currentZoneId) return 5;
  if (tech.currentZoneId === zoneId) return 20;
  if (tech.currentZoneId.startsWith("col_") && zoneId.startsWith("col_")) return 12;
  return 5;
}

function scoreAvailability(tech: TechnicianInfo): number {
  switch (tech.availabilityStatus) {
    case "available": return 20;
    case "busy": return 8;
    case "offline": return 0;
    default: return 10;
  }
}

function scoreRating(tech: TechnicianInfo): number {
  return Math.round((tech.rating / 5) * 20);
}

function scoreWorkload(tech: TechnicianInfo): number {
  const jobs = tech.activeJobsCount ?? 0;
  if (jobs === 0) return 10;
  if (jobs <= 2) return 6;
  return 2;
}

export interface MatchResult {
  technician: TechnicianInfo | null;
  score: number;
  confidenceScore: number;
  extendedCoverage: boolean;
  nearbyTechCount: number;
  distanceKm: number;
  etaRange: string;
  zoneMatch: boolean;
  requiresPartnerConfirmation: boolean;
  message: string;
}

/** Compute a human-friendly ETA range */
function computeEtaRange(etaMins: number): string {
  if (etaMins <= 30) return "within 30 minutes";
  if (etaMins <= 60) return "within 1 hour";
  if (etaMins <= 240) return "today";
  return "within 24 hours";
}

/** Simulate distance from zone */
function computeDistanceKm(techZone: string | undefined, targetZone: string): number {
  if (!techZone) return 8;
  if (techZone === targetZone) return 1.5 + Math.random() * 2;
  if (techZone.startsWith("col_") && targetZone.startsWith("col_")) return 3 + Math.random() * 4;
  return 6 + Math.random() * 6;
}

export function matchTechnician(
  categoryCode: CategoryCode,
  zoneId: string,
  isEmergency: boolean
): MatchResult {
  const candidates: MatchCandidate[] = MOCK_TECHNICIANS
    .filter((t) => t.availabilityStatus !== "offline")
    .map((tech) => {
      let score = scoreSpecialization(tech, categoryCode)
        + scoreZone(tech, zoneId)
        + scoreAvailability(tech)
        + scoreRating(tech)
        + scoreWorkload(tech);

      if (isEmergency && tech.availabilityStatus === "available" && tech.currentZoneId === zoneId) {
        score += 15;
      }

      return { tech, score };
    })
    .sort((a, b) => b.score - a.score);

  const nearbyTechCount = candidates.filter(c => 
    c.tech.currentZoneId === zoneId || 
    (c.tech.currentZoneId?.startsWith("col_") && zoneId.startsWith("col_"))
  ).length;

  if (candidates.length === 0) {
    return {
      technician: null,
      score: 0,
      confidenceScore: 0,
      extendedCoverage: false,
      nearbyTechCount: 0,
      distanceKm: 0,
      etaRange: "within 24 hours",
      zoneMatch: false,
      requiresPartnerConfirmation: false,
      message: "No technicians available. Matching in progress.",
    };
  }

  const best = candidates[0];
  const inZone = best.tech.currentZoneId === zoneId;
  const extendedCoverage = !inZone && best.score < 50;
  const etaMins = parseInt(best.tech.eta) || 30;
  const distanceKm = Math.round(computeDistanceKm(best.tech.currentZoneId, zoneId) * 10) / 10;
  
  // Partner confirmation required if busy or high workload
  const requiresPartnerConfirmation = best.tech.availabilityStatus === "busy" || (best.tech.activeJobsCount ?? 0) >= 3;

  return {
    technician: {
      ...best.tech,
      eta: extendedCoverage ? `${etaMins + 15} mins` : best.tech.eta,
    },
    score: best.score,
    confidenceScore: Math.min(best.score, 100),
    extendedCoverage,
    nearbyTechCount,
    distanceKm,
    etaRange: computeEtaRange(extendedCoverage ? etaMins + 15 : etaMins),
    zoneMatch: inZone,
    requiresPartnerConfirmation,
    message: extendedCoverage
      ? "Extended coverage — technician from nearby zone"
      : `Matched: ${best.tech.name} (Score: ${best.score}/100)`,
  };
}

/** Get mock zone intelligence for display */
export function getZoneIntelligence(zoneId: string): { techsNearby: number; avgResponseMinutes: number } {
  const nearby = MOCK_TECHNICIANS.filter(
    (t) => t.availabilityStatus !== "offline" && (t.currentZoneId === zoneId || t.currentZoneId?.startsWith("col_"))
  ).length;
  return {
    techsNearby: nearby,
    avgResponseMinutes: 18 + Math.floor(Math.random() * 12),
  };
}
