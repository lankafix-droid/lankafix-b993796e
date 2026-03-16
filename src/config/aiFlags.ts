/**
 * AI Feature Flags — Config Wrapper
 * Re-exports centralized flag system with LankaFix category taxonomy binding.
 */
export {
  getAIFlags,
  isAIEnabled,
  setAIFlagOverrides,
  resetAIFlags,
  loadAIFlagsFromSettings,
  type AIFeatureFlags,
} from "@/lib/aiFeatureFlags";

/** Standardized LankaFix category codes used across all AI modules */
export const CATEGORY_CODES = [
  "MOBILE",
  "LAPTOP",
  "PRINTER",
  "CCTV",
  "AC",
  "SOLAR",
  "SMART_HOME_OFFICE",
  "CONSUMER_ELEC",
  "IT",
] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];

/** Human-readable category labels */
export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  MOBILE: "Mobile Phone Repair",
  LAPTOP: "Laptop Repair",
  PRINTER: "Printer Repair",
  CCTV: "CCTV Installation",
  AC: "AC Repair & Service",
  SOLAR: "Solar Solutions",
  SMART_HOME_OFFICE: "Smart Home & Office",
  CONSUMER_ELEC: "Consumer Electronics",
  IT: "IT Services",
};
