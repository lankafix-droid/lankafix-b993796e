/**
 * Priority Service Config — Lean layer for faster-response dispatch.
 * 
 * Priority Service = faster dispatch attempt + priority fee.
 * This is NOT a surge-pricing engine — it's a simple operational priority layer.
 */

export interface PriorityServiceEntry {
  category_code: string;
  /** Optional — if omitted, applies to all services in the category */
  service_type?: string;
  priority_enabled: boolean;
  priority_fee_lkr: number;
  priority_eta_text: string;
  standard_eta_text: string;
  priority_badge_label: string;
  customer_disclaimer: string;
  partner_bonus_note: string;
}

const DEFAULT_DISCLAIMER =
  "Priority fee covers urgent dispatch and faster response. Final repair quote may still vary after inspection.";

const DEFAULT_PARTNER_NOTE =
  "⚡ Priority booking — customer paid for faster response. Please prioritise.";

// ─── IT ───
const IT_PRIORITY: PriorityServiceEntry[] = [
  {
    category_code: "IT",
    service_type: "software",
    priority_enabled: true,
    priority_fee_lkr: 1000,
    priority_eta_text: "Within 1 hour",
    standard_eta_text: "Same day · 1–2 hours",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
  {
    category_code: "IT",
    service_type: "laptop_overheating",
    priority_enabled: true,
    priority_fee_lkr: 1500,
    priority_eta_text: "Within 1 hour",
    standard_eta_text: "Same day · 1–2 hours",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
  {
    category_code: "IT",
    service_type: "network",
    priority_enabled: true,
    priority_fee_lkr: 1000,
    priority_eta_text: "Within 1 hour",
    standard_eta_text: "Same day · 1–2 hours",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
];

// ─── CONSUMER ELECTRONICS ───
const CONSUMER_ELEC_PRIORITY: PriorityServiceEntry[] = [
  {
    category_code: "CONSUMER_ELEC",
    service_type: "tv",
    priority_enabled: true,
    priority_fee_lkr: 1500,
    priority_eta_text: "Within 2 hours",
    standard_eta_text: "Same day · On-site inspection",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
  {
    category_code: "CONSUMER_ELEC",
    service_type: "fridge",
    priority_enabled: true,
    priority_fee_lkr: 2000,
    priority_eta_text: "Within 2 hours",
    standard_eta_text: "Same day · On-site inspection",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
];

// ─── SMART HOME ───
const SMART_HOME_PRIORITY: PriorityServiceEntry[] = [
  {
    category_code: "SMART_HOME_OFFICE",
    service_type: "automation",
    priority_enabled: true,
    priority_fee_lkr: 1500,
    priority_eta_text: "Within 4 hours",
    standard_eta_text: "Within 24 hours",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
];

// ─── SOLAR ───
const SOLAR_PRIORITY: PriorityServiceEntry[] = [
  {
    category_code: "SOLAR",
    service_type: "troubleshoot",
    priority_enabled: true,
    priority_fee_lkr: 2000,
    priority_eta_text: "Within 12 hours",
    standard_eta_text: "Within 48 hours",
    priority_badge_label: "⚡ Priority",
    customer_disclaimer: DEFAULT_DISCLAIMER,
    partner_bonus_note: DEFAULT_PARTNER_NOTE,
  },
];

// ─── COMBINED REGISTRY ───
const ALL_PRIORITY_ENTRIES: PriorityServiceEntry[] = [
  ...IT_PRIORITY,
  ...CONSUMER_ELEC_PRIORITY,
  ...SMART_HOME_PRIORITY,
  ...SOLAR_PRIORITY,
];

/**
 * Look up priority config for a given category + service type.
 * Returns null if not priority-enabled.
 */
export function getPriorityConfig(
  categoryCode: string,
  serviceType?: string
): PriorityServiceEntry | null {
  // Try exact match first
  if (serviceType) {
    const exact = ALL_PRIORITY_ENTRIES.find(
      (e) =>
        e.category_code === categoryCode &&
        e.service_type === serviceType &&
        e.priority_enabled
    );
    if (exact) return exact;
  }

  // Fall back to category-level entry (no service_type)
  const categoryLevel = ALL_PRIORITY_ENTRIES.find(
    (e) =>
      e.category_code === categoryCode &&
      !e.service_type &&
      e.priority_enabled
  );
  return categoryLevel || null;
}

/**
 * Check if priority service is available for a category/service combo.
 */
export function isPriorityAvailable(
  categoryCode: string,
  serviceType?: string
): boolean {
  return getPriorityConfig(categoryCode, serviceType) !== null;
}
