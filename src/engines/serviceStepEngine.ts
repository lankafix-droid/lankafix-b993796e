/**
 * Service-Type Step Engine
 * Determines the exact booking step sequence based on category + service type.
 * This replaces the old category-level step logic that caused incorrect flows
 * (e.g., AC Installation showing repair issue selectors).
 */

export type BookingStepId =
  | "landing"
  | "service_type"
  | "issue"
  | "pricing_expectation"
  | "part_grade"
  | "service_mode"
  | "location"
  | "device_details"
  | "smart_diagnosis"
  | "diagnosis_summary"
  | "ac_install_addons"
  | "site_conditions"
  | "pricing"
  | "booking_protection"
  | "assignment"
  | "confirmation";

/**
 * A service-type step override.
 * `steps` is the ordered step list for this service type.
 * If a service type isn't listed, it falls back to the category default.
 */
interface ServiceStepOverride {
  steps: BookingStepId[];
}

/**
 * Per-category, per-service-type step maps.
 * The key is `${categoryCode}::${serviceTypeId}`.
 * If no override exists, the system uses a category-level default builder.
 */
const SERVICE_STEP_MAP: Record<string, ServiceStepOverride> = {
  // ─── AC ───────────────────────────────────────────────────
  // AC Repair: needs issue selection + diagnosis
  "AC::repair": {
    steps: ["landing", "service_type", "issue", "pricing_expectation", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // AC Water Leak Repair
  "AC::water_leak": {
    steps: ["landing", "service_type", "issue", "pricing_expectation", "location", "device_details", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // AC Gas Refill: no issue selection, no diagnosis
  "AC::gas": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // AC Standard Service
  "AC::service": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // AC Deep Clean
  "AC::deep_clean": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // AC Installation: NO issue, NO diagnosis, HAS addons, quote required
  "AC::install": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "ac_install_addons", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  // AC Relocation: NO issue, NO diagnosis, no addons
  "AC::relocation": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  // AC Not Sure / Diagnose
  "AC::not_sure": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },

  // ─── CCTV ─────────────────────────────────────────────────
  // New Installation: property → cameras → coverage → site inspection (quote required)
  "CCTV::new_install": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  // Upgrade: existing system info → cameras to add → site inspection
  "CCTV::upgrade": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  // Repair: issue selection → device details → technician
  "CCTV::repair": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Site Inspection
  "CCTV::inspection": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  "CCTV::not_sure": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },

  // ─── IT ───────────────────────────────────────────────────
  // Remote Support: skip location
  "IT::software": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Network Setup
  "IT::network": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Printer
  "IT::printer": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Data Recovery: drop-off only
  "IT::data_recovery": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "booking_protection", "assignment", "confirmation"],
  },
  // Not Sure / Diagnose
  "IT::not_sure": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  },

  // ─── MOBILE ───────────────────────────────────────────────
  // Screen: needs part grade
  "MOBILE::screen": {
    steps: ["landing", "service_type", "pricing_expectation", "part_grade", "service_mode", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Battery
  "MOBILE::battery": {
    steps: ["landing", "service_type", "pricing_expectation", "part_grade", "service_mode", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Charging
  "MOBILE::charging": {
    steps: ["landing", "service_type", "pricing_expectation", "part_grade", "service_mode", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Water damage
  "MOBILE::water": {
    steps: ["landing", "service_type", "pricing_expectation", "part_grade", "service_mode", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Camera
  "MOBILE::camera": {
    steps: ["landing", "service_type", "pricing_expectation", "part_grade", "service_mode", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Software: skip part grade, can be remote
  "MOBILE::software": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Not sure
  "MOBILE::not_sure": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  },

  // ─── CONSUMER ELECTRONICS ─────────────────────────────────
  // All appliance types follow diagnostic-first
  "CONSUMER_ELEC::tv": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "CONSUMER_ELEC::washing": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "CONSUMER_ELEC::fridge": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "CONSUMER_ELEC::microwave": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "CONSUMER_ELEC::fan": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "CONSUMER_ELEC::other": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },

  // ─── SOLAR ────────────────────────────────────────────────
  // New Install: consultation flow (bill → property → roof → site inspection)
  "SOLAR::new_install": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  // Expand
  "SOLAR::expand": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  // Maintenance
  "SOLAR::maintenance": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  // Troubleshoot
  "SOLAR::troubleshoot": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },

  // ─── SMART HOME ───────────────────────────────────────────
  "SMART_HOME_OFFICE::security": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  "SMART_HOME_OFFICE::automation": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  "SMART_HOME_OFFICE::energy": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },
  "SMART_HOME_OFFICE::office": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  },

  // ─── COPIER ───────────────────────────────────────────────
  "COPIER::paper_jam": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::print_quality": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::not_printing": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::wifi_setup": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::installation": {
    steps: ["landing", "service_type", "pricing_expectation", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::toner_drum": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::roller_service": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::copier_service": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "COPIER::not_sure": {
    steps: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  },

  // ─── PRINT SUPPLIES ───────────────────────────────────────
  "PRINT_SUPPLIES::toner_order": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "PRINT_SUPPLIES::ink_order": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "PRINT_SUPPLIES::drum_unit": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "PRINT_SUPPLIES::ribbon": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "PRINT_SUPPLIES::thermal_roll": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
  "PRINT_SUPPLIES::maintenance_kit": {
    steps: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  },
};

// Default step builders per category (used for IT laptop/desktop variants not explicitly listed)
const CATEGORY_DEFAULT_STEPS: Record<string, BookingStepId[]> = {
  AC: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "pricing", "booking_protection", "assignment", "confirmation"],
  MOBILE: ["landing", "service_type", "pricing_expectation", "part_grade", "service_mode", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  IT: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "smart_diagnosis", "diagnosis_summary", "pricing", "booking_protection", "assignment", "confirmation"],
  CCTV: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  CONSUMER_ELEC: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  SOLAR: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  SMART_HOME_OFFICE: ["landing", "service_type", "pricing_expectation", "location", "device_details", "site_conditions", "booking_protection", "assignment", "confirmation"],
  COPIER: ["landing", "service_type", "pricing_expectation", "service_mode", "location", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
  PRINT_SUPPLIES: ["landing", "service_type", "pricing_expectation", "device_details", "pricing", "booking_protection", "assignment", "confirmation"],
};

/**
 * Get the step sequence for a given category + service type.
 * Before a service type is selected, returns just ["landing", "service_type"].
 */
export function getServiceSteps(
  categoryCode: string,
  serviceTypeId: string | undefined,
  /** Runtime overrides for conditional steps */
  context?: {
    serviceModeId?: string;
    hasDiagBlock?: boolean;
  }
): BookingStepId[] {
  // Before service type is selected, only show landing + service type
  if (!serviceTypeId) {
    return ["landing", "service_type"];
  }

  const key = `${categoryCode}::${serviceTypeId}`;
  const override = SERVICE_STEP_MAP[key];
  let steps = override
    ? [...override.steps]
    : [...(CATEGORY_DEFAULT_STEPS[categoryCode] || ["landing", "service_type", "device_details", "booking_protection", "assignment", "confirmation"])];

  // Runtime adjustments based on service mode
  if (context?.serviceModeId) {
    // Skip location for remote and drop_off modes
    if (context.serviceModeId === "remote" || context.serviceModeId === "drop_off") {
      steps = steps.filter(s => s !== "location");
    }
    // Skip site conditions for remote
    if (context.serviceModeId === "remote") {
      steps = steps.filter(s => s !== "site_conditions");
    }
  }

  // Remove diagnosis steps if no diagnostic block available
  if (context && !context.hasDiagBlock) {
    steps = steps.filter(s => s !== "smart_diagnosis" && s !== "diagnosis_summary");
  }

  return steps;
}
