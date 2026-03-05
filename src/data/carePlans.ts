/**
 * LankaFix Care Plan Catalog — Stage 11
 */
import type { CarePlanDefinition, BundlePlan } from "@/types/subscription";

export const CARE_PLANS: CarePlanDefinition[] = [
  // AC Care Plans
  {
    id: "AC_BASIC", category: "AC", tier: "basic", name: "AC Basic Care",
    annualPrice: 4500, visitsPerYear: 1, serviceCredits: 1, priorityDispatch: false, laborDiscount: 0,
    features: ["1 annual cleaning service", "Filter inspection", "Basic diagnostics"],
    serviceChecklist: ["Filter cleaning", "Coil cleaning", "Drainage inspection", "Gas pressure check", "Electrical inspection"],
  },
  {
    id: "AC_STANDARD", category: "AC", tier: "standard", name: "AC Standard Care",
    annualPrice: 7500, visitsPerYear: 2, serviceCredits: 3, priorityDispatch: false, laborDiscount: 10,
    features: ["2 maintenance visits per year", "10% repair labor discount", "Priority scheduling"],
    serviceChecklist: ["Filter cleaning", "Coil cleaning", "Drainage inspection", "Gas pressure check", "Electrical inspection", "Thermostat calibration"],
  },
  {
    id: "AC_PREMIUM", category: "AC", tier: "premium", name: "AC Premium Care",
    annualPrice: 10500, visitsPerYear: 3, serviceCredits: 5, priorityDispatch: true, laborDiscount: 15,
    features: ["3 maintenance visits per year", "Priority dispatch", "15% repair labor discount", "Emergency support"],
    serviceChecklist: ["Filter cleaning", "Coil cleaning", "Drainage inspection", "Gas pressure check", "Electrical inspection", "Thermostat calibration", "Refrigerant top-up check"],
  },

  // CCTV Care Plans
  {
    id: "CCTV_BASIC", category: "CCTV", tier: "basic", name: "CCTV Basic Care",
    annualPrice: 6000, visitsPerYear: 1, serviceCredits: 1, priorityDispatch: false, laborDiscount: 0,
    features: ["1 annual inspection", "Camera alignment check", "DVR health check"],
    serviceChecklist: ["Camera alignment", "DVR health check", "Cable inspection", "Firmware update", "Storage health check"],
  },
  {
    id: "CCTV_STANDARD", category: "CCTV", tier: "standard", name: "CCTV Standard Care",
    annualPrice: 10000, visitsPerYear: 2, serviceCredits: 3, priorityDispatch: false, laborDiscount: 10,
    features: ["2 inspections per year", "10% repair discount", "Remote view setup"],
    serviceChecklist: ["Camera alignment", "DVR health check", "Cable inspection", "Firmware update", "Storage health check", "Night vision test"],
  },
  {
    id: "CCTV_PREMIUM", category: "CCTV", tier: "premium", name: "CCTV Premium Care",
    annualPrice: 16000, visitsPerYear: 4, serviceCredits: 6, priorityDispatch: true, laborDiscount: 15,
    features: ["4 inspections per year", "Priority dispatch", "15% repair discount", "24/7 emergency support"],
    serviceChecklist: ["Camera alignment", "DVR health check", "Cable inspection", "Firmware update", "Storage health check", "Night vision test", "Motion detection calibration"],
  },

  // Copier / Printer Plans
  {
    id: "COPIER_BASIC", category: "COPIER", tier: "basic", name: "Printer Basic Care",
    annualPrice: 7000, visitsPerYear: 2, serviceCredits: 2, priorityDispatch: false, laborDiscount: 0,
    features: ["2 visits annually", "Internal cleaning", "Basic diagnostics"],
    serviceChecklist: ["Internal cleaning", "Roller inspection", "Toner alignment", "Paper feed calibration", "Firmware updates"],
  },
  {
    id: "COPIER_STANDARD", category: "COPIER", tier: "standard", name: "Printer Standard Care",
    annualPrice: 12000, visitsPerYear: 4, serviceCredits: 4, priorityDispatch: false, laborDiscount: 10,
    features: ["4 visits annually", "10% repair discount", "Priority scheduling"],
    serviceChecklist: ["Internal cleaning", "Roller inspection", "Toner alignment", "Paper feed calibration", "Firmware updates", "Print quality test"],
  },
  {
    id: "COPIER_PREMIUM", category: "COPIER", tier: "premium", name: "Printer Premium Care",
    annualPrice: 18000, visitsPerYear: 12, serviceCredits: 12, priorityDispatch: true, laborDiscount: 20,
    features: ["Unlimited service labor", "Priority dispatch", "20% parts discount"],
    serviceChecklist: ["Internal cleaning", "Roller inspection", "Toner alignment", "Paper feed calibration", "Firmware updates", "Print quality test", "Network diagnostics"],
  },

  // IT Care Plans
  {
    id: "IT_BASIC", category: "IT", tier: "basic", name: "Home IT Care",
    annualPrice: 8000, visitsPerYear: 1, serviceCredits: 3, priorityDispatch: false, laborDiscount: 0,
    features: ["Up to 3 devices", "Remote troubleshooting", "1 onsite visit per year", "System health checks"],
    serviceChecklist: ["OS updates", "Virus scan", "Disk cleanup", "Network check", "Hardware diagnostics"],
  },
  {
    id: "IT_STANDARD", category: "IT", tier: "standard", name: "IT Standard Care",
    annualPrice: 15000, visitsPerYear: 2, serviceCredits: 5, priorityDispatch: false, laborDiscount: 10,
    features: ["Up to 5 devices", "2 onsite visits", "10% repair discount", "Remote support"],
    serviceChecklist: ["OS updates", "Virus scan", "Disk cleanup", "Network check", "Hardware diagnostics", "Backup verification"],
  },
  {
    id: "IT_PREMIUM", category: "IT", tier: "premium", name: "SME IT Support",
    annualPrice: 24000, visitsPerYear: 4, serviceCredits: 10, priorityDispatch: true, laborDiscount: 15,
    features: ["Up to 10 devices", "Monthly health check", "Priority support", "15% repair discount", "Network troubleshooting"],
    serviceChecklist: ["OS updates", "Virus scan", "Disk cleanup", "Network check", "Hardware diagnostics", "Backup verification", "Security audit"],
  },

  // Solar Plans
  {
    id: "SOLAR_BASIC", category: "SOLAR", tier: "basic", name: "Solar Basic Care",
    annualPrice: 10000, visitsPerYear: 2, serviceCredits: 2, priorityDispatch: false, laborDiscount: 0,
    features: ["2 visits per year", "Panel cleaning", "Basic inspection"],
    serviceChecklist: ["Panel cleaning", "Inverter inspection", "Cable inspection", "Output efficiency testing", "Battery health check"],
  },
  {
    id: "SOLAR_STANDARD", category: "SOLAR", tier: "standard", name: "Solar Standard Care",
    annualPrice: 18000, visitsPerYear: 4, serviceCredits: 4, priorityDispatch: false, laborDiscount: 10,
    features: ["4 visits per year", "10% repair discount", "Performance monitoring"],
    serviceChecklist: ["Panel cleaning", "Inverter inspection", "Cable inspection", "Output efficiency testing", "Battery health check", "Mounting check"],
  },
  {
    id: "SOLAR_PREMIUM", category: "SOLAR", tier: "premium", name: "Solar Premium Care",
    annualPrice: 25000, visitsPerYear: 6, serviceCredits: 8, priorityDispatch: true, laborDiscount: 15,
    features: ["6 visits per year", "Priority dispatch", "15% repair discount", "Emergency support"],
    serviceChecklist: ["Panel cleaning", "Inverter inspection", "Cable inspection", "Output efficiency testing", "Battery health check", "Mounting check", "Wiring integrity test"],
  },

  // Router / WiFi Plans
  {
    id: "ROUTER_BASIC", category: "ROUTER", tier: "basic", name: "WiFi Basic Care",
    annualPrice: 3500, visitsPerYear: 1, serviceCredits: 1, priorityDispatch: false, laborDiscount: 0,
    features: ["1 annual check", "Signal optimization", "Firmware update"],
    serviceChecklist: ["Signal optimization", "Router configuration", "Firmware updates", "Interference troubleshooting"],
  },
  {
    id: "ROUTER_STANDARD", category: "ROUTER", tier: "standard", name: "WiFi Standard Care",
    annualPrice: 6000, visitsPerYear: 2, serviceCredits: 2, priorityDispatch: false, laborDiscount: 10,
    features: ["2 visits per year", "10% repair discount", "Network optimization"],
    serviceChecklist: ["Signal optimization", "Router configuration", "Firmware updates", "Interference troubleshooting", "Speed test"],
  },
  {
    id: "ROUTER_PREMIUM", category: "ROUTER", tier: "premium", name: "WiFi Premium Care",
    annualPrice: 9000, visitsPerYear: 4, serviceCredits: 4, priorityDispatch: true, laborDiscount: 15,
    features: ["4 visits per year", "Priority dispatch", "15% repair discount"],
    serviceChecklist: ["Signal optimization", "Router configuration", "Firmware updates", "Interference troubleshooting", "Speed test", "Security audit"],
  },

  // Mobile
  {
    id: "MOBILE_BASIC", category: "MOBILE", tier: "basic", name: "Mobile Basic Care",
    annualPrice: 3000, visitsPerYear: 1, serviceCredits: 1, priorityDispatch: false, laborDiscount: 0,
    features: ["1 annual health check", "Software optimization"],
    serviceChecklist: ["Battery health check", "Software update", "Storage cleanup", "Screen inspection"],
  },
  {
    id: "MOBILE_STANDARD", category: "MOBILE", tier: "standard", name: "Mobile Standard Care",
    annualPrice: 5500, visitsPerYear: 2, serviceCredits: 2, priorityDispatch: false, laborDiscount: 10,
    features: ["2 visits per year", "10% repair discount"],
    serviceChecklist: ["Battery health check", "Software update", "Storage cleanup", "Screen inspection", "Port cleaning"],
  },
  {
    id: "MOBILE_PREMIUM", category: "MOBILE", tier: "premium", name: "Mobile Premium Care",
    annualPrice: 8000, visitsPerYear: 3, serviceCredits: 4, priorityDispatch: true, laborDiscount: 15,
    features: ["3 visits per year", "Priority dispatch", "15% repair discount"],
    serviceChecklist: ["Battery health check", "Software update", "Storage cleanup", "Screen inspection", "Port cleaning", "Water damage inspection"],
  },

  // Consumer Electronics
  {
    id: "CONSUMER_ELEC_BASIC", category: "CONSUMER_ELEC", tier: "basic", name: "Electronics Basic Care",
    annualPrice: 4000, visitsPerYear: 1, serviceCredits: 1, priorityDispatch: false, laborDiscount: 0,
    features: ["1 annual check", "General diagnostics"],
    serviceChecklist: ["Power supply check", "Firmware update", "Cleaning", "Port inspection"],
  },
  {
    id: "CONSUMER_ELEC_STANDARD", category: "CONSUMER_ELEC", tier: "standard", name: "Electronics Standard Care",
    annualPrice: 7000, visitsPerYear: 2, serviceCredits: 2, priorityDispatch: false, laborDiscount: 10,
    features: ["2 visits per year", "10% repair discount"],
    serviceChecklist: ["Power supply check", "Firmware update", "Cleaning", "Port inspection", "Performance test"],
  },
  {
    id: "CONSUMER_ELEC_PREMIUM", category: "CONSUMER_ELEC", tier: "premium", name: "Electronics Premium Care",
    annualPrice: 10000, visitsPerYear: 3, serviceCredits: 4, priorityDispatch: true, laborDiscount: 15,
    features: ["3 visits per year", "Priority dispatch", "15% repair discount"],
    serviceChecklist: ["Power supply check", "Firmware update", "Cleaning", "Port inspection", "Performance test", "Safety inspection"],
  },

  // Smart Home
  {
    id: "SMART_HOME_BASIC", category: "SMART_HOME_OFFICE", tier: "basic", name: "Smart Home Basic Care",
    annualPrice: 5000, visitsPerYear: 1, serviceCredits: 1, priorityDispatch: false, laborDiscount: 0,
    features: ["1 annual check", "System diagnostics"],
    serviceChecklist: ["Device connectivity check", "Hub inspection", "Firmware updates", "Automation test"],
  },
  {
    id: "SMART_HOME_STANDARD", category: "SMART_HOME_OFFICE", tier: "standard", name: "Smart Home Standard Care",
    annualPrice: 9000, visitsPerYear: 2, serviceCredits: 2, priorityDispatch: false, laborDiscount: 10,
    features: ["2 visits per year", "10% repair discount"],
    serviceChecklist: ["Device connectivity check", "Hub inspection", "Firmware updates", "Automation test", "Network optimization"],
  },
  {
    id: "SMART_HOME_PREMIUM", category: "SMART_HOME_OFFICE", tier: "premium", name: "Smart Home Premium Care",
    annualPrice: 14000, visitsPerYear: 4, serviceCredits: 5, priorityDispatch: true, laborDiscount: 15,
    features: ["4 visits per year", "Priority dispatch", "15% repair discount"],
    serviceChecklist: ["Device connectivity check", "Hub inspection", "Firmware updates", "Automation test", "Network optimization", "Security audit"],
  },
];

export const BUNDLE_PLANS: BundlePlan[] = [
  {
    id: "HOME_BUNDLE",
    name: "LankaFix Home Care Bundle",
    description: "Complete home device protection — AC, TV, Router, Laptop & Printer",
    deviceSlots: 5,
    annualPrice: 12000,
    visitsPerYear: 2,
    laborDiscount: 15,
    priorityDispatch: true,
    features: [
      "Cover up to 5 devices",
      "2 maintenance visits annually",
      "Priority dispatch",
      "15% repair labor discount",
      "Single subscription for entire home",
    ],
  },
  {
    id: "BUSINESS_BUNDLE",
    name: "LankaFix Business Care",
    description: "Designed for retail shops and SMEs — comprehensive device coverage",
    deviceSlots: 10,
    annualPrice: 35000,
    visitsPerYear: 4,
    laborDiscount: 20,
    priorityDispatch: true,
    features: [
      "Cover up to 10 devices",
      "Monthly health checks",
      "Priority support",
      "20% repair labor discount",
      "Dedicated account support",
    ],
  },
];

/** Get plans for a specific device category */
export function getPlansForCategory(category: string): CarePlanDefinition[] {
  return CARE_PLANS.filter((p) => p.category === category);
}

/** Get a specific plan by ID */
export function getPlanById(planId: string): CarePlanDefinition | undefined {
  return CARE_PLANS.find((p) => p.id === planId);
}
