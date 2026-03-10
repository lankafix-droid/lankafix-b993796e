/**
 * LankaFix Deterministic Pricing Engine
 * 
 * AUTHORITY: This engine is the SINGLE SOURCE OF TRUTH for all pricing.
 * AI modules are strictly informational — they cannot override these calculations.
 * 
 * Every price component is rule-attributed with an explainable source.
 */
import type { CategoryCode } from "@/types/booking";
import { categoryPricingRules, type CategoryPricingRule, serviceOverrides } from "@/config/pricingRules";
import { CATEGORY_TIER_MAP, TIER_COMMISSION_RATES, type CategoryTier } from "@/engines/commissionEngine";
import { MARKET_PRICE_RANGES, type MarketPriceRange } from "@/engines/pricingIntelligenceEngine";
import { getTravelFee } from "@/data/travelFees";
import { getPaymentRules } from "@/lib/paymentRules";

// ─── Rule Attribution ───────────────────────────────────────────

export type RuleSource =
  | "category_config"
  | "service_override"
  | "market_range"
  | "zone_travel"
  | "emergency_policy"
  | "commission_tier"
  | "deposit_policy"
  | "platform_policy";

export interface PriceLineItem {
  id: string;
  label: string;
  amount: number;
  ruleSource: RuleSource;
  explanation: string;
  /** Whether customer sees this line */
  customerVisible: boolean;
}

export interface DeterministicPriceResult {
  /** All itemized line items with rule attribution */
  lineItems: PriceLineItem[];
  /** Customer-facing subtotals */
  subtotals: {
    visitFee: number;
    diagnosticFee: number;
    estimatedServiceMin: number;
    estimatedServiceMax: number;
    travelFee: number;
    emergencySurcharge: number;
    protectionFee: number;
  };
  /** Total estimated range */
  estimatedTotalMin: number;
  estimatedTotalMax: number;
  /** Deposit info */
  deposit: {
    required: boolean;
    amount: number;
    explanation: string;
  };
  /** Commission (internal, not customer-visible) */
  commission: {
    tier: CategoryTier;
    percent: number;
    estimatedAmount: number;
  };
  /** Market validation */
  marketRange: MarketPriceRange | null;
  isWithinMarketRange: boolean;
  /** Guardrail status */
  guardrails: GuardrailResult;
  /** Explainability metadata */
  pricingModel: string;
  ruleVersion: string;
}

// ─── Guardrails ─────────────────────────────────────────────────

export type GuardrailLevel = "pass" | "warning" | "ceiling_hit" | "blocked";

export interface GuardrailResult {
  level: GuardrailLevel;
  messages: GuardrailMessage[];
  ceilingLKR: number | null;
  isAboveCeiling: boolean;
}

export interface GuardrailMessage {
  level: "info" | "warning" | "error";
  message: string;
  ruleSource: RuleSource;
}

const GUARDRAIL_CEILING_MULTIPLIER = 1.5; // 150% of market max
const GUARDRAIL_WARNING_MULTIPLIER = 1.2; // 120% of market max
const GUARDRAIL_FLOOR_MULTIPLIER = 0.5;   // 50% of market min

function evaluateGuardrails(
  totalLKR: number,
  marketRange: MarketPriceRange | null
): GuardrailResult {
  const messages: GuardrailMessage[] = [];
  let level: GuardrailLevel = "pass";
  let ceilingLKR: number | null = null;
  let isAboveCeiling = false;

  if (!marketRange) {
    messages.push({
      level: "info",
      message: "No market benchmark available for this service. Price set by technician quote.",
      ruleSource: "market_range",
    });
    return { level, messages, ceilingLKR, isAboveCeiling };
  }

  ceilingLKR = Math.round(marketRange.maxLKR * GUARDRAIL_CEILING_MULTIPLIER);

  // Floor check
  if (totalLKR < marketRange.minLKR * GUARDRAIL_FLOOR_MULTIPLIER) {
    level = "warning";
    messages.push({
      level: "warning",
      message: `Quote LKR ${totalLKR.toLocaleString()} is ${Math.round(((marketRange.minLKR - totalLKR) / marketRange.minLKR) * 100)}% below market minimum. May indicate quality concerns.`,
      ruleSource: "market_range",
    });
  }

  // Within range
  if (totalLKR >= marketRange.minLKR && totalLKR <= marketRange.maxLKR) {
    messages.push({
      level: "info",
      message: "Price is within the verified Sri Lankan market range.",
      ruleSource: "market_range",
    });
  }

  // Warning zone
  if (totalLKR > marketRange.maxLKR && totalLKR <= marketRange.maxLKR * GUARDRAIL_WARNING_MULTIPLIER) {
    level = "warning";
    messages.push({
      level: "warning",
      message: `Quote is ${Math.round(((totalLKR - marketRange.maxLKR) / marketRange.maxLKR) * 100)}% above typical market range. Explanation recommended.`,
      ruleSource: "market_range",
    });
  }

  // Ceiling zone
  if (totalLKR > marketRange.maxLKR * GUARDRAIL_WARNING_MULTIPLIER && totalLKR <= ceilingLKR) {
    level = "ceiling_hit";
    messages.push({
      level: "warning",
      message: `Quote exceeds market range significantly. Requires technician explanation before customer approval.`,
      ruleSource: "market_range",
    });
  }

  // Blocked
  if (totalLKR > ceilingLKR) {
    level = "blocked";
    isAboveCeiling = true;
    messages.push({
      level: "error",
      message: `Quote LKR ${totalLKR.toLocaleString()} exceeds the guardrail ceiling of LKR ${ceilingLKR.toLocaleString()}. Admin review required.`,
      ruleSource: "platform_policy",
    });
  }

  return { level, messages, ceilingLKR, isAboveCeiling };
}

// ─── Main Engine ────────────────────────────────────────────────

export function calculateDeterministicPrice(params: {
  categoryCode: CategoryCode;
  serviceCode?: string;
  serviceKey?: string;
  basePrice: number;
  isEmergency?: boolean;
  zoneId?: string;
  requiresDiagnostic?: boolean;
  requiresQuote?: boolean;
  protectionFee?: number;
}): DeterministicPriceResult {
  const {
    categoryCode,
    serviceCode,
    serviceKey,
    basePrice,
    isEmergency = false,
    zoneId,
    requiresDiagnostic = false,
    requiresQuote = false,
    protectionFee = 0,
  } = params;

  const catRule = categoryPricingRules[categoryCode];
  const svcOverride = serviceCode ? serviceOverrides[serviceCode] : undefined;
  const lineItems: PriceLineItem[] = [];

  // 1. Visit Fee
  const visitFee = svcOverride?.visitFee ?? catRule.visitFee;
  if (visitFee > 0) {
    lineItems.push({
      id: "visit_fee",
      label: "Visit / Call-out Fee",
      amount: visitFee,
      ruleSource: svcOverride?.visitFee !== undefined ? "service_override" : "category_config",
      explanation: `Standard visit fee for ${categoryCode} services. Covers technician travel and initial assessment.`,
      customerVisible: true,
    });
  }

  // 2. Diagnostic Fee
  const diagnosticFee = requiresDiagnostic ? (svcOverride?.diagnosticFee ?? catRule.diagnosticFee) : 0;
  if (diagnosticFee > 0) {
    lineItems.push({
      id: "diagnostic_fee",
      label: "Diagnostic / Inspection Fee",
      amount: diagnosticFee,
      ruleSource: svcOverride?.diagnosticFee !== undefined ? "service_override" : "category_config",
      explanation: "Covers detailed diagnosis to identify the exact issue. Deducted from final bill if you proceed with repair.",
      customerVisible: true,
    });
  }

  // 3. Travel Fee
  const travelFee = zoneId ? getTravelFee(zoneId) : 0;
  if (travelFee > 0) {
    lineItems.push({
      id: "travel_fee",
      label: "Travel Fee",
      amount: travelFee,
      ruleSource: "zone_travel",
      explanation: "Zone-based travel charge. Colombo Central is free, suburbs incur a distance-based fee.",
      customerVisible: true,
    });
  }

  // 4. Emergency Surcharge
  const surchargePercent = svcOverride?.emergencySurchargePercent ?? catRule.emergencySurchargePercent;
  const emergencySurcharge = isEmergency ? Math.round((visitFee + diagnosticFee + basePrice) * surchargePercent / 100) : 0;
  if (emergencySurcharge > 0) {
    lineItems.push({
      id: "emergency_surcharge",
      label: "Emergency Surcharge",
      amount: emergencySurcharge,
      ruleSource: "emergency_policy",
      explanation: `${surchargePercent}% surcharge for priority emergency dispatch. Technician arrives within 60 minutes.`,
      customerVisible: true,
    });
  }

  // 5. Protection Fee
  if (protectionFee > 0) {
    lineItems.push({
      id: "protection_fee",
      label: "Booking Protection",
      amount: protectionFee,
      ruleSource: "platform_policy",
      explanation: "Fully refundable protection fee. Covers service guarantee, dispute resolution, and quality assurance.",
      customerVisible: true,
    });
  }

  // 6. Estimate range
  const multiplier = svcOverride?.estimateMultiplier ?? catRule.estimateMultiplier;
  const estimatedServiceMin = Math.round(basePrice * multiplier.min);
  const estimatedServiceMax = Math.round(basePrice * multiplier.max);

  // Calculate totals
  const fixedFees = visitFee + diagnosticFee + (travelFee > 0 ? travelFee : 0) + emergencySurcharge + protectionFee;
  const estimatedTotalMin = fixedFees + estimatedServiceMin;
  const estimatedTotalMax = fixedFees + estimatedServiceMax;

  // Market range lookup
  const marketRange = serviceKey
    ? MARKET_PRICE_RANGES.find(r => r.serviceKey === serviceKey) ?? null
    : null;

  const isWithinMarketRange = marketRange
    ? estimatedTotalMin >= marketRange.minLKR * 0.8 && estimatedTotalMax <= marketRange.maxLKR * 1.2
    : true;

  // Guardrails
  const guardrails = evaluateGuardrails(estimatedTotalMax, marketRange);

  // Commission (internal)
  const tier = CATEGORY_TIER_MAP[categoryCode];
  const commissionPercent = TIER_COMMISSION_RATES[tier];
  const estimatedCommission = Math.round(estimatedServiceMin * (commissionPercent / 100));

  // Deposit
  const paymentRules = getPaymentRules(categoryCode, estimatedTotalMin, isEmergency, requiresQuote);

  // Determine pricing model label
  let pricingModel = "Fixed Price";
  if (requiresQuote) pricingModel = "Inspection Required";
  else if (requiresDiagnostic) pricingModel = "Diagnostic First";
  else if (estimatedServiceMin !== estimatedServiceMax) pricingModel = "Starting From";

  return {
    lineItems,
    subtotals: {
      visitFee,
      diagnosticFee,
      estimatedServiceMin,
      estimatedServiceMax,
      travelFee: travelFee > 0 ? travelFee : 0,
      emergencySurcharge,
      protectionFee,
    },
    estimatedTotalMin,
    estimatedTotalMax,
    deposit: {
      required: paymentRules.depositRequired,
      amount: paymentRules.depositAmount,
      explanation: paymentRules.depositRequired
        ? `A refundable deposit of LKR ${paymentRules.depositAmount.toLocaleString()} is required for ${categoryCode} services to secure your booking.`
        : "No deposit required. Pay after service completion.",
    },
    commission: {
      tier,
      percent: commissionPercent,
      estimatedAmount: estimatedCommission,
    },
    marketRange,
    isWithinMarketRange,
    guardrails,
    pricingModel,
    ruleVersion: "v2.0-deterministic",
  };
}

// ─── Quote Validation (Server-side mirror) ──────────────────────

export function validateQuoteAgainstGuardrails(
  quoteTotalLKR: number,
  categoryCode: CategoryCode,
  serviceKey?: string
): GuardrailResult {
  const marketRange = serviceKey
    ? MARKET_PRICE_RANGES.find(r => r.serviceKey === serviceKey) ?? null
    : null;
  return evaluateGuardrails(quoteTotalLKR, marketRange);
}
