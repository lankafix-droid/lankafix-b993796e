/**
 * Category-Specific Booking Rules Engine
 * Defines required fields, consents, escalation rules, and validation per service category.
 */

export interface OnboardingField {
  key: string;
  label: string;
  type: "boolean" | "select" | "text" | "photo";
  options?: { value: string; label: string }[];
  required: boolean;
  description?: string;
  consentType?: string;
  /** Only show this field when a condition on another field matches */
  showWhen?: { field: string; values: string[] };
}

export interface EscalationRule {
  /** Which answer triggers escalation */
  triggerField: string;
  triggerValues: string[];
  /** What happens */
  action: "warn" | "block" | "inspection_required" | "diagnostic_fee";
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface CategoryRequirements {
  categoryCode: string;
  label: string;
  /** Profile fields required beyond base */
  requiredProfileFields: string[];
  /** Address fields that must be present */
  requiredAddressFields: string[];
  /** Minimum serviceability state */
  requiredServiceability: ("verified_serviceable" | "edge_serviceable")[];
  /** Category-specific intake questions */
  fields: OnboardingField[];
  /** Consent types that must be accepted */
  requiredConsents: string[];
  /** Escalation rules based on answers */
  escalationRules: EscalationRule[];
  /** Can this category be served remotely? */
  remoteEligible: boolean;
  /** Does this always require inspection first? */
  inspectionOnly: boolean;
  /** Is a diagnostic fee mandatory? */
  diagnosticFeeMandatory: boolean;
}

// ─── MOBILE REPAIRS ────────────────────────────────────────
const MOBILE: CategoryRequirements = {
  categoryCode: "MOBILE",
  label: "Mobile Phone Repairs",
  requiredProfileFields: ["full_name", "phone"],
  requiredAddressFields: [],
  requiredServiceability: ["verified_serviceable", "edge_serviceable"],
  remoteEligible: false,
  inspectionOnly: false,
  diagnosticFeeMandatory: false,
  requiredConsents: ["data_safety", "backup_responsibility"],
  fields: [
    { key: "service_type", label: "Service type", type: "select", required: true, options: [
      { value: "screen_repair", label: "Screen Repair" },
      { value: "battery_replace", label: "Battery Replacement" },
      { value: "charging_port", label: "Charging Port" },
      { value: "water_damage", label: "Water Damage" },
      { value: "motherboard", label: "Motherboard Issue" },
      { value: "software", label: "Software Issue" },
      { value: "other", label: "Other" },
    ]},
    { key: "brand", label: "Phone brand", type: "select", required: true, options: [
      { value: "apple", label: "Apple" }, { value: "samsung", label: "Samsung" },
      { value: "huawei", label: "Huawei" }, { value: "xiaomi", label: "Xiaomi" },
      { value: "oppo", label: "OPPO" }, { value: "other", label: "Other" },
    ]},
    { key: "model", label: "Model name", type: "text", required: false },
    { key: "issue_condition", label: "Describe the issue", type: "text", required: true },
    { key: "service_mode", label: "Preferred service mode", type: "select", required: false, options: [
      { value: "pickup", label: "Pickup from my location" },
      { value: "dropoff", label: "I'll drop off" },
      { value: "onsite", label: "On-site repair" },
    ]},
    { key: "photo_damage", label: "Photo of damage", type: "photo", required: false,
      description: "Upload a photo for faster diagnosis",
      showWhen: { field: "service_type", values: ["screen_repair", "water_damage"] } },
    { key: "data_backup_done", label: "I have backed up my data", type: "boolean", required: true, consentType: "backup_responsibility" },
    { key: "pin_sharing_ack", label: "I may need to share my PIN for diagnosis", type: "boolean", required: true, consentType: "pin_sharing" },
  ],
  escalationRules: [
    { triggerField: "service_type", triggerValues: ["water_damage"], action: "warn", severity: "warning",
      message: "Water damage repairs have variable success rates. A diagnostic fee may apply." },
    { triggerField: "service_type", triggerValues: ["motherboard"], action: "inspection_required", severity: "critical",
      message: "Motherboard issues require physical inspection before quoting." },
  ],
};

// ─── IT REPAIRS ────────────────────────────────────────────
const IT: CategoryRequirements = {
  categoryCode: "IT",
  label: "IT Repairs & Support",
  requiredProfileFields: ["full_name", "phone"],
  requiredAddressFields: [],
  requiredServiceability: ["verified_serviceable", "edge_serviceable"],
  remoteEligible: true,
  inspectionOnly: false,
  diagnosticFeeMandatory: false,
  requiredConsents: ["data_safety", "data_risk"],
  fields: [
    { key: "support_type", label: "Support type", type: "select", required: true, options: [
      { value: "hardware", label: "Hardware Repair" },
      { value: "software", label: "Software / OS" },
      { value: "network", label: "Network / Connectivity" },
      { value: "virus", label: "Virus / Malware" },
      { value: "data_recovery", label: "Data Recovery" },
      { value: "setup", label: "New Setup / Migration" },
    ]},
    { key: "environment_type", label: "Environment", type: "select", required: true, options: [
      { value: "home", label: "Home / Personal" },
      { value: "office", label: "Office / Business" },
      { value: "server", label: "Server / Network" },
    ]},
    { key: "device_type", label: "Device type", type: "select", required: true, options: [
      { value: "laptop", label: "Laptop" }, { value: "desktop", label: "Desktop" },
      { value: "printer", label: "Printer / Scanner" }, { value: "network", label: "Network Equipment" },
      { value: "other", label: "Other" },
    ]},
    { key: "issue_type", label: "Describe the issue", type: "text", required: true },
    { key: "urgency", label: "Urgency", type: "select", required: true, options: [
      { value: "normal", label: "Normal" }, { value: "urgent", label: "Urgent (today)" },
      { value: "critical", label: "Critical (business down)" },
    ]},
    { key: "remote_eligible", label: "Can this be resolved remotely?", type: "select", required: false, options: [
      { value: "yes", label: "Yes, try remote first" },
      { value: "no", label: "No, need on-site" },
      { value: "unsure", label: "Not sure" },
    ]},
    { key: "data_access_permission", label: "I grant permission for data access during repair", type: "boolean", required: true,
      consentType: "data_access_permission",
      showWhen: { field: "support_type", values: ["data_recovery", "virus", "software"] } },
    { key: "backup_ack", label: "I acknowledge backup is recommended before service", type: "boolean", required: true, consentType: "backup_recommendation" },
  ],
  escalationRules: [
    { triggerField: "support_type", triggerValues: ["data_recovery"], action: "diagnostic_fee", severity: "warning",
      message: "Data recovery requires a mandatory diagnostic fee before work begins." },
    { triggerField: "urgency", triggerValues: ["critical"], action: "warn", severity: "critical",
      message: "Critical urgency may incur an emergency surcharge." },
  ],
};

// ─── CONSUMER ELECTRONICS ──────────────────────────────────
const CONSUMER_ELEC: CategoryRequirements = {
  categoryCode: "CONSUMER_ELEC",
  label: "Consumer Electronics",
  requiredProfileFields: ["full_name", "phone"],
  requiredAddressFields: ["address_line_1", "city"],
  requiredServiceability: ["verified_serviceable", "edge_serviceable"],
  remoteEligible: false,
  inspectionOnly: false,
  diagnosticFeeMandatory: false,
  requiredConsents: ["data_safety", "quote_variance"],
  fields: [
    { key: "appliance_type", label: "Appliance type", type: "select", required: true, options: [
      { value: "tv", label: "TV / Display" }, { value: "washing_machine", label: "Washing Machine" },
      { value: "fridge", label: "Refrigerator" }, { value: "microwave", label: "Microwave / Oven" },
      { value: "audio", label: "Audio System" }, { value: "other", label: "Other" },
    ]},
    { key: "issue_type", label: "Describe the issue", type: "text", required: true },
    { key: "urgency", label: "Urgency", type: "select", required: true, options: [
      { value: "normal", label: "Normal" }, { value: "urgent", label: "Urgent" },
    ]},
    { key: "service_method", label: "Service method", type: "select", required: true, options: [
      { value: "onsite", label: "On-site repair" }, { value: "pickup", label: "Pickup & return" },
    ]},
    { key: "parking_notes", label: "Parking / access notes", type: "text", required: false },
  ],
  escalationRules: [
    { triggerField: "appliance_type", triggerValues: ["washing_machine", "fridge"], action: "inspection_required", severity: "info",
      message: "Major appliance repairs require an inspection before final pricing." },
  ],
};

// ─── SMART HOME / OFFICE ───────────────────────────────────
const SMART_HOME_OFFICE: CategoryRequirements = {
  categoryCode: "SMART_HOME_OFFICE",
  label: "Smart Home & Office",
  requiredProfileFields: ["full_name", "phone"],
  requiredAddressFields: ["address_line_1", "city"],
  requiredServiceability: ["verified_serviceable", "edge_serviceable"],
  remoteEligible: false,
  inspectionOnly: true,
  diagnosticFeeMandatory: false,
  requiredConsents: ["inspection_first"],
  fields: [
    { key: "environment_type", label: "Environment", type: "select", required: true, options: [
      { value: "home", label: "Home" }, { value: "office", label: "Office" },
      { value: "retail", label: "Retail / Shop" },
    ]},
    { key: "goals", label: "Primary goal", type: "select", required: true, options: [
      { value: "automation", label: "Home Automation" }, { value: "security", label: "Security System" },
      { value: "network", label: "Network Infrastructure" }, { value: "av", label: "AV Setup" },
      { value: "consultation", label: "General Consultation" },
    ]},
    { key: "infrastructure_ready", label: "Is existing network infrastructure in place?", type: "select", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "partial", label: "Partially" }, { value: "no", label: "No / Unsure" },
    ]},
    { key: "power_cut_concern", label: "Is power backup a concern?", type: "boolean", required: false },
    { key: "network_readiness_ack", label: "I confirm network/power readiness at the location", type: "boolean", required: true, consentType: "network_readiness" },
  ],
  escalationRules: [
    { triggerField: "infrastructure_ready", triggerValues: ["no"], action: "inspection_required", severity: "info",
      message: "A site survey is needed to assess infrastructure compatibility." },
  ],
};

// ─── SOLAR ─────────────────────────────────────────────────
const SOLAR: CategoryRequirements = {
  categoryCode: "SOLAR",
  label: "Solar Solutions",
  requiredProfileFields: ["full_name", "phone"],
  requiredAddressFields: ["address_line_1", "city"],
  requiredServiceability: ["verified_serviceable", "edge_serviceable"],
  remoteEligible: false,
  inspectionOnly: true,
  diagnosticFeeMandatory: false,
  requiredConsents: ["inspection_first"],
  fields: [
    { key: "property_type", label: "Property type", type: "select", required: true, options: [
      { value: "house", label: "House" }, { value: "apartment", label: "Apartment / Condo" },
      { value: "commercial", label: "Commercial Building" }, { value: "factory", label: "Factory / Warehouse" },
    ]},
    { key: "electricity_bill_range", label: "Monthly electricity bill range", type: "select", required: true, options: [
      { value: "under_5000", label: "Under Rs. 5,000" }, { value: "5000_10000", label: "Rs. 5,000 – 10,000" },
      { value: "10000_25000", label: "Rs. 10,000 – 25,000" }, { value: "25000_50000", label: "Rs. 25,000 – 50,000" },
      { value: "over_50000", label: "Over Rs. 50,000" },
    ]},
    { key: "roof_type", label: "Roof type", type: "select", required: true, options: [
      { value: "concrete", label: "Concrete slab" }, { value: "tile", label: "Clay / Tile" },
      { value: "asbestos", label: "Asbestos sheet" }, { value: "metal", label: "Metal sheet" },
      { value: "other", label: "Other / Not sure" },
    ]},
    { key: "goal", label: "Primary goal", type: "select", required: true, options: [
      { value: "bill_reduction", label: "Reduce electricity bill" },
      { value: "backup", label: "Power backup" }, { value: "both", label: "Both" },
    ]},
  ],
  escalationRules: [],
};

// ─── ON-SITE SERVICES TEMPLATE (AC, CCTV, etc.) ───────────
function createOnsiteCategory(code: string, label: string, extraFields: OnboardingField[] = [], extraConsents: string[] = []): CategoryRequirements {
  return {
    categoryCode: code,
    label,
    requiredProfileFields: ["full_name", "phone"],
    requiredAddressFields: ["address_line_1", "city"],
    requiredServiceability: ["verified_serviceable", "edge_serviceable"],
    remoteEligible: false,
    inspectionOnly: false,
    diagnosticFeeMandatory: false,
    requiredConsents: ["data_safety", ...extraConsents],
    fields: [
      { key: "address_confirmed", label: "Service address confirmed", type: "boolean", required: true },
      { key: "floor_or_unit", label: "Floor / unit", type: "text", required: false },
      { key: "parking_notes", label: "Parking availability", type: "text", required: false },
      { key: "adult_presence", label: "An adult (18+) will be present during service", type: "boolean", required: true, consentType: "adult_presence" },
      ...extraFields,
    ],
    escalationRules: [],
  };
}

// ─── ALL CATEGORY CONFIGS ──────────────────────────────────
export const CATEGORY_RULES: Record<string, CategoryRequirements> = {
  MOBILE,
  IT,
  CONSUMER_ELEC,
  SMART_HOME_OFFICE,
  SOLAR,
  AC: createOnsiteCategory("AC", "AC Services"),
  CCTV: createOnsiteCategory("CCTV", "CCTV Solutions"),
  ELECTRICAL: createOnsiteCategory("ELECTRICAL", "Electrical Services"),
  PLUMBING: createOnsiteCategory("PLUMBING", "Plumbing Services"),
  HOME_SECURITY: createOnsiteCategory("HOME_SECURITY", "Home Security"),
  POWER_BACKUP: createOnsiteCategory("POWER_BACKUP", "Power Backup Solutions"),
  APPLIANCE_INSTALL: createOnsiteCategory("APPLIANCE_INSTALL", "Appliance Installation"),
  NETWORK: createOnsiteCategory("NETWORK", "Internet & Network"),
  COPIER: createOnsiteCategory("COPIER", "Copier Repairs"),
};

/** Get rules for a category, returns default on-site rules as fallback */
export function getCategoryRules(categoryCode: string): CategoryRequirements {
  return CATEGORY_RULES[categoryCode] || createOnsiteCategory(categoryCode, categoryCode);
}

/** Backward compat: legacy API */
export function getCategoryOnboarding(categoryCode: string) {
  const rules = CATEGORY_RULES[categoryCode];
  if (!rules) return null;
  return { categoryCode: rules.categoryCode, label: rules.label, fields: rules.fields };
}

/** Check which escalation rules fire for given answers */
export function checkEscalationRules(categoryCode: string, answers: Record<string, string>): EscalationRule[] {
  const rules = getCategoryRules(categoryCode);
  return rules.escalationRules.filter(rule =>
    rule.triggerValues.includes(answers[rule.triggerField])
  );
}

/** Determine which fields should be visible based on conditional logic */
export function getVisibleFields(categoryCode: string, answers: Record<string, any>): OnboardingField[] {
  const rules = getCategoryRules(categoryCode);
  return rules.fields.filter(f => {
    if (!f.showWhen) return true;
    return f.showWhen.values.includes(answers[f.showWhen.field]);
  });
}

/** Base fields required for any booking */
export const BASE_BOOKING_REQUIREMENTS = [
  "full_name",
  "phone",
  "serviceable_address",
] as const;

/** Address verification states */
export type AddressVerificationState = "verified_serviceable" | "edge_serviceable" | "needs_verification" | "outside_coverage";
