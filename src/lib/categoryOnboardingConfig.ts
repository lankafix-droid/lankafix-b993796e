/**
 * Category-Specific Onboarding Requirements
 * Defines what extra info is needed per service category before booking.
 */

export interface OnboardingField {
  key: string;
  label: string;
  type: "boolean" | "select" | "text";
  options?: { value: string; label: string }[];
  required: boolean;
  description?: string;
  consentType?: string; // links to consent_records if set
}

export interface CategoryOnboarding {
  categoryCode: string;
  label: string;
  fields: OnboardingField[];
}

export const CATEGORY_ONBOARDING: CategoryOnboarding[] = [
  {
    categoryCode: "MOBILE",
    label: "Mobile Phone Repairs",
    fields: [
      { key: "data_backup_done", label: "Have you backed up your data?", type: "boolean", required: true, description: "We recommend backing up before any repair." },
      { key: "has_important_data", label: "Does the device contain important data?", type: "boolean", required: true },
      { key: "pin_sharing_ack", label: "I understand I may need to share my device PIN for diagnosis", type: "boolean", required: true, consentType: "pin_sharing" },
      { key: "fulfillment_pref", label: "Preferred service mode", type: "select", required: false, options: [
        { value: "pickup", label: "Pickup from my location" },
        { value: "dropoff", label: "I'll drop off at service center" },
        { value: "onsite", label: "On-site repair" },
      ]},
    ],
  },
  {
    categoryCode: "IT",
    label: "IT Repairs & Support",
    fields: [
      { key: "environment_type", label: "Environment type", type: "select", required: true, options: [
        { value: "home", label: "Home / Personal" },
        { value: "office", label: "Office / Business" },
        { value: "server", label: "Server / Network" },
      ]},
      { key: "device_type", label: "Device type", type: "select", required: true, options: [
        { value: "laptop", label: "Laptop" },
        { value: "desktop", label: "Desktop" },
        { value: "printer", label: "Printer / Scanner" },
        { value: "network", label: "Network Equipment" },
        { value: "other", label: "Other" },
      ]},
      { key: "data_risk_ack", label: "I understand data loss risk during repairs", type: "boolean", required: true, consentType: "data_risk" },
      { key: "backup_recommended_ack", label: "I acknowledge backup is recommended before service", type: "boolean", required: true, consentType: "backup_recommendation" },
      { key: "remote_eligible", label: "Can this be resolved remotely?", type: "select", required: false, options: [
        { value: "yes", label: "Yes, try remote first" },
        { value: "no", label: "No, need on-site visit" },
        { value: "unsure", label: "Not sure" },
      ]},
    ],
  },
  {
    categoryCode: "SOLAR",
    label: "Solar Solutions",
    fields: [
      { key: "property_type", label: "Property type", type: "select", required: true, options: [
        { value: "house", label: "House" },
        { value: "apartment", label: "Apartment / Condo" },
        { value: "commercial", label: "Commercial Building" },
        { value: "factory", label: "Factory / Warehouse" },
      ]},
      { key: "electricity_bill_range", label: "Monthly electricity bill range", type: "select", required: true, options: [
        { value: "under_5000", label: "Under Rs. 5,000" },
        { value: "5000_10000", label: "Rs. 5,000 – 10,000" },
        { value: "10000_25000", label: "Rs. 10,000 – 25,000" },
        { value: "25000_50000", label: "Rs. 25,000 – 50,000" },
        { value: "over_50000", label: "Over Rs. 50,000" },
      ]},
      { key: "roof_type", label: "Roof type", type: "select", required: true, options: [
        { value: "concrete", label: "Concrete slab" },
        { value: "tile", label: "Clay / Tile" },
        { value: "asbestos", label: "Asbestos sheet" },
        { value: "metal", label: "Metal sheet" },
        { value: "other", label: "Other / Not sure" },
      ]},
      { key: "goal", label: "Primary goal", type: "select", required: true, options: [
        { value: "bill_reduction", label: "Reduce electricity bill" },
        { value: "backup", label: "Power backup" },
        { value: "both", label: "Both" },
      ]},
    ],
  },
  {
    categoryCode: "AC",
    label: "AC Services",
    fields: [
      { key: "address_confirmed", label: "Service address confirmed", type: "boolean", required: true },
      { key: "floor", label: "Floor / unit", type: "text", required: false },
      { key: "parking_notes", label: "Parking availability", type: "text", required: false },
      { key: "adult_presence", label: "An adult (18+) will be present during service", type: "boolean", required: true, consentType: "adult_presence" },
    ],
  },
  {
    categoryCode: "CCTV",
    label: "CCTV Solutions",
    fields: [
      { key: "address_confirmed", label: "Service address confirmed", type: "boolean", required: true },
      { key: "floor", label: "Floor / unit", type: "text", required: false },
      { key: "parking_notes", label: "Parking availability", type: "text", required: false },
      { key: "adult_presence", label: "An adult (18+) will be present during service", type: "boolean", required: true, consentType: "adult_presence" },
    ],
  },
];

/** On-site service categories share access fields */
const ON_SITE_CATEGORIES = ["AC", "CCTV", "ELECTRICAL", "PLUMBING", "SMART_HOME_OFFICE", "HOME_SECURITY", "POWER_BACKUP", "APPLIANCE_INSTALL", "CONSUMER_ELEC"];

export function getCategoryOnboarding(categoryCode: string): CategoryOnboarding | null {
  const exact = CATEGORY_ONBOARDING.find(c => c.categoryCode === categoryCode);
  if (exact) return exact;

  // Fallback: on-site categories get the AC template
  if (ON_SITE_CATEGORIES.includes(categoryCode)) {
    return CATEGORY_ONBOARDING.find(c => c.categoryCode === "AC") ?? null;
  }

  return null;
}

/** Base fields required for any booking */
export const BASE_BOOKING_REQUIREMENTS = [
  "full_name",
  "phone",
  "serviceable_address",
] as const;
