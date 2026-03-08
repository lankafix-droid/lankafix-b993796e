/**
 * LankaFix Booking Protection Engine
 * Determines protection type, fee, and contact unlock logic per category.
 */
import type { CategoryCode } from "@/types/booking";

export type ProtectionType = "secure_booking" | "dispatch_protection" | "site_visit_reservation";

export interface ProtectionConfig {
  type: ProtectionType;
  label: string;
  description: string;
  feeRange: { min: number; max: number; default: number };
  refundPolicy: string;
  adjustableAgainstInvoice: boolean;
  uiMessage: string;
  ctaLabel: string;
}

const PROTECTION_CONFIGS: Record<ProtectionType, Omit<ProtectionConfig, "feeRange">> = {
  secure_booking: {
    type: "secure_booking",
    label: "Secure Booking Fee",
    description: "Reserves your verified technician and activates LankaFix service protection.",
    refundPolicy: "Non-refundable once provider is assigned and job is accepted. May be adjusted against the final bill.",
    adjustableAgainstInvoice: false,
    uiMessage: "Secure your LankaFix booking with a small confirmation fee.",
    ctaLabel: "Continue with Secure Booking",
  },
  dispatch_protection: {
    type: "dispatch_protection",
    label: "Technician Dispatch Protection",
    description: "Confirms technician dispatch to your location under LankaFix protection.",
    refundPolicy: "Non-refundable once technician dispatch is confirmed. If technician fails to arrive within SLA, LankaFix may refund or compensate.",
    adjustableAgainstInvoice: false,
    uiMessage: "Confirm technician dispatch under LankaFix protection.",
    ctaLabel: "Confirm Protected Dispatch",
  },
  site_visit_reservation: {
    type: "site_visit_reservation",
    label: "Site Visit Reservation",
    description: "Reserves a verified LankaFix site inspection. Fee is deducted from your final invoice if you proceed with the project.",
    refundPolicy: "Deducted from final invoice if project proceeds. Non-refundable once site inspection is completed.",
    adjustableAgainstInvoice: true,
    uiMessage: "Reserve your verified LankaFix site visit.",
    ctaLabel: "Reserve Site Visit",
  },
};

const FEE_RANGES: Record<ProtectionType, { min: number; max: number; default: number }> = {
  secure_booking: { min: 500, max: 1500, default: 750 },
  dispatch_protection: { min: 1000, max: 2500, default: 1500 },
  site_visit_reservation: { min: 2000, max: 5000, default: 3000 },
};

const CATEGORY_PROTECTION_MAP: Record<CategoryCode, ProtectionType> = {
  MOBILE: "secure_booking",
  IT: "secure_booking",
  COPIER: "secure_booking",
  PRINT_SUPPLIES: "secure_booking",
  AC: "dispatch_protection",
  CONSUMER_ELEC: "dispatch_protection",
  CCTV: "site_visit_reservation",
  SOLAR: "site_visit_reservation",
  SMART_HOME_OFFICE: "site_visit_reservation",
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
  // Emergency bookings use max fee
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

export const TRUST_BADGES = [
  { label: "Verified Technicians", icon: "ShieldCheck" },
  { label: "LankaFix Booking Protection", icon: "Lock" },
  { label: "Secure Payment", icon: "CreditCard" },
  { label: "LankaFix Support Available", icon: "Headphones" },
] as const;
