/**
 * LankaFix Commission Engine
 * Category-tiered commission calculation for the managed marketplace.
 * 
 * Tiers:
 *   Small Repairs   → 10% (Mobile, IT, Copier, Print Supplies)
 *   Medium Repairs   → 7%  (AC, Consumer Electronics)
 *   Project Install  → 5%  (CCTV, Solar, Smart Home/Office)
 */
import type { CategoryCode } from "@/types/booking";

// ─── Category Tier Classification ───────────────────────────────

export type CategoryTier = "small_repair" | "medium_repair" | "project_install";

export const CATEGORY_TIER_MAP: Record<CategoryCode, CategoryTier> = {
  MOBILE: "small_repair",
  IT: "small_repair",
  COPIER: "small_repair",
  PRINT_SUPPLIES: "small_repair",
  AC: "medium_repair",
  CONSUMER_ELEC: "medium_repair",
  CCTV: "project_install",
  SOLAR: "project_install",
  SMART_HOME_OFFICE: "project_install",
};

export const TIER_COMMISSION_RATES: Record<CategoryTier, number> = {
  small_repair: 10,
  medium_repair: 7,
  project_install: 5,
};

export const TIER_LABELS: Record<CategoryTier, string> = {
  small_repair: "Small Repair",
  medium_repair: "Medium Repair",
  project_install: "Installation Project",
};

// ─── Commission Calculation ─────────────────────────────────────

export interface CommissionResult {
  categoryCode: CategoryCode;
  tier: CategoryTier;
  tierLabel: string;
  commissionPercent: number;
  jobValue: number;
  commissionAmount: number;
  partnerPayout: number;
  /** Diagnostic/inspection fee retained by platform (separate revenue) */
  platformDiagnosticFee: number;
  /** Total platform revenue = commission + diagnostic fee */
  totalPlatformRevenue: number;
}

export function calculateCommission(
  categoryCode: CategoryCode,
  jobValue: number,
  diagnosticFee: number = 0
): CommissionResult {
  const tier = CATEGORY_TIER_MAP[categoryCode];
  const commissionPercent = TIER_COMMISSION_RATES[tier];
  const commissionAmount = Math.round(jobValue * (commissionPercent / 100));
  const partnerPayout = jobValue - commissionAmount;

  return {
    categoryCode,
    tier,
    tierLabel: TIER_LABELS[tier],
    commissionPercent,
    jobValue,
    commissionAmount,
    partnerPayout,
    platformDiagnosticFee: diagnosticFee,
    totalPlatformRevenue: commissionAmount + diagnosticFee,
  };
}

// ─── Job Value Lock ─────────────────────────────────────────────

export interface LockedJobValue {
  jobId: string;
  categoryCode: CategoryCode;
  lockedTotal: number;
  laborCost: number;
  partsCost: number;
  serviceFee: number;
  additionalMaterials: number;
  lockedAt: string;
  lockedBy: "quote_approval" | "fixed_price";
  commission: CommissionResult;
}

export function lockJobValue(
  jobId: string,
  categoryCode: CategoryCode,
  laborCost: number,
  partsCost: number,
  serviceFee: number,
  additionalMaterials: number,
  diagnosticFee: number = 0
): LockedJobValue {
  const lockedTotal = laborCost + partsCost + serviceFee + additionalMaterials;
  const commission = calculateCommission(categoryCode, lockedTotal, diagnosticFee);

  return {
    jobId,
    categoryCode,
    lockedTotal,
    laborCost,
    partsCost,
    serviceFee,
    additionalMaterials,
    lockedAt: new Date().toISOString(),
    lockedBy: "quote_approval",
    commission,
  };
}

// ─── Payment Model Helpers ──────────────────────────────────────

export type PaymentModel = "customer_pays_platform" | "customer_pays_partner";

export interface PaymentModelResult {
  model: PaymentModel;
  customerPays: number;
  commissionDeducted: number;
  partnerReceives: number;
  description: string;
}

/**
 * Model A: Customer pays LankaFix → platform deducts commission → pays partner
 * Model B: Customer pays partner → platform deducts commission from partner wallet
 */
export function resolvePaymentModel(
  model: PaymentModel,
  jobValue: number,
  categoryCode: CategoryCode
): PaymentModelResult {
  const commission = calculateCommission(categoryCode, jobValue);

  if (model === "customer_pays_platform") {
    return {
      model,
      customerPays: jobValue,
      commissionDeducted: commission.commissionAmount,
      partnerReceives: commission.partnerPayout,
      description: `Customer pays LKR ${jobValue.toLocaleString()} to LankaFix. Platform deducts ${commission.commissionPercent}% commission (LKR ${commission.commissionAmount.toLocaleString()}) and releases LKR ${commission.partnerPayout.toLocaleString()} to partner.`,
    };
  }

  return {
    model,
    customerPays: jobValue,
    commissionDeducted: commission.commissionAmount,
    partnerReceives: jobValue - commission.commissionAmount,
    description: `Customer pays partner directly. LankaFix deducts LKR ${commission.commissionAmount.toLocaleString()} (${commission.commissionPercent}%) from partner wallet balance.`,
  };
}
