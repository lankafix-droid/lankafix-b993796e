/**
 * V2 Category Flow Configurations
 * Defines service types, device detail questions, pricing indicators, and flow type per category.
 */
import type { CategoryCode } from "@/types/booking";

export type V2FlowType = "fast_book" | "inspection" | "hybrid";
export type V2PriceType = "fixed" | "starts_from" | "inspection_required";

export interface V2FlowOption {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

export interface V2DeviceQuestion {
  key: string;
  label: string;
  type: "select" | "text" | "toggle";
  options?: { label: string; value: string }[];
  required: boolean;
}

export interface V2ServicePackage {
  id: string;
  name: string;
  description: string;
  priceType: V2PriceType;
  price: number;
  priceMax?: number;
  features: string[];
  popular?: boolean;
  commitmentFee?: number;
}

export interface V2SiteCondition {
  key: string;
  label: string;
  type: "toggle" | "select";
  options?: { label: string; value: string }[];
}

export interface V2CategoryFlow {
  code: CategoryCode;
  name: string;
  flowType: V2FlowType;
  heroTagline: string;
  trustBadges: string[];
  priceExample: string;
  serviceTypes: V2FlowOption[];
  issueSelectors?: V2FlowOption[];
  deviceQuestions: V2DeviceQuestion[];
  packages: V2ServicePackage[];
  siteConditions?: V2SiteCondition[];
  requiresCommitmentFee: boolean;
  commitmentFeeAmount: number;
  commitmentFeeNote: string;
  photoUploadHint?: string;
  dataRiskDisclaimer?: string;
}

export const v2CategoryFlows: Record<string, V2CategoryFlow> = {
  AC: {
    code: "AC",
    name: "AC Services",
    flowType: "hybrid",
    heroTagline: "AC Repair in 2 Hours",
    trustBadges: ["Verified Technician", "Transparent Pricing", "Warranty Backed", "LankaFix Approved"],
    priceExample: "Services from LKR 3,500",
    serviceTypes: [
      { id: "service", label: "Service / Cleaning", description: "Regular AC maintenance & deep cleaning", icon: "Wind" },
      { id: "repair", label: "Repair", description: "Fix cooling, leak, noise or electrical issues", icon: "Wrench" },
      { id: "install", label: "Installation", description: "New AC unit installation", icon: "PlusCircle" },
      { id: "gas", label: "Gas Refill", description: "Refrigerant top-up for all AC types", icon: "Thermometer" },
      { id: "not_sure", label: "Not Sure", description: "Let our technician diagnose the issue", icon: "HelpCircle" },
    ],
    issueSelectors: [
      { id: "not_cooling", label: "Not Cooling", description: "AC runs but doesn't cool properly", icon: "ThermometerSnowflake" },
      { id: "water_leak", label: "Water Leak", description: "Water dripping from indoor unit", icon: "Droplets" },
      { id: "bad_smell", label: "Bad Smell", description: "Unpleasant odor when AC runs", icon: "Wind" },
      { id: "noise", label: "Noise Issue", description: "Unusual sounds from AC unit", icon: "Volume2" },
      { id: "not_turning_on", label: "Not Turning On", description: "AC doesn't power on at all", icon: "PowerOff" },
    ],
    deviceQuestions: [
      { key: "ac_type", label: "AC Type", type: "select", options: [{ label: "Wall Mount / Split", value: "split" }, { label: "Cassette", value: "cassette" }, { label: "Window", value: "window" }, { label: "Not Sure", value: "not_sure" }], required: true },
      { key: "brand", label: "Brand", type: "select", options: [{ label: "Samsung", value: "samsung" }, { label: "LG", value: "lg" }, { label: "Daikin", value: "daikin" }, { label: "Mitsubishi", value: "mitsubishi" }, { label: "Panasonic", value: "panasonic" }, { label: "Other", value: "other" }], required: false },
      { key: "capacity", label: "Capacity (BTU)", type: "select", options: [{ label: "9,000 BTU", value: "9000" }, { label: "12,000 BTU", value: "12000" }, { label: "18,000 BTU", value: "18000" }, { label: "24,000 BTU", value: "24000" }, { label: "Not Sure", value: "not_sure" }], required: false },
      { key: "units", label: "Number of Units", type: "select", options: [{ label: "1 Unit", value: "1" }, { label: "2 Units", value: "2" }, { label: "3 Units", value: "3" }, { label: "4+ Units", value: "4_plus" }], required: true },
      { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop", value: "shop" }], required: true },
    ],
    packages: [
      { id: "inspection", name: "Inspection Visit", description: "Technician inspects & diagnoses the issue", priceType: "fixed", price: 2500, features: ["On-site visit", "Full diagnosis", "Written report", "Deductible from repair"] },
      { id: "standard", name: "Standard Service", description: "Filter wash, gas check, general cleaning", priceType: "fixed", price: 4500, features: ["Indoor unit cleaning", "Filter wash", "Gas pressure check", "Performance test"], popular: true },
      { id: "deep_wash", name: "Deep Chemical Wash", description: "Complete chemical cleaning of indoor & outdoor units", priceType: "fixed", price: 7500, features: ["Chemical wash indoor", "Outdoor unit cleaning", "Coil cleaning", "Drain line flush", "Gas check"] },
      { id: "gas_refill", name: "Gas Refill", description: "Refrigerant recharge for optimal cooling", priceType: "starts_from", price: 3500, priceMax: 8000, features: ["Gas type assessment", "Leak check", "Recharge", "Performance test"] },
    ],
    requiresCommitmentFee: false,
    commitmentFeeAmount: 0,
    commitmentFeeNote: "",
    photoUploadHint: "Upload a photo of your AC unit to help the technician prepare",
  },

  MOBILE: {
    code: "MOBILE",
    name: "Mobile Phone Repairs",
    flowType: "fast_book",
    heroTagline: "Broken Phone Screen? Fixed Today",
    trustBadges: ["Verified Technician", "Data Safe", "Warranty Backed", "Transparent Pricing"],
    priceExample: "Repairs from LKR 2,000",
    serviceTypes: [
      { id: "screen", label: "Screen Broken", description: "Cracked or unresponsive display", icon: "Smartphone" },
      { id: "battery", label: "Battery Replacement", description: "Battery draining fast or swollen", icon: "Battery" },
      { id: "charging", label: "Charging Problem", description: "Won't charge or loose port", icon: "Zap" },
      { id: "camera", label: "Camera Issue", description: "Blurry, black screen or not working", icon: "Camera" },
      { id: "water", label: "Water Damage", description: "Phone exposed to water or liquid", icon: "Droplets" },
      { id: "software", label: "Software Issue", description: "Freezing, crashing or virus", icon: "Bug" },
    ],
    deviceQuestions: [
      { key: "brand", label: "Brand", type: "select", options: [{ label: "Apple iPhone", value: "apple" }, { label: "Samsung", value: "samsung" }, { label: "Huawei", value: "huawei" }, { label: "Xiaomi", value: "xiaomi" }, { label: "Oppo", value: "oppo" }, { label: "Other", value: "other" }], required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "touch_working", label: "Is touch still working?", type: "toggle", required: true },
      { key: "powers_on", label: "Does the phone power on?", type: "toggle", required: true },
    ],
    packages: [
      { id: "diagnostic", name: "Diagnostic First", description: "Full inspection before any repair", priceType: "fixed", price: 500, features: ["Full device check", "Written diagnosis", "Repair recommendation", "Fee deducted from repair"] },
      { id: "compatible_lcd", name: "Compatible LCD", description: "Budget-friendly screen replacement", priceType: "starts_from", price: 5000, priceMax: 12000, features: ["Compatible display", "90-day warranty", "Same-day service"] },
      { id: "oem_oled", name: "OEM OLED Display", description: "High-quality equivalent display", priceType: "starts_from", price: 8000, priceMax: 25000, features: ["OEM-grade display", "6-month warranty", "Same-day service"], popular: true },
      { id: "genuine", name: "Genuine Display", description: "Original manufacturer display", priceType: "starts_from", price: 15000, priceMax: 45000, features: ["Genuine part", "12-month warranty", "Same-day service"] },
    ],
    requiresCommitmentFee: false,
    commitmentFeeAmount: 0,
    commitmentFeeNote: "",
    photoUploadHint: "Upload a photo of the damage to get an accurate estimate",
    dataRiskDisclaimer: "By proceeding, you acknowledge that LankaFix and the technician are not responsible for any data loss during the repair process. We recommend backing up your data before handing over your device.",
  },

  CONSUMER_ELEC: {
    code: "CONSUMER_ELEC",
    name: "Consumer Electronics",
    flowType: "fast_book",
    heroTagline: "Appliance Not Working? We'll Fix It",
    trustBadges: ["Verified Technician", "Transparent Pricing", "Warranty Backed", "LankaFix Approved"],
    priceExample: "Repairs from LKR 2,500",
    serviceTypes: [
      { id: "tv", label: "TV Repair", description: "LED, LCD, Smart TV issues", icon: "Tv" },
      { id: "washing", label: "Washing Machine", description: "Not spinning, draining or leaking", icon: "Waves" },
      { id: "fridge", label: "Refrigerator", description: "Not cooling, ice buildup, noise", icon: "Refrigerator" },
      { id: "microwave", label: "Microwave", description: "Not heating, turntable, display issues", icon: "Microwave" },
      { id: "fan", label: "Fan / Ventilation", description: "Ceiling fan, exhaust fan repair", icon: "Fan" },
      { id: "other", label: "Other Appliance", description: "Iron, blender, other home appliances", icon: "Cog" },
    ],
    deviceQuestions: [
      { key: "brand", label: "Brand", type: "text", required: false },
      { key: "model", label: "Model (if known)", type: "text", required: false },
      { key: "age", label: "Approximate Age", type: "select", options: [{ label: "Under 1 year", value: "lt_1y" }, { label: "1-3 years", value: "1_3y" }, { label: "3-5 years", value: "3_5y" }, { label: "Over 5 years", value: "gt_5y" }], required: true },
      { key: "issue_description", label: "Describe the problem", type: "text", required: true },
    ],
    packages: [
      { id: "inspection", name: "On-Site Inspection", description: "Technician visits and diagnoses the issue", priceType: "fixed", price: 2500, features: ["Home visit", "Full diagnosis", "Repair estimate", "Fee deducted from repair"], popular: true },
      { id: "pickup", name: "Pick-up & Return", description: "We collect, repair and return your appliance", priceType: "starts_from", price: 3500, features: ["Free pickup", "Workshop repair", "Quality tested", "Free delivery back"] },
      { id: "inspection_only", name: "Inspection Only", description: "Get a detailed report without committing to repair", priceType: "fixed", price: 1500, features: ["Written report", "Photo documentation", "Repair/replace recommendation"] },
    ],
    requiresCommitmentFee: false,
    commitmentFeeAmount: 0,
    commitmentFeeNote: "",
    photoUploadHint: "Upload a photo or video of the issue",
  },

  CCTV: {
    code: "CCTV",
    name: "CCTV Solutions",
    flowType: "inspection",
    heroTagline: "Professional CCTV Installation Packages",
    trustBadges: ["Verified Technician", "Installation Guaranteed", "Warranty Backed", "LankaFix Approved"],
    priceExample: "Packages from LKR 15,000",
    serviceTypes: [
      { id: "new_install", label: "New Installation", description: "Complete CCTV system setup", icon: "Camera" },
      { id: "upgrade", label: "System Upgrade", description: "Add cameras or upgrade DVR/NVR", icon: "ArrowUpCircle" },
      { id: "repair", label: "Repair", description: "Fix camera, DVR or connectivity issues", icon: "Wrench" },
      { id: "inspection", label: "Site Inspection", description: "Professional security assessment", icon: "Search" },
    ],
    deviceQuestions: [
      { key: "property_type", label: "Property Type", type: "select", options: [{ label: "Home", value: "home" }, { label: "Shop", value: "shop" }, { label: "Office", value: "office" }, { label: "Warehouse", value: "warehouse" }], required: true },
      { key: "camera_count", label: "Number of Cameras", type: "select", options: [{ label: "2 Cameras", value: "2" }, { label: "4 Cameras", value: "4" }, { label: "8 Cameras", value: "8" }, { label: "16+ Cameras", value: "16_plus" }, { label: "Not Sure", value: "not_sure" }], required: true },
      { key: "existing_system", label: "Existing CCTV System?", type: "toggle", required: true },
    ],
    packages: [
      { id: "starter", name: "Starter Package", description: "2 cameras with 4-channel DVR", priceType: "starts_from", price: 25000, priceMax: 35000, features: ["2x HD cameras", "4-ch DVR", "500GB storage", "Mobile app setup", "Basic cabling"] },
      { id: "advanced", name: "Advanced Package", description: "4 cameras with 8-channel NVR", priceType: "starts_from", price: 45000, priceMax: 65000, features: ["4x Full HD cameras", "8-ch NVR", "1TB storage", "Night vision", "Remote access", "Professional cabling"], popular: true },
      { id: "secure", name: "Secure Package", description: "8 cameras with premium NVR", priceType: "starts_from", price: 85000, priceMax: 120000, features: ["8x 2MP cameras", "8-ch NVR", "2TB storage", "AI motion detection", "24/7 recording", "Professional installation"] },
    ],
    siteConditions: [
      { key: "power_nearby", label: "Power outlet nearby installation points?", type: "toggle" },
      { key: "roof_access", label: "Roof access available?", type: "toggle" },
      { key: "ladder_needed", label: "Ladder required (high walls)?", type: "toggle" },
      { key: "internet", label: "Internet connection available?", type: "toggle" },
    ],
    requiresCommitmentFee: true,
    commitmentFeeAmount: 3000,
    commitmentFeeNote: "Deductible from your final bill",
    photoUploadHint: "Upload photos of the property exterior to help plan camera placement",
  },

  IT: {
    code: "IT",
    name: "IT Support",
    flowType: "fast_book",
    heroTagline: "IT Problems? Expert Help Fast",
    trustBadges: ["Verified Technician", "Data Safe", "Transparent Pricing", "LankaFix Approved"],
    priceExample: "Support from LKR 2,000",
    serviceTypes: [
      { id: "laptop", label: "Laptop Repair", description: "Hardware or software issues", icon: "Laptop" },
      { id: "desktop", label: "Desktop Repair", description: "PC not working, slow, or crashing", icon: "Monitor" },
      { id: "network", label: "Network Issue", description: "WiFi, router, LAN problems", icon: "Wifi" },
      { id: "printer", label: "Printer Problem", description: "Printer setup, jam or quality issues", icon: "Printer" },
      { id: "software", label: "Software Help", description: "Installation, virus, backup", icon: "Code" },
    ],
    deviceQuestions: [
      { key: "environment", label: "Environment", type: "select", options: [{ label: "Home", value: "home" }, { label: "Office", value: "office" }, { label: "Retail/Shop", value: "retail" }, { label: "School", value: "school" }], required: true },
      { key: "issue", label: "Main Issue", type: "select", options: [{ label: "Slow System", value: "slow" }, { label: "Virus / Malware", value: "virus" }, { label: "Not Powering On", value: "no_power" }, { label: "WiFi Problem", value: "wifi" }, { label: "Data Recovery", value: "data" }, { label: "Other", value: "other" }], required: true },
      { key: "device_count", label: "Number of Devices", type: "select", options: [{ label: "1 Device", value: "1" }, { label: "2-5 Devices", value: "2_5" }, { label: "5+ Devices", value: "5_plus" }], required: false },
    ],
    packages: [
      { id: "remote", name: "Remote Support", description: "Expert help via remote access", priceType: "fixed", price: 2000, features: ["Screen sharing", "30-min session", "Software fixes", "No visit needed"] },
      { id: "onsite", name: "On-Site Visit", description: "Technician comes to your location", priceType: "starts_from", price: 3500, features: ["Home/office visit", "Hardware check", "Software diagnosis", "Network check"], popular: true },
      { id: "data_recovery", name: "Data Recovery", description: "Recover lost or deleted files", priceType: "inspection_required", price: 5000, priceMax: 15000, features: ["Drive assessment", "Recovery attempt", "Report", "Quote before proceeding"] },
    ],
    requiresCommitmentFee: false,
    commitmentFeeAmount: 0,
    commitmentFeeNote: "",
  },

  SOLAR: {
    code: "SOLAR",
    name: "Solar Solutions",
    flowType: "inspection",
    heroTagline: "Cut Your Electricity Bill with Solar",
    trustBadges: ["Verified Installer", "Installation Guaranteed", "Warranty Backed", "LankaFix Approved"],
    priceExample: "Systems from LKR 250,000",
    serviceTypes: [
      { id: "new_install", label: "New Solar Install", description: "Complete solar PV system", icon: "Sun" },
      { id: "expand", label: "Expand System", description: "Add panels or battery to existing system", icon: "PlusCircle" },
      { id: "maintenance", label: "Maintenance", description: "Panel cleaning, wiring check, audit", icon: "Settings" },
      { id: "troubleshoot", label: "Troubleshooting", description: "System not performing as expected", icon: "AlertTriangle" },
    ],
    deviceQuestions: [
      { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Office", value: "office" }, { label: "Factory", value: "factory" }, { label: "Warehouse", value: "warehouse" }], required: true },
      { key: "bill_range", label: "Monthly Electricity Bill", type: "select", options: [{ label: "Under LKR 10,000", value: "lt_10k" }, { label: "LKR 10,000 - 20,000", value: "10_20k" }, { label: "LKR 20,000 - 40,000", value: "20_40k" }, { label: "Over LKR 40,000", value: "gt_40k" }], required: true },
      { key: "backup", label: "Battery backup needed?", type: "toggle", required: true },
      { key: "existing_solar", label: "Existing solar system?", type: "toggle", required: true },
    ],
    packages: [
      { id: "consultation", name: "Free Consultation", description: "Discuss your solar needs with an expert", priceType: "fixed", price: 0, features: ["Phone/video call", "Bill analysis", "System recommendation", "No obligation"] },
      { id: "site_inspection", name: "Site Inspection", description: "Professional roof and electrical assessment", priceType: "fixed", price: 5000, features: ["Roof assessment", "Shading analysis", "Electrical check", "System design", "Detailed quote"], commitmentFee: 5000, popular: true },
      { id: "maintenance_pkg", name: "Maintenance Package", description: "Annual solar panel maintenance", priceType: "fixed", price: 8000, features: ["Panel cleaning", "Wiring inspection", "Inverter check", "Performance report"] },
    ],
    siteConditions: [
      { key: "roof_type", label: "Roof Type", type: "select", options: [{ label: "Tile", value: "tile" }, { label: "Concrete Slab", value: "slab" }, { label: "Metal Sheet", value: "metal" }, { label: "Asbestos", value: "asbestos" }] },
      { key: "shading", label: "Shading Level", type: "select", options: [{ label: "No Shade", value: "none" }, { label: "Partial Shade", value: "partial" }, { label: "Heavy Shade", value: "heavy" }] },
      { key: "roof_photo", label: "Can you upload a roof photo?", type: "toggle" },
    ],
    requiresCommitmentFee: true,
    commitmentFeeAmount: 5000,
    commitmentFeeNote: "Deductible from your installation cost",
    photoUploadHint: "Upload photos of your roof and electrical meter board",
  },

  SMART_HOME_OFFICE: {
    code: "SMART_HOME_OFFICE",
    name: "Smart Home & Office",
    flowType: "inspection",
    heroTagline: "Make Your Space Smarter",
    trustBadges: ["Verified Technician", "Installation Guaranteed", "Warranty Backed", "LankaFix Approved"],
    priceExample: "Packages from LKR 15,000",
    serviceTypes: [
      { id: "security", label: "Security", description: "Smart locks, alarms, access control", icon: "Shield" },
      { id: "automation", label: "Automation", description: "Smart lighting, scenes, voice control", icon: "Lightbulb" },
      { id: "energy", label: "Energy Monitoring", description: "Track and reduce energy consumption", icon: "Gauge" },
      { id: "office", label: "Office Automation", description: "Meeting rooms, access, networking", icon: "Building" },
    ],
    deviceQuestions: [
      { key: "environment", label: "Environment", type: "select", options: [{ label: "Home", value: "home" }, { label: "SME Office", value: "sme" }, { label: "Retail", value: "retail" }, { label: "Warehouse", value: "warehouse" }], required: true },
      { key: "requirements", label: "What do you need?", type: "select", options: [{ label: "Smart Lighting", value: "lighting" }, { label: "Access Control", value: "access" }, { label: "Smart Locks", value: "locks" }, { label: "Energy Monitoring", value: "energy" }, { label: "Full Package", value: "full" }], required: true },
      { key: "wifi", label: "WiFi available?", type: "toggle", required: true },
    ],
    packages: [
      { id: "starter", name: "Smart Starter", description: "Basic smart home automation", priceType: "starts_from", price: 15000, priceMax: 25000, features: ["Smart hub", "2 smart bulbs", "1 smart plug", "App setup", "Voice control"] },
      { id: "secure", name: "Smart Secure", description: "Smart home security package", priceType: "starts_from", price: 35000, priceMax: 55000, features: ["Smart lock", "Door sensor", "Motion sensor", "Smart camera", "App alerts"], popular: true },
      { id: "office_pro", name: "Smart Office Pro", description: "Complete office automation", priceType: "starts_from", price: 75000, priceMax: 120000, features: ["Access control", "Meeting room booking", "Energy monitoring", "Smart lighting", "Network setup"] },
    ],
    siteConditions: [
      { key: "wifi_available", label: "WiFi available?", type: "toggle" },
      { key: "solar_available", label: "Solar power available?", type: "toggle" },
      { key: "backup_required", label: "Battery backup required?", type: "toggle" },
    ],
    requiresCommitmentFee: true,
    commitmentFeeAmount: 3000,
    commitmentFeeNote: "Deductible from your project cost",
    photoUploadHint: "Upload photos of the areas you want to automate",
  },
};

export function getV2Flow(code: string): V2CategoryFlow | undefined {
  return v2CategoryFlows[code];
}

export function getFlowStepCount(flowType: V2FlowType): number {
  switch (flowType) {
    case "fast_book": return 5;
    case "inspection": return 6;
    case "hybrid": return 5;
  }
}
