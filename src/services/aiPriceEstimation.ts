/**
 * AI Price Estimation Service
 * Provides advisory price estimates before booking confirmation.
 * Always shows disclaimer — final price confirmed after technician inspection.
 *
 * HARDENED: feature flags, fallbacks, schema validation, metering, caching.
 */
import { createConfidenceEnvelope } from "@/lib/aiConfidence";
import { isAIEnabled } from "@/config/aiFlags";
import { isValidPriceEstimate } from "@/ai/schemas";
import { getFallbackPriceRange } from "@/services/aiFallbacks";
import { recordAIUsage } from "@/services/aiUsageMeter";
import { withCache } from "@/services/aiCacheService";
import { logAIEvent } from "@/services/aiEventTracking";
import type { AIAdvisoryMeta } from "@/ai/types";

export interface PriceEstimate extends AIAdvisoryMeta {
  estimated_min_price: number;
  estimated_max_price: number;
  recommended_service_type: string;
  disclaimer: string;
}

// Category-based price ranges (LKR) — advisory only
const PRICE_RANGES: Record<string, { min: number; max: number; service: string }> = {
  MOBILE: { min: 1500, max: 8000, service: "Mobile Phone Repair" },
  LAPTOP: { min: 2500, max: 15000, service: "Laptop Repair" },
  PRINTER: { min: 2000, max: 10000, service: "Printer Repair" },
  CCTV: { min: 3000, max: 25000, service: "CCTV Installation" },
  AC: { min: 2500, max: 12000, service: "AC Service & Repair" },
  SOLAR: { min: 5000, max: 50000, service: "Solar Solutions" },
  SMART_HOME_OFFICE: { min: 3000, max: 20000, service: "Smart Home Setup" },
  CONSUMER_ELEC: { min: 1500, max: 8000, service: "Electronics Repair" },
  IT: { min: 2000, max: 12000, service: "IT Services" },
};

// Issue-specific adjustments
const ISSUE_MULTIPLIERS: Record<string, number> = {
  screen_broken: 1.3,
  battery_problem: 0.7,
  charging_issue: 0.6,
  water_damage: 1.5,
  camera_issue: 0.8,
  installation: 1.4,
  maintenance: 0.5,
  repair: 1.0,
  replacement: 1.6,
};

const DISCLAIMER = "Final price will be confirmed after technician inspection.";

/** Generate an advisory price estimate (with hardening) */
export function estimatePrice(
  categoryCode: string,
  issueType?: string
): PriceEstimate {
  // Feature flag check — return safe fallback if disabled
  if (!isAIEnabled("ai_estimate_assist")) {
    const fb = getFallbackPriceRange(categoryCode);
    const range = PRICE_RANGES[categoryCode];
    return {
      estimated_min_price: fb.min,
      estimated_max_price: fb.max,
      recommended_service_type: range?.service ?? "General Service",
      confidence: createConfidenceEnvelope(20, ["feature_disabled"]),
      disclaimer: DISCLAIMER,
      fallback_used: true,
      advisory_only: true,
    };
  }

  const start = performance.now();

  try {
    const result = computeEstimate(categoryCode, issueType);

    // Schema validation
    const valid = isValidPriceEstimate({
      estimated_min_price: result.estimated_min_price,
      estimated_max_price: result.estimated_max_price,
      recommended_service_type: result.recommended_service_type,
      confidence_score: result.confidence.confidence_score,
    });

    if (!valid) {
      const fb = getFallbackPriceRange(categoryCode);
      const latency = Math.round(performance.now() - start);
      recordAIUsage("ai_estimate_assist", latency, true);
      return {
        estimated_min_price: fb.min,
        estimated_max_price: fb.max,
        recommended_service_type: PRICE_RANGES[categoryCode]?.service ?? "General Service",
        confidence: createConfidenceEnvelope(15, ["schema_validation_failed"]),
        disclaimer: DISCLAIMER,
        fallback_used: true,
        advisory_only: true,
      };
    }

    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_estimate_assist", latency, false);

    // Log AI event (fire-and-forget)
    logAIEvent({
      ai_module: "ai_estimate_assist",
      input_summary: `${categoryCode}/${issueType ?? "none"}`,
      output_summary: `${result.estimated_min_price}-${result.estimated_max_price} LKR`,
      confidence_score: result.confidence.confidence_score,
    });

    return result;
  } catch {
    const fb = getFallbackPriceRange(categoryCode);
    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_estimate_assist", latency, true);
    return {
      estimated_min_price: fb.min,
      estimated_max_price: fb.max,
      recommended_service_type: PRICE_RANGES[categoryCode]?.service ?? "General Service",
      confidence: createConfidenceEnvelope(10, ["computation_error", "fallback_used"]),
      disclaimer: DISCLAIMER,
      fallback_used: true,
      advisory_only: true,
    };
  }
}

/** Core computation (deterministic, rule-based) */
function computeEstimate(categoryCode: string, issueType?: string): PriceEstimate {
  const range = PRICE_RANGES[categoryCode] || { min: 2000, max: 10000, service: "General Service" };

  let multiplier = 1.0;
  const reasons: string[] = ["category_based_estimate"];

  if (issueType) {
    const issueKey = Object.keys(ISSUE_MULTIPLIERS).find((k) =>
      issueType.toLowerCase().includes(k)
    );
    if (issueKey) {
      multiplier = ISSUE_MULTIPLIERS[issueKey];
      reasons.push(`issue_adjustment_${issueKey}`);
    }
  }

  const min = Math.round(range.min * multiplier);
  const max = Math.round(range.max * multiplier);

  const confidenceScore = issueType ? 55 : 35;
  reasons.push(issueType ? "issue_specified" : "category_only");

  return {
    estimated_min_price: min,
    estimated_max_price: max,
    recommended_service_type: range.service,
    confidence: createConfidenceEnvelope(confidenceScore, reasons),
    disclaimer: DISCLAIMER,
    fallback_used: false,
    advisory_only: true,
  };
}

/** Cached price estimate for repeated lookups */
export async function estimatePriceCached(
  categoryCode: string,
  issueType?: string
): Promise<PriceEstimate> {
  const { data, cached } = await withCache(
    "ai_estimate_assist",
    { categoryCode, issueType },
    async () => estimatePrice(categoryCode, issueType),
    3 * 60 * 1000 // 3 minute TTL
  );
  return { ...data, cached };
}

/** Format price range for display */
export function formatPriceRange(estimate: PriceEstimate): string {
  return `LKR ${estimate.estimated_min_price.toLocaleString()} – ${estimate.estimated_max_price.toLocaleString()}`;
}
