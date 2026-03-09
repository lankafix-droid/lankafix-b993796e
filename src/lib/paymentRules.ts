/**
 * LankaFix Payment Rules Engine
 * Category-aware payment logic aligned to Sri Lankan market behavior.
 */
import type { CategoryCode } from "@/types/booking";
import { CATEGORY_TIER_MAP, TIER_COMMISSION_RATES } from "@/engines/commissionEngine";

export interface PaymentRuleResult {
  depositRequired: boolean;
  depositAmount: number;
  allowCashOnCompletion: boolean;
  allowBankTransfer: boolean;
  allowGateway: boolean;
  allowLankaQr: boolean;
  splitPaymentEnabled: boolean;
  settlementCommissionPercent: number;
  technicianSharePercent: number;
  /** Whether milestone payments apply */
  milestonePaymentsEnabled: boolean;
}

interface CategoryPaymentConfig {
  depositRequired: boolean;
  depositPercent: number;
  allowCashOnCompletion: boolean;
  splitPaymentEnabled: boolean;
  technicianSharePercent: number;
}

/** Commission rates now driven by tier: small=10%, medium=7%, project=5% */
function getCommissionPercent(categoryCode: CategoryCode): number {
  const tier = CATEGORY_TIER_MAP[categoryCode];
  return TIER_COMMISSION_RATES[tier];
}

const CATEGORY_PAYMENT_CONFIG: Record<CategoryCode, CategoryPaymentConfig> = {
  AC: {
    depositRequired: false,
    depositPercent: 0,
    allowCashOnCompletion: true,
    splitPaymentEnabled: false,
    technicianSharePercent: 60,
  },
  IT: {
    depositRequired: false,
    depositPercent: 0,
    allowCashOnCompletion: true,
    splitPaymentEnabled: false,
    technicianSharePercent: 60,
  },
  MOBILE: {
    depositRequired: false,
    depositPercent: 0,
    allowCashOnCompletion: true,
    splitPaymentEnabled: false,
    technicianSharePercent: 55,
  },
  CONSUMER_ELEC: {
    depositRequired: false,
    depositPercent: 0,
    allowCashOnCompletion: true,
    splitPaymentEnabled: false,
    technicianSharePercent: 60,
  },
  COPIER: {
    depositRequired: false,
    depositPercent: 0,
    allowCashOnCompletion: true,
    splitPaymentEnabled: false,
    technicianSharePercent: 55,
  },
  CCTV: {
    depositRequired: true,
    depositPercent: 30,
    allowCashOnCompletion: true,
    splitPaymentEnabled: true,
    technicianSharePercent: 55,
  },
  SOLAR: {
    depositRequired: true,
    depositPercent: 25,
    allowCashOnCompletion: true,
    splitPaymentEnabled: true,
    technicianSharePercent: 50,
  },
  SMART_HOME_OFFICE: {
    depositRequired: true,
    depositPercent: 25,
    allowCashOnCompletion: true,
    splitPaymentEnabled: true,
    technicianSharePercent: 55,
  },
  PRINT_SUPPLIES: {
    depositRequired: false,
    depositPercent: 0,
    allowCashOnCompletion: true,
    splitPaymentEnabled: false,
    technicianSharePercent: 65,
  },
};

export function getPaymentRules(
  categoryCode: CategoryCode,
  totalAmount: number,
  isEmergency: boolean = false,
  isQuoteRequired: boolean = false
): PaymentRuleResult {
  const config = CATEGORY_PAYMENT_CONFIG[categoryCode];

  let depositRequired = config.depositRequired;
  let depositAmount = 0;

  // Emergency or quote-required may trigger deposit
  if (isEmergency && !depositRequired) {
    depositRequired = false; // Don't force deposit for emergencies in small repair categories
  }
  if (isQuoteRequired && !depositRequired && totalAmount > 10000) {
    depositRequired = true;
  }

  if (depositRequired) {
    depositAmount = Math.round(totalAmount * (config.depositPercent / 100));
    if (depositAmount < 500) depositAmount = 500; // Minimum deposit
  }

  return {
    depositRequired,
    depositAmount,
    allowCashOnCompletion: config.allowCashOnCompletion,
    allowBankTransfer: true,
    allowGateway: false, // Coming soon
    allowLankaQr: false, // Coming soon
    splitPaymentEnabled: config.splitPaymentEnabled,
    settlementCommissionPercent: config.commissionPercent,
    technicianSharePercent: config.technicianSharePercent,
  };
}
