/**
 * AI Output Schemas
 * Type definitions and runtime validators for all AI module outputs.
 * Every AI response MUST be validated before use.
 */

// ── Photo Triage ──────────────────────────────────────────────
export interface PhotoTriageOutput {
  possible_issue: string;
  urgency: "low" | "medium" | "high";
  requires_diagnostic: boolean;
  confidence_score: number;
}

export function isValidPhotoTriage(obj: unknown): obj is PhotoTriageOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.possible_issue === "string" &&
    ["low", "medium", "high"].includes(o.urgency as string) &&
    typeof o.requires_diagnostic === "boolean" &&
    typeof o.confidence_score === "number" &&
    o.confidence_score >= 0 &&
    o.confidence_score <= 100
  );
}

// ── Price Estimate ────────────────────────────────────────────
export interface PriceEstimateOutput {
  estimated_min_price: number;
  estimated_max_price: number;
  recommended_service_type: string;
  confidence_score: number;
}

export function isValidPriceEstimate(obj: unknown): obj is PriceEstimateOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.estimated_min_price === "number" &&
    typeof o.estimated_max_price === "number" &&
    typeof o.recommended_service_type === "string" &&
    typeof o.confidence_score === "number" &&
    o.estimated_min_price <= o.estimated_max_price
  );
}

// ── Review Summary ────────────────────────────────────────────
export interface ReviewSummaryOutput {
  positive_themes: string[];
  complaint_themes: string[];
  quality_strengths: string[];
  risk_signals: string[];
  overall_sentiment: "positive" | "mixed" | "negative";
}

export function isValidReviewSummary(obj: unknown): obj is ReviewSummaryOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.positive_themes) &&
    Array.isArray(o.complaint_themes) &&
    Array.isArray(o.quality_strengths) &&
    Array.isArray(o.risk_signals) &&
    ["positive", "mixed", "negative"].includes(o.overall_sentiment as string)
  );
}

// ── Fraud Alert ───────────────────────────────────────────────
export interface FraudAlertOutput {
  alert_type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  message: string;
  confidence_score: number;
}

export function isValidFraudAlert(obj: unknown): obj is FraudAlertOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.alert_type === "string" &&
    ["info", "low", "medium", "high", "critical"].includes(o.severity as string) &&
    typeof o.message === "string" &&
    typeof o.confidence_score === "number"
  );
}

// ── Partner Reliability ───────────────────────────────────────
export interface PartnerReliabilityOutput {
  reliability_score: number;
  response_reliability: number;
  completion_consistency: number;
  satisfaction_trend: "improving" | "stable" | "declining";
  dispute_frequency: "low" | "moderate" | "high";
}

export function isValidPartnerReliability(obj: unknown): obj is PartnerReliabilityOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.reliability_score === "number" &&
    typeof o.response_reliability === "number" &&
    typeof o.completion_consistency === "number" &&
    ["improving", "stable", "declining"].includes(o.satisfaction_trend as string) &&
    ["low", "moderate", "high"].includes(o.dispute_frequency as string)
  );
}
