/**
 * LankaFix Service Pricing Intelligence Engine
 * Provides realistic Sri Lankan market price ranges, quote validation,
 * and pricing trust indicators for all service categories.
 */
import type { CategoryCode } from "@/types/booking";

// ─── Market Price Range Database (LKR) ───

export interface MarketPriceRange {
  serviceKey: string;
  category: CategoryCode;
  label: string;
  minLKR: number;
  maxLKR: number;
  /** Typical/median price */
  typicalLKR: number;
  /** Includes labour only or labour+parts */
  includesParts: boolean;
  /** Tags for search/filter */
  tags: string[];
}

export const MARKET_PRICE_RANGES: MarketPriceRange[] = [
  // ─── IT REPAIRS ───
  { serviceKey: "it_laptop_screen", category: "IT", label: "Laptop Screen Replacement", minLKR: 12000, maxLKR: 45000, typicalLKR: 22000, includesParts: true, tags: ["laptop", "screen", "display"] },
  { serviceKey: "it_laptop_battery", category: "IT", label: "Laptop Battery Replacement", minLKR: 6000, maxLKR: 18000, typicalLKR: 10000, includesParts: true, tags: ["laptop", "battery"] },
  { serviceKey: "it_laptop_motherboard", category: "IT", label: "Laptop Motherboard Repair", minLKR: 8000, maxLKR: 35000, typicalLKR: 18000, includesParts: true, tags: ["laptop", "motherboard", "board"] },
  { serviceKey: "it_laptop_hinge", category: "IT", label: "Laptop Hinge Repair", minLKR: 3500, maxLKR: 12000, typicalLKR: 6500, includesParts: true, tags: ["laptop", "hinge"] },
  { serviceKey: "it_laptop_keyboard", category: "IT", label: "Laptop Keyboard Replacement", minLKR: 5000, maxLKR: 15000, typicalLKR: 8500, includesParts: true, tags: ["laptop", "keyboard"] },
  { serviceKey: "it_laptop_overheat", category: "IT", label: "Laptop Overheating Service", minLKR: 2500, maxLKR: 6000, typicalLKR: 3500, includesParts: false, tags: ["laptop", "overheating", "thermal"] },
  { serviceKey: "it_desktop_ram", category: "IT", label: "Desktop RAM Upgrade", minLKR: 4000, maxLKR: 12000, typicalLKR: 7000, includesParts: true, tags: ["desktop", "ram", "memory"] },
  { serviceKey: "it_desktop_storage", category: "IT", label: "Desktop Storage Upgrade", minLKR: 6000, maxLKR: 25000, typicalLKR: 12000, includesParts: true, tags: ["desktop", "storage", "ssd", "hdd"] },

  // ─── AC SERVICES ───
  { serviceKey: "ac_inspection", category: "AC", label: "AC Inspection", minLKR: 1500, maxLKR: 2500, typicalLKR: 1500, includesParts: false, tags: ["ac", "inspection", "check"] },
  { serviceKey: "ac_general_service", category: "AC", label: "AC General Service", minLKR: 3000, maxLKR: 5000, typicalLKR: 3500, includesParts: false, tags: ["ac", "service", "cleaning"] },
  { serviceKey: "ac_full_service", category: "AC", label: "AC Full Service", minLKR: 5000, maxLKR: 7500, typicalLKR: 5500, includesParts: false, tags: ["ac", "full", "deep clean"] },
  { serviceKey: "ac_gas_refill", category: "AC", label: "AC Gas Refill", minLKR: 8000, maxLKR: 18000, typicalLKR: 12000, includesParts: true, tags: ["ac", "gas", "refill", "refrigerant"] },
  { serviceKey: "ac_installation", category: "AC", label: "AC Installation", minLKR: 12000, maxLKR: 25000, typicalLKR: 15000, includesParts: false, tags: ["ac", "installation", "install"] },
  { serviceKey: "ac_relocation", category: "AC", label: "AC Relocation", minLKR: 8000, maxLKR: 18000, typicalLKR: 10000, includesParts: false, tags: ["ac", "relocation", "move"] },
  { serviceKey: "ac_water_leakage", category: "AC", label: "AC Water Leakage Repair", minLKR: 3500, maxLKR: 8000, typicalLKR: 5000, includesParts: true, tags: ["ac", "leak", "water", "drainage"] },

  // ─── CCTV SERVICES ───
  { serviceKey: "cctv_inspection", category: "CCTV", label: "CCTV Site Inspection", minLKR: 1000, maxLKR: 2000, typicalLKR: 1500, includesParts: false, tags: ["cctv", "inspection", "site visit"] },
  { serviceKey: "cctv_install_per_cam", category: "CCTV", label: "CCTV Installation (per camera)", minLKR: 2500, maxLKR: 6000, typicalLKR: 4000, includesParts: false, tags: ["cctv", "install", "camera"] },
  { serviceKey: "cctv_dvr_config", category: "CCTV", label: "DVR Configuration", minLKR: 2000, maxLKR: 5000, typicalLKR: 3000, includesParts: false, tags: ["cctv", "dvr", "nvr", "config"] },
  { serviceKey: "cctv_troubleshoot", category: "CCTV", label: "Camera Troubleshooting", minLKR: 1500, maxLKR: 4000, typicalLKR: 2500, includesParts: false, tags: ["cctv", "troubleshoot", "repair"] },

  // ─── MOBILE PHONE REPAIRS ───
  { serviceKey: "mobile_screen", category: "MOBILE", label: "Screen Replacement", minLKR: 6000, maxLKR: 45000, typicalLKR: 18000, includesParts: true, tags: ["mobile", "screen", "display", "lcd"] },
  { serviceKey: "mobile_battery", category: "MOBILE", label: "Battery Replacement", minLKR: 3500, maxLKR: 12000, typicalLKR: 6500, includesParts: true, tags: ["mobile", "battery"] },
  { serviceKey: "mobile_charging", category: "MOBILE", label: "Charging Port Repair", minLKR: 2500, maxLKR: 6000, typicalLKR: 3500, includesParts: true, tags: ["mobile", "charging", "port"] },
  { serviceKey: "mobile_software", category: "MOBILE", label: "Software Repair", minLKR: 1500, maxLKR: 3500, typicalLKR: 2000, includesParts: false, tags: ["mobile", "software", "os"] },

  // ─── HOME ELECTRONICS ───
  { serviceKey: "elec_tv_inspection", category: "CONSUMER_ELEC", label: "TV Repair Inspection", minLKR: 1500, maxLKR: 2500, typicalLKR: 1500, includesParts: false, tags: ["tv", "inspection"] },
  { serviceKey: "elec_tv_panel", category: "CONSUMER_ELEC", label: "TV Panel Repair", minLKR: 6000, maxLKR: 35000, typicalLKR: 15000, includesParts: true, tags: ["tv", "panel", "screen"] },
  { serviceKey: "elec_washing", category: "CONSUMER_ELEC", label: "Washing Machine Repair", minLKR: 3500, maxLKR: 12000, typicalLKR: 6000, includesParts: true, tags: ["washing", "machine"] },
  { serviceKey: "elec_fridge", category: "CONSUMER_ELEC", label: "Refrigerator Repair", minLKR: 3500, maxLKR: 15000, typicalLKR: 7500, includesParts: true, tags: ["fridge", "refrigerator"] },

  // ─── COPIER ───
  { serviceKey: "copier_inspection", category: "COPIER", label: "Copier Inspection", minLKR: 1500, maxLKR: 3000, typicalLKR: 2000, includesParts: false, tags: ["copier", "inspection"] },
  { serviceKey: "copier_service", category: "COPIER", label: "Copier General Service", minLKR: 3500, maxLKR: 8000, typicalLKR: 5000, includesParts: false, tags: ["copier", "service"] },
  { serviceKey: "copier_repair", category: "COPIER", label: "Copier Repair", minLKR: 5000, maxLKR: 25000, typicalLKR: 12000, includesParts: true, tags: ["copier", "repair"] },

  // ─── SOLAR ───
  { serviceKey: "solar_inspection", category: "SOLAR", label: "Solar Site Inspection", minLKR: 2000, maxLKR: 5000, typicalLKR: 3000, includesParts: false, tags: ["solar", "inspection"] },
  { serviceKey: "solar_maintenance", category: "SOLAR", label: "Solar Panel Maintenance", minLKR: 5000, maxLKR: 12000, typicalLKR: 7500, includesParts: false, tags: ["solar", "maintenance", "cleaning"] },

  // ─── SMART HOME ───
  { serviceKey: "smart_consultation", category: "SMART_HOME_OFFICE", label: "Smart Home Consultation", minLKR: 2000, maxLKR: 5000, typicalLKR: 3000, includesParts: false, tags: ["smart", "consultation"] },
  { serviceKey: "smart_installation", category: "SMART_HOME_OFFICE", label: "Smart Device Installation", minLKR: 3000, maxLKR: 15000, typicalLKR: 8000, includesParts: false, tags: ["smart", "install"] },
];

// ─── Quote Validation ───

export type QuoteValidationLevel = "normal" | "warning" | "requires_explanation" | "rejected";

export interface QuoteValidationResult {
  level: QuoteValidationLevel;
  message: string;
  suggestedRange: { min: number; max: number } | null;
  percentAbove?: number;
  percentBelow?: number;
}

const WARNING_THRESHOLD = 1.2;  // 20% above max
const EXPLANATION_THRESHOLD = 1.5; // 50% above max
const UNDERPRICING_THRESHOLD = 0.7; // 30% below min

export function validateQuotePrice(
  totalLKR: number,
  category: CategoryCode,
  serviceKey?: string
): QuoteValidationResult {
  // Find matching market range
  const range = serviceKey
    ? MARKET_PRICE_RANGES.find((r) => r.serviceKey === serviceKey)
    : null;

  // Fallback: find any range for category
  const categoryRanges = MARKET_PRICE_RANGES.filter((r) => r.category === category);
  const fallbackMin = categoryRanges.length > 0 ? Math.min(...categoryRanges.map((r) => r.minLKR)) : 0;
  const fallbackMax = categoryRanges.length > 0 ? Math.max(...categoryRanges.map((r) => r.maxLKR)) : Infinity;

  const min = range?.minLKR ?? fallbackMin;
  const max = range?.maxLKR ?? fallbackMax;

  if (min === 0 && max === Infinity) {
    return { level: "normal", message: "Price accepted", suggestedRange: null };
  }

  // Underpricing
  if (totalLKR < min * UNDERPRICING_THRESHOLD) {
    return {
      level: "warning",
      message: `This quote (LKR ${totalLKR.toLocaleString()}) is significantly below the typical market range. This may affect service quality perception.`,
      suggestedRange: { min, max },
      percentBelow: Math.round(((min - totalLKR) / min) * 100),
    };
  }

  // Within range
  if (totalLKR <= max) {
    return { level: "normal", message: "Price is within market range", suggestedRange: { min, max } };
  }

  // Slightly above
  if (totalLKR <= max * WARNING_THRESHOLD) {
    return {
      level: "warning",
      message: `This quote is above the typical LankaFix market range (LKR ${min.toLocaleString()} – ${max.toLocaleString()}). Please confirm the reason.`,
      suggestedRange: { min, max },
      percentAbove: Math.round(((totalLKR - max) / max) * 100),
    };
  }

  // Significantly above
  if (totalLKR <= max * EXPLANATION_THRESHOLD) {
    return {
      level: "requires_explanation",
      message: `This quote exceeds the market range by ${Math.round(((totalLKR - max) / max) * 100)}%. An explanation is required before sending to the customer.`,
      suggestedRange: { min, max },
      percentAbove: Math.round(((totalLKR - max) / max) * 100),
    };
  }

  // Extremely above
  return {
    level: "rejected",
    message: `This quote (LKR ${totalLKR.toLocaleString()}) is excessively above the market range and cannot be submitted without admin review.`,
    suggestedRange: { min, max },
    percentAbove: Math.round(((totalLKR - max) / max) * 100),
  };
}

// ─── Price Range Lookup ───

export function getMarketRange(category: CategoryCode, serviceKey?: string): MarketPriceRange | null {
  if (serviceKey) {
    return MARKET_PRICE_RANGES.find((r) => r.serviceKey === serviceKey) ?? null;
  }
  return null;
}

export function getCategoryRanges(category: CategoryCode): MarketPriceRange[] {
  return MARKET_PRICE_RANGES.filter((r) => r.category === category);
}

// ─── Zone Price Adjustment ───

const ZONE_ADJUSTMENTS: Record<string, number> = {
  colombo: 1.0,
  kandy: 0.9,
  gampaha: 0.95,
  galle: 0.9,
  negombo: 0.92,
};

export function getZoneAdjustment(zoneGroup: string): number {
  return ZONE_ADJUSTMENTS[zoneGroup.toLowerCase()] ?? 1.0;
}

export function adjustPriceForZone(priceLKR: number, zoneGroup: string): number {
  return Math.round(priceLKR * getZoneAdjustment(zoneGroup));
}

// ─── Trust Pricing Badges ───

export type PricingBadge = {
  label: string;
  icon: string;
  variant: "success" | "primary" | "warning";
};

export function getPricingBadges(
  quoteTotalLKR: number,
  marketRange: MarketPriceRange | null,
  bookingsInCategory: number
): PricingBadge[] {
  const badges: PricingBadge[] = [];

  if (marketRange) {
    const mid = (marketRange.minLKR + marketRange.maxLKR) / 2;
    if (quoteTotalLKR <= mid) {
      badges.push({ label: "Fair Price", icon: "BadgeCheck", variant: "success" });
    }
    if (quoteTotalLKR >= marketRange.minLKR && quoteTotalLKR <= marketRange.maxLKR) {
      badges.push({ label: "Verified Price Range", icon: "ShieldCheck", variant: "primary" });
    }
  }

  if (bookingsInCategory > 50) {
    badges.push({ label: "Popular Service", icon: "TrendingUp", variant: "primary" });
  }

  return badges;
}

// ─── Format helpers ───

export function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}

export function formatPriceRange(min: number, max: number): string {
  return `LKR ${min.toLocaleString()} – ${max.toLocaleString()}`;
}
