/**
 * LankaFix Booking Protection Engine
 * Determines protection type, fee, contact unlock logic, and category-specific messaging.
 */
import type { CategoryCode } from "@/types/booking";

export type ProtectionType = "secure_booking" | "dispatch_protection" | "site_visit_reservation";

export type PaymentMethodId = "lankaqr" | "card" | "bank_transfer" | "wallet";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: string;
  instant: boolean;
  available: boolean;
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { id: "lankaqr", label: "LankaQR", description: "Scan & pay instantly", icon: "QrCode", instant: true, available: true },
  { id: "card", label: "Visa / Mastercard", description: "Credit or debit card", icon: "CreditCard", instant: true, available: true },
  { id: "wallet", label: "Digital Wallet", description: "FriMi, eZ Cash, mCash", icon: "Wallet", instant: true, available: true },
  { id: "bank_transfer", label: "Bank Transfer", description: "Upload receipt after transfer", icon: "Building2", instant: false, available: true },
];

export interface ProtectionConfig {
  type: ProtectionType;
  label: string;
  description: string;
  categoryMessage: string;
  feeRange: { min: number; max: number; default: number };
  refundPolicy: string;
  refundChipLabel: string;
  refundChipVariant: "adjustable" | "non_refundable" | "sla_protected";
  adjustableAgainstInvoice: boolean;
  uiMessage: string;
  ctaLabel: string;
  payLaterLabel: string;
}

const PROTECTION_CONFIGS: Record<ProtectionType, Omit<ProtectionConfig, "feeRange">> = {
  secure_booking: {
    type: "secure_booking",
    label: "Secure Booking Fee",
    description: "Reserves your verified technician and activates LankaFix service protection.",
    categoryMessage: "This confirms your LankaFix repair booking and prepares the correct technician or repair partner.",
    refundPolicy: "Non-refundable once provider is assigned and job is accepted. May be adjusted against the final bill.",
    refundChipLabel: "Non-Refundable After Assignment",
    refundChipVariant: "non_refundable",
    adjustableAgainstInvoice: false,
    uiMessage: "Reserve your verified LankaFix technician with a small booking protection fee.",
    ctaLabel: "Continue with Secure Booking",
    payLaterLabel: "Final repair cost confirmed after diagnosis",
  },
  dispatch_protection: {
    type: "dispatch_protection",
    label: "Inspection Booking Fee",
    description: "Confirms technician dispatch to your location under LankaFix protection.",
    categoryMessage: "This confirms technician dispatch and protects against wasted visits.",
    refundPolicy: "Non-refundable once technician dispatch is confirmed. If technician fails to arrive within SLA, LankaFix may refund or compensate.",
    refundChipLabel: "Refunded if Technician Fails SLA",
    refundChipVariant: "sla_protected",
    adjustableAgainstInvoice: false,
    uiMessage: "Confirm technician dispatch under LankaFix protection.",
    ctaLabel: "Confirm Protected Dispatch",
    payLaterLabel: "Service cost confirmed after technician diagnosis",
  },
  site_visit_reservation: {
    type: "site_visit_reservation",
    label: "Site Visit Reservation",
    description: "Reserves a verified LankaFix site inspection. Fee is deducted from your final invoice if you proceed with the project.",
    categoryMessage: "This reserves your LankaFix project consultation. The amount will be adjusted against your final project bill if you proceed.",
    refundPolicy: "Deducted from final invoice if project proceeds. Non-refundable once site inspection is completed.",
    refundChipLabel: "Adjustable Against Final Bill",
    refundChipVariant: "adjustable",
    adjustableAgainstInvoice: true,
    uiMessage: "Reserve your verified LankaFix site visit.",
    ctaLabel: "Reserve Site Visit",
    payLaterLabel: "Project cost quoted after site inspection",
  },
};

const FEE_RANGES: Record<ProtectionType, { min: number; max: number; default: number }> = {
  secure_booking: { min: 1000, max: 1500, default: 1000 },
  dispatch_protection: { min: 1500, max: 2500, default: 1500 },
  site_visit_reservation: { min: 2500, max: 5000, default: 3000 },
};

const CATEGORY_PROTECTION_MAP: Record<CategoryCode, ProtectionType> = {
  MOBILE: "secure_booking",
  IT: "secure_booking",
  COPIER: "secure_booking",
  PRINT_SUPPLIES: "secure_booking",
  NETWORK: "secure_booking",
  AC: "dispatch_protection",
  CONSUMER_ELEC: "dispatch_protection",
  ELECTRICAL: "dispatch_protection",
  PLUMBING: "dispatch_protection",
  APPLIANCE_INSTALL: "dispatch_protection",
  CCTV: "site_visit_reservation",
  SOLAR: "site_visit_reservation",
  SMART_HOME_OFFICE: "site_visit_reservation",
  HOME_SECURITY: "site_visit_reservation",
  POWER_BACKUP: "site_visit_reservation",
};

export function getProtectionType(categoryCode: CategoryCode): ProtectionType {
  return CATEGORY_PROTECTION_MAP[categoryCode];
}

export function getProtectionConfig(categoryCode: CategoryCode): ProtectionConfig {
  const type = getProtectionType(categoryCode);
  return {
    ...PROTECTION_CONFIGS[type],
    feeRange: FEE_RANGES[type],
  };
}

export function getProtectionFee(categoryCode: CategoryCode, isEmergency: boolean = false): number {
  const config = getProtectionConfig(categoryCode);
  if (isEmergency) return config.feeRange.max;
  return config.feeRange.default;
}

export function isContactUnlocked(protectionStatus: string | null): boolean {
  return protectionStatus === "paid";
}

export function getProtectionBenefits(): string[] {
  return [
    "Reserve your verified technician",
    "Prevent fake bookings",
    "Ensure faster service dispatch",
    "Protect your job under LankaFix support",
  ];
}

export function getAntiBypassNotice(): string {
  return "LankaFix warranty, mediation, and service protection apply only to bookings confirmed through LankaFix.";
}

/** Slot hold duration in seconds */
export const SLOT_HOLD_SECONDS = 600; // 10 minutes

export const TRUST_BADGES = [
  { label: "Verified Providers", icon: "ShieldCheck" },
  { label: "Transparent Pricing", icon: "Eye" },
  { label: "Service Protection", icon: "Shield" },
  { label: "LankaFix Mediation", icon: "Headphones" },
] as const;
