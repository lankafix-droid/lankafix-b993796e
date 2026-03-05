import { categories } from "@/data/categories";
import type { CategoryCode, ServiceMode } from "@/types/booking";

export interface DiagnoseRecommendation {
  recommendedCategoryCode: CategoryCode;
  recommendedServiceCode: string;
  recommendedServiceName: string;
  confidenceLabel: "Best Match" | "Recommended" | "General Inspection";
  recommendedMode: ServiceMode;
  estimatedFromPrice: number;
  sameDayAvailable: boolean;
  resultType: "service" | "product";
  helperNote: string;
}

type ProblemKey = string;

/** Maps categoryCode -> problemType -> { serviceCode, confidence } */
const PROBLEM_SERVICE_MAP: Record<string, Record<ProblemKey, { serviceCode: string; confidence: "Best Match" | "Recommended" | "General Inspection" }>> = {
  AC: {
    not_cooling: { serviceCode: "AC_REPAIR", confidence: "Best Match" },
    leaking_water: { serviceCode: "AC_REPAIR", confidence: "Best Match" },
    making_noise: { serviceCode: "AC_REPAIR", confidence: "Recommended" },
    not_turning_on: { serviceCode: "AC_REPAIR", confidence: "Best Match" },
    need_cleaning: { serviceCode: "AC_FULL_SERVICE", confidence: "Best Match" },
    not_sure: { serviceCode: "AC_REPAIR", confidence: "General Inspection" },
  },
  CCTV: {
    camera_not_showing: { serviceCode: "CCTV_REPAIR", confidence: "Best Match" },
    dvr_nvr_issue: { serviceCode: "CCTV_REPAIR", confidence: "Best Match" },
    remote_not_working: { serviceCode: "CCTV_REMOTE_VIEW", confidence: "Best Match" },
    new_installation: { serviceCode: "CCTV_INSTALL", confidence: "Best Match" },
    need_maintenance: { serviceCode: "CCTV_MAINTENANCE", confidence: "Best Match" },
    not_sure: { serviceCode: "CCTV_REPAIR", confidence: "General Inspection" },
  },
  MOBILE: {
    screen_broken: { serviceCode: "MOBILE_SCREEN", confidence: "Best Match" },
    battery_draining: { serviceCode: "MOBILE_BATTERY", confidence: "Best Match" },
    not_charging: { serviceCode: "MOBILE_GENERAL", confidence: "Recommended" },
    not_turning_on: { serviceCode: "MOBILE_GENERAL", confidence: "Recommended" },
    software_issue: { serviceCode: "MOBILE_SOFTWARE", confidence: "Best Match" },
    not_sure: { serviceCode: "MOBILE_GENERAL", confidence: "General Inspection" },
  },
  IT: {
    laptop_slow: { serviceCode: "IT_REMOTE", confidence: "Best Match" },
    wifi_network: { serviceCode: "IT_NETWORK", confidence: "Best Match" },
    desktop_not_on: { serviceCode: "IT_ONSITE", confidence: "Recommended" },
    printer_connectivity: { serviceCode: "IT_ONSITE", confidence: "Recommended" },
    software_os: { serviceCode: "IT_REMOTE", confidence: "Best Match" },
    not_sure: { serviceCode: "IT_ONSITE", confidence: "General Inspection" },
  },
  SOLAR: {
    low_output: { serviceCode: "SOLAR_MAINTENANCE", confidence: "Recommended" },
    inverter_issue: { serviceCode: "SOLAR_REPAIR", confidence: "Best Match" },
    battery_issue: { serviceCode: "SOLAR_REPAIR", confidence: "Recommended" },
    need_installation: { serviceCode: "SOLAR_INSTALL", confidence: "Best Match" },
    need_inspection: { serviceCode: "SOLAR_MAINTENANCE", confidence: "Recommended" },
    not_sure: { serviceCode: "SOLAR_MAINTENANCE", confidence: "General Inspection" },
  },
  CONSUMER_ELEC: {
    tv_not_on: { serviceCode: "CE_TV_REPAIR", confidence: "Best Match" },
    no_display_sound: { serviceCode: "CE_TV_REPAIR", confidence: "Recommended" },
    remote_input: { serviceCode: "CE_TV_REPAIR", confidence: "Recommended" },
    appliance_issue: { serviceCode: "CE_WASHING", confidence: "Recommended" },
    need_inspection: { serviceCode: "CE_TV_REPAIR", confidence: "General Inspection" },
    not_sure: { serviceCode: "CE_TV_REPAIR", confidence: "General Inspection" },
  },
  COPIER: {
    not_printing: { serviceCode: "COPIER_REPAIR", confidence: "Best Match" },
    paper_jam: { serviceCode: "COPIER_REPAIR", confidence: "Best Match" },
    poor_quality: { serviceCode: "COPIER_REPAIR", confidence: "Best Match" },
    error_message: { serviceCode: "COPIER_REPAIR", confidence: "Recommended" },
    need_service: { serviceCode: "COPIER_MAINTENANCE", confidence: "Best Match" },
    not_sure: { serviceCode: "COPIER_REPAIR", confidence: "General Inspection" },
  },
  SMART_HOME_OFFICE: {
    cctv_smart_lock: { serviceCode: "SH_LOCK", confidence: "Recommended" },
    wifi_smart_device: { serviceCode: "SH_AUTOMATION", confidence: "Recommended" },
    intercom_access: { serviceCode: "SH_AUTOMATION", confidence: "Recommended" },
    office_automation: { serviceCode: "SH_NETWORK_INFRA", confidence: "Recommended" },
    need_installation: { serviceCode: "SH_AUTOMATION", confidence: "Best Match" },
    not_sure: { serviceCode: "SH_AUTOMATION", confidence: "General Inspection" },
  },
  PRINT_SUPPLIES: {
    need_toner: { serviceCode: "PS_TONER_ORDER", confidence: "Best Match" },
    need_ink: { serviceCode: "PS_INK_ORDER", confidence: "Best Match" },
    need_printer: { serviceCode: "PS_PRINTER_SETUP", confidence: "Recommended" },
    need_accessories: { serviceCode: "PS_TONER_ORDER", confidence: "Recommended" },
    compatibility_help: { serviceCode: "PS_TONER_ORDER", confidence: "General Inspection" },
    not_sure: { serviceCode: "PS_TONER_ORDER", confidence: "General Inspection" },
  },
};

const EMERGENCY_CATEGORIES: CategoryCode[] = ["AC", "CCTV", "MOBILE", "IT", "COPIER", "CONSUMER_ELEC"];

export function getDiagnoseRecommendation(
  selectedCategory: CategoryCode,
  problemType: string,
  urgencyLevel: string,
  _userArea: string
): DiagnoseRecommendation {
  const mapping = PROBLEM_SERVICE_MAP[selectedCategory]?.[problemType];
  const serviceCode = mapping?.serviceCode ?? categories.find(c => c.code === selectedCategory)?.services[0]?.code ?? "";
  const confidence = mapping?.confidence ?? "General Inspection";

  const cat = categories.find(c => c.code === selectedCategory);
  const svc = cat?.services.find(s => s.code === serviceCode);

  const isProduct = selectedCategory === "PRINT_SUPPLIES" && 
    ["need_toner", "need_ink", "need_accessories", "need_printer"].includes(problemType);

  const sameDayAvailable = urgencyLevel === "emergency" || urgencyLevel === "same_day" ||
    (svc?.slaMinutesEmergency !== undefined && EMERGENCY_CATEGORIES.includes(selectedCategory));

  const defaultMode: ServiceMode = svc?.allowedModes[0] ?? "on_site";

  const helperNotes: Record<string, string> = {
    "Best Match": "High confidence — this service matches your problem description.",
    "Recommended": "Based on your description, this is our recommended starting point.",
    "General Inspection": "We'll start with a diagnostic inspection to identify the exact issue.",
  };

  return {
    recommendedCategoryCode: selectedCategory,
    recommendedServiceCode: serviceCode,
    recommendedServiceName: svc?.name ?? "General Service",
    confidenceLabel: confidence,
    recommendedMode: defaultMode,
    estimatedFromPrice: svc?.fromPrice ?? cat?.fromPrice ?? 0,
    sameDayAvailable,
    resultType: isProduct ? "product" : "service",
    helperNote: helperNotes[confidence],
  };
}

/** Problem options per category */
export const CATEGORY_PROBLEMS: Record<string, { key: string; label: string }[]> = {
  AC: [
    { key: "not_cooling", label: "Not cooling" },
    { key: "leaking_water", label: "Leaking water" },
    { key: "making_noise", label: "Making noise" },
    { key: "not_turning_on", label: "Not turning on" },
    { key: "need_cleaning", label: "Need cleaning / service" },
    { key: "not_sure", label: "Not sure" },
  ],
  CCTV: [
    { key: "camera_not_showing", label: "Camera not showing" },
    { key: "dvr_nvr_issue", label: "DVR / NVR issue" },
    { key: "remote_not_working", label: "Remote viewing not working" },
    { key: "new_installation", label: "Need new installation" },
    { key: "need_maintenance", label: "Need maintenance" },
    { key: "not_sure", label: "Not sure" },
  ],
  MOBILE: [
    { key: "screen_broken", label: "Screen broken" },
    { key: "battery_draining", label: "Battery draining fast" },
    { key: "not_charging", label: "Not charging" },
    { key: "not_turning_on", label: "Not turning on" },
    { key: "software_issue", label: "Software issue" },
    { key: "not_sure", label: "Not sure" },
  ],
  IT: [
    { key: "laptop_slow", label: "Laptop slow" },
    { key: "wifi_network", label: "Wi-Fi / network issue" },
    { key: "desktop_not_on", label: "Desktop not turning on" },
    { key: "printer_connectivity", label: "Printer connectivity issue" },
    { key: "software_os", label: "Software / OS issue" },
    { key: "not_sure", label: "Not sure" },
  ],
  SOLAR: [
    { key: "low_output", label: "Low power generation" },
    { key: "inverter_issue", label: "Inverter issue" },
    { key: "battery_issue", label: "Battery issue" },
    { key: "need_installation", label: "Need installation" },
    { key: "need_inspection", label: "Need inspection" },
    { key: "not_sure", label: "Not sure" },
  ],
  CONSUMER_ELEC: [
    { key: "tv_not_on", label: "TV not turning on" },
    { key: "no_display_sound", label: "No display / sound issue" },
    { key: "remote_input", label: "Remote / input issue" },
    { key: "appliance_issue", label: "Appliance issue" },
    { key: "need_inspection", label: "Need inspection" },
    { key: "not_sure", label: "Not sure" },
  ],
  COPIER: [
    { key: "not_printing", label: "Not printing" },
    { key: "paper_jam", label: "Paper jam" },
    { key: "poor_quality", label: "Poor print quality" },
    { key: "error_message", label: "Error message" },
    { key: "need_service", label: "Need service / maintenance" },
    { key: "not_sure", label: "Not sure" },
  ],
  SMART_HOME_OFFICE: [
    { key: "cctv_smart_lock", label: "CCTV / smart lock integration" },
    { key: "wifi_smart_device", label: "Wi-Fi smart device setup" },
    { key: "intercom_access", label: "Intercom / access issue" },
    { key: "office_automation", label: "Office device automation" },
    { key: "need_installation", label: "Need installation" },
    { key: "not_sure", label: "Not sure" },
  ],
  PRINT_SUPPLIES: [
    { key: "need_toner", label: "Need toner" },
    { key: "need_ink", label: "Need ink" },
    { key: "need_printer", label: "Need printer" },
    { key: "need_accessories", label: "Need accessories" },
    { key: "compatibility_help", label: "Need model compatibility help" },
    { key: "not_sure", label: "Not sure" },
  ],
};

/** Urgency options — category-aware */
export function getUrgencyOptions(categoryCode: CategoryCode): { key: string; label: string; description: string }[] {
  if (categoryCode === "PRINT_SUPPLIES") {
    return [
      { key: "same_day", label: "Same day delivery", description: "Get it delivered today" },
      { key: "next_day", label: "Next day delivery", description: "Delivery by tomorrow" },
      { key: "flexible", label: "Flexible", description: "No rush — best price" },
    ];
  }

  const hasEmergency = EMERGENCY_CATEGORIES.includes(categoryCode);
  const options = [];

  if (hasEmergency) {
    options.push({ key: "emergency", label: "Emergency (today)", description: "Fastest response — surcharge may apply" });
  }
  options.push(
    { key: "same_day", label: "Same day", description: "Service within today" },
    { key: "within_24h", label: "Within 24 hours", description: "Scheduled for tomorrow" },
    { key: "flexible", label: "Flexible", description: "Best available slot" },
  );

  return options;
}

/** Display info per category for the wizard */
export const DIAGNOSE_CATEGORY_DISPLAY: { code: CategoryCode; label: string; icon: string }[] = [
  { code: "AC", label: "Air Conditioner", icon: "Snowflake" },
  { code: "CCTV", label: "CCTV / Security", icon: "Camera" },
  { code: "MOBILE", label: "Mobile Phone", icon: "Smartphone" },
  { code: "IT", label: "Laptop / IT", icon: "Monitor" },
  { code: "SOLAR", label: "Solar System", icon: "Sun" },
  { code: "CONSUMER_ELEC", label: "TV / Electronics", icon: "Tv" },
  { code: "COPIER", label: "Printer / Copier", icon: "Printer" },
  { code: "SMART_HOME_OFFICE", label: "Smart Home / Office", icon: "Home" },
  { code: "PRINT_SUPPLIES", label: "Printing Supplies", icon: "ShoppingBag" },
];
