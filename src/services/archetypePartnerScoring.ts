/**
 * Archetype-Aware Partner Scoring Engine — LankaFix
 *
 * Produces ranked partner lists with scoring weights that vary
 * by service archetype. Uses structured zone matching and
 * availability freshness penalties.
 *
 * ADVISORY-ONLY: operators approve all assignments.
 */
import type { ServiceArchetype } from "@/hooks/useSupplyIntelligence";
import { partnerServesZoneOrAdjacent } from "@/lib/zoneNormalization";

// ── Types ──

export interface ScoredPartner {
  partnerId: string;
  partnerName: string;
  score: number;
  factors: ScoringFactor[];
  explanation: string;
  penalties: string[];
  zoneMatch: "direct" | "adjacent" | "none";
}

export interface ScoringFactor {
  name: string;
  rawScore: number;  // 0-100
  weight: number;    // 0-1
  weighted: number;  // rawScore * weight
  label: string;
}

interface PartnerForScoring {
  id: string;
  full_name: string;
  categories_supported: string[];
  service_zones?: string[] | null;
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  on_time_rate?: number | null;
  acceptance_rate?: number | null;
  cancellation_rate?: number | null;
  average_response_time_minutes?: number | null;
  availability_status?: string;
  current_job_count?: number | null;
  updated_at?: string;
  availability_last_updated?: string;
  experience_years?: number;
  specializations?: string[];
  performance_score?: number | null;
}

// ── Weight profiles per archetype ──

const WEIGHT_PROFILES: Record<ServiceArchetype, Record<string, number>> = {
  instant: {
    availability:    0.25,
    response_speed:  0.20,
    zone_match:      0.20,
    load_balance:    0.10,
    rating:          0.10,
    reliability:     0.10,
    experience:      0.05,
  },
  inspection_first: {
    reliability:     0.25,
    on_time_rate:    0.20,
    rating:          0.15,
    zone_match:      0.15,
    response_speed:  0.10,
    experience:      0.10,
    availability:    0.05,
  },
  consultation: {
    specialization:  0.25,
    zone_match:      0.20,
    reliability:     0.15,
    experience:      0.15,
    rating:          0.15,
    response_speed:  0.10,
    availability:    0.00,
  },
  project_based: {
    specialization:  0.25,
    experience:      0.20,
    zone_match:      0.15,
    reliability:     0.15,
    rating:          0.15,
    response_speed:  0.10,
    availability:    0.00,
  },
  delivery: {
    availability:    0.30,
    response_speed:  0.25,
    zone_match:      0.25,
    rating:          0.10,
    reliability:     0.10,
    experience:      0.00,
  },
  waitlist: {
    zone_match:      0.30,
    availability:    0.25,
    rating:          0.20,
    reliability:     0.15,
    experience:      0.10,
    response_speed:  0.00,
  },
};

// ── Availability freshness ──

const FRESHNESS_THRESHOLDS_HOURS = {
  fresh: 1,      // Updated within 1h → full trust
  stale: 4,      // 1-4h → penalty
  expired: 12,   // 4-12h → heavy penalty
  // >12h → treat as offline
};

/**
 * Availability freshness penalty.
 * Uses availability_last_updated (dedicated field) rather than generic updated_at.
 * Generic updated_at changes on ANY column edit and gives false freshness signals.
 */
function getAvailabilityFreshnessPenalty(availabilityLastUpdated?: string, updatedAt?: string): { penalty: number; label: string } {
  // Prefer dedicated field; fallback to updated_at with extra penalty
  const timestamp = availabilityLastUpdated || updatedAt;
  if (!timestamp) return { penalty: 30, label: "no_freshness_data" };
  const hoursAgo = (Date.now() - new Date(timestamp).getTime()) / 3600000;
  // If using fallback updated_at, add a small extra penalty for low confidence
  const fallbackPenalty = availabilityLastUpdated ? 0 : 5;
  if (hoursAgo <= FRESHNESS_THRESHOLDS_HOURS.fresh) return { penalty: 0 + fallbackPenalty, label: availabilityLastUpdated ? "fresh" : "fresh_fallback" };
  if (hoursAgo <= FRESHNESS_THRESHOLDS_HOURS.stale) return { penalty: 15 + fallbackPenalty, label: "stale" };
  if (hoursAgo <= FRESHNESS_THRESHOLDS_HOURS.expired) return { penalty: 35 + fallbackPenalty, label: "expired" };
  return { penalty: 60, label: "very_stale" };
}

// ── Scoring ──

export function scorePartnersForLead(
  partners: PartnerForScoring[],
  archetype: ServiceArchetype,
  categoryCode: string,
  zoneCode: string | null | undefined
): ScoredPartner[] {
  const weights = WEIGHT_PROFILES[archetype] || WEIGHT_PROFILES.instant;

  return partners
    .map((p) => scoreOnePartner(p, weights, categoryCode, zoneCode, archetype))
    .sort((a, b) => b.score - a.score);
}

function scoreOnePartner(
  p: PartnerForScoring,
  weights: Record<string, number>,
  categoryCode: string,
  zoneCode: string | null | undefined,
  archetype: ServiceArchetype
): ScoredPartner {
  const factors: ScoringFactor[] = [];
  const penalties: string[] = [];

  // --- Factor: Availability ---
  const availRaw = p.availability_status === "online" ? 100 : p.availability_status === "busy" ? 40 : 0;
  pushFactor(factors, "availability", availRaw, weights.availability || 0, "Availability");

  // --- Factor: Response Speed ---
  const respTime = p.average_response_time_minutes ?? 30;
  const respRaw = Math.max(0, 100 - respTime * 2);
  pushFactor(factors, "response_speed", respRaw, weights.response_speed || 0, "Response Speed");

  // --- Factor: Zone Match (structured) ---
  let zoneRaw = 50; // Default if no zone specified
  let zoneMatchType: "direct" | "adjacent" | "none" = "none";
  if (zoneCode) {
    const { serves, direct } = partnerServesZoneOrAdjacent(p.service_zones, zoneCode);
    if (direct) { zoneRaw = 100; zoneMatchType = "direct"; }
    else if (serves) { zoneRaw = 60; zoneMatchType = "adjacent"; }
    else { zoneRaw = 0; zoneMatchType = "none"; }
  }
  pushFactor(factors, "zone_match", zoneRaw, weights.zone_match || 0, "Zone Match");

  // --- Factor: Rating ---
  const ratingRaw = Math.min(100, ((p.rating_average ?? 3) / 5) * 100);
  pushFactor(factors, "rating", ratingRaw, weights.rating || 0, "Rating");

  // --- Factor: Reliability (acceptance + on-time + cancellation) ---
  const acceptanceRate = p.acceptance_rate ?? 70;
  const onTimeRate = p.on_time_rate ?? 70;
  const cancelRate = p.cancellation_rate ?? 10;
  const reliabilityRaw = Math.min(100, (acceptanceRate * 0.4 + onTimeRate * 0.4 + (100 - cancelRate) * 0.2));
  pushFactor(factors, "reliability", reliabilityRaw, weights.reliability || 0, "Reliability");

  // --- Factor: On-Time Rate (for inspection_first) ---
  if (weights.on_time_rate) {
    pushFactor(factors, "on_time_rate", onTimeRate, weights.on_time_rate, "On-Time Rate");
  }

  // --- Factor: Experience ---
  const expYears = p.experience_years ?? 1;
  const jobCount = p.completed_jobs_count ?? 0;
  const expRaw = Math.min(100, (expYears / 10) * 50 + (jobCount / 200) * 50);
  pushFactor(factors, "experience", expRaw, weights.experience || 0, "Experience");

  // --- Factor: Specialization (for consultation/project) ---
  if (weights.specialization) {
    const hasSpecialization = (p.specializations || p.categories_supported || []).includes(categoryCode);
    const specRaw = hasSpecialization ? 100 : 30;
    pushFactor(factors, "specialization", specRaw, weights.specialization, "Specialization");
  }

  // --- Factor: Load Balance (for instant) ---
  if (weights.load_balance) {
    const currentLoad = p.current_job_count ?? 0;
    const loadRaw = Math.max(0, 100 - currentLoad * 25);
    pushFactor(factors, "load_balance", loadRaw, weights.load_balance, "Load Balance");
  }

  // --- Compute weighted total ---
  let totalScore = factors.reduce((sum, f) => sum + f.weighted, 0);

  // --- Penalties ---

  // Availability freshness penalty
  const freshness = getAvailabilityFreshnessPenalty(p.updated_at);
  if (freshness.penalty > 0) {
    totalScore -= freshness.penalty;
    penalties.push(`availability_${freshness.label}`);
  }

  // Category mismatch is fatal
  if (!p.categories_supported?.includes(categoryCode)) {
    totalScore = 0;
    penalties.push("category_mismatch");
  }

  // Low acceptance rate penalty
  if (acceptanceRate < 40) {
    totalScore -= 10;
    penalties.push("low_acceptance_rate");
  }

  // High cancellation penalty
  if (cancelRate > 30) {
    totalScore -= 15;
    penalties.push("high_cancellation");
  }

  // Cap score
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  const explanation = buildExplanation(p, factors, penalties, zoneMatchType, archetype);

  return {
    partnerId: p.id,
    partnerName: p.full_name,
    score: totalScore,
    factors,
    explanation,
    penalties,
    zoneMatch: zoneMatchType,
  };
}

function pushFactor(
  arr: ScoringFactor[],
  name: string,
  rawScore: number,
  weight: number,
  label: string
) {
  arr.push({ name, rawScore: Math.round(rawScore), weight, weighted: Math.round(rawScore * weight), label });
}

function buildExplanation(
  p: PartnerForScoring,
  factors: ScoringFactor[],
  penalties: string[],
  zoneMatch: string,
  archetype: ServiceArchetype
): string {
  const parts: string[] = [];

  // Top 2 strongest factors
  const sorted = [...factors].sort((a, b) => b.weighted - a.weighted);
  for (const f of sorted.slice(0, 2)) {
    if (f.rawScore >= 80) {
      parts.push(`strong ${f.label.toLowerCase()}`);
    } else if (f.rawScore >= 60) {
      parts.push(`good ${f.label.toLowerCase()}`);
    }
  }

  if (zoneMatch === "direct") parts.push("serves this zone");
  else if (zoneMatch === "adjacent") parts.push("nearby zone");

  if (penalties.length > 0) {
    const penaltyLabels = penalties
      .filter(p => !p.startsWith("availability_fresh"))
      .map(p => p.replace(/_/g, " "));
    if (penaltyLabels.length > 0) parts.push(`⚠ ${penaltyLabels.join(", ")}`);
  }

  if (parts.length === 0) return `${p.full_name} is available.`;
  return `${p.full_name}: ${parts.join(", ")}.`;
}
