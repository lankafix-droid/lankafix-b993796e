/**
 * AI Partner Matching Intelligence
 * Advisory ranking factors for partner selection.
 * Does NOT modify dispatch — provides display-only insights.
 *
 * HARDENED: feature flags, fallbacks, metering, advisory_only, confidence.
 */
import { createConfidenceEnvelope } from "@/lib/aiConfidence";
import { isAIEnabled } from "@/config/aiFlags";
import { recordAIUsage } from "@/services/aiUsageMeter";
import { logAIEvent } from "@/services/aiEventTracking";
import type { AIAdvisoryMeta } from "@/ai/types";

export interface PartnerMatchScore extends AIAdvisoryMeta {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  factors: MatchFactor[];
  explanation: string;
}

export interface MatchFactor {
  name: string;
  score: number;
  weight: number;
  label: string;
}

interface PartnerData {
  id: string;
  full_name: string;
  categories_supported: string[];
  service_zones?: string[] | null;
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  on_time_rate?: number | null;
  average_response_time_minutes?: number | null;
  availability_status?: string;
}

const FACTOR_WEIGHTS = {
  category_match: 0.25,
  zone_coverage: 0.2,
  availability: 0.15,
  response_speed: 0.15,
  rating: 0.15,
  completion: 0.1,
};

/** Score a list of partners for a given booking context */
export function rankPartnersForBooking(
  partners: PartnerData[],
  categoryCode: string,
  zoneCode?: string
): PartnerMatchScore[] {
  const start = performance.now();

  // Feature flag check
  if (!isAIEnabled("ai_partner_ranking")) {
    recordAIUsage("ai_partner_ranking", 0, true);
    return partners.map((p) => ({
      partnerId: p.id,
      partnerName: p.full_name,
      overallScore: 50,
      factors: [],
      explanation: `${p.full_name} is available for this service.`,
      confidence: createConfidenceEnvelope(10, ["feature_disabled"]),
      fallback_used: true,
      advisory_only: true as const,
    }));
  }

  try {
    const results = partners
      .map((p) => scorePartner(p, categoryCode, zoneCode))
      .sort((a, b) => b.overallScore - a.overallScore);

    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_partner_ranking", latency, false);

    // Log top match (fire-and-forget)
    if (results.length > 0) {
      logAIEvent({
        ai_module: "ai_partner_ranking",
        input_summary: `${categoryCode}/${zoneCode ?? "any"} — ${partners.length} candidates`,
        output_summary: `Top: ${results[0].partnerName} (${results[0].overallScore})`,
        confidence_score: results[0].confidence.confidence_score,
      });
    }

    return results;
  } catch {
    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_partner_ranking", latency, true);
    return partners.map((p) => ({
      partnerId: p.id,
      partnerName: p.full_name,
      overallScore: 50,
      factors: [],
      explanation: `${p.full_name} is available for this service.`,
      confidence: createConfidenceEnvelope(10, ["computation_error", "fallback_used"]),
      fallback_used: true,
      advisory_only: true as const,
    }));
  }
}

function scorePartner(
  p: PartnerData,
  categoryCode: string,
  zoneCode?: string
): PartnerMatchScore {
  const factors: MatchFactor[] = [];

  const catMatch = p.categories_supported?.includes(categoryCode) ? 100 : 0;
  factors.push({ name: "category_match", score: catMatch, weight: FACTOR_WEIGHTS.category_match, label: "Category Match" });

  const zoneMatch = !zoneCode || (p.service_zones?.includes(zoneCode) ?? false) ? 100 : 30;
  factors.push({ name: "zone_coverage", score: zoneMatch, weight: FACTOR_WEIGHTS.zone_coverage, label: "Zone Coverage" });

  const availScore = p.availability_status === "available" ? 100 : p.availability_status === "busy" ? 40 : 0;
  factors.push({ name: "availability", score: availScore, weight: FACTOR_WEIGHTS.availability, label: "Availability" });

  const respTime = p.average_response_time_minutes ?? 30;
  const respScore = Math.max(0, 100 - respTime * 2);
  factors.push({ name: "response_speed", score: respScore, weight: FACTOR_WEIGHTS.response_speed, label: "Response Speed" });

  const ratingScore = Math.min(100, ((p.rating_average ?? 3) / 5) * 100);
  factors.push({ name: "rating", score: ratingScore, weight: FACTOR_WEIGHTS.rating, label: "Customer Rating" });

  const completionScore = Math.min(100, ((p.completed_jobs_count ?? 0) / 50) * 100);
  factors.push({ name: "completion", score: completionScore, weight: FACTOR_WEIGHTS.completion, label: "Job Completion" });

  const overallScore = factors.reduce((s, f) => s + f.score * f.weight, 0);

  const reasons: string[] = [];
  if (catMatch === 100) reasons.push("category_specialist");
  if ((p.rating_average ?? 0) >= 4.5) reasons.push("top_rated");
  if ((p.completed_jobs_count ?? 0) > 100) reasons.push("experienced");
  if (respTime < 10) reasons.push("fast_responder");

  const explanation = generateExplanation(p, reasons);

  return {
    partnerId: p.id,
    partnerName: p.full_name,
    overallScore: Math.round(overallScore),
    factors,
    explanation,
    confidence: createConfidenceEnvelope(
      Math.min(90, overallScore),
      reasons.length > 0 ? reasons : ["standard_scoring"]
    ),
    fallback_used: false,
    advisory_only: true,
  };
}

function generateExplanation(p: PartnerData, reasons: string[]): string {
  const parts: string[] = [];
  if (reasons.includes("category_specialist")) parts.push("specializes in this category");
  if (reasons.includes("top_rated")) parts.push(`rated ${p.rating_average?.toFixed(1)}★`);
  if (reasons.includes("experienced")) parts.push(`completed ${p.completed_jobs_count}+ jobs`);
  if (reasons.includes("fast_responder")) parts.push("responds quickly");

  if (parts.length === 0) return `${p.full_name} is available for this service.`;
  return `Suggested because ${p.full_name} ${parts.join(", ")}.`;
}
