/**
 * LankaFix Matching Engine
 * Matches technicians to bookings based on specialization, zone, availability, rating, and workload.
 * API Contract: POST /api/matching/find { bookingDraft } -> TechnicianInfo
 */
import type { TechnicianInfo, CategoryCode, BookingState } from "@/types/booking";

interface MatchCandidate {
  tech: TechnicianInfo;
  score: number;
}

// Mock technician pool — in production this comes from the partner API
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
  // Nearby zone heuristic: if same city prefix
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
  extendedCoverage: boolean;
  message: string;
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

      // Emergency: boost available techs in-zone
      if (isEmergency && tech.availabilityStatus === "available" && tech.currentZoneId === zoneId) {
        score += 15;
      }

      return { tech, score };
    })
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { technician: null, score: 0, extendedCoverage: false, message: "No technicians available. Matching in progress." };
  }

  const best = candidates[0];
  const inZone = best.tech.currentZoneId === zoneId;
  const extendedCoverage = !inZone && best.score < 50;

  return {
    technician: {
      ...best.tech,
      eta: extendedCoverage ? `${parseInt(best.tech.eta) + 15} mins` : best.tech.eta,
    },
    score: best.score,
    extendedCoverage,
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
