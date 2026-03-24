/**
 * Category Flow Engine — Production-grade flow configuration for LankaFix.
 * Maps each category to a flow family, diagnostic fields, commercial expectations,
 * and trust/risk metadata. Drives Interfaces 2, 3, and 4.
 */

// ─── Flow Family Types ─────────────────────────────────────

export type FlowFamily =
  | "direct_booking"
  | "inspection_first"
  | "diagnosis_first"
  | "consultation_first";

export type CommercialExpectation =
  | "fixed_price"
  | "quote_after_inspection"
  | "diagnostic_fee_required"
  | "site_assessment_free"
  | "site_assessment_paid"
  | "parts_additional"
  | "commitment_fee";

export type ServiceOutcome =
  | "booking"
  | "inspection"
  | "diagnosis"
  | "consultation"
  | "callback"
  | "quote_request";

// ─── Diagnostic Field Types ────────────────────────────────

export interface DiagnosticOption {
  value: string;
  label: string;
  icon?: string;
  flowOverride?: FlowFamily;
}

export interface DiagnosticField {
  key: string;
  label: string;
  type: "select" | "multi_select" | "text" | "number" | "photo" | "boolean" | "search_select";
  options?: DiagnosticOption[];
  placeholder?: string;
  required: boolean;
  showWhen?: { field: string; values: string[] };
  hint?: string;
  columns?: number;
}

// ─── Trust & Risk Layer ────────────────────────────────────

export interface TrustSignal {
  key: string;
  label: string;
  description: string;
  icon: "shield" | "clock" | "star" | "check" | "lock" | "camera" | "warranty";
}

export interface RiskDisclaimer {
  key: string;
  message: string;
  severity: "info" | "warning" | "critical";
  showWhen?: { field: string; values: string[] };
}

export interface CommercialInfo {
  expectations: CommercialExpectation[];
  inspectionFeeRange?: string;
  diagnosticFeeRange?: string;
  commitmentFeeRange?: string;
  warrantyHint?: string;
  priceVisibility: "transparent" | "quote_based" | "after_inspection";
  expectationLabel: string;
}

// ─── Category Flow Config ──────────────────────────────────

export interface CategoryFlowConfig {
  code: string;
  label: string;
  defaultFlowFamily: FlowFamily;
  serviceFlowMap: Record<string, FlowFamily>;
  diagnosticFields: DiagnosticField[];
  commercial: CommercialInfo;
  trustSignals: TrustSignal[];
  riskDisclaimers: RiskDisclaimer[];
  requiredConsents: string[];
  photoUploadEnabled: boolean;
  dataDisclaimerRequired: boolean;
  adultPresenceRequired: boolean;
  accessDetailsRequired: boolean;
}

// ─── AC ────────────────────────────────────────────────────

const AC_FLOW: CategoryFlowConfig = {
  code: "AC",
  label: "AC Services",
  defaultFlowFamily: "inspection_first",
  serviceFlowMap: {
    general_service: "direct_booking",
    gas_topup: "direct_booking",
    relocation: "direct_booking",
    repair: "inspection_first",
    inspection: "inspection_first",
    installation: "consultation_first",
    amc: "consultation_first",
  },
  diagnosticFields: [
    {
      key: "ac_type", label: "AC Type", type: "select", required: true, columns: 3,
      options: [
        { value: "split_wall", label: "Split (Wall)", icon: "🏠" },
        { value: "split_ceiling", label: "Split (Ceiling)", icon: "🏢" },
        { value: "window", label: "Window Unit", icon: "🪟" },
        { value: "portable", label: "Portable", icon: "📦" },
        { value: "central", label: "Central/Ducted", icon: "🏗️" },
        { value: "unsure", label: "Not Sure", icon: "❓" },
      ],
    },
    {
      key: "btu_capacity", label: "BTU / Capacity", type: "select", required: false, columns: 3,
      options: [
        { value: "9000", label: "9,000 BTU" },
        { value: "12000", label: "12,000 BTU" },
        { value: "18000", label: "18,000 BTU" },
        { value: "24000", label: "24,000 BTU" },
        { value: "larger", label: "Larger" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "ac_brand", label: "Brand", type: "select", required: true, columns: 3,
      options: [
        { value: "samsung", label: "Samsung" },
        { value: "lg", label: "LG" },
        { value: "daikin", label: "Daikin" },
        { value: "panasonic", label: "Panasonic" },
        { value: "midea", label: "Midea" },
        { value: "haier", label: "Haier" },
        { value: "singer", label: "Singer" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "refrigerant_type", label: "Refrigerant Type", type: "select", required: false, columns: 2,
      hint: "Check the label on your outdoor unit",
      options: [
        { value: "r22", label: "R22 (older)" },
        { value: "r32", label: "R32" },
        { value: "r410a", label: "R410A" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "unit_count", label: "Number of Units", type: "select", required: true, columns: 2,
      options: [
        { value: "1", label: "1 Unit" },
        { value: "2", label: "2 Units" },
        { value: "3_plus", label: "3+" },
      ],
    },
    {
      key: "issue_type", label: "Primary Issue", type: "select", required: false, columns: 2,
      hint: "What's the main problem?",
      options: [
        { value: "not_cooling", label: "Not Cooling" },
        { value: "water_leaking", label: "Water Leaking" },
        { value: "strange_noise", label: "Strange Noise" },
        { value: "bad_smell", label: "Bad Smell" },
        { value: "no_power", label: "Not Turning On" },
        { value: "high_consumption", label: "High Power Bill" },
      ],
    },
    {
      key: "installation_height", label: "Installation Height", type: "select", required: false, columns: 2,
      showWhen: { field: "ac_type", values: ["split_wall", "split_ceiling"] },
      options: [
        { value: "standard", label: "Standard (< 3m)" },
        { value: "high", label: "High (3m+)" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    { key: "photo_unit", label: "Photo of Unit", type: "photo", required: false, hint: "Helps with faster diagnosis" },
  ],
  commercial: {
    expectations: ["quote_after_inspection", "parts_additional"],
    inspectionFeeRange: "LKR 500 – 1,500",
    warrantyHint: "90-day labour warranty on repairs",
    priceVisibility: "after_inspection",
    expectationLabel: "Quote after inspection • Parts billed separately",
  },
  trustSignals: [
    { key: "verified", label: "Verified Technicians", description: "All AC technicians are LankaFix verified", icon: "shield" },
    { key: "warranty", label: "90-Day Warranty", description: "Labour warranty on all repairs", icon: "warranty" },
    { key: "parts", label: "Genuine Parts", description: "Genuine refrigerant and spare parts only", icon: "check" },
  ],
  riskDisclaimers: [
    { key: "gas_type", message: "R22 refrigerant is being phased out. Availability may be limited and pricing higher.", severity: "warning", showWhen: { field: "refrigerant_type", values: ["r22"] } },
    { key: "high_install", message: "High-installation units may require additional equipment. Surcharge may apply.", severity: "info", showWhen: { field: "installation_height", values: ["high"] } },
    { key: "multi_unit", message: "Multi-unit service pricing is per unit. Discounts may apply for 3+ units.", severity: "info", showWhen: { field: "unit_count", values: ["3_plus"] } },
  ],
  requiredConsents: ["adult_presence"],
  photoUploadEnabled: true,
  dataDisclaimerRequired: false,
  adultPresenceRequired: true,
  accessDetailsRequired: true,
};

// ─── MOBILE ────────────────────────────────────────────────

const MOBILE_FLOW: CategoryFlowConfig = {
  code: "MOBILE",
  label: "Mobile Phone Repairs",
  defaultFlowFamily: "direct_booking",
  serviceFlowMap: {
    screen_replacement: "direct_booking",
    battery_replacement: "direct_booking",
    charging_repair: "direct_booking",
    camera_repair: "direct_booking",
    software_issue: "direct_booking",
    water_damage: "diagnosis_first",
    full_diagnosis: "diagnosis_first",
    no_power: "diagnosis_first",
    motherboard: "diagnosis_first",
    charging_ic: "diagnosis_first",
  },
  diagnosticFields: [
    {
      key: "phone_brand", label: "Phone Brand", type: "select", required: true, columns: 3,
      options: [
        { value: "apple", label: "Apple", icon: "🍎" },
        { value: "samsung", label: "Samsung" },
        { value: "huawei", label: "Huawei" },
        { value: "xiaomi", label: "Xiaomi" },
        { value: "oppo", label: "OPPO" },
        { value: "realme", label: "Realme" },
        { value: "oneplus", label: "OnePlus" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "phone_model", label: "Model", type: "text", required: false,
      placeholder: "e.g. iPhone 15 Pro, Galaxy S24",
      hint: "Helps us prepare the right parts",
    },
    {
      key: "phone_condition", label: "Current Condition", type: "select", required: true, columns: 2,
      options: [
        { value: "works_partially", label: "Works but has issues" },
        { value: "screen_cracked", label: "Screen cracked/broken" },
        { value: "not_turning_on", label: "Not turning on", flowOverride: "diagnosis_first" },
        { value: "water_exposed", label: "Water/liquid exposed", flowOverride: "diagnosis_first" },
      ],
    },
    {
      key: "touch_working", label: "Is touch working?", type: "select", required: false, columns: 3,
      showWhen: { field: "phone_condition", values: ["works_partially", "screen_cracked"] },
      options: [
        { value: "yes", label: "Yes" },
        { value: "partial", label: "Partially" },
        { value: "no", label: "No" },
      ],
    },
    {
      key: "display_visible", label: "Can you see the display?", type: "select", required: false, columns: 3,
      showWhen: { field: "phone_condition", values: ["works_partially", "screen_cracked"] },
      options: [
        { value: "yes", label: "Yes, clearly" },
        { value: "partial", label: "Partially" },
        { value: "no", label: "No / black" },
      ],
    },
    {
      key: "previously_repaired", label: "Previously repaired?", type: "select", required: false, columns: 3,
      options: [
        { value: "no", label: "No" },
        { value: "yes_same", label: "Yes, same issue" },
        { value: "yes_other", label: "Yes, other issue" },
      ],
    },
    {
      key: "screen_quality", label: "Screen Quality Preference", type: "select", required: false, columns: 2,
      showWhen: { field: "phone_condition", values: ["screen_cracked"] },
      hint: "Higher quality = better colour & durability",
      options: [
        { value: "compatible", label: "Compatible (Budget)" },
        { value: "original", label: "Original Quality" },
        { value: "genuine", label: "Genuine (if available)" },
      ],
    },
    {
      key: "data_backed_up", label: "Is your data backed up?", type: "select", required: true, columns: 2,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "need_help", label: "Need help" },
      ],
    },
    {
      key: "important_data", label: "Important data on device?", type: "select", required: false, columns: 2,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    { key: "photo_damage", label: "Photo of Damage", type: "photo", required: false, hint: "Upload for faster diagnosis", showWhen: { field: "phone_condition", values: ["screen_cracked", "water_exposed"] } },
  ],
  commercial: {
    expectations: ["fixed_price", "parts_additional"],
    diagnosticFeeRange: "LKR 500",
    warrantyHint: "30-day warranty on screen & battery replacements",
    priceVisibility: "transparent",
    expectationLabel: "Transparent pricing • Parts included in quote",
  },
  trustSignals: [
    { key: "data_safe", label: "Data Safe", description: "Your data stays private throughout the repair", icon: "lock" },
    { key: "genuine", label: "Genuine Parts", description: "OEM-grade replacement parts with warranty", icon: "check" },
    { key: "warranty", label: "30-Day Warranty", description: "Warranty on parts and labour", icon: "warranty" },
  ],
  riskDisclaimers: [
    { key: "water", message: "Water damage recovery has variable success rates. A diagnostic fee of LKR 500 applies before repair assessment.", severity: "critical", showWhen: { field: "phone_condition", values: ["water_exposed"] } },
    { key: "no_backup", message: "We recommend backing up your data before any repair. LankaFix is not responsible for data loss.", severity: "warning", showWhen: { field: "data_backed_up", values: ["no"] } },
    { key: "dead_phone", message: "Non-responsive devices require physical diagnosis. Final quote may differ from estimate.", severity: "warning", showWhen: { field: "phone_condition", values: ["not_turning_on"] } },
    { key: "prev_repair", message: "Previously repaired devices may have non-standard parts. This can affect repair cost and warranty coverage.", severity: "info", showWhen: { field: "previously_repaired", values: ["yes_same", "yes_other"] } },
  ],
  requiredConsents: ["data_safety", "backup_responsibility", "pin_passcode", "data_risk"],
  photoUploadEnabled: true,
  dataDisclaimerRequired: true,
  adultPresenceRequired: false,
  accessDetailsRequired: false,
};

// ─── IT ────────────────────────────────────────────────────

const IT_FLOW: CategoryFlowConfig = {
  code: "IT",
  label: "IT Repairs & Support",
  defaultFlowFamily: "direct_booking",
  serviceFlowMap: {
    laptop_repair: "direct_booking",
    desktop_repair: "direct_booking",
    software_support: "direct_booking",
    network_support: "direct_booking",
    remote_support: "direct_booking",
    printer_support: "direct_booking",
    data_recovery: "diagnosis_first",
  },
  diagnosticFields: [
    {
      key: "environment", label: "Environment", type: "select", required: true, columns: 2,
      options: [
        { value: "home", label: "Home / Personal", icon: "🏠" },
        { value: "office", label: "Office / Business", icon: "🏢" },
      ],
    },
    {
      key: "device_type", label: "Device Type", type: "select", required: true, columns: 3,
      options: [
        { value: "laptop", label: "Laptop", icon: "💻" },
        { value: "desktop", label: "Desktop", icon: "🖥️" },
        { value: "printer", label: "Printer", icon: "🖨️" },
        { value: "network_device", label: "Router/Switch", icon: "📡" },
        { value: "server", label: "Server/NAS", icon: "🗄️" },
        { value: "other", label: "Other", icon: "❓" },
      ],
    },
    {
      key: "issue_branch", label: "Issue Type", type: "select", required: true, columns: 2,
      options: [
        { value: "hardware", label: "Hardware Problem" },
        { value: "software", label: "Software / OS" },
        { value: "network", label: "Network / WiFi" },
        { value: "virus", label: "Virus / Malware" },
        { value: "data", label: "Data Recovery" },
        { value: "setup", label: "New Setup" },
      ],
    },
    {
      key: "remote_possible", label: "Can this be fixed remotely?", type: "select", required: false, columns: 3,
      options: [
        { value: "yes", label: "Yes, try remote" },
        { value: "no", label: "Need on-site" },
        { value: "unsure", label: "Not sure" },
      ],
    },
    {
      key: "data_access_needed", label: "Does the technician need login access?", type: "select", required: false, columns: 2,
      showWhen: { field: "issue_branch", values: ["software", "virus", "data"] },
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      key: "business_impact", label: "Business Impact", type: "select", required: false, columns: 2,
      showWhen: { field: "environment", values: ["office"] },
      options: [
        { value: "low", label: "Low – can wait" },
        { value: "medium", label: "Medium – slowing work" },
        { value: "high", label: "High – work stopped" },
      ],
    },
  ],
  commercial: {
    expectations: ["fixed_price"],
    diagnosticFeeRange: "LKR 1,000 – 2,000",
    warrantyHint: "14-day warranty on software fixes",
    priceVisibility: "transparent",
    expectationLabel: "Transparent pricing • Remote option available",
  },
  trustSignals: [
    { key: "data_safe", label: "Data Protection", description: "Strict data handling protocols", icon: "lock" },
    { key: "remote", label: "Remote Support", description: "Quick fixes without waiting for a visit", icon: "clock" },
    { key: "business", label: "Business Ready", description: "Enterprise-grade support standards", icon: "shield" },
  ],
  riskDisclaimers: [
    { key: "data_recovery", message: "Data recovery requires a mandatory diagnostic fee. Success is not guaranteed depending on damage severity.", severity: "warning", showWhen: { field: "issue_branch", values: ["data"] } },
    { key: "virus_critical", message: "Severe malware may require OS reinstallation. Back up important data before service.", severity: "warning", showWhen: { field: "issue_branch", values: ["virus"] } },
  ],
  requiredConsents: ["data_safety", "data_risk"],
  photoUploadEnabled: false,
  dataDisclaimerRequired: true,
  adultPresenceRequired: false,
  accessDetailsRequired: false,
};

// ─── CCTV ──────────────────────────────────────────────────

const CCTV_FLOW: CategoryFlowConfig = {
  code: "CCTV",
  label: "CCTV & Security",
  defaultFlowFamily: "consultation_first",
  serviceFlowMap: {
    new_installation: "consultation_first",
    system_upgrade: "consultation_first",
    camera_repair: "direct_booking",
    dvr_nvr_issue: "direct_booking",
    wiring_fix: "direct_booking",
  },
  diagnosticFields: [
    {
      key: "request_type", label: "What do you need?", type: "select", required: true, columns: 2,
      options: [
        { value: "new_install", label: "New Installation", icon: "🏗️", flowOverride: "consultation_first" },
        { value: "repair", label: "Repair / Fix", icon: "🔧" },
        { value: "upgrade", label: "Upgrade System", icon: "⬆️", flowOverride: "consultation_first" },
        { value: "inspection", label: "System Check", icon: "🔍", flowOverride: "inspection_first" },
      ],
    },
    {
      key: "property_type", label: "Property Type", type: "select", required: true, columns: 2,
      options: [
        { value: "house", label: "House", icon: "🏠" },
        { value: "apartment", label: "Apartment", icon: "🏢" },
        { value: "office", label: "Office", icon: "💼" },
        { value: "shop_retail", label: "Shop / Retail", icon: "🏪" },
        { value: "warehouse", label: "Warehouse", icon: "🏭" },
        { value: "other", label: "Other", icon: "❓" },
      ],
    },
    {
      key: "coverage_area", label: "Coverage Area", type: "select", required: false, columns: 2,
      showWhen: { field: "request_type", values: ["new_install", "upgrade"] },
      options: [
        { value: "entrance", label: "Entrance Only" },
        { value: "perimeter", label: "Full Perimeter" },
        { value: "indoor", label: "Indoor Areas" },
        { value: "full", label: "Full Property" },
        { value: "unsure", label: "Need Assessment" },
      ],
    },
    {
      key: "camera_count", label: "Number of Cameras", type: "select", required: false, columns: 3,
      showWhen: { field: "request_type", values: ["new_install", "upgrade"] },
      options: [
        { value: "1_2", label: "1–2" },
        { value: "3_4", label: "3–4" },
        { value: "5_8", label: "5–8" },
        { value: "8_plus", label: "8+" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "camera_type_pref", label: "Camera Type", type: "select", required: false, columns: 2,
      showWhen: { field: "request_type", values: ["new_install", "upgrade"] },
      options: [
        { value: "dome", label: "Dome" },
        { value: "bullet", label: "Bullet" },
        { value: "ptz", label: "PTZ" },
        { value: "mixed", label: "Mixed" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "storage_pref", label: "Storage Preference", type: "select", required: false, columns: 2,
      showWhen: { field: "request_type", values: ["new_install", "upgrade"] },
      options: [
        { value: "local_dvr", label: "Local DVR/NVR" },
        { value: "cloud", label: "Cloud Storage" },
        { value: "both", label: "Both" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "existing_issue", label: "What's the issue?", type: "select", required: false, columns: 2,
      showWhen: { field: "request_type", values: ["repair"] },
      options: [
        { value: "offline", label: "Camera Offline" },
        { value: "no_recording", label: "Not Recording" },
        { value: "blurry", label: "Blurry Feed" },
        { value: "wiring", label: "Wiring Issue" },
        { value: "dvr_nvr", label: "DVR/NVR Issue" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "photo_site", label: "Photo of Installation Area", type: "photo", required: false, hint: "Helps with site assessment planning", showWhen: { field: "request_type", values: ["new_install", "upgrade"] } },
  ],
  commercial: {
    expectations: ["site_assessment_free", "quote_after_inspection"],
    warrantyHint: "1-year installation warranty",
    priceVisibility: "quote_based",
    expectationLabel: "Free site assessment • Custom quote provided",
  },
  trustSignals: [
    { key: "site_visit", label: "Free Site Visit", description: "No-obligation assessment for new installations", icon: "check" },
    { key: "clean_wiring", label: "Clean Installation", description: "Professional cable management standards", icon: "star" },
    { key: "remote_setup", label: "Remote Viewing", description: "Mobile app setup included", icon: "shield" },
  ],
  riskDisclaimers: [],
  requiredConsents: ["inspection_first"],
  photoUploadEnabled: true,
  dataDisclaimerRequired: false,
  adultPresenceRequired: true,
  accessDetailsRequired: true,
};

// ─── SOLAR ─────────────────────────────────────────────────

const SOLAR_FLOW: CategoryFlowConfig = {
  code: "SOLAR",
  label: "Solar Solutions",
  defaultFlowFamily: "consultation_first",
  serviceFlowMap: {
    new_installation: "consultation_first",
    panel_repair: "inspection_first",
    inverter_repair: "inspection_first",
    battery_service: "inspection_first",
    maintenance: "direct_booking",
  },
  diagnosticFields: [
    {
      key: "solar_need", label: "What do you need?", type: "select", required: true, columns: 2,
      options: [
        { value: "new_system", label: "New Solar System", icon: "☀️", flowOverride: "consultation_first" },
        { value: "repair", label: "Repair / Fix", icon: "🔧", flowOverride: "inspection_first" },
        { value: "maintenance", label: "Maintenance", icon: "🔄" },
        { value: "consultation", label: "Just Consulting", icon: "💡", flowOverride: "consultation_first" },
      ],
    },
    {
      key: "property_type", label: "Property Type", type: "select", required: true, columns: 2,
      options: [
        { value: "house", label: "House", icon: "🏠" },
        { value: "apartment", label: "Apartment", icon: "🏢" },
        { value: "commercial", label: "Commercial", icon: "🏗️" },
        { value: "factory", label: "Factory", icon: "🏭" },
      ],
    },
    {
      key: "monthly_bill", label: "Monthly Electricity Bill", type: "select", required: true, columns: 2,
      showWhen: { field: "solar_need", values: ["new_system", "consultation"] },
      options: [
        { value: "under_5000", label: "Under Rs. 5,000" },
        { value: "5000_10000", label: "Rs. 5K – 10K" },
        { value: "10000_25000", label: "Rs. 10K – 25K" },
        { value: "25000_50000", label: "Rs. 25K – 50K" },
        { value: "over_50000", label: "Over Rs. 50K" },
      ],
    },
    {
      key: "roof_type", label: "Roof Type", type: "select", required: false, columns: 3,
      showWhen: { field: "solar_need", values: ["new_system"] },
      options: [
        { value: "concrete", label: "Concrete" },
        { value: "tile", label: "Clay/Tile" },
        { value: "metal", label: "Metal Sheet" },
        { value: "asbestos", label: "Asbestos" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "roof_condition", label: "Roof Condition", type: "select", required: false, columns: 3,
      showWhen: { field: "solar_need", values: ["new_system"] },
      options: [
        { value: "good", label: "Good" },
        { value: "needs_repair", label: "Needs Repair" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "shading", label: "Any shading on roof?", type: "select", required: false, columns: 3,
      showWhen: { field: "solar_need", values: ["new_system"] },
      hint: "Trees, buildings, or structures casting shadows",
      options: [
        { value: "none", label: "No Shading" },
        { value: "partial", label: "Some Shading" },
        { value: "heavy", label: "Heavy Shading" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "backup_need", label: "Need Battery Backup?", type: "select", required: false, columns: 3,
      showWhen: { field: "solar_need", values: ["new_system", "consultation"] },
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "unsure", label: "Not Sure" },
      ],
    },
    {
      key: "existing_issue", label: "Current Issue", type: "select", required: false, columns: 2,
      showWhen: { field: "solar_need", values: ["repair"] },
      options: [
        { value: "inverter_error", label: "Inverter Error" },
        { value: "low_output", label: "Low Output" },
        { value: "panel_damage", label: "Panel Damage" },
        { value: "battery_issue", label: "Battery Issue" },
        { value: "metering", label: "Net Metering Issue" },
        { value: "other", label: "Other" },
      ],
    },
  ],
  commercial: {
    expectations: ["site_assessment_free", "quote_after_inspection"],
    warrantyHint: "Installer warranty + panel manufacturer warranty",
    priceVisibility: "quote_based",
    expectationLabel: "Free site assessment • ROI calculation included",
  },
  trustSignals: [
    { key: "assessment", label: "Free Assessment", description: "No-obligation energy assessment", icon: "check" },
    { key: "certified", label: "Certified Installers", description: "Government-approved solar installers", icon: "shield" },
    { key: "roi", label: "ROI Guidance", description: "Payback period calculation included", icon: "star" },
  ],
  riskDisclaimers: [
    { key: "asbestos", message: "Asbestos roofing may require additional structural assessment before installation.", severity: "warning", showWhen: { field: "roof_type", values: ["asbestos"] } },
    { key: "roof_repair", message: "Roof repairs should be completed before solar installation to avoid reinstallation costs.", severity: "warning", showWhen: { field: "roof_condition", values: ["needs_repair"] } },
    { key: "heavy_shade", message: "Heavy shading significantly reduces solar output. A site assessment will determine feasibility.", severity: "info", showWhen: { field: "shading", values: ["heavy"] } },
  ],
  requiredConsents: ["inspection_first"],
  photoUploadEnabled: true,
  dataDisclaimerRequired: false,
  adultPresenceRequired: true,
  accessDetailsRequired: true,
};

// ─── CONSUMER ELECTRONICS ──────────────────────────────────

const CONSUMER_ELEC_FLOW: CategoryFlowConfig = {
  code: "CONSUMER_ELEC",
  label: "Electronics Repair",
  defaultFlowFamily: "inspection_first",
  serviceFlowMap: {
    tv_repair: "inspection_first",
    audio_repair: "inspection_first",
    appliance_repair: "inspection_first",
    diagnosis: "diagnosis_first",
  },
  diagnosticFields: [
    {
      key: "appliance_type", label: "What device?", type: "select", required: true, columns: 2,
      options: [
        { value: "tv", label: "TV / Display", icon: "📺" },
        { value: "audio", label: "Audio System", icon: "🔊" },
        { value: "washing_machine", label: "Washing Machine", icon: "🧺" },
        { value: "fridge", label: "Refrigerator", icon: "❄️" },
        { value: "microwave", label: "Microwave", icon: "🍽️" },
        { value: "other", label: "Other", icon: "❓" },
      ],
    },
    {
      key: "brand", label: "Brand", type: "text", required: false,
      placeholder: "e.g. Samsung, LG, Sony",
    },
    {
      key: "symptom", label: "What's happening?", type: "select", required: true, columns: 2,
      showWhen: { field: "appliance_type", values: ["tv"] },
      options: [
        { value: "black_screen", label: "Black Screen" },
        { value: "sound_only", label: "Sound, No Picture" },
        { value: "no_sound", label: "No Sound" },
        { value: "lines_flicker", label: "Lines / Flicker" },
        { value: "power_issue", label: "Won't Turn On" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "symptom_general", label: "What's happening?", type: "select", required: true, columns: 2,
      showWhen: { field: "appliance_type", values: ["audio", "washing_machine", "fridge", "microwave", "other"] },
      options: [
        { value: "not_working", label: "Not Working" },
        { value: "noisy", label: "Strange Noise" },
        { value: "leaking", label: "Leaking" },
        { value: "power_issue", label: "Power Issue" },
        { value: "error_code", label: "Error Code" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "appliance_location", label: "Where is the appliance?", type: "select", required: false, columns: 2,
      hint: "Helps technician prepare for access",
      options: [
        { value: "ground_floor", label: "Ground Floor" },
        { value: "upper_floor", label: "Upper Floor" },
        { value: "kitchen", label: "Kitchen" },
        { value: "outdoor", label: "Outdoor / Garage" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "photo_appliance", label: "Photo of Appliance", type: "photo", required: false, hint: "Photo of the issue or error display" },
  ],
  commercial: {
    expectations: ["quote_after_inspection", "parts_additional"],
    inspectionFeeRange: "LKR 500 – 1,500",
    warrantyHint: "30-day repair warranty",
    priceVisibility: "after_inspection",
    expectationLabel: "Inspection first • Quote before repair",
  },
  trustSignals: [
    { key: "inspect", label: "Diagnose First", description: "No repair without your approval", icon: "check" },
    { key: "quote", label: "Transparent Quote", description: "Itemized quote before any work begins", icon: "shield" },
    { key: "warranty", label: "Repair Warranty", description: "30-day warranty on all repairs", icon: "warranty" },
  ],
  riskDisclaimers: [
    { key: "major_appliance", message: "Large appliance repairs require an on-site inspection before quoting. Parts may need to be ordered.", severity: "info", showWhen: { field: "appliance_type", values: ["washing_machine", "fridge"] } },
  ],
  requiredConsents: ["quote_variance"],
  photoUploadEnabled: true,
  dataDisclaimerRequired: false,
  adultPresenceRequired: true,
  accessDetailsRequired: true,
};

// ─── COPIER ────────────────────────────────────────────────

const COPIER_FLOW: CategoryFlowConfig = {
  code: "COPIER",
  label: "Copier & Printer Repair",
  defaultFlowFamily: "direct_booking",
  serviceFlowMap: {
    repair: "direct_booking",
    maintenance: "direct_booking",
    setup: "direct_booking",
    network_print: "direct_booking",
  },
  diagnosticFields: [
    {
      key: "device_category", label: "Device Type", type: "select", required: true, columns: 2,
      options: [
        { value: "laser_printer", label: "Laser Printer", icon: "🖨️" },
        { value: "inkjet_printer", label: "Inkjet Printer", icon: "🖨️" },
        { value: "copier", label: "Copier/MFP", icon: "📠" },
        { value: "large_format", label: "Large Format", icon: "📐" },
      ],
    },
    {
      key: "issue_type", label: "Issue", type: "select", required: true, columns: 2,
      options: [
        { value: "paper_jam", label: "Paper Jam" },
        { value: "poor_quality", label: "Poor Print Quality" },
        { value: "offline", label: "Offline / Not Responding" },
        { value: "feeder_issue", label: "Feeder Issue" },
        { value: "toner_ink", label: "Toner / Ink Issue" },
        { value: "error_code", label: "Error Code" },
        { value: "connectivity", label: "Network / Connectivity" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "business_urgency", label: "Business Impact", type: "select", required: true, columns: 2,
      options: [
        { value: "low", label: "Low – can wait" },
        { value: "medium", label: "Medium – slowing work" },
        { value: "high", label: "High – business stopped" },
      ],
    },
    {
      key: "print_volume", label: "Monthly Print Volume", type: "select", required: false, columns: 2,
      hint: "Helps determine wear patterns",
      options: [
        { value: "low", label: "< 500 pages" },
        { value: "medium", label: "500 – 2,000 pages" },
        { value: "high", label: "2,000 – 10,000 pages" },
        { value: "very_high", label: "10,000+ pages" },
      ],
    },
    {
      key: "brand_model", label: "Brand & Model", type: "text", required: false,
      placeholder: "e.g. HP LaserJet Pro M404",
    },
  ],
  commercial: {
    expectations: ["fixed_price"],
    warrantyHint: "30-day service warranty",
    priceVisibility: "transparent",
    expectationLabel: "Transparent pricing • Business-priority response",
  },
  trustSignals: [
    { key: "business", label: "Business Priority", description: "Priority response for business-critical devices", icon: "clock" },
    { key: "parts", label: "Genuine Parts", description: "OEM consumables and spare parts", icon: "check" },
  ],
  riskDisclaimers: [
    { key: "board_issue", message: "Error code or board-level issues may require parts ordering. Final quote after diagnosis.", severity: "info", showWhen: { field: "issue_type", values: ["error_code"] } },
  ],
  requiredConsents: [],
  photoUploadEnabled: false,
  dataDisclaimerRequired: false,
  adultPresenceRequired: false,
  accessDetailsRequired: true,
};

// ─── SMART HOME ────────────────────────────────────────────

const SMART_HOME_FLOW: CategoryFlowConfig = {
  code: "SMART_HOME_OFFICE",
  label: "Smart Home & Office",
  defaultFlowFamily: "consultation_first",
  serviceFlowMap: {
    new_setup: "consultation_first",
    consultation: "consultation_first",
    device_fix: "direct_booking",
    integration: "direct_booking",
  },
  diagnosticFields: [
    {
      key: "goal", label: "What do you need?", type: "select", required: true, columns: 2,
      options: [
        { value: "automation", label: "Home Automation", icon: "🏠" },
        { value: "security", label: "Security System", icon: "🔒" },
        { value: "network", label: "Network Setup", icon: "📡" },
        { value: "av", label: "AV / Media", icon: "🎵" },
        { value: "troubleshoot", label: "Fix Existing", icon: "🔧" },
        { value: "consult", label: "Just Consulting", icon: "💡" },
      ],
    },
    {
      key: "environment", label: "Environment", type: "select", required: true, columns: 3,
      options: [
        { value: "home", label: "Home" },
        { value: "office", label: "Office" },
        { value: "retail", label: "Retail / Shop" },
      ],
    },
    {
      key: "infra_ready", label: "Network infrastructure in place?", type: "select", required: false, columns: 3,
      options: [
        { value: "yes", label: "Yes" },
        { value: "partial", label: "Partially" },
        { value: "no", label: "No / Unsure" },
      ],
    },
  ],
  commercial: {
    expectations: ["site_assessment_free", "quote_after_inspection"],
    warrantyHint: "Installation warranty included",
    priceVisibility: "quote_based",
    expectationLabel: "Free consultation • Custom quote provided",
  },
  trustSignals: [
    { key: "ecosystems", label: "All Ecosystems", description: "Works with Apple, Google, Alexa, and more", icon: "check" },
    { key: "training", label: "Training Included", description: "User training after setup", icon: "star" },
  ],
  riskDisclaimers: [
    { key: "no_infra", message: "No existing network may require additional infrastructure work and cost.", severity: "info", showWhen: { field: "infra_ready", values: ["no"] } },
  ],
  requiredConsents: ["inspection_first"],
  photoUploadEnabled: false,
  dataDisclaimerRequired: false,
  adultPresenceRequired: true,
  accessDetailsRequired: true,
};

// ─── NETWORK ───────────────────────────────────────────────

const NETWORK_FLOW: CategoryFlowConfig = {
  code: "NETWORK",
  label: "IT & Network Support",
  defaultFlowFamily: "direct_booking",
  serviceFlowMap: {
    wifi_setup: "direct_booking",
    troubleshooting: "direct_booking",
    server_support: "direct_booking",
    network_setup: "consultation_first",
  },
  diagnosticFields: [
    {
      key: "issue_type", label: "What's the issue?", type: "select", required: true, columns: 2,
      options: [
        { value: "slow_internet", label: "Slow Internet", icon: "🐌" },
        { value: "wifi_dropping", label: "WiFi Dropping", icon: "❌" },
        { value: "no_connection", label: "No Connection", icon: "📵" },
        { value: "new_setup", label: "Need New Setup", icon: "🔧" },
        { value: "security", label: "Security Concern", icon: "🔒" },
        { value: "other", label: "Other", icon: "❓" },
      ],
    },
    {
      key: "environment", label: "Environment", type: "select", required: true, columns: 2,
      options: [
        { value: "home", label: "Home" },
        { value: "office", label: "Office / Business" },
      ],
    },
  ],
  commercial: {
    expectations: ["fixed_price"],
    warrantyHint: "Configuration support included",
    priceVisibility: "transparent",
    expectationLabel: "Transparent pricing • Remote support available",
  },
  trustSignals: [
    { key: "business", label: "Business Grade", description: "Enterprise-grade networking expertise", icon: "shield" },
    { key: "secure", label: "Secure Setup", description: "Security-first network configuration", icon: "lock" },
  ],
  riskDisclaimers: [],
  requiredConsents: [],
  photoUploadEnabled: false,
  dataDisclaimerRequired: false,
  adultPresenceRequired: false,
  accessDetailsRequired: true,
};

// ─── Registry ──────────────────────────────────────────────

const CATEGORY_FLOW_REGISTRY: Record<string, CategoryFlowConfig> = {
  AC: AC_FLOW,
  MOBILE: MOBILE_FLOW,
  IT: IT_FLOW,
  CCTV: CCTV_FLOW,
  SOLAR: SOLAR_FLOW,
  CONSUMER_ELEC: CONSUMER_ELEC_FLOW,
  COPIER: COPIER_FLOW,
  SMART_HOME_OFFICE: SMART_HOME_FLOW,
  NETWORK: NETWORK_FLOW,
};

/** Get the flow config for a category */
export function getCategoryFlowConfig(code: string): CategoryFlowConfig | null {
  return CATEGORY_FLOW_REGISTRY[code] || null;
}

/** Resolve the active flow family for a given service selection */
export function resolveFlowFamily(
  code: string,
  serviceId?: string,
  diagnosticAnswers?: Record<string, string>
): FlowFamily {
  const config = getCategoryFlowConfig(code);
  if (!config) return "direct_booking";

  // Check if any diagnostic answer has a flowOverride
  if (diagnosticAnswers) {
    for (const field of config.diagnosticFields) {
      if (field.options) {
        const selectedValue = diagnosticAnswers[field.key];
        const selectedOption = field.options.find(o => o.value === selectedValue);
        if (selectedOption?.flowOverride) return selectedOption.flowOverride;
      }
    }
  }

  // Check service-level override
  if (serviceId && config.serviceFlowMap[serviceId]) {
    return config.serviceFlowMap[serviceId];
  }

  return config.defaultFlowFamily;
}

/** Get visible diagnostic fields based on current answers */
export function getVisibleDiagnosticFields(
  code: string,
  answers: Record<string, string>
): DiagnosticField[] {
  const config = getCategoryFlowConfig(code);
  if (!config) return [];
  return config.diagnosticFields.filter(f => {
    if (!f.showWhen) return true;
    return f.showWhen.values.includes(answers[f.showWhen.field]);
  });
}

/** Get active risk disclaimers based on current answers */
export function getActiveDisclaimers(
  code: string,
  answers: Record<string, string>
): RiskDisclaimer[] {
  const config = getCategoryFlowConfig(code);
  if (!config) return [];
  return config.riskDisclaimers.filter(d => {
    if (!d.showWhen) return true;
    return d.showWhen.values.includes(answers[d.showWhen.field]);
  });
}

/** Flow family display labels */
export const FLOW_FAMILY_LABELS: Record<FlowFamily, { label: string; description: string; icon: string }> = {
  direct_booking: { label: "Book Service", description: "Confirmed booking with a matched technician", icon: "⚡" },
  inspection_first: { label: "Inspection First", description: "On-site inspection, then quote before repair", icon: "🔍" },
  diagnosis_first: { label: "Diagnosis Required", description: "Professional diagnosis needed before repair", icon: "🩺" },
  consultation_first: { label: "Site Assessment", description: "Free consultation and custom quote", icon: "📋" },
};
