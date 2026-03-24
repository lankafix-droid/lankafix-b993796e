/**
 * AI Pricing Advisor Service
 * Client-side service to invoke the AI pricing advisor edge function.
 * Returns structured pricing guidance for technicians.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PricingAdvisorRequest {
  category_code: string;
  service_type?: string;
  service_key?: string;
  issue_description?: string;
  device_brand?: string;
  device_model?: string;
  is_emergency?: boolean;
  zone_code?: string;
  /** Optional: validate an existing quote */
  proposed_labor?: number;
  proposed_parts?: { name: string; amount: number }[];
  proposed_total?: number;
}

export interface AIRecommendedRange {
  min_lkr: number;
  max_lkr: number;
  sweet_spot_lkr: number;
}

export interface AIPartsAssessment {
  likely_needed: boolean;
  estimated_parts_cost_min?: number;
  estimated_parts_cost_max?: number;
  common_parts?: string[];
  parts_availability?: "readily_available" | "may_need_ordering" | "specialist_sourcing";
}

export interface AITimeEstimate {
  min_minutes: number;
  max_minutes: number;
  includes_diagnostics?: boolean;
}

export interface AIRiskWarning {
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface AIQuoteValidation {
  is_fair: boolean;
  feedback: string;
  approval_likelihood: "very_likely" | "likely" | "uncertain" | "unlikely";
}

export interface AIUpsellOpportunity {
  service: string;
  reason: string;
  estimated_cost_lkr?: number;
}

export interface AIPricingAdvice {
  complexity_level: "low" | "medium" | "high" | "specialist";
  complexity_reasoning: string;
  recommended_price_range: AIRecommendedRange;
  price_factors_up: string[];
  price_factors_down: string[];
  parts_assessment: AIPartsAssessment;
  time_estimate: AITimeEstimate;
  risk_warnings: AIRiskWarning[];
  customer_explanation: string;
  quote_validation?: AIQuoteValidation;
  upsell_opportunities?: AIUpsellOpportunity[];
}

export interface PricingAdvisorResponse {
  market_band: { min: number; max: number; typical: number } | null;
  complexity_factors: string[];
  warranty_template: string;
  is_emergency: boolean;
  ai_advice: AIPricingAdvice | null;
  ai_available: boolean;
  response_time_ms: number;
  advisory_notice: string;
}

/**
 * Get AI pricing guidance for a repair job.
 * Combines deterministic market data with AI-generated insights.
 */
export async function getPricingAdvice(
  request: PricingAdvisorRequest
): Promise<{ data: PricingAdvisorResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-pricing-advisor", {
      body: request,
    });

    if (error) {
      return { data: null, error: error.message || "Failed to get pricing advice" };
    }

    return { data: data as PricingAdvisorResponse, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Format complexity level for display
 */
export function getComplexityDisplay(level: AIPricingAdvice["complexity_level"]) {
  const map = {
    low: { label: "Simple Job", color: "text-emerald-600 bg-emerald-50", icon: "✅" },
    medium: { label: "Standard Repair", color: "text-amber-600 bg-amber-50", icon: "🔧" },
    high: { label: "Complex Repair", color: "text-orange-600 bg-orange-50", icon: "⚠️" },
    specialist: { label: "Specialist Required", color: "text-red-600 bg-red-50", icon: "🔬" },
  };
  return map[level] || map.medium;
}

/**
 * Format LKR amount for display
 */
export function formatLKR(amount: number): string {
  return `Rs ${amount.toLocaleString()}`;
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(estimate: AITimeEstimate): string {
  const fmtTime = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    }
    return `${m}m`;
  };
  return `${fmtTime(estimate.min_minutes)} – ${fmtTime(estimate.max_minutes)}`;
}
