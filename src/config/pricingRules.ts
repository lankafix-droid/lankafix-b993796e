import type { CategoryCode } from "@/types/booking";

export interface CategoryPricingRule {
  visitFee: number;
  diagnosticFee: number;
  emergencySurchargePercent: number;
  estimateMultiplier: { min: number; max: number };
  depositRequired: boolean;
  depositAmount: number;
  cancelPolicy: {
    freeCancelMinutes: number;
    refundBeforeDispatchPercent: number;
    refundAfterDispatchPercent: number;
  };
}

export interface ServicePricingOverride {
  visitFee?: number;
  diagnosticFee?: number;
  emergencySurchargePercent?: number;
  estimateMultiplier?: { min: number; max: number };
  depositRequired?: boolean;
  depositAmount?: number;
}

const defaultRule: CategoryPricingRule = {
  visitFee: 500,
  diagnosticFee: 0,
  emergencySurchargePercent: 0,
  estimateMultiplier: { min: 1.0, max: 2.5 },
  depositRequired: false,
  depositAmount: 0,
  cancelPolicy: {
    freeCancelMinutes: 5,
    refundBeforeDispatchPercent: 100,
    refundAfterDispatchPercent: 0,
  },
};

export const categoryPricingRules: Record<CategoryCode, CategoryPricingRule> = {
  AC: {
    visitFee: 500,
    diagnosticFee: 1500,
    emergencySurchargePercent: 25,
    estimateMultiplier: { min: 1.0, max: 2.0 },
    depositRequired: false,
    depositAmount: 0,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 0 },
  },
  CCTV: {
    visitFee: 0,
    diagnosticFee: 2000,
    emergencySurchargePercent: 20,
    estimateMultiplier: { min: 1.0, max: 3.0 },
    depositRequired: true,
    depositAmount: 3000,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 0 },
  },
  MOBILE: {
    visitFee: 0,
    diagnosticFee: 500,
    emergencySurchargePercent: 30,
    estimateMultiplier: { min: 1.0, max: 2.5 },
    depositRequired: false,
    depositAmount: 0,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 0 },
  },
  IT: {
    visitFee: 1000,
    diagnosticFee: 1500,
    emergencySurchargePercent: 25,
    estimateMultiplier: { min: 1.0, max: 3.0 },
    depositRequired: false,
    depositAmount: 0,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 0 },
  },
  SOLAR: {
    visitFee: 0,
    diagnosticFee: 3000,
    emergencySurchargePercent: 0,
    estimateMultiplier: { min: 1.0, max: 5.0 },
    depositRequired: true,
    depositAmount: 5000,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 50 },
  },
  CONSUMER_ELEC: {
    visitFee: 500,
    diagnosticFee: 1000,
    emergencySurchargePercent: 20,
    estimateMultiplier: { min: 1.0, max: 2.0 },
    depositRequired: false,
    depositAmount: 0,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 0 },
  },
  SMART_HOME_OFFICE: {
    visitFee: 0,
    diagnosticFee: 2500,
    emergencySurchargePercent: 0,
    estimateMultiplier: { min: 1.0, max: 4.0 },
    depositRequired: true,
    depositAmount: 3000,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 50 },
  },
  COPIER: {
    visitFee: 1000,
    diagnosticFee: 1500,
    emergencySurchargePercent: 20,
    estimateMultiplier: { min: 1.0, max: 2.5 },
    depositRequired: false,
    depositAmount: 0,
    cancelPolicy: { freeCancelMinutes: 5, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 0 },
  },
  PRINT_SUPPLIES: {
    visitFee: 0,
    diagnosticFee: 0,
    emergencySurchargePercent: 0,
    estimateMultiplier: { min: 1.0, max: 1.5 },
    depositRequired: false,
    depositAmount: 0,
    cancelPolicy: { freeCancelMinutes: 10, refundBeforeDispatchPercent: 100, refundAfterDispatchPercent: 100 },
  },
};

export const serviceOverrides: Record<string, ServicePricingOverride> = {
  AC_GAS_TOPUP: { visitFee: 0, diagnosticFee: 0, estimateMultiplier: { min: 1.0, max: 1.2 } },
  AC_FULL_SERVICE: { visitFee: 0, diagnosticFee: 0, estimateMultiplier: { min: 1.0, max: 1.3 } },
  MOBILE_SCREEN: { emergencySurchargePercent: 40 },
  IT_REMOTE: { visitFee: 0, diagnosticFee: 0 },
  SOLAR_INSTALL: { depositRequired: true, depositAmount: 10000 },
  COPIER_MAJOR: { depositRequired: true, depositAmount: 5000 },
  PS_TONER_ORDER: { estimateMultiplier: { min: 1.0, max: 1.2 } },
  PS_INK_ORDER: { estimateMultiplier: { min: 1.0, max: 1.1 } },
};

export interface PricingResult {
  visitFee: number;
  diagnosticFee: number;
  emergencySurcharge: number;
  estimatedMin: number;
  estimatedMax: number;
  depositRequired: boolean;
  depositAmount: number;
  partsSeparate: boolean;
  quoteRequired: boolean;
  cancelPolicy: CategoryPricingRule["cancelPolicy"];
  /** Dynamic pricing fields */
  baseVisitFee: number;
  zoneFactorAmount: number;
  platformFee: number;
}

export function calculatePricing(
  categoryCode: CategoryCode,
  serviceCode: string,
  fromPrice: number,
  requiresDiagnostic: boolean,
  requiresQuote: boolean,
  isEmergency: boolean,
  surgeFactor: number = 1.0
): PricingResult {
  const catRule = categoryPricingRules[categoryCode] || defaultRule;
  const svcOverride = serviceOverrides[serviceCode] || {};

  const visitFee = svcOverride.visitFee ?? catRule.visitFee;
  const diagnosticFee = requiresDiagnostic ? (svcOverride.diagnosticFee ?? catRule.diagnosticFee) : 0;
  const surchargePercent = svcOverride.emergencySurchargePercent ?? catRule.emergencySurchargePercent;
  const multiplier = svcOverride.estimateMultiplier ?? catRule.estimateMultiplier;
  const depositReq = svcOverride.depositRequired ?? catRule.depositRequired;
  const depositAmt = svcOverride.depositAmount ?? catRule.depositAmount;

  const baseMin = fromPrice * multiplier.min;
  const baseMax = fromPrice * multiplier.max;
  const zoneFactorAmount = Math.round((visitFee + baseMin) * (surgeFactor - 1));
  const emergencySurcharge = isEmergency ? Math.round((visitFee + diagnosticFee + baseMin) * surchargePercent / 100) : 0;
  const platformFee = Math.round(baseMin * 0.05); // 5% platform fee

  return {
    visitFee,
    diagnosticFee,
    emergencySurcharge,
    estimatedMin: Math.round(baseMin + zoneFactorAmount),
    estimatedMax: Math.round(baseMax + zoneFactorAmount),
    depositRequired: depositReq,
    depositAmount: depositAmt,
    partsSeparate: requiresQuote,
    quoteRequired: requiresQuote,
    cancelPolicy: catRule.cancelPolicy,
    baseVisitFee: visitFee,
    zoneFactorAmount,
    platformFee,
  };
}
