/**
 * Instant Pricing Config — Phase 1 Soft Launch
 * 
 * Lightweight config for services that can show an estimated price range
 * and allow "Book Now" without requiring a quote workflow.
 * 
 * This is a CONVERSION LAYER, not a price-lock engine.
 * Partners still inspect and can submit a quote if the job is more complex.
 */

export type PricingMode = "instant_price" | "quote_required" | "diagnostic_first";

export interface InstantPriceEntry {
  category_code: string;
  service_type: string;
  /** Optional narrower issue id */
  issue_id?: string;
  min_price_lkr: number;
  max_price_lkr: number;
  estimated_eta_text: string;
  disclaimer: string;
  booking_label: string;
  /** Whether this is a popular fixed-range service */
  popular?: boolean;
}

// ─── Default disclaimer used for all instant-price entries ───
const DEFAULT_DISCLAIMER =
  "Final price may vary after inspection if hidden faults or additional parts are found.";

// ─── IT SERVICES ───
const IT_INSTANT: InstantPriceEntry[] = [
  {
    category_code: "IT",
    service_type: "software",
    min_price_lkr: 2000,
    max_price_lkr: 4000,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "OS Install / Virus Cleanup",
    popular: true,
  },
  {
    category_code: "IT",
    service_type: "laptop_battery",
    min_price_lkr: 2500,
    max_price_lkr: 5000,
    estimated_eta_text: "Same day · 30–60 min",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Laptop Battery Replacement",
  },
  {
    category_code: "IT",
    service_type: "laptop_storage",
    min_price_lkr: 2500,
    max_price_lkr: 5500,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "HDD / SSD Upgrade",
    popular: true,
  },
  {
    category_code: "IT",
    service_type: "laptop_keyboard",
    min_price_lkr: 2500,
    max_price_lkr: 5000,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Keyboard Replacement",
  },
  {
    category_code: "IT",
    service_type: "laptop_overheating",
    min_price_lkr: 3000,
    max_price_lkr: 5000,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Fan / Overheating Fix",
  },
  {
    category_code: "IT",
    service_type: "network",
    min_price_lkr: 2000,
    max_price_lkr: 4500,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "WiFi / Router Setup",
    popular: true,
  },
  {
    category_code: "IT",
    service_type: "printer",
    min_price_lkr: 2500,
    max_price_lkr: 4000,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Printer / Scanner Service",
  },
  {
    category_code: "IT",
    service_type: "desktop_ram",
    min_price_lkr: 2500,
    max_price_lkr: 5000,
    estimated_eta_text: "Same day · 30–60 min",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "RAM Upgrade",
  },
  {
    category_code: "IT",
    service_type: "desktop_psu",
    min_price_lkr: 3500,
    max_price_lkr: 6000,
    estimated_eta_text: "Same day · 1–2 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Power Supply Replacement",
  },
];

// ─── CONSUMER ELECTRONICS ───
const CONSUMER_ELEC_INSTANT: InstantPriceEntry[] = [
  {
    category_code: "CONSUMER_ELEC",
    service_type: "tv",
    min_price_lkr: 2500,
    max_price_lkr: 4500,
    estimated_eta_text: "Same day · On-site inspection",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "TV Diagnostic Visit",
    popular: true,
  },
  {
    category_code: "CONSUMER_ELEC",
    service_type: "washing",
    min_price_lkr: 2500,
    max_price_lkr: 5000,
    estimated_eta_text: "Same day · On-site inspection",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Washing Machine Diagnostic",
  },
  {
    category_code: "CONSUMER_ELEC",
    service_type: "fridge",
    min_price_lkr: 2500,
    max_price_lkr: 5000,
    estimated_eta_text: "Same day · On-site inspection",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Fridge Diagnostic Visit",
  },
  {
    category_code: "CONSUMER_ELEC",
    service_type: "microwave",
    min_price_lkr: 2000,
    max_price_lkr: 3500,
    estimated_eta_text: "Same day · On-site inspection",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Microwave Diagnostic",
  },
];

// ─── SMART HOME & OFFICE ───
const SMART_HOME_INSTANT: InstantPriceEntry[] = [
  {
    category_code: "SMART_HOME_OFFICE",
    service_type: "automation",
    min_price_lkr: 3500,
    max_price_lkr: 8000,
    estimated_eta_text: "Within 24 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Smart Lighting / Router Setup",
    popular: true,
  },
  {
    category_code: "SMART_HOME_OFFICE",
    service_type: "energy",
    min_price_lkr: 4000,
    max_price_lkr: 7500,
    estimated_eta_text: "Within 24 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Energy Monitor Installation",
  },
];

// ─── SOLAR ───
const SOLAR_INSTANT: InstantPriceEntry[] = [
  {
    category_code: "SOLAR",
    service_type: "maintenance",
    min_price_lkr: 5000,
    max_price_lkr: 10000,
    estimated_eta_text: "Within 48 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Solar Panel Maintenance",
    popular: true,
  },
  {
    category_code: "SOLAR",
    service_type: "troubleshoot",
    min_price_lkr: 4500,
    max_price_lkr: 8000,
    estimated_eta_text: "Within 48 hours",
    disclaimer: DEFAULT_DISCLAIMER,
    booking_label: "Solar System Diagnostic",
  },
];

// ─── COMBINED REGISTRY ───
const ALL_INSTANT_PRICES: InstantPriceEntry[] = [
  ...IT_INSTANT,
  ...CONSUMER_ELEC_INSTANT,
  ...SMART_HOME_INSTANT,
  ...SOLAR_INSTANT,
];

/**
 * Look up the instant price entry for a given category + service type.
 * Returns null if the service is not eligible for instant pricing.
 */
export function getInstantPrice(
  categoryCode: string,
  serviceType: string,
  issueId?: string
): InstantPriceEntry | null {
  // Try exact match with issue_id first
  if (issueId) {
    const exact = ALL_INSTANT_PRICES.find(
      (e) =>
        e.category_code === categoryCode &&
        e.service_type === serviceType &&
        e.issue_id === issueId
    );
    if (exact) return exact;
  }

  // Fall back to category + service type
  return (
    ALL_INSTANT_PRICES.find(
      (e) =>
        e.category_code === categoryCode &&
        e.service_type === serviceType &&
        !e.issue_id
    ) || null
  );
}

/**
 * Determine the pricing mode for a given service in a category.
 * 
 * Priority:
 * 1. If instant price config exists → "instant_price"
 * 2. Fall back to the category's pricingArchetype mapping
 */
export function getServicePricingMode(
  categoryCode: string,
  serviceType: string,
  categoryArchetype: string
): PricingMode {
  const instant = getInstantPrice(categoryCode, serviceType);
  if (instant) return "instant_price";

  // Map existing archetypes
  if (categoryArchetype === "fixed_price") return "instant_price";
  if (categoryArchetype === "quote_required") return "quote_required";
  return "diagnostic_first";
}

/**
 * Get all instant-price entries for a category (for landing page display).
 */
export function getInstantPricesForCategory(categoryCode: string): InstantPriceEntry[] {
  return ALL_INSTANT_PRICES.filter((e) => e.category_code === categoryCode);
}
