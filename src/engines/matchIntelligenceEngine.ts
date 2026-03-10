/**
 * LankaFix Match Intelligence Engine
 * ───────────────────────────────────
 * Deterministic confidence scoring, explainability metadata,
 * and human-readable match reasoning for dispatch transparency.
 */

export type ConfidenceTier = "excellent" | "strong" | "good" | "fair" | "limited";

export interface MatchFactor {
  id: string;
  label: string;
  score: number;      // 0–100 within this factor
  weight: number;      // 0–1 weight in total
  weighted: number;    // score × weight
  icon: string;        // lucide icon name
  reason: string;      // human-readable explanation
  sentiment: "positive" | "neutral" | "caution";
}

export interface MatchIntelligence {
  confidenceScore: number;        // 0–100
  confidenceTier: ConfidenceTier;
  tierLabel: string;
  tierColor: string;              // semantic token name
  factors: MatchFactor[];
  topReasons: string[];           // top 3 reasons for this match
  cautionReasons: string[];       // any concerns
  matchSummary: string;           // one-line summary
  reliabilityNote: string;        // SLA/reliability context
}

// ─── Weight Config (matches memory: 30/20/15/10/10/10/5) ────
const WEIGHTS = {
  proximity:       0.30,
  specialization:  0.20,
  rating:          0.15,
  response_speed:  0.10,
  workload:        0.10,
  completion_rate: 0.10,
  emergency:       0.05,
} as const;

function tierFromScore(score: number): { tier: ConfidenceTier; label: string; color: string } {
  if (score >= 85) return { tier: "excellent", label: "Excellent Match", color: "success" };
  if (score >= 70) return { tier: "strong", label: "Strong Match", color: "primary" };
  if (score >= 55) return { tier: "good", label: "Good Match", color: "primary" };
  if (score >= 40) return { tier: "fair", label: "Fair Match", color: "warning" };
  return { tier: "limited", label: "Limited Match", color: "warning" };
}

function proximityReason(distanceKm: number, zoneMatch: boolean): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  if (distanceKm <= 2 && zoneMatch) return { score: 100, reason: `Only ${distanceKm} km away, in your zone`, sentiment: "positive" };
  if (distanceKm <= 3) return { score: 90, reason: `${distanceKm} km away — very close`, sentiment: "positive" };
  if (distanceKm <= 5) return { score: 70, reason: `${distanceKm} km away — nearby area`, sentiment: "positive" };
  if (distanceKm <= 8) return { score: 50, reason: `${distanceKm} km away — moderate distance`, sentiment: "neutral" };
  if (distanceKm <= 12) return { score: 30, reason: `${distanceKm} km away — extended coverage`, sentiment: "caution" };
  return { score: 15, reason: `${distanceKm} km away — far, longer ETA expected`, sentiment: "caution" };
}

function specializationReason(matchesCategory: boolean, matchesBrand: boolean, brandName?: string): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  if (matchesCategory && matchesBrand && brandName) return { score: 100, reason: `Specializes in ${brandName} for this category`, sentiment: "positive" };
  if (matchesCategory) return { score: 80, reason: "Certified in this service category", sentiment: "positive" };
  if (matchesBrand) return { score: 60, reason: `Familiar with ${brandName || "this brand"}`, sentiment: "neutral" };
  return { score: 20, reason: "General technician — not a specialist", sentiment: "caution" };
}

function ratingReason(avg: number, jobCount: number): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  if (avg >= 4.8 && jobCount >= 200) return { score: 100, reason: `★ ${avg} from ${jobCount}+ verified jobs — top performer`, sentiment: "positive" };
  if (avg >= 4.5 && jobCount >= 100) return { score: 85, reason: `★ ${avg} from ${jobCount} jobs — highly rated`, sentiment: "positive" };
  if (avg >= 4.0) return { score: 65, reason: `★ ${avg} rating — reliable performer`, sentiment: "neutral" };
  if (avg >= 3.5) return { score: 40, reason: `★ ${avg} rating — average performance`, sentiment: "caution" };
  return { score: 20, reason: `★ ${avg} rating — newer technician`, sentiment: "caution" };
}

function responseSpeedReason(avgMinutes: number): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  if (avgMinutes <= 5) return { score: 100, reason: "Responds in under 5 minutes on average", sentiment: "positive" };
  if (avgMinutes <= 15) return { score: 80, reason: `Average response time: ${avgMinutes} min`, sentiment: "positive" };
  if (avgMinutes <= 30) return { score: 55, reason: `Typical response: ~${avgMinutes} min`, sentiment: "neutral" };
  return { score: 25, reason: `Slower response time (~${avgMinutes} min)`, sentiment: "caution" };
}

function workloadReason(currentJobs: number, maxConcurrent: number): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  const ratio = currentJobs / Math.max(maxConcurrent, 1);
  if (ratio === 0) return { score: 100, reason: "Currently free — no active jobs", sentiment: "positive" };
  if (ratio <= 0.5) return { score: 75, reason: `${currentJobs} active job${currentJobs > 1 ? "s" : ""} — light workload`, sentiment: "positive" };
  if (ratio <= 0.8) return { score: 45, reason: `${currentJobs} active jobs — moderate workload`, sentiment: "neutral" };
  return { score: 15, reason: `${currentJobs} active jobs — near capacity`, sentiment: "caution" };
}

function completionRateReason(rate: number): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  if (rate >= 98) return { score: 100, reason: `${rate}% completion rate — exceptional reliability`, sentiment: "positive" };
  if (rate >= 95) return { score: 85, reason: `${rate}% completion rate — very reliable`, sentiment: "positive" };
  if (rate >= 90) return { score: 60, reason: `${rate}% completion rate — good track record`, sentiment: "neutral" };
  if (rate >= 80) return { score: 35, reason: `${rate}% completion rate — some cancellations`, sentiment: "caution" };
  return { score: 15, reason: `${rate}% completion rate — reliability concerns`, sentiment: "caution" };
}

function emergencyReason(isEmergency: boolean, emergencyAvailable: boolean): { score: number; reason: string; sentiment: MatchFactor["sentiment"] } {
  if (!isEmergency) return { score: 50, reason: "Standard priority job", sentiment: "neutral" };
  if (emergencyAvailable) return { score: 100, reason: "Emergency-ready — priority response enabled", sentiment: "positive" };
  return { score: 20, reason: "Not flagged for emergency priority", sentiment: "caution" };
}

export interface MatchIntelligenceInput {
  distanceKm: number;
  zoneMatch: boolean;
  matchesCategory: boolean;
  matchesBrand: boolean;
  brandName?: string;
  ratingAverage: number;
  jobsCompleted: number;
  avgResponseMinutes: number;
  currentJobs: number;
  maxConcurrent: number;
  completionRate: number;
  isEmergency: boolean;
  emergencyAvailable: boolean;
  technicianName: string;
  etaMinutes: number;
}

export function computeMatchIntelligence(input: MatchIntelligenceInput): MatchIntelligence {
  const prox = proximityReason(input.distanceKm, input.zoneMatch);
  const spec = specializationReason(input.matchesCategory, input.matchesBrand, input.brandName);
  const rate = ratingReason(input.ratingAverage, input.jobsCompleted);
  const speed = responseSpeedReason(input.avgResponseMinutes);
  const load = workloadReason(input.currentJobs, input.maxConcurrent);
  const comp = completionRateReason(input.completionRate);
  const emerg = emergencyReason(input.isEmergency, input.emergencyAvailable);

  const factors: MatchFactor[] = [
    { id: "proximity", label: "Proximity", score: prox.score, weight: WEIGHTS.proximity, weighted: Math.round(prox.score * WEIGHTS.proximity), icon: "MapPin", reason: prox.reason, sentiment: prox.sentiment },
    { id: "specialization", label: "Specialization", score: spec.score, weight: WEIGHTS.specialization, weighted: Math.round(spec.score * WEIGHTS.specialization), icon: "Wrench", reason: spec.reason, sentiment: spec.sentiment },
    { id: "rating", label: "Rating", score: rate.score, weight: WEIGHTS.rating, weighted: Math.round(rate.score * WEIGHTS.rating), icon: "Star", reason: rate.reason, sentiment: rate.sentiment },
    { id: "response_speed", label: "Response Speed", score: speed.score, weight: WEIGHTS.response_speed, weighted: Math.round(speed.score * WEIGHTS.response_speed), icon: "Zap", reason: speed.reason, sentiment: speed.sentiment },
    { id: "workload", label: "Workload", score: load.score, weight: WEIGHTS.workload, weighted: Math.round(load.score * WEIGHTS.workload), icon: "Activity", reason: load.reason, sentiment: load.sentiment },
    { id: "completion_rate", label: "Reliability", score: comp.score, weight: WEIGHTS.completion_rate, weighted: Math.round(comp.score * WEIGHTS.completion_rate), icon: "CheckCircle2", reason: comp.reason, sentiment: comp.sentiment },
    { id: "emergency", label: "Emergency", score: emerg.score, weight: WEIGHTS.emergency, weighted: Math.round(emerg.score * WEIGHTS.emergency), icon: "AlertTriangle", reason: emerg.reason, sentiment: emerg.sentiment },
  ];

  const confidenceScore = Math.min(100, factors.reduce((sum, f) => sum + f.weighted, 0));
  const { tier, label, color } = tierFromScore(confidenceScore);

  const topReasons = factors
    .filter(f => f.sentiment === "positive")
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3)
    .map(f => f.reason);

  const cautionReasons = factors
    .filter(f => f.sentiment === "caution")
    .map(f => f.reason);

  const matchSummary = topReasons.length > 0
    ? `${input.technicianName} is a ${label.toLowerCase()} — ${topReasons[0].toLowerCase()}`
    : `${input.technicianName} is available for this job`;

  const reliabilityNote = input.completionRate >= 95
    ? "This technician has a strong track record of completing jobs on time."
    : input.completionRate >= 85
      ? "Good reliability history with occasional rescheduling."
      : "Newer or variable reliability — LankaFix backup dispatch is active.";

  return {
    confidenceScore,
    confidenceTier: tier,
    tierLabel: label,
    tierColor: color,
    factors,
    topReasons,
    cautionReasons,
    matchSummary,
    reliabilityNote,
  };
}

/**
 * Build MatchIntelligenceInput from a SmartDispatchCandidate
 */
export function intelligenceFromCandidate(
  candidate: {
    distance_km: number;
    eta_minutes: number;
    partner: {
      full_name: string;
      rating_average: number;
      completed_jobs_count: number;
      experience_years: number;
      current_job_count: number;
      acceptance_rate: number;
      cancellation_rate: number;
      emergency_available: boolean;
      specializations: string[];
      brand_specializations: string[];
      service_zones: string[];
    };
    score?: { total: number };
  },
  categoryCode: string,
  isEmergency: boolean,
  customerZone?: string,
  brand?: string,
): MatchIntelligence {
  const p = candidate.partner;
  return computeMatchIntelligence({
    distanceKm: candidate.distance_km,
    zoneMatch: customerZone ? p.service_zones.includes(customerZone) : candidate.distance_km < 3,
    matchesCategory: p.specializations.includes(categoryCode),
    matchesBrand: brand ? p.brand_specializations.includes(brand) : false,
    brandName: brand,
    ratingAverage: p.rating_average,
    jobsCompleted: p.completed_jobs_count,
    avgResponseMinutes: Math.max(5, 30 - (p.acceptance_rate / 5)),
    currentJobs: p.current_job_count,
    maxConcurrent: 3,
    completionRate: Math.max(0, 100 - (p.cancellation_rate * 100)),
    isEmergency,
    emergencyAvailable: p.emergency_available,
    technicianName: p.full_name,
    etaMinutes: candidate.eta_minutes,
  });
}
