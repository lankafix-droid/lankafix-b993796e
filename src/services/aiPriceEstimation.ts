/**
 * AI Price Estimation Service
 * Provides advisory price estimates before booking confirmation.
 * Always shows disclaimer — final price confirmed after technician inspection.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";

export interface PriceEstimate {
  estimated_min_price: number;
  estimated_max_price: number;
  recommended_service_type: string;
  confidence: AIConfidenceEnvelope;
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
  SMARTHOME: { min: 3000, max: 20000, service: "Smart Home Setup" },
  ELECTRONICS: { min: 1500, max: 8000, service: "Electronics Repair" },
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

/** Generate an advisory price estimate */
export function estimatePrice(
  categoryCode: string,
  issueType?: string
): PriceEstimate {
  const range = PRICE_RANGES[categoryCode] || { min: 2000, max: 10000, service: "General Service" };

  // Apply issue-based adjustment
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

  // Confidence based on how specific the input is
  const confidenceScore = issueType ? 55 : 35;
  reasons.push(issueType ? "issue_specified" : "category_only");

  return {
    estimated_min_price: min,
    estimated_max_price: max,
    recommended_service_type: range.service,
    confidence: createConfidenceEnvelope(confidenceScore, reasons),
    disclaimer: DISCLAIMER,
  };
}

/** Format price range for display */
export function formatPriceRange(estimate: PriceEstimate): string {
  return `LKR ${estimate.estimated_min_price.toLocaleString()} – ${estimate.estimated_max_price.toLocaleString()}`;
}
