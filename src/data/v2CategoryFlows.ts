/**
 * V2 Category Flow Configurations
 * Full marketplace spec: all categories LIVE, booking models, assignment types, pricing archetypes
 */
import type { CategoryCode } from "@/types/booking";

export type V2FlowType = "fast_book" | "inspection" | "hybrid";
export type V2PriceType = "fixed" | "starts_from" | "inspection_required";
export type V2BookingModel = "fast_book" | "diagnostic_first" | "inspection_consultation";
export type V2AssignmentType = "technician" | "partner_shop" | "site_inspection" | "remote_support";
export type V2PricingArchetype = "fixed_price" | "diagnostic_first" | "quote_required";

export interface V2FlowOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  group?: string;
  priceLabel?: string;
  tag?: string;
  estimatedTime?: string;
}

export interface V2DeviceQuestion {
  key: string;
  label: string;
  type: "select" | "text" | "toggle";
  options?: { label: string; value: string }[];
  required: boolean;
  /** Only show this question when one of these serviceTypeIds is selected. Omit = always show. */
  showForServiceTypes?: string[];
  /** Only show when another device answer matches. E.g. { key: "device_type", value: "laptop" } */
  showIfAnswer?: { key: string; value: string | string[] };
}

export interface V2ServiceMode {
  id: string;
  label: string;
  description: string;
  icon: string;
  extraFee?: number;
  skipLocation?: boolean;
  details?: string[];
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

export interface V2QuickService {
  label: string;
  priceLabel: string;
  serviceTypeId: string;
  pricingArchetype: V2PricingArchetype;
}

export interface V2PartnerShopInfo {
  name: string;
  location: string;
  rating: number;
  repairTimeEstimate: string;
  openHours: string;
  verified: boolean;
}

export interface V2CategoryFlow {
  code: CategoryCode;
  name: string;
  flowType: V2FlowType;
  bookingModel: V2BookingModel;
  assignmentType: V2AssignmentType;
  pricingArchetype: V2PricingArchetype;
  heroTagline: string;
  heroSubtext: string;
  trustBadges: string[];
  priceExample: string;
  availabilityLabel?: string;
  serviceTypes: V2FlowOption[];
  issueSelectors?: V2FlowOption[];
  deviceQuestions: V2DeviceQuestion[];
  serviceModes?: V2ServiceMode[];
  packages: V2ServicePackage[];
  siteConditions?: V2SiteCondition[];
  quickServices: V2QuickService[];
  requiresCommitmentFee: boolean;
  commitmentFeeAmount: number;
  commitmentFeeNote: string;
  photoUploadHint?: string;
  dataRiskDisclaimer?: string;
  cancellationNote: string;
  warrantyNote: string;
  pricingExplanation: string;
  partnerShops?: V2PartnerShopInfo[];
}

// ─── MOBILE REPAIRS ──────────────────────────────────────────────
const MOBILE_FLOW: V2CategoryFlow = {
  code: "MOBILE",
  name: "Mobile Phone Repairs",
  flowType: "fast_book",
  bookingModel: "fast_book",
  assignmentType: "partner_shop",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Broken Phone Screen? Fixed Today",
  heroSubtext: "Verified technicians · Genuine & OEM parts · Warranty on every repair",
  trustBadges: ["Verified Technician", "Data Safe", "Warranty Backed", "Transparent Pricing"],
  priceExample: "Starting from LKR 5,000",
  serviceTypes: [
    { id: "screen", label: "Screen Broken", description: "Cracked, shattered or unresponsive display", icon: "Smartphone" },
    { id: "battery", label: "Battery Replacement", description: "Battery draining fast, swollen or dead", icon: "Battery" },
    { id: "charging", label: "Charging Problem", description: "Won't charge, loose port or slow charging", icon: "Zap" },
    { id: "water", label: "Water Damage", description: "Phone exposed to water or liquid spill", icon: "Droplets" },
    { id: "camera", label: "Camera Issue", description: "Blurry photos, black screen or autofocus fail", icon: "Camera" },
    { id: "software", label: "Software Issue", description: "Freezing, crashing, virus or won't boot", icon: "Bug" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our technician diagnose — takes less than 30 seconds", icon: "Stethoscope" },
  ],
  deviceQuestions: [
    { key: "brand", label: "Phone Brand", type: "select", options: [{ label: "Apple iPhone", value: "apple" }, { label: "Samsung", value: "samsung" }, { label: "Huawei", value: "huawei" }, { label: "Xiaomi", value: "xiaomi" }, { label: "Oppo", value: "oppo" }, { label: "Vivo", value: "vivo" }, { label: "Infinix", value: "infinix" }, { label: "Tecno", value: "tecno" }, { label: "Other", value: "other" }], required: true },
    { key: "model", label: "Phone Model", type: "text", required: true },
    // Screen-specific
    { key: "touch_working", label: "Is touch still working?", type: "toggle", required: true, showForServiceTypes: ["screen"] },
    { key: "display_visible", label: "Is the display still visible?", type: "toggle", required: true, showForServiceTypes: ["screen"] },
    // Battery-specific
    { key: "battery_swollen", label: "Is the back cover raised or swollen?", type: "toggle", required: false, showForServiceTypes: ["battery"] },
    // Charging-specific
    { key: "port_loose", label: "Does the cable feel loose in the port?", type: "toggle", required: false, showForServiceTypes: ["charging"] },
    // Water damage
    { key: "still_powers_on", label: "Does the phone still power on?", type: "toggle", required: true, showForServiceTypes: ["water"] },
    { key: "when_exposed", label: "When did this happen?", type: "select", options: [{ label: "Less than 24 hours", value: "lt_24h" }, { label: "1-3 days ago", value: "1_3d" }, { label: "More than 3 days", value: "gt_3d" }], required: true, showForServiceTypes: ["water"] },
    // General
    { key: "previously_repaired", label: "Has it been repaired before?", type: "toggle", required: false },
  ],
  serviceModes: [
    { id: "drop_off", label: "Drop-Off", description: "Bring your device to a verified partner shop", icon: "MapPin", details: ["Shop location shown after booking", "Walk-in during open hours", "Fastest turnaround"] },
    { id: "pickup_return", label: "Pick-Up & Return", description: "We collect and deliver your device", icon: "Truck", extraFee: 500, details: ["Scheduled pickup slot", "Secure packaging provided", "Device returned after repair"] },
    { id: "express", label: "Express Repair", description: "Priority repair — same-day guaranteed", icon: "Zap", extraFee: 1000, details: ["Priority queue", "Same-day completion", "SMS updates"] },
    { id: "diagnostic", label: "Diagnostic First", description: "Full inspection before any repair work", icon: "Search", details: ["Full device check", "Written diagnosis", "Repair fee deducted if you proceed"] },
  ],
  packages: [
    { id: "diagnostic", name: "Diagnostic First", description: "Full inspection before any repair", priceType: "fixed", price: 500, features: ["Full device check", "Written diagnosis", "Repair recommendation", "Fee deducted from repair"] },
    { id: "compatible_lcd", name: "Compatible LCD", description: "Budget-friendly screen replacement", priceType: "starts_from", price: 5000, priceMax: 12000, features: ["Compatible display", "90-day warranty", "Same-day service"] },
    { id: "oem_oled", name: "OEM OLED Display", description: "High-quality equivalent display", priceType: "starts_from", price: 8000, priceMax: 25000, features: ["OEM-grade display", "6-month warranty", "Same-day service"], popular: true },
    { id: "genuine", name: "Genuine Display", description: "Original manufacturer display", priceType: "starts_from", price: 15000, priceMax: 45000, features: ["Genuine part", "12-month warranty", "Same-day service"] },
  ],
  quickServices: [
    { label: "Broken Phone Screen", priceLabel: "From LKR 9,500", serviceTypeId: "screen", pricingArchetype: "diagnostic_first" },
    { label: "Battery Replacement", priceLabel: "From LKR 3,500", serviceTypeId: "battery", pricingArchetype: "diagnostic_first" },
    { label: "Charging Port Fix", priceLabel: "From LKR 2,500", serviceTypeId: "charging", pricingArchetype: "diagnostic_first" },
  ],
  partnerShops: [],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  photoUploadHint: "Upload a photo of the damage to help the technician prepare the right parts",
  dataRiskDisclaimer: "By proceeding, you acknowledge that LankaFix and the assigned technician are not responsible for any data loss during the repair process. We strongly recommend backing up your data before handing over your device. Do not share your PIN or passwords unless absolutely necessary.",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "All repairs include warranty on parts and labor",
  pricingExplanation: "Mobile repairs use Starting From pricing. Final price depends on your device model, spare part availability, and part grade selected. You choose your part quality (Original, OEM, A Grade, or Compatible) and receive a detailed quote for approval before any repair begins.",
};

// ─── AC SERVICES ──────────────────────────────────────────────
const AC_FLOW: V2CategoryFlow = {
  code: "AC",
  name: "AC Services",
  flowType: "hybrid",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "fixed_price",
  heroTagline: "AC Repair in 2 Hours",
  heroSubtext: "Same-day service across Greater Colombo · Verified AC specialists",
  trustBadges: ["Verified Technician", "Transparent Pricing", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Services from LKR 3,500",
  serviceTypes: [
    { id: "service", label: "Standard Service", description: "Regular AC maintenance and filter wash", icon: "Wind" },
    { id: "deep_clean", label: "Deep Clean", description: "Full chemical wash of indoor & outdoor units", icon: "Sparkles" },
    { id: "repair", label: "Repair", description: "Fix cooling, leak, noise or electrical issues", icon: "Wrench" },
    { id: "gas", label: "Gas Refill", description: "Refrigerant top-up for optimal cooling", icon: "Thermometer" },
    { id: "install", label: "New Installation", description: "Professional AC installation with piping and bracket", icon: "PlusCircle", priceLabel: "Site inspection required", tag: "Inspection" },
    { id: "relocation", label: "AC Relocation", description: "Move your existing AC to a new location", icon: "ArrowRight", priceLabel: "From LKR 8,000" },
    { id: "water_leak", label: "Water Leakage Repair", description: "Water dripping from indoor unit, drain line issue", icon: "Droplets", priceLabel: "From LKR 3,500" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our technician diagnose — takes less than 30 seconds", icon: "Stethoscope" },
  ],
  issueSelectors: [
    { id: "not_cooling", label: "Not Cooling", description: "AC runs but room stays warm", icon: "ThermometerSnowflake" },
    { id: "water_leak", label: "Water Leak", description: "Water dripping from indoor unit", icon: "Droplets" },
    { id: "bad_smell", label: "Bad Smell", description: "Unpleasant odor when AC runs", icon: "Wind" },
    { id: "noise", label: "Unusual Noise", description: "Rattling, buzzing or grinding sounds", icon: "Volume2" },
    { id: "not_turning_on", label: "Not Turning On", description: "AC doesn't respond to remote or power", icon: "PowerOff" },
  ],
  deviceQuestions: [
    { key: "ac_type", label: "AC Type", type: "select", options: [{ label: "Wall Mount / Split", value: "split" }, { label: "Cassette", value: "cassette" }, { label: "Window", value: "window" }, { label: "Portable", value: "portable" }, { label: "Not Sure", value: "not_sure" }], required: true },
    { key: "brand", label: "Brand", type: "select", options: [{ label: "Samsung", value: "samsung" }, { label: "LG", value: "lg" }, { label: "Daikin", value: "daikin" }, { label: "Mitsubishi", value: "mitsubishi" }, { label: "Panasonic", value: "panasonic" }, { label: "Haier", value: "haier" }, { label: "Midea", value: "midea" }, { label: "Singer", value: "singer" }, { label: "Other", value: "other" }], required: false },
    { key: "units", label: "Number of Units", type: "select", options: [{ label: "1 Unit", value: "1" }, { label: "2 Units", value: "2" }, { label: "3 Units", value: "3" }, { label: "4+ Units", value: "4_plus" }], required: true },
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop / Showroom", value: "shop" }], required: true },
    // Technical questions — shown only for relevant service types
    { key: "capacity", label: "Capacity (BTU)", type: "select", options: [{ label: "9,000 BTU", value: "9000" }, { label: "12,000 BTU", value: "12000" }, { label: "18,000 BTU", value: "18000" }, { label: "24,000 BTU", value: "24000" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["gas", "install", "deep_clean"] },
    { key: "refrigerant", label: "Refrigerant Type (if known)", type: "select", options: [{ label: "R-22", value: "r22" }, { label: "R-32", value: "r32" }, { label: "R-410A", value: "r410a" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["gas", "repair"] },
    // Installation-specific
    { key: "install_floor", label: "Installation Floor", type: "select", options: [{ label: "Ground Floor", value: "ground" }, { label: "1st Floor", value: "1st" }, { label: "2nd Floor", value: "2nd" }, { label: "3rd Floor+", value: "3rd_plus" }], required: true, showForServiceTypes: ["install", "relocation"] },
    { key: "piping_estimate", label: "Estimated piping distance", type: "select", options: [{ label: "Under 3 meters", value: "lt_3" }, { label: "3-5 meters", value: "3_5" }, { label: "Over 5 meters", value: "gt_5" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["install", "relocation"] },
  ],
  siteConditions: [
    { key: "emergency", label: "Is this an emergency?", type: "toggle" },
    { key: "high_rise", label: "High-rise building (above 3rd floor)?", type: "toggle" },
    { key: "roof_access", label: "Roof / outdoor unit accessible?", type: "toggle" },
    { key: "parking", label: "Parking available for service van?", type: "toggle" },
    { key: "ladder_needed", label: "Ladder required?", type: "toggle" },
  ],
  packages: [
    { id: "inspection", name: "Inspection Visit", description: "Technician inspects and diagnoses the issue", priceType: "fixed", price: 2500, features: ["On-site visit", "Full diagnosis", "Written report", "Deductible from repair cost"] },
    { id: "standard", name: "Standard Service", description: "Filter wash, gas check, general cleaning", priceType: "fixed", price: 4500, features: ["Indoor unit cleaning", "Filter wash", "Gas pressure check", "Performance test"], popular: true },
    { id: "deep_wash", name: "Deep Chemical Wash", description: "Complete chemical cleaning of indoor & outdoor units", priceType: "fixed", price: 7500, features: ["Chemical wash indoor", "Outdoor unit cleaning", "Coil cleaning", "Drain line flush", "Gas check"] },
    { id: "gas_refill", name: "Gas Refill", description: "Refrigerant recharge for optimal cooling", priceType: "starts_from", price: 3500, priceMax: 8000, features: ["Gas type assessment", "Leak check", "Recharge", "Performance test"] },
  ],
  quickServices: [
    { label: "AC Not Cooling", priceLabel: "Inspection LKR 2,500", serviceTypeId: "repair", pricingArchetype: "diagnostic_first" },
    { label: "AC Service & Clean", priceLabel: "From LKR 4,500", serviceTypeId: "service", pricingArchetype: "fixed_price" },
    { label: "Gas Refill", priceLabel: "From LKR 3,500", serviceTypeId: "gas", pricingArchetype: "diagnostic_first" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  photoUploadHint: "Upload a photo of your AC unit to help the technician prepare",
  cancellationNote: "Free cancellation within 10 minutes. Emergency bookings may require a commitment fee.",
  warrantyNote: "Service warranty on all eligible repairs and parts",
  pricingExplanation: "AC cleaning and standard services have Fixed Pricing. Repairs require a diagnostic visit first — the technician will provide a quote for your approval before starting any repair work.",
};

// ─── IT SUPPORT ──────────────────────────────────────────────
const IT_FLOW: V2CategoryFlow = {
  code: "IT",
  name: "IT Repairs & Support",
  flowType: "hybrid",
  bookingModel: "diagnostic_first",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Laptop & IT Repairs — Expert Help Fast",
  heroSubtext: "Screen replacement · Battery · SSD upgrade · Motherboard repair · Remote & on-site support",
  trustBadges: ["Verified Technician", "Data Safe", "Transparent Pricing", "Warranty Backed"],
  priceExample: "Laptop repairs from LKR 2,500",
  serviceTypes: [
    // ── Laptop Repairs ──
    { id: "laptop_screen", label: "Screen Replacement", description: "Cracked screen, flickering display, black screen, damaged LCD or LED panel", icon: "Monitor", group: "Laptop Repairs", priceLabel: "From LKR 8,000", tag: "Diagnostic Required", estimatedTime: "1–2 hours" },
    { id: "laptop_battery", label: "Battery Replacement", description: "Battery not charging, draining quickly, laptop shuts down without power", icon: "Battery", group: "Laptop Repairs", priceLabel: "From LKR 2,500", estimatedTime: "30–60 min" },
    { id: "laptop_storage", label: "HDD / SSD Replacement", description: "Hard drive failure, slow performance, upgrade from HDD to SSD", icon: "HardDrive", group: "Laptop Repairs", priceLabel: "From LKR 2,500", estimatedTime: "1–2 hours" },
    { id: "laptop_motherboard", label: "Motherboard Repair", description: "Laptop not powering on, charging issues, short circuit or component damage", icon: "Cpu", group: "Laptop Repairs", priceLabel: "From LKR 6,000", tag: "Diagnostic Required", estimatedTime: "2–5 days" },
    { id: "laptop_hinge", label: "Hinge Repair", description: "Broken hinges, loose screen frame, hinge stuck or laptop body crack", icon: "Wrench", group: "Laptop Repairs", priceLabel: "From LKR 3,500", estimatedTime: "1–3 hours" },
    { id: "laptop_keyboard", label: "Keyboard Replacement", description: "Keys not working, liquid damage, keyboard malfunction", icon: "Keyboard", group: "Laptop Repairs", priceLabel: "From LKR 2,500", estimatedTime: "1–2 hours" },
    { id: "laptop_overheating", label: "Overheating / Fan Repair", description: "Laptop overheating, loud fan noise, thermal shutdown, cooling issues", icon: "Thermometer", group: "Laptop Repairs", priceLabel: "From LKR 3,000", estimatedTime: "1–2 hours" },
    // ── Desktop Repairs ──
    { id: "desktop_power", label: "Not Powering On", description: "Desktop won't start, no display, power button unresponsive", icon: "PowerOff", group: "Desktop Repairs", priceLabel: "From LKR 2,500", tag: "Diagnostic Required" },
    { id: "desktop_motherboard", label: "Motherboard Repair", description: "Desktop motherboard failure, component damage, no POST", icon: "Cpu", group: "Desktop Repairs", priceLabel: "From LKR 5,000", tag: "Diagnostic Required" },
    { id: "desktop_ram", label: "RAM Upgrade / Replacement", description: "Add more RAM, replace faulty memory, fix blue screen errors", icon: "MemoryStick", group: "Desktop Repairs", priceLabel: "From LKR 2,500" },
    { id: "desktop_gpu", label: "GPU Troubleshooting", description: "No display, graphics artifacts, GPU fan not spinning", icon: "Monitor", group: "Desktop Repairs", priceLabel: "From LKR 3,000", tag: "Diagnostic Required" },
    { id: "desktop_psu", label: "Power Supply Replacement", description: "Random shutdowns, burning smell, PSU failure", icon: "Zap", group: "Desktop Repairs", priceLabel: "From LKR 3,500" },
    // ── Network & Other ──
    { id: "network", label: "Network / WiFi Issue", description: "WiFi, router, LAN or internet problems", icon: "Wifi", group: "Network & Other" },
    { id: "printer", label: "Printer / Scanner", description: "Setup, paper jam or print quality issues", icon: "Printer", group: "Network & Other", priceLabel: "Service LKR 2,500" },
    { id: "software", label: "Software Help", description: "OS install, virus removal, backup & recovery", icon: "Code", group: "Network & Other" },
    { id: "data_recovery", label: "Data Recovery", description: "Recover lost or deleted files from any device", icon: "HardDrive", group: "Network & Other", priceLabel: "From LKR 5,000", tag: "Diagnostic Required" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our IT specialist assess — takes less than 30 seconds", icon: "Stethoscope" },
  ],
  issueSelectors: [
    { id: "not_powering_on", label: "Not Powering On", description: "Device won't start or shows no display", icon: "PowerOff" },
    { id: "slow_performance", label: "Slow / Freezing", description: "System is slow, hangs or freezes frequently", icon: "Clock" },
    { id: "screen_damage", label: "Screen Damage", description: "Cracked, flickering or black screen", icon: "Monitor" },
    { id: "overheating", label: "Overheating", description: "Device gets very hot or shuts down from heat", icon: "Thermometer" },
    { id: "virus_malware", label: "Virus / Malware", description: "Suspicious popups, browser hijacked, ransomware", icon: "Bug" },
    { id: "hardware_upgrade", label: "Hardware Upgrade", description: "SSD, RAM, battery or other component upgrade", icon: "ArrowUpCircle" },
    { id: "connectivity", label: "Connectivity Issue", description: "WiFi, Bluetooth or network not working", icon: "Wifi" },
    { id: "other", label: "Other / Not Sure", description: "Something else — we'll diagnose it", icon: "HelpCircle" },
  ],
  deviceQuestions: [
    { key: "device_type", label: "Device Type", type: "select", options: [{ label: "Laptop", value: "laptop" }, { label: "Desktop", value: "desktop" }, { label: "Network Equipment", value: "network" }, { label: "Printer", value: "printer" }], required: true },
    { key: "brand", label: "Device Brand", type: "select", options: [{ label: "HP", value: "hp" }, { label: "Dell", value: "dell" }, { label: "Lenovo", value: "lenovo" }, { label: "ASUS", value: "asus" }, { label: "Acer", value: "acer" }, { label: "MSI", value: "msi" }, { label: "Apple MacBook", value: "apple" }, { label: "Other", value: "other" }], required: true, showForServiceTypes: ["laptop_screen", "laptop_battery", "laptop_storage", "laptop_motherboard", "laptop_hinge", "laptop_keyboard", "laptop_overheating", "desktop_power", "desktop_motherboard", "desktop_ram", "desktop_gpu", "desktop_psu"] },
    { key: "model", label: "Model (e.g. HP Pavilion 15)", type: "text", required: false, showForServiceTypes: ["laptop_screen", "laptop_battery", "laptop_storage", "laptop_motherboard", "laptop_hinge", "laptop_keyboard", "laptop_overheating", "desktop_power", "desktop_motherboard", "desktop_ram", "desktop_gpu", "desktop_psu"] },
    { key: "environment", label: "Where do you need support?", type: "select", options: [{ label: "Home", value: "home" }, { label: "Office", value: "office" }, { label: "Retail / Shop", value: "retail" }, { label: "School / Institute", value: "school" }], required: true },
    { key: "device_count", label: "Number of Devices", type: "select", options: [{ label: "1 Device", value: "1" }, { label: "2-5 Devices", value: "2_5" }, { label: "5+ Devices", value: "5_plus" }], required: false, showForServiceTypes: ["network", "software"] },
    // Network-specific
    { key: "router_brand", label: "Router Brand", type: "text", required: false, showForServiceTypes: ["network"] },
    { key: "internet_provider", label: "Internet Provider", type: "select", options: [{ label: "SLT Fiber", value: "slt" }, { label: "Dialog", value: "dialog" }, { label: "Mobitel", value: "mobitel" }, { label: "Hutch", value: "hutch" }, { label: "Other", value: "other" }], required: false, showForServiceTypes: ["network"] },
    // Remote support — minimal device info
    { key: "os_type", label: "Operating System", type: "select", options: [{ label: "Windows 10/11", value: "windows" }, { label: "macOS", value: "macos" }, { label: "Linux", value: "linux" }], required: true, showForServiceTypes: ["software"] },
  ],
  serviceModes: [
    { id: "onsite", label: "On-Site Visit", description: "Technician comes to your home or office", icon: "MapPin", details: ["Technician dispatched to you", "Full diagnosis on-site", "Same-day availability"] },
    { id: "pickup_return", label: "Pick-Up & Return", description: "We collect and deliver your device", icon: "Truck", extraFee: 500, details: ["Scheduled pickup slot", "Secure handling", "Device returned after repair"] },
    { id: "remote", label: "Remote Support", description: "Expert help via screen sharing — no visit needed", icon: "Monitor", skipLocation: true, details: ["Available time slots shown", "30-min session", "Lower cost than on-site"] },
    { id: "inspection", label: "Diagnostic Only", description: "Full inspection and written report — no obligation", icon: "Search", details: ["Written diagnosis report", "Repair quote provided", "Fee deducted if you proceed"] },
  ],
  packages: [
    { id: "diagnostic", name: "Diagnostic Visit", description: "Full inspection and written report", priceType: "fixed", price: 2500, features: ["On-site diagnosis", "Written report", "Repair quote", "Fee deducted from repair cost"] },
    { id: "remote", name: "Remote Support", description: "Expert help via remote access", priceType: "fixed", price: 2000, features: ["Screen sharing session", "30-min support", "Software fixes", "No visit needed"] },
    { id: "onsite_repair", name: "On-Site Repair", description: "Technician visits and repairs on the spot", priceType: "starts_from", price: 3500, features: ["Home/office visit", "Hardware & software check", "Parts quoted separately", "Warranty on labour"], popular: true },
    { id: "data_recovery", name: "Data Recovery", description: "Recover lost or deleted files", priceType: "inspection_required", price: 5000, priceMax: 15000, features: ["Drive assessment", "Recovery attempt", "Detailed report", "Quote before proceeding"] },
  ],
  quickServices: [
    { label: "Laptop Screen Replacement", priceLabel: "From LKR 8,000", serviceTypeId: "laptop_screen", pricingArchetype: "diagnostic_first" },
    { label: "Battery Replacement", priceLabel: "From LKR 2,500", serviceTypeId: "laptop_battery", pricingArchetype: "diagnostic_first" },
    { label: "SSD Upgrade", priceLabel: "From LKR 2,500", serviceTypeId: "laptop_storage", pricingArchetype: "diagnostic_first" },
    { label: "Keyboard Replacement", priceLabel: "From LKR 2,500", serviceTypeId: "laptop_keyboard", pricingArchetype: "diagnostic_first" },
    { label: "WiFi / Router Fix", priceLabel: "From LKR 2,000", serviceTypeId: "network", pricingArchetype: "fixed_price" },
    { label: "Virus Removal", priceLabel: "From LKR 2,000", serviceTypeId: "software", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  photoUploadHint: "Upload a photo of the issue to help the technician prepare",
  dataRiskDisclaimer: "By proceeding, you acknowledge that LankaFix and the assigned technician are not responsible for any data loss during the repair process. We strongly recommend backing up your data before handing over your device.",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "Software fixes: 7-day warranty. Hardware repairs: 30-day warranty on labour. Parts warranty depends on part grade.",
  pricingExplanation: "IT repairs use Starting From pricing. The base price covers diagnostic and labour. Parts are quoted separately based on your device model and availability. You will receive a detailed quote for approval before any repair work begins. Remote support sessions have fixed pricing.",
};

// ─── CCTV SOLUTIONS ──────────────────────────────────────────────
const CCTV_FLOW: V2CategoryFlow = {
  code: "CCTV",
  name: "CCTV Solutions",
  flowType: "inspection",
  bookingModel: "inspection_consultation",
  assignmentType: "site_inspection",
  pricingArchetype: "quote_required",
  heroTagline: "Professional CCTV Installation",
  heroSubtext: "Site inspection first · Residential & commercial packages",
  trustBadges: ["Verified Installer", "Installation Guaranteed", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Packages from LKR 15,000",
  serviceTypes: [
    { id: "new_install", label: "New Installation", description: "Complete CCTV system setup for your property", icon: "Camera" },
    { id: "upgrade", label: "System Upgrade", description: "Add cameras or upgrade DVR/NVR", icon: "ArrowUpCircle" },
    { id: "repair", label: "Repair Existing", description: "Fix camera, DVR or connectivity issues", icon: "Wrench" },
    { id: "inspection", label: "Site Inspection", description: "Professional security assessment of your property", icon: "Search" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Get expert advice on your security needs", icon: "Stethoscope" },
  ],
  deviceQuestions: [
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "Home", value: "home" }, { label: "Apartment", value: "apartment" }, { label: "Shop", value: "shop" }, { label: "Office", value: "office" }, { label: "Warehouse", value: "warehouse" }, { label: "Factory", value: "factory" }], required: true },
    { key: "camera_count", label: "Number of Cameras", type: "select", options: [{ label: "2 Cameras", value: "2" }, { label: "4 Cameras", value: "4" }, { label: "8 Cameras", value: "8" }, { label: "16+ Cameras", value: "16_plus" }, { label: "Not Sure", value: "not_sure" }], required: true },
    { key: "camera_type", label: "Camera Type Preference", type: "select", options: [{ label: "Bullet (wall/ceiling)", value: "bullet" }, { label: "Dome (indoor ceiling)", value: "dome" }, { label: "PTZ (pan-tilt-zoom)", value: "ptz" }, { label: "Mix / Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["new_install", "upgrade"] },
    { key: "coverage_area", label: "Coverage Area", type: "select", options: [{ label: "Entrance only", value: "entrance" }, { label: "Perimeter / Outdoor", value: "perimeter" }, { label: "Indoor common areas", value: "indoor" }, { label: "Full property (indoor + outdoor)", value: "full" }], required: true, showForServiceTypes: ["new_install", "upgrade", "inspection"] },
    { key: "indoor_outdoor", label: "Camera Location", type: "select", options: [{ label: "Indoor Only", value: "indoor" }, { label: "Outdoor Only", value: "outdoor" }, { label: "Both Indoor & Outdoor", value: "both" }], required: true },
    { key: "recorder_type", label: "Recorder Type", type: "select", options: [{ label: "DVR (Analog)", value: "dvr" }, { label: "NVR (IP/Network)", value: "nvr" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["repair", "upgrade"] },
    { key: "mobile_viewing", label: "Mobile viewing needed?", type: "toggle", required: true },
    { key: "night_vision", label: "Night vision needed?", type: "toggle", required: true },
    { key: "existing_system", label: "Existing CCTV system?", type: "toggle", required: true },
  ],
  siteConditions: [
    { key: "power_nearby", label: "Power outlet near installation points?", type: "toggle" },
    { key: "internet", label: "Internet connection available?", type: "toggle" },
    { key: "roof_access", label: "Roof access available?", type: "toggle" },
    { key: "ladder_needed", label: "Ladder required (high walls)?", type: "toggle" },
    { key: "multi_floor", label: "Multi-floor property?", type: "toggle" },
  ],
  packages: [
    { id: "site_visit", name: "Site Inspection", description: "Professional security assessment", priceType: "fixed", price: 3000, features: ["Property walkthrough", "Camera placement plan", "System recommendation", "Written quote", "Fee deducted from install"], commitmentFee: 3000 },
    { id: "starter", name: "Residential Starter", description: "2 cameras with 4-channel DVR", priceType: "starts_from", price: 25000, priceMax: 35000, features: ["2x HD cameras", "4-ch DVR", "500GB storage", "Mobile app setup", "Basic cabling"] },
    { id: "advanced", name: "Advanced Package", description: "4 cameras with 8-channel NVR", priceType: "starts_from", price: 45000, priceMax: 65000, features: ["4x Full HD cameras", "8-ch NVR", "1TB storage", "Night vision", "Remote access", "Professional cabling"], popular: true },
    { id: "commercial", name: "Commercial", description: "8+ cameras — inspection required", priceType: "inspection_required", price: 85000, priceMax: 150000, features: ["Custom camera count", "AI motion detection", "24/7 recording", "Professional installation", "Maintenance plan"] },
  ],
  quickServices: [
    { label: "CCTV Site Visit", priceLabel: "LKR 3,000", serviceTypeId: "inspection", pricingArchetype: "quote_required" },
    { label: "Camera Repair", priceLabel: "From LKR 5,000", serviceTypeId: "repair", pricingArchetype: "diagnostic_first" },
    { label: "4-Camera Package", priceLabel: "From LKR 45,000", serviceTypeId: "new_install", pricingArchetype: "quote_required" },
  ],
  requiresCommitmentFee: true,
  commitmentFeeAmount: 3000,
  commitmentFeeNote: "Site visit fee — fully deductible from your installation cost",
  photoUploadHint: "Upload photos of the property exterior to help plan camera placement",
  cancellationNote: "Free cancellation before site visit. Commitment fee applies after scheduling.",
  warrantyNote: "Installation warranty included. Equipment warranty per manufacturer terms.",
  pricingExplanation: "CCTV installations require a site inspection first. You'll receive a detailed quote after the inspection team visits your property. The inspection fee is fully deductible from your installation cost.",
};

// ─── CONSUMER ELECTRONICS ──────────────────────────────────────────────
const CONSUMER_ELEC_FLOW: V2CategoryFlow = {
  code: "CONSUMER_ELEC",
  name: "Consumer Electronics",
  flowType: "inspection",
  bookingModel: "diagnostic_first",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Appliance Not Working? We'll Fix It",
  heroSubtext: "TV, fridge, washing machine & more — diagnosis before repair",
  trustBadges: ["Verified Technician", "Transparent Pricing", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Inspection from LKR 1,500",
  serviceTypes: [
    { id: "tv", label: "TV Repair", description: "LED, LCD, Smart TV issues", icon: "Tv" },
    { id: "washing", label: "Washing Machine", description: "Not spinning, draining or leaking", icon: "Waves" },
    { id: "fridge", label: "Refrigerator", description: "Not cooling, ice buildup, noise", icon: "Refrigerator" },
    { id: "microwave", label: "Microwave", description: "Not heating, turntable, display issues", icon: "Microwave" },
    { id: "fan", label: "Fan / Ventilation", description: "Ceiling fan, exhaust fan repair", icon: "Fan" },
    { id: "other", label: "Other Appliance", description: "Iron, blender, other home appliances", icon: "Cog" },
  ],
  issueSelectors: [
    { id: "not_working", label: "Not Working At All", description: "Device won't turn on or respond", icon: "PowerOff" },
    { id: "partial", label: "Partially Working", description: "Some functions work, some don't", icon: "AlertTriangle" },
    { id: "noise", label: "Making Noise", description: "Unusual sounds during operation", icon: "Volume2" },
    { id: "leak", label: "Leaking", description: "Water or fluid leak", icon: "Droplets" },
    { id: "display", label: "Display Issue", description: "Screen problems, flickering, blank", icon: "Monitor" },
  ],
  deviceQuestions: [
    // Appliance-specific brand selectors
    { key: "brand", label: "Brand", type: "select", options: [{ label: "Samsung", value: "samsung" }, { label: "LG", value: "lg" }, { label: "Sony", value: "sony" }, { label: "Panasonic", value: "panasonic" }, { label: "Singer", value: "singer" }, { label: "Abans", value: "abans" }, { label: "Sisil", value: "sisil" }, { label: "Haier", value: "haier" }, { label: "Hisense", value: "hisense" }, { label: "Other", value: "other" }], required: true },
    { key: "model_number", label: "Model Number (check label on back)", type: "text", required: false },
    { key: "age", label: "Approximate Age", type: "select", options: [{ label: "Under 1 year", value: "lt_1y" }, { label: "1-3 years", value: "1_3y" }, { label: "3-5 years", value: "3_5y" }, { label: "Over 5 years", value: "gt_5y" }, { label: "Not Sure", value: "not_sure" }], required: false },
    // TV-specific
    { key: "tv_type", label: "TV Type", type: "select", options: [{ label: "LED / LCD", value: "led" }, { label: "OLED", value: "oled" }, { label: "Smart TV", value: "smart" }, { label: "Not Sure", value: "not_sure" }], required: true, showForServiceTypes: ["tv"] },
    { key: "tv_size", label: "Screen Size (approx.)", type: "select", options: [{ label: "32\" or smaller", value: "lt_32" }, { label: "40\"-50\"", value: "40_50" }, { label: "55\"-65\"", value: "55_65" }, { label: "75\" or larger", value: "gt_75" }], required: false, showForServiceTypes: ["tv"] },
    { key: "tv_issue", label: "What's the issue?", type: "select", options: [{ label: "No picture", value: "no_picture" }, { label: "No sound", value: "no_sound" }, { label: "Lines on screen", value: "lines" }, { label: "Cracked panel", value: "cracked" }, { label: "Smart features not working", value: "smart_issue" }, { label: "Not turning on", value: "no_power" }], required: true, showForServiceTypes: ["tv"] },
    // Fridge-specific
    { key: "fridge_type", label: "Refrigerator Type", type: "select", options: [{ label: "Single Door", value: "single" }, { label: "Double Door", value: "double" }, { label: "Side by Side", value: "side_by_side" }, { label: "Mini Fridge", value: "mini" }], required: true, showForServiceTypes: ["fridge"] },
    { key: "fridge_issue", label: "What's the issue?", type: "select", options: [{ label: "Not cooling", value: "not_cooling" }, { label: "Compressor noise", value: "compressor" }, { label: "Water leak", value: "leak" }, { label: "Not powering on", value: "no_power" }, { label: "Ice buildup", value: "ice" }, { label: "Door seal problem", value: "seal" }], required: true, showForServiceTypes: ["fridge"] },
    // Washing machine-specific
    { key: "washer_type", label: "Washing Machine Type", type: "select", options: [{ label: "Top Load", value: "top" }, { label: "Front Load", value: "front" }, { label: "Semi-Automatic", value: "semi" }], required: true, showForServiceTypes: ["washing"] },
    { key: "washer_issue", label: "What's the issue?", type: "select", options: [{ label: "Not spinning", value: "not_spinning" }, { label: "Not draining", value: "not_draining" }, { label: "Water leaking", value: "leaking" }, { label: "Excessive vibration", value: "vibration" }, { label: "Error code on display", value: "error_code" }, { label: "Not turning on", value: "no_power" }], required: true, showForServiceTypes: ["washing"] },
    // Microwave-specific
    { key: "microwave_issue", label: "What's the issue?", type: "select", options: [{ label: "Not heating", value: "not_heating" }, { label: "Not turning on", value: "no_power" }, { label: "Sparking inside", value: "sparking" }, { label: "Turntable not rotating", value: "turntable" }, { label: "Display/buttons not working", value: "display" }], required: true, showForServiceTypes: ["microwave"] },
    // Generic fallback
    { key: "issue_description", label: "Describe the problem", type: "text", required: true, showForServiceTypes: ["fan", "other"] },
  ],
  serviceModes: [
    { id: "onsite", label: "On-Site Inspection", description: "Technician visits your home to diagnose", icon: "MapPin", details: ["Home visit included", "Diagnosis on the spot", "Quote before repair"] },
    { id: "pickup_return", label: "Pick-Up & Return", description: "We collect, repair and return your appliance", icon: "Truck", extraFee: 1000, details: ["Scheduled pickup", "Workshop repair", "Returned after completion"] },
    { id: "inspection_only", label: "Inspection Only", description: "Get a detailed report without committing to repair", icon: "Search", details: ["Written diagnosis", "Photo documentation", "Repair vs replace recommendation"] },
  ],
  packages: [
    { id: "inspection", name: "On-Site Inspection", description: "Technician visits and diagnoses the issue", priceType: "fixed", price: 2500, features: ["Home visit", "Full diagnosis", "Repair estimate", "Fee deducted from repair"], popular: true },
    { id: "pickup", name: "Pick-up & Return", description: "We collect, repair and return your appliance", priceType: "starts_from", price: 3500, features: ["Free pickup", "Workshop repair", "Quality tested", "Free delivery back"] },
    { id: "inspection_only", name: "Inspection Only", description: "Detailed report without commitment", priceType: "fixed", price: 1500, features: ["Written report", "Photo documentation", "Repair/replace recommendation"] },
  ],
  quickServices: [
    { label: "TV Repair", priceLabel: "Inspection LKR 2,500", serviceTypeId: "tv", pricingArchetype: "diagnostic_first" },
    { label: "Washing Machine Fix", priceLabel: "Inspection LKR 2,500", serviceTypeId: "washing", pricingArchetype: "diagnostic_first" },
    { label: "Fridge Repair", priceLabel: "Inspection LKR 2,500", serviceTypeId: "fridge", pricingArchetype: "diagnostic_first" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  photoUploadHint: "Upload a photo or video of the appliance issue",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "Repair warranty provided after quote approval",
  pricingExplanation: "Appliance repairs use Diagnostic First pricing. A technician visits to inspect and diagnose the issue, then provides a detailed quote. No repair starts without your approval. Genuine and compatible parts options available.",
};

// ─── SOLAR SOLUTIONS ──────────────────────────────────────────────
const SOLAR_FLOW: V2CategoryFlow = {
  code: "SOLAR",
  name: "Solar Solutions",
  flowType: "inspection",
  bookingModel: "inspection_consultation",
  assignmentType: "site_inspection",
  pricingArchetype: "quote_required",
  heroTagline: "Cut Your Electricity Bill with Solar",
  heroSubtext: "Professional installation · CEB net-metering · Site inspection required",
  trustBadges: ["Verified Installer", "Installation Guaranteed", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Systems from LKR 250,000",
  serviceTypes: [
    { id: "new_install", label: "New Solar Install", description: "Complete solar PV system", icon: "Sun" },
    { id: "expand", label: "Expand System", description: "Add panels or battery to existing", icon: "PlusCircle" },
    { id: "maintenance", label: "Maintenance", description: "Panel cleaning, wiring check, audit", icon: "Settings" },
    { id: "troubleshoot", label: "Troubleshooting", description: "System not performing as expected", icon: "AlertTriangle" },
  ],
  deviceQuestions: [
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Office", value: "office" }, { label: "Factory", value: "factory" }, { label: "Warehouse", value: "warehouse" }], required: true },
    { key: "bill_range", label: "Monthly Electricity Bill", type: "select", options: [{ label: "Under LKR 10,000", value: "lt_10k" }, { label: "LKR 10,000 - 20,000", value: "10_20k" }, { label: "LKR 20,000 - 40,000", value: "20_40k" }, { label: "Over LKR 40,000", value: "gt_40k" }], required: true, showForServiceTypes: ["new_install", "expand"] },
    { key: "roof_type", label: "Roof Type", type: "select", options: [{ label: "Tile", value: "tile" }, { label: "Concrete Slab", value: "slab" }, { label: "Metal Sheet", value: "metal" }, { label: "Asbestos", value: "asbestos" }], required: true, showForServiceTypes: ["new_install", "expand"] },
    { key: "roof_condition", label: "Roof Condition", type: "select", options: [{ label: "Good — No leaks", value: "good" }, { label: "Minor repairs needed", value: "minor" }, { label: "Major repairs needed", value: "major" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["new_install"] },
    { key: "backup", label: "Battery backup needed?", type: "toggle", required: true, showForServiceTypes: ["new_install", "expand"] },
    { key: "existing_solar", label: "Existing solar system?", type: "toggle", required: true },
    // Troubleshoot/maintenance
    { key: "system_capacity", label: "System Capacity (kW)", type: "select", options: [{ label: "Under 3 kW", value: "lt_3" }, { label: "3-5 kW", value: "3_5" }, { label: "5-10 kW", value: "5_10" }, { label: "Over 10 kW", value: "gt_10" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["troubleshoot", "maintenance", "expand"] },
    { key: "inverter_brand", label: "Inverter Brand", type: "text", required: false, showForServiceTypes: ["troubleshoot", "maintenance"] },
    { key: "panel_count", label: "Number of Panels", type: "select", options: [{ label: "1-5", value: "1_5" }, { label: "6-10", value: "6_10" }, { label: "10+", value: "10_plus" }, { label: "Not Sure", value: "not_sure" }], required: false, showForServiceTypes: ["troubleshoot", "maintenance"] },
  ],
  siteConditions: [
    { key: "roof_type", label: "Roof Type", type: "select", options: [{ label: "Tile", value: "tile" }, { label: "Concrete Slab", value: "slab" }, { label: "Metal Sheet", value: "metal" }, { label: "Asbestos", value: "asbestos" }] },
    { key: "shading", label: "Shading Level", type: "select", options: [{ label: "No Shade", value: "none" }, { label: "Partial Shade", value: "partial" }, { label: "Heavy Shade", value: "heavy" }] },
    { key: "roof_photo", label: "Can you provide roof photos?", type: "toggle" },
  ],
  packages: [
    { id: "consultation", name: "Free Consultation", description: "Discuss your solar needs with an expert", priceType: "fixed", price: 0, features: ["Phone/video call", "Bill analysis", "System recommendation", "No obligation"] },
    { id: "site_inspection", name: "Site Inspection", description: "Professional roof and electrical assessment", priceType: "fixed", price: 5000, features: ["Roof assessment", "Shading analysis", "Electrical check", "System design", "Detailed quote"], commitmentFee: 5000, popular: true },
    { id: "maintenance_pkg", name: "Maintenance Package", description: "Annual solar panel maintenance", priceType: "fixed", price: 8000, features: ["Panel cleaning", "Wiring inspection", "Inverter check", "Performance report"] },
  ],
  quickServices: [
    { label: "Solar Consultation", priceLabel: "Free", serviceTypeId: "new_install", pricingArchetype: "quote_required" },
    { label: "Site Inspection", priceLabel: "LKR 5,000", serviceTypeId: "new_install", pricingArchetype: "quote_required" },
    { label: "Panel Maintenance", priceLabel: "From LKR 8,000", serviceTypeId: "maintenance", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: true,
  commitmentFeeAmount: 5000,
  commitmentFeeNote: "Deductible from your installation cost",
  photoUploadHint: "Upload photos of your roof and electrical meter board",
  cancellationNote: "Free cancellation before site visit",
  warrantyNote: "Installation warranty included. Panel warranty per manufacturer.",
  pricingExplanation: "Solar installations require a site inspection. After our team visits, you'll receive a detailed quote with system specifications, expected savings, and installation timeline. The inspection fee is deductible.",
};

// ─── SMART HOME & OFFICE ──────────────────────────────────────────────
const SMART_HOME_FLOW: V2CategoryFlow = {
  code: "SMART_HOME_OFFICE",
  name: "Smart Home & Office",
  flowType: "inspection",
  bookingModel: "inspection_consultation",
  assignmentType: "site_inspection",
  pricingArchetype: "quote_required",
  heroTagline: "Make Your Space Smarter",
  heroSubtext: "Smart locks, automation, energy monitoring — consultation first",
  trustBadges: ["Verified Technician", "Installation Guaranteed", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Packages from LKR 15,000",
  serviceTypes: [
    { id: "security", label: "Security", description: "Smart locks, alarms, access control", icon: "Shield" },
    { id: "automation", label: "Automation", description: "Smart lighting, scenes, voice control", icon: "Lightbulb" },
    { id: "energy", label: "Energy Monitoring", description: "Track and reduce consumption", icon: "Gauge" },
    { id: "office", label: "Office Automation", description: "Meeting rooms, access, networking", icon: "Building" },
  ],
  deviceQuestions: [
    { key: "environment", label: "Environment", type: "select", options: [{ label: "Home", value: "home" }, { label: "SME Office", value: "sme" }, { label: "Retail", value: "retail" }, { label: "Warehouse", value: "warehouse" }], required: true },
    { key: "goals", label: "Primary Goal", type: "select", options: [{ label: "Security & Access Control", value: "security" }, { label: "Energy Savings", value: "energy" }, { label: "Convenience / Automation", value: "convenience" }, { label: "Complete Smart Setup", value: "full" }], required: true },
    { key: "requirements", label: "What do you need?", type: "select", options: [{ label: "Smart Lighting", value: "lighting" }, { label: "Access Control", value: "access" }, { label: "Smart Locks", value: "locks" }, { label: "Energy Monitoring", value: "energy" }, { label: "Full Package", value: "full" }], required: true },
    { key: "existing_smart_devices", label: "Any existing smart devices?", type: "select", options: [{ label: "None", value: "none" }, { label: "Smart speakers (Alexa/Google)", value: "speakers" }, { label: "Smart lights", value: "lights" }, { label: "Multiple devices", value: "multiple" }], required: false },
    { key: "wifi_quality", label: "WiFi coverage quality", type: "select", options: [{ label: "Good everywhere", value: "good" }, { label: "Weak in some areas", value: "weak" }, { label: "No WiFi", value: "none" }, { label: "Not Sure", value: "not_sure" }], required: true },
  ],
  siteConditions: [
    { key: "solar_available", label: "Solar power available?", type: "toggle" },
    { key: "backup_required", label: "Battery backup required?", type: "toggle" },
    { key: "multi_floor", label: "Multi-floor property?", type: "toggle" },
  ],
  packages: [
    { id: "consultation", name: "Free Consultation", description: "Discuss your automation needs", priceType: "fixed", price: 0, features: ["Phone/video call", "Needs assessment", "System recommendation", "No obligation"] },
    { id: "starter", name: "Smart Starter", description: "Basic smart home automation", priceType: "starts_from", price: 15000, priceMax: 25000, features: ["Smart hub", "2 smart bulbs", "1 smart plug", "App setup", "Voice control"] },
    { id: "secure", name: "Smart Secure", description: "Smart home security package", priceType: "starts_from", price: 35000, priceMax: 55000, features: ["Smart lock", "Door sensor", "Motion sensor", "Smart camera", "App alerts"], popular: true },
    { id: "office_pro", name: "Smart Office Pro", description: "Complete office automation", priceType: "starts_from", price: 75000, priceMax: 120000, features: ["Access control", "Meeting room booking", "Energy monitoring", "Smart lighting", "Network setup"] },
  ],
  quickServices: [
    { label: "Smart Lock Install", priceLabel: "From LKR 15,000", serviceTypeId: "security", pricingArchetype: "quote_required" },
    { label: "Smart Lighting", priceLabel: "From LKR 10,000", serviceTypeId: "automation", pricingArchetype: "quote_required" },
  ],
  requiresCommitmentFee: true,
  commitmentFeeAmount: 3000,
  commitmentFeeNote: "Deductible from your project cost",
  photoUploadHint: "Upload photos of the areas you want to automate",
  cancellationNote: "Free cancellation before consultation",
  warrantyNote: "Installation warranty included. Equipment warranty per manufacturer.",
  pricingExplanation: "Smart Home & Office projects require a consultation first. After understanding your needs, we provide a detailed quote with equipment, installation, and configuration costs.",
};

// ─── COPIER REPAIRS ──────────────────────────────────────────────
const COPIER_FLOW: V2CategoryFlow = {
  code: "COPIER",
  name: "Printer & Copier Repairs",
  flowType: "hybrid",
  bookingModel: "diagnostic_first",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Printer or Copier Not Working?",
  heroSubtext: "Laser, inkjet, dot matrix & thermal — all brands serviced",
  trustBadges: ["Verified Technician", "Transparent Pricing", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Inspection from LKR 2,500",
  serviceTypes: [
    { id: "paper_jam", label: "Paper Jam / Feed Issue", description: "Paper jamming, misfeeding, or multi-feed problems", icon: "FileText", group: "Common Issues", priceLabel: "Inspection LKR 2,500" },
    { id: "print_quality", label: "Print Quality Issue", description: "Faded prints, streaks, smudges, or blank pages", icon: "Printer", group: "Common Issues", priceLabel: "Inspection LKR 2,500" },
    { id: "not_printing", label: "Not Printing", description: "Printer not responding, error lights, offline status", icon: "AlertTriangle", group: "Common Issues", priceLabel: "Inspection LKR 2,500" },
    { id: "wifi_setup", label: "WiFi / Network Setup", description: "Wireless printing setup, network configuration", icon: "Wifi", group: "Setup & Config", priceLabel: "LKR 2,000" },
    { id: "installation", label: "New Printer Setup", description: "Unbox, install drivers, configure and test new printer", icon: "PlusCircle", group: "Setup & Config", priceLabel: "LKR 2,500" },
    { id: "toner_drum", label: "Toner / Drum Replacement", description: "Replace toner cartridge, drum unit, or fuser", icon: "Package", group: "Parts & Maintenance", priceLabel: "Parts quoted separately" },
    { id: "roller_service", label: "Roller / Maintenance Kit", description: "Replace pickup rollers, separation pads, fuser kit", icon: "Settings", group: "Parts & Maintenance", priceLabel: "Parts quoted separately" },
    { id: "copier_service", label: "Copier Full Service", description: "Full cleaning, calibration, and maintenance of copier", icon: "Wrench", group: "Parts & Maintenance", priceLabel: "From LKR 5,000" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our technician diagnose — takes less than 30 seconds", icon: "Stethoscope" },
  ],
  deviceQuestions: [
    { key: "printer_type", label: "Printer Type", type: "select", options: [{ label: "Laser Printer", value: "laser" }, { label: "Ink Tank / Inkjet", value: "inkjet" }, { label: "Dot Matrix", value: "dot_matrix" }, { label: "Thermal Printer", value: "thermal" }, { label: "Copier / MFP", value: "copier" }, { label: "Large Format / Plotter", value: "large_format" }, { label: "Not Sure", value: "not_sure" }], required: true },
    { key: "brand", label: "Brand", type: "select", options: [{ label: "HP", value: "hp" }, { label: "Canon", value: "canon" }, { label: "Epson", value: "epson" }, { label: "Brother", value: "brother" }, { label: "Ricoh", value: "ricoh" }, { label: "Kyocera", value: "kyocera" }, { label: "Samsung", value: "samsung" }, { label: "Xerox", value: "xerox" }, { label: "Other", value: "other" }], required: true },
    { key: "model", label: "Model Number", type: "text", required: false },
    { key: "connectivity", label: "Connection Type", type: "select", options: [{ label: "USB", value: "usb" }, { label: "WiFi", value: "wifi" }, { label: "Ethernet", value: "ethernet" }, { label: "Not Sure", value: "not_sure" }], required: false },
    { key: "environment", label: "Location", type: "select", options: [{ label: "Home", value: "home" }, { label: "Office", value: "office" }, { label: "Retail / Shop", value: "retail" }], required: true },
  ],
  serviceModes: [
    { id: "onsite", label: "On-Site Visit", description: "Technician comes to your location", icon: "MapPin", details: ["Diagnosis on-site", "Same-day availability", "Parts quoted separately"] },
    { id: "pickup_return", label: "Pick-Up & Return", description: "We collect, repair and return your printer", icon: "Truck", extraFee: 500, details: ["Scheduled pickup", "Workshop repair", "Returned after completion"] },
  ],
  packages: [
    { id: "diagnostic", name: "Diagnostic Visit", description: "Technician inspects and diagnoses the issue", priceType: "fixed", price: 2500, features: ["On-site inspection", "Written diagnosis", "Parts quote", "Fee deducted from repair"] },
    { id: "setup", name: "Printer Setup", description: "New printer installation and configuration", priceType: "fixed", price: 2500, features: ["Unbox & assemble", "Driver installation", "Network setup", "Test print"] },
    { id: "service", name: "Full Service", description: "Complete printer cleaning and maintenance", priceType: "starts_from", price: 4000, priceMax: 8000, features: ["Internal cleaning", "Roller check", "Calibration", "Test print"], popular: true },
    { id: "major_repair", name: "Major Repair", description: "Fuser, board, or motor replacement", priceType: "starts_from", price: 5000, priceMax: 15000, features: ["Full diagnosis", "Parts sourced", "Repair & testing", "Warranty on parts"] },
  ],
  quickServices: [
    { label: "Paper Jam Fix", priceLabel: "Inspection LKR 2,500", serviceTypeId: "paper_jam", pricingArchetype: "diagnostic_first" },
    { label: "Print Quality Fix", priceLabel: "Inspection LKR 2,500", serviceTypeId: "print_quality", pricingArchetype: "diagnostic_first" },
    { label: "New Printer Setup", priceLabel: "LKR 2,500", serviceTypeId: "installation", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  photoUploadHint: "Upload a photo of the printer and the error display if visible",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "90-day warranty on repairs. Parts warranty depends on component.",
  pricingExplanation: "Printer repairs use Diagnostic First pricing. The technician inspects the device, then provides a detailed parts and labor quote for your approval. No work begins without your consent.",
};

// ─── PRINT SUPPLIES ──────────────────────────────────────────────
const PRINT_SUPPLIES_FLOW: V2CategoryFlow = {
  code: "PRINT_SUPPLIES",
  name: "Printing Supplies",
  flowType: "fast_book",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "fixed_price",
  heroTagline: "Toner & Ink Delivered Fast",
  heroSubtext: "Genuine, compatible & refilled cartridges for all major brands",
  trustBadges: ["Genuine Products", "Fast Delivery", "Compatible Options", "LankaFix Approved"],
  priceExample: "Cartridges from LKR 2,500",
  serviceTypes: [
    { id: "toner_order", label: "Toner Cartridge", description: "Laser printer toner — genuine & compatible options", icon: "Package", priceLabel: "From LKR 3,500" },
    { id: "ink_order", label: "Ink Cartridge / Bottles", description: "Inkjet and ink tank refills", icon: "Droplets", priceLabel: "From LKR 1,500" },
    { id: "drum_unit", label: "Drum Unit", description: "Replacement drum for laser printers", icon: "Circle", priceLabel: "From LKR 4,000" },
    { id: "ribbon", label: "Dot Matrix Ribbon", description: "Printer ribbon for dot matrix machines", icon: "FileText", priceLabel: "From LKR 800" },
    { id: "thermal_roll", label: "Thermal Paper Rolls", description: "Thermal receipt and label rolls", icon: "Receipt", priceLabel: "From LKR 250/roll" },
    { id: "maintenance_kit", label: "Maintenance Kit", description: "Fuser, rollers, and maintenance parts", icon: "Settings", priceLabel: "From LKR 8,000" },
  ],
  deviceQuestions: [
    { key: "printer_brand", label: "Printer Brand", type: "select", options: [{ label: "HP", value: "hp" }, { label: "Canon", value: "canon" }, { label: "Epson", value: "epson" }, { label: "Brother", value: "brother" }, { label: "Ricoh", value: "ricoh" }, { label: "Kyocera", value: "kyocera" }, { label: "Samsung", value: "samsung" }, { label: "Other", value: "other" }], required: true },
    { key: "printer_model", label: "Printer Model Number", type: "text", required: true },
    { key: "quantity", label: "Quantity", type: "select", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3-5", value: "3_5" }, { label: "5+", value: "5_plus" }], required: true },
    { key: "quality_preference", label: "Quality Preference", type: "select", options: [{ label: "Genuine / Original", value: "genuine" }, { label: "Compatible / OEM", value: "compatible" }, { label: "Refilled", value: "refilled" }, { label: "Best value option", value: "best_value" }], required: true },
  ],
  packages: [
    { id: "delivery", name: "Supply Delivery", description: "Cartridge/toner delivered to your location", priceType: "starts_from", price: 2500, features: ["Delivery included", "Correct model confirmed", "Installation help available"], popular: true },
    { id: "install_included", name: "Delivery + Installation", description: "Supply delivered and installed by technician", priceType: "starts_from", price: 3500, features: ["Delivery included", "Technician installs", "Test print", "Old cartridge disposed"] },
  ],
  quickServices: [
    { label: "Toner Cartridge", priceLabel: "From LKR 3,500", serviceTypeId: "toner_order", pricingArchetype: "fixed_price" },
    { label: "Ink Refill", priceLabel: "From LKR 1,500", serviceTypeId: "ink_order", pricingArchetype: "fixed_price" },
    { label: "Thermal Paper", priceLabel: "From LKR 250/roll", serviceTypeId: "thermal_roll", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation before dispatch",
  warrantyNote: "Genuine products include manufacturer warranty. Compatible supplies include 30-day replacement guarantee.",
  pricingExplanation: "Printing supplies have fixed pricing based on your printer model and the quality tier you choose (genuine, compatible, or refilled). Prices are confirmed before order placement.",
};

// ─── ELECTRICAL SERVICES ──────────────────────────────────────
const ELECTRICAL_FLOW: V2CategoryFlow = {
  code: "ELECTRICAL",
  name: "Electrical Services",
  flowType: "hybrid",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Expert Electricians — Fast & Safe",
  heroSubtext: "Socket repairs · Wiring · Fan install · Surge protection · Emergency service",
  trustBadges: ["Licensed Electrician", "Safety Certified", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Services from LKR 1,500",
  serviceTypes: [
    { id: "socket", label: "Socket Repair", description: "Fix faulty, sparking, or dead power sockets", icon: "Plug", priceLabel: "From LKR 1,500" },
    { id: "circuit_breaker", label: "Circuit Breaker Trip", description: "Diagnose and fix tripping breakers", icon: "Zap", priceLabel: "From LKR 2,000", tag: "Emergency" },
    { id: "rewiring", label: "House Rewiring", description: "Full or partial rewiring for safety", icon: "Cable", priceLabel: "Quote Required", tag: "Inspection" },
    { id: "lighting", label: "Lighting Installation", description: "Ceiling lights, spotlights, chandeliers, LED strips", icon: "Lightbulb", priceLabel: "From LKR 2,000" },
    { id: "fan", label: "Ceiling Fan Install", description: "Install or replace ceiling fans", icon: "Fan", priceLabel: "From LKR 2,500" },
    { id: "surge", label: "Surge Protection", description: "Protect home & appliances from power surges", icon: "ShieldCheck", priceLabel: "From LKR 3,500" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our electrician diagnose your issue", icon: "Stethoscope" },
  ],
  deviceQuestions: [
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop", value: "shop" }], required: true },
    { key: "floor_count", label: "Number of Floors", type: "select", options: [{ label: "Single storey", value: "1" }, { label: "2 floors", value: "2" }, { label: "3+ floors", value: "3_plus" }], required: false },
  ],
  siteConditions: [
    { key: "emergency", label: "Is this an emergency?", type: "toggle" },
    { key: "power_off", label: "Is the power currently off?", type: "toggle" },
    { key: "main_panel_accessible", label: "Main panel accessible?", type: "toggle" },
  ],
  packages: [
    { id: "inspection", name: "Electrical Inspection", description: "Full safety inspection of wiring and panels", priceType: "fixed", price: 2000, features: ["Full wiring check", "Safety report", "Recommendations"] },
    { id: "socket_fix", name: "Socket Repair", description: "Fix up to 3 faulty sockets", priceType: "fixed", price: 1500, features: ["Socket replacement", "Wiring check", "Safety test"], popular: true },
    { id: "lighting_pack", name: "Lighting Package", description: "Install up to 4 light fixtures", priceType: "starts_from", price: 3500, features: ["Up to 4 fixtures", "Wiring included", "Dimmer optional"] },
  ],
  quickServices: [
    { label: "Socket Repair", priceLabel: "From LKR 1,500", serviceTypeId: "socket", pricingArchetype: "fixed_price" },
    { label: "Circuit Breaker Fix", priceLabel: "From LKR 2,000", serviceTypeId: "circuit_breaker", pricingArchetype: "diagnostic_first" },
    { label: "Fan Installation", priceLabel: "From LKR 2,500", serviceTypeId: "fan", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "All electrical work includes safety certification and 90-day warranty",
  pricingExplanation: "Simple repairs have fixed pricing. Complex jobs like rewiring require an inspection visit first — the electrician provides a detailed quote for approval before starting work.",
};

// ─── PLUMBING SERVICES ──────────────────────────────────────
const PLUMBING_FLOW: V2CategoryFlow = {
  code: "PLUMBING",
  name: "Plumbing Services",
  flowType: "hybrid",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Plumbing Problems? Fixed Fast",
  heroSubtext: "Leaks · Pipe repairs · Water pumps · Bathroom & kitchen plumbing",
  trustBadges: ["Licensed Plumber", "Emergency Available", "Warranty Backed", "Transparent Pricing"],
  priceExample: "Services from LKR 1,500",
  serviceTypes: [
    { id: "leak", label: "Pipe Leak Repair", description: "Fix leaking pipes, joints, and fittings", icon: "Droplets", priceLabel: "From LKR 1,500", tag: "Emergency" },
    { id: "pump", label: "Water Pump", description: "Install or repair water pumps", icon: "Activity", priceLabel: "From LKR 3,000" },
    { id: "tank", label: "Water Tank", description: "Tank installation, repair, or cleaning", icon: "Container", priceLabel: "Quote Required", tag: "Inspection" },
    { id: "bathroom", label: "Bathroom Plumbing", description: "Toilet, shower, basin, drainage issues", icon: "Bath", priceLabel: "From LKR 2,000" },
    { id: "kitchen", label: "Kitchen Plumbing", description: "Sink repairs, mixer taps, drainage", icon: "CookingPot", priceLabel: "From LKR 2,000" },
    { id: "hot_water", label: "Hot Water System", description: "Install or repair hot water heaters", icon: "Flame", priceLabel: "From LKR 8,000", tag: "Inspection" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our plumber assess your issue", icon: "Stethoscope" },
  ],
  deviceQuestions: [
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop", value: "shop" }], required: true },
  ],
  siteConditions: [
    { key: "emergency", label: "Is this an emergency?", type: "toggle" },
    { key: "water_supply_off", label: "Can you turn off the main water supply?", type: "toggle" },
    { key: "flooding", label: "Is there active flooding?", type: "toggle" },
  ],
  packages: [
    { id: "basic_fix", name: "Basic Plumbing Fix", description: "Fix a single leak or tap issue", priceType: "fixed", price: 1500, features: ["Single issue fix", "Parts included if minor", "Same-day service"], popular: true },
    { id: "bathroom_pack", name: "Bathroom Overhaul", description: "Full bathroom plumbing check and repairs", priceType: "starts_from", price: 5000, features: ["All fixtures checked", "Drainage cleared", "Leak repairs"] },
    { id: "pump_install", name: "Pump Installation", description: "Install new water pump with wiring", priceType: "starts_from", price: 5000, features: ["Pump installation", "Piping connection", "Pressure test"] },
  ],
  quickServices: [
    { label: "Pipe Leak Repair", priceLabel: "From LKR 1,500", serviceTypeId: "leak", pricingArchetype: "diagnostic_first" },
    { label: "Bathroom Fix", priceLabel: "From LKR 2,000", serviceTypeId: "bathroom", pricingArchetype: "diagnostic_first" },
    { label: "Water Pump", priceLabel: "From LKR 3,000", serviceTypeId: "pump", pricingArchetype: "diagnostic_first" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "All plumbing work includes 90-day warranty on workmanship",
  pricingExplanation: "Minor plumbing repairs are priced from a base rate. Complex jobs like hot water installation or tank work require an inspection visit first with a detailed quote for approval.",
};

// ─── NETWORK SERVICES ──────────────────────────────────────
const NETWORK_FLOW: V2CategoryFlow = {
  code: "NETWORK",
  name: "Internet & Network",
  flowType: "hybrid",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "WiFi Slow? Network Down? Fixed Fast",
  heroSubtext: "Router setup · Mesh WiFi · Office LAN · Internet troubleshooting",
  trustBadges: ["Certified Technician", "Remote Support", "Same Day", "Transparent Pricing"],
  priceExample: "Services from LKR 2,000",
  availabilityLabel: "Same Day · Remote Available",
  serviceTypes: [
    { id: "wifi_setup", label: "WiFi Router Setup", description: "New router configuration and optimization", icon: "Wifi", priceLabel: "From LKR 2,000" },
    { id: "mesh", label: "Mesh Network Setup", description: "Whole-home WiFi coverage with mesh system", icon: "Globe", priceLabel: "From LKR 5,000" },
    { id: "office_lan", label: "Office LAN Setup", description: "Ethernet cabling and switch configuration", icon: "Network", priceLabel: "Quote Required", tag: "Inspection" },
    { id: "troubleshoot", label: "Internet Troubleshoot", description: "Fix slow internet, disconnections, DNS issues", icon: "WifiOff", priceLabel: "From LKR 2,000", tag: "Remote" },
    { id: "cabling", label: "Structured Cabling", description: "Professional Cat6/Cat6A cabling for offices", icon: "Cable", priceLabel: "Quote Required", tag: "Inspection" },
    { id: "speed", label: "Speed Optimization", description: "Optimize network for maximum performance", icon: "Gauge", priceLabel: "From LKR 2,000" },
  ],
  deviceQuestions: [
    { key: "isp", label: "Internet Provider", type: "select", options: [{ label: "SLT/Mobitel", value: "slt" }, { label: "Dialog", value: "dialog" }, { label: "Hutch", value: "hutch" }, { label: "Airtel", value: "airtel" }, { label: "Other", value: "other" }], required: true },
    { key: "connection_type", label: "Connection Type", type: "select", options: [{ label: "Fiber", value: "fiber" }, { label: "4G/5G Router", value: "4g" }, { label: "ADSL", value: "adsl" }, { label: "Not sure", value: "unknown" }], required: false },
    { key: "device_count", label: "Devices to connect", type: "select", options: [{ label: "1-5", value: "1_5" }, { label: "5-10", value: "5_10" }, { label: "10-20", value: "10_20" }, { label: "20+", value: "20_plus" }], required: false },
  ],
  packages: [
    { id: "router_setup", name: "Router Setup", description: "Configure router with optimal settings", priceType: "fixed", price: 2000, features: ["Router configuration", "WiFi optimization", "Device connection", "Speed test"], popular: true },
    { id: "mesh_setup", name: "Mesh WiFi Package", description: "Install and configure mesh network", priceType: "starts_from", price: 5000, features: ["Mesh device setup", "Optimal placement", "All devices connected", "Speed test"] },
    { id: "office_network", name: "Office Network", description: "Full office LAN and WiFi setup", priceType: "inspection_required", price: 8000, features: ["Site survey", "Cabling plan", "Switch config", "WiFi access points"] },
  ],
  quickServices: [
    { label: "WiFi Setup", priceLabel: "From LKR 2,000", serviceTypeId: "wifi_setup", pricingArchetype: "fixed_price" },
    { label: "Internet Fix", priceLabel: "From LKR 2,000", serviceTypeId: "troubleshoot", pricingArchetype: "diagnostic_first" },
    { label: "Mesh Network", priceLabel: "From LKR 5,000", serviceTypeId: "mesh", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation within 10 minutes. Remote sessions can be rescheduled.",
  warrantyNote: "Network setup includes 30-day support for configuration issues",
  pricingExplanation: "Router setup and basic troubleshooting have fixed pricing. Office LAN and structured cabling require a site survey with a detailed quote before work begins.",
};

// ─── HOME SECURITY ──────────────────────────────────────
const HOME_SECURITY_FLOW: V2CategoryFlow = {
  code: "HOME_SECURITY",
  name: "Home Security Systems",
  flowType: "inspection",
  bookingModel: "inspection_consultation",
  assignmentType: "site_inspection",
  pricingArchetype: "quote_required",
  heroTagline: "Protect Your Home — Smart Security",
  heroSubtext: "Video doorbells · Smart locks · Alarm systems · Gate automation",
  trustBadges: ["Verified Installer", "Warranty Backed", "App Integration", "LankaFix Approved"],
  priceExample: "Installations from LKR 5,000",
  serviceTypes: [
    { id: "doorbell", label: "Video Doorbell", description: "Install and configure video doorbell", icon: "Bell", priceLabel: "From LKR 5,000" },
    { id: "smart_lock", label: "Smart Door Lock", description: "Digital/biometric lock installation", icon: "Lock", priceLabel: "From LKR 8,000" },
    { id: "alarm", label: "Alarm System", description: "Burglar alarm with sensors and app", icon: "Siren", priceLabel: "Quote Required", tag: "Inspection" },
    { id: "intercom", label: "Intercom System", description: "Audio/video intercom installation", icon: "Phone", priceLabel: "From LKR 10,000", tag: "Inspection" },
    { id: "gate", label: "Gate Automation", description: "Automate sliding or swing gates", icon: "DoorOpen", priceLabel: "Quote Required", tag: "Inspection" },
  ],
  deviceQuestions: [
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop", value: "shop" }], required: true },
    { key: "entry_points", label: "Entry Points to Secure", type: "select", options: [{ label: "1-2", value: "1_2" }, { label: "3-4", value: "3_4" }, { label: "5+", value: "5_plus" }], required: false },
  ],
  packages: [
    { id: "inspection", name: "Security Assessment", description: "Professional security survey of your property", priceType: "fixed", price: 3000, features: ["Property assessment", "Vulnerability report", "Equipment recommendations", "Fee deducted from project"], commitmentFee: 3000 },
    { id: "basic_security", name: "Basic Security Package", description: "Video doorbell + smart lock", priceType: "starts_from", price: 15000, features: ["Video doorbell", "Smart lock", "App setup", "Installation included"], popular: true },
    { id: "full_security", name: "Full Home Security", description: "Complete security system with monitoring", priceType: "inspection_required", price: 50000, features: ["CCTV cameras", "Alarm system", "Smart locks", "Gate automation", "App integration"] },
  ],
  quickServices: [
    { label: "Video Doorbell", priceLabel: "From LKR 5,000", serviceTypeId: "doorbell", pricingArchetype: "fixed_price" },
    { label: "Smart Lock", priceLabel: "From LKR 8,000", serviceTypeId: "smart_lock", pricingArchetype: "quote_required" },
    { label: "Gate Automation", priceLabel: "Quote Required", serviceTypeId: "gate", pricingArchetype: "quote_required" },
  ],
  requiresCommitmentFee: true,
  commitmentFeeAmount: 3000,
  commitmentFeeNote: "Deductible from the final project cost",
  cancellationNote: "Free cancellation before site inspection. Commitment fee is non-refundable after inspection.",
  warrantyNote: "All installations include 12-month warranty on workmanship and equipment",
  pricingExplanation: "Security installations require a site assessment to determine the right equipment and configuration. The assessment fee is deducted from your final project cost.",
};

// ─── POWER BACKUP ──────────────────────────────────────
const POWER_BACKUP_FLOW: V2CategoryFlow = {
  code: "POWER_BACKUP",
  name: "Power Backup Solutions",
  flowType: "hybrid",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "Never Lose Power Again",
  heroSubtext: "UPS · Inverters · Generators · Solar battery · Battery replacement",
  trustBadges: ["Verified Technician", "Emergency Available", "Warranty Backed", "LankaFix Approved"],
  priceExample: "Services from LKR 3,000",
  serviceTypes: [
    { id: "ups", label: "UPS Installation", description: "Install UPS for computers, home or office", icon: "BatteryCharging", priceLabel: "From LKR 3,000" },
    { id: "inverter", label: "Inverter Setup", description: "Home or office power inverter installation", icon: "Zap", priceLabel: "From LKR 8,000", tag: "Inspection" },
    { id: "generator", label: "Generator Install", description: "Portable or standby generator setup", icon: "Power", priceLabel: "Quote Required", tag: "Inspection" },
    { id: "battery", label: "Battery Replacement", description: "Replace UPS, inverter, or solar batteries", icon: "Battery", priceLabel: "From LKR 3,500" },
    { id: "solar_battery", label: "Solar Battery Backup", description: "Add battery storage to solar system", icon: "Sun", priceLabel: "Quote Required", tag: "Inspection" },
  ],
  deviceQuestions: [
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop/Commercial", value: "commercial" }], required: true },
    { key: "power_need", label: "What needs backup?", type: "select", options: [{ label: "Computer/IT only", value: "it" }, { label: "Lights & fans", value: "basic" }, { label: "Full house", value: "full" }, { label: "Office/Server", value: "server" }], required: true },
  ],
  packages: [
    { id: "ups_basic", name: "Desktop UPS", description: "UPS for single PC or workstation", priceType: "starts_from", price: 3000, features: ["UPS installation", "Battery test", "Surge protection", "Warranty included"], popular: true },
    { id: "home_backup", name: "Home Power Backup", description: "Inverter system for lights and fans", priceType: "starts_from", price: 15000, features: ["Inverter installation", "Battery setup", "Wiring to selected circuits", "Auto-switchover"] },
    { id: "commercial", name: "Commercial Backup", description: "Generator or large-scale UPS solution", priceType: "inspection_required", price: 50000, features: ["Site assessment", "Load calculation", "Equipment sourcing", "Installation & testing"] },
  ],
  quickServices: [
    { label: "UPS Installation", priceLabel: "From LKR 3,000", serviceTypeId: "ups", pricingArchetype: "fixed_price" },
    { label: "Battery Replacement", priceLabel: "From LKR 3,500", serviceTypeId: "battery", pricingArchetype: "fixed_price" },
    { label: "Inverter Setup", priceLabel: "From LKR 8,000", serviceTypeId: "inverter", pricingArchetype: "quote_required" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "All installations include warranty on workmanship. Battery warranty per manufacturer terms.",
  pricingExplanation: "Simple UPS installations have fixed pricing. Inverter and generator setups require a site assessment to determine load requirements and provide an accurate quote.",
};

// ─── APPLIANCE INSTALLATION ──────────────────────────────────────
const APPLIANCE_INSTALL_FLOW: V2CategoryFlow = {
  code: "APPLIANCE_INSTALL",
  name: "Appliance Installation",
  flowType: "fast_book",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "fixed_price",
  heroTagline: "New Appliance? We'll Install It",
  heroSubtext: "AC · Washing machine · TV mounting · Water heater · Kitchen appliances",
  trustBadges: ["Verified Installer", "Same Day Available", "Warranty Backed", "Transparent Pricing"],
  priceExample: "Installation from LKR 2,500",
  serviceTypes: [
    { id: "ac_install", label: "AC Installation", description: "Professional split or window AC installation", icon: "Snowflake", priceLabel: "From LKR 8,000", tag: "Quote Required" },
    { id: "washing", label: "Washing Machine", description: "Install and connect with plumbing", icon: "Waves", priceLabel: "From LKR 3,000" },
    { id: "tv_mount", label: "TV Wall Mounting", description: "Wall mount with cable management", icon: "Monitor", priceLabel: "From LKR 2,500" },
    { id: "water_heater", label: "Water Heater", description: "Electric or instant heater installation", icon: "Flame", priceLabel: "From LKR 3,500" },
    { id: "kitchen", label: "Kitchen Appliance", description: "Dishwasher, oven, cooker hood, hob setup", icon: "ChefHat", priceLabel: "From LKR 5,000", tag: "Quote Required" },
  ],
  deviceQuestions: [
    { key: "brand", label: "Appliance Brand", type: "text", required: false },
    { key: "purchased", label: "Already purchased?", type: "toggle", required: true },
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }], required: true },
  ],
  packages: [
    { id: "tv_mount", name: "TV Wall Mount", description: "Mount TV with cable concealment", priceType: "fixed", price: 2500, features: ["Wall mounting", "Cable management", "Bracket alignment", "Cleanup"], popular: true },
    { id: "washer_install", name: "Washing Machine Install", description: "Full installation with plumbing", priceType: "fixed", price: 3000, features: ["Unboxing", "Plumbing connection", "Level adjustment", "Test run"] },
    { id: "ac_install", name: "AC Installation", description: "Split AC with piping and bracket", priceType: "starts_from", price: 8000, features: ["Bracket install", "Piping", "Gas charging", "Electrical connection"] },
  ],
  quickServices: [
    { label: "TV Wall Mount", priceLabel: "LKR 2,500", serviceTypeId: "tv_mount", pricingArchetype: "fixed_price" },
    { label: "Washing Machine", priceLabel: "LKR 3,000", serviceTypeId: "washing", pricingArchetype: "fixed_price" },
    { label: "Water Heater", priceLabel: "From LKR 3,500", serviceTypeId: "water_heater", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "All installations include 90-day warranty on workmanship",
  pricingExplanation: "Most appliance installations have fixed pricing. AC installation may vary based on piping distance and floor level — a detailed quote is provided before work starts.",
};

// ─── EXPORTS ──────────────────────────────────────────────

export const v2CategoryFlows: Record<string, V2CategoryFlow> = {
  AC: AC_FLOW,
  MOBILE: MOBILE_FLOW,
  IT: IT_FLOW,
  CCTV: CCTV_FLOW,
  CONSUMER_ELEC: CONSUMER_ELEC_FLOW,
  SOLAR: SOLAR_FLOW,
  SMART_HOME_OFFICE: SMART_HOME_FLOW,
  COPIER: COPIER_FLOW,
  PRINT_SUPPLIES: PRINT_SUPPLIES_FLOW,
  ELECTRICAL: ELECTRICAL_FLOW,
  PLUMBING: PLUMBING_FLOW,
  NETWORK: NETWORK_FLOW,
  HOME_SECURITY: HOME_SECURITY_FLOW,
  POWER_BACKUP: POWER_BACKUP_FLOW,
  APPLIANCE_INSTALL: APPLIANCE_INSTALL_FLOW,
};

export function getV2Flow(code: string): V2CategoryFlow | undefined {
  return v2CategoryFlows[code] || v2CategoryFlows[code.toUpperCase()];
}

export function getFlowStepCount(flowType: V2FlowType): number {
  switch (flowType) {
    case "fast_book": return 5;
    case "inspection": return 6;
    case "hybrid": return 5;
  }
}

// ─── SEARCH INDEX ──────────────────────────────────────────────
export interface SearchResult {
  categoryCode: string;
  categoryName: string;
  serviceTypeId: string;
  serviceLabel: string;
  keywords: string[];
}

const SEARCH_INDEX: SearchResult[] = [
  // Mobile
  { categoryCode: "MOBILE", categoryName: "Mobile Repairs", serviceTypeId: "screen", serviceLabel: "Screen Repair", keywords: ["phone screen broken", "screen cracked", "screen shattered", "display broken", "glass broken", "phone screen"] },
  { categoryCode: "MOBILE", categoryName: "Mobile Repairs", serviceTypeId: "battery", serviceLabel: "Battery Replacement", keywords: ["phone battery", "battery dead", "battery draining", "phone dying", "battery swollen"] },
  { categoryCode: "MOBILE", categoryName: "Mobile Repairs", serviceTypeId: "charging", serviceLabel: "Charging Fix", keywords: ["phone not charging", "charging port", "charger not working", "slow charging", "loose charger"] },
  { categoryCode: "MOBILE", categoryName: "Mobile Repairs", serviceTypeId: "water", serviceLabel: "Water Damage", keywords: ["phone water damage", "phone fell in water", "wet phone", "phone got wet"] },
  { categoryCode: "MOBILE", categoryName: "Mobile Repairs", serviceTypeId: "software", serviceLabel: "Software Fix", keywords: ["phone virus", "phone slow", "phone freezing", "phone crashing", "phone stuck"] },
  // AC
  { categoryCode: "AC", categoryName: "AC Services", serviceTypeId: "repair", serviceLabel: "AC Repair", keywords: ["ac not cooling", "ac not working", "ac repair", "air conditioner", "ac problem", "ac leaking", "ac noise"] },
  { categoryCode: "AC", categoryName: "AC Services", serviceTypeId: "service", serviceLabel: "AC Service", keywords: ["ac service", "ac cleaning", "ac maintenance", "ac filter", "ac clean"] },
  { categoryCode: "AC", categoryName: "AC Services", serviceTypeId: "gas", serviceLabel: "Gas Refill", keywords: ["ac gas", "ac gas refill", "ac refrigerant", "ac not cold"] },
  { categoryCode: "AC", categoryName: "AC Services", serviceTypeId: "install", serviceLabel: "AC Installation", keywords: ["ac install", "ac installation", "new ac", "ac relocation", "ac move"] },
  // IT
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_screen", serviceLabel: "Laptop Screen Replacement", keywords: ["laptop screen", "laptop display", "laptop screen broken", "laptop screen cracked"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_battery", serviceLabel: "Laptop Battery", keywords: ["laptop battery", "laptop not charging", "laptop dying"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_storage", serviceLabel: "SSD Upgrade", keywords: ["ssd upgrade", "hard drive", "laptop slow", "hdd to ssd"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_motherboard", serviceLabel: "Motherboard Repair", keywords: ["laptop not working", "laptop not turning on", "motherboard repair", "laptop dead"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_hinge", serviceLabel: "Hinge Repair", keywords: ["laptop hinge", "laptop hinge broken", "screen loose"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_keyboard", serviceLabel: "Keyboard Replacement", keywords: ["laptop keyboard", "keys not working", "keyboard broken"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop_overheating", serviceLabel: "Overheating Fix", keywords: ["laptop overheating", "laptop hot", "fan noise", "laptop fan"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "desktop_ram", serviceLabel: "RAM Upgrade", keywords: ["ram upgrade", "add ram", "memory upgrade", "blue screen"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "network", serviceLabel: "Network Fix", keywords: ["wifi not working", "wifi problem", "router issue", "internet not working", "wifi slow", "no internet", "router fix"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "software", serviceLabel: "Software Help", keywords: ["virus removal", "malware", "computer virus", "computer slow", "windows update"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "printer", serviceLabel: "Printer Fix", keywords: ["printer not working", "printer jam", "printer setup", "scanner not working"] },
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "data_recovery", serviceLabel: "Data Recovery", keywords: ["data recovery", "lost files", "deleted files", "hard drive"] },
  // CCTV
  { categoryCode: "CCTV", categoryName: "CCTV Solutions", serviceTypeId: "new_install", serviceLabel: "CCTV Installation", keywords: ["cctv install", "cctv camera", "security camera", "surveillance", "cctv system"] },
  { categoryCode: "CCTV", categoryName: "CCTV Solutions", serviceTypeId: "repair", serviceLabel: "CCTV Repair", keywords: ["cctv not working", "camera not working", "dvr not working", "cctv repair"] },
  // Consumer Electronics
  { categoryCode: "CONSUMER_ELEC", categoryName: "Electronics Repair", serviceTypeId: "tv", serviceLabel: "TV Repair", keywords: ["tv not working", "tv repair", "tv no power", "tv screen", "tv no picture", "tv no sound"] },
  { categoryCode: "CONSUMER_ELEC", categoryName: "Electronics Repair", serviceTypeId: "washing", serviceLabel: "Washing Machine Fix", keywords: ["washing machine", "washer not working", "washing machine not spinning", "washing machine leaking"] },
  { categoryCode: "CONSUMER_ELEC", categoryName: "Electronics Repair", serviceTypeId: "fridge", serviceLabel: "Fridge Repair", keywords: ["fridge not cooling", "fridge repair", "refrigerator", "fridge noise", "fridge ice"] },
  // Solar
  { categoryCode: "SOLAR", categoryName: "Solar Solutions", serviceTypeId: "new_install", serviceLabel: "Solar Installation", keywords: ["solar panel", "solar install", "solar system", "solar power", "electricity bill", "net metering"] },
  // Smart Home
  { categoryCode: "SMART_HOME_OFFICE", categoryName: "Smart Home", serviceTypeId: "security", serviceLabel: "Smart Locks", keywords: ["smart lock", "smart home", "home automation", "smart door", "access control"] },
  { categoryCode: "SMART_HOME_OFFICE", categoryName: "Smart Home", serviceTypeId: "automation", serviceLabel: "Smart Lighting", keywords: ["smart light", "smart bulb", "smart home automation", "voice control", "alexa", "google home"] },
  // Copier / Printer
  { categoryCode: "COPIER", categoryName: "Printer Repairs", serviceTypeId: "paper_jam", serviceLabel: "Paper Jam Fix", keywords: ["printer not printing", "paper jam", "printer jam", "printer error", "copier jam"] },
  { categoryCode: "COPIER", categoryName: "Printer Repairs", serviceTypeId: "print_quality", serviceLabel: "Print Quality Fix", keywords: ["faded print", "printer streaks", "blank pages", "print quality", "smudge print"] },
  { categoryCode: "COPIER", categoryName: "Printer Repairs", serviceTypeId: "wifi_setup", serviceLabel: "Printer WiFi Setup", keywords: ["printer wifi", "printer wireless", "printer network", "printer offline", "printer setup"] },
  { categoryCode: "COPIER", categoryName: "Printer Repairs", serviceTypeId: "installation", serviceLabel: "New Printer Setup", keywords: ["new printer", "printer install", "printer setup", "unbox printer"] },
  // Print Supplies
  { categoryCode: "PRINT_SUPPLIES", categoryName: "Printing Supplies", serviceTypeId: "toner_order", serviceLabel: "Toner Cartridge", keywords: ["toner", "toner cartridge", "laser toner", "printer toner", "toner refill"] },
  { categoryCode: "PRINT_SUPPLIES", categoryName: "Printing Supplies", serviceTypeId: "ink_order", serviceLabel: "Ink Cartridge", keywords: ["ink", "ink cartridge", "printer ink", "ink refill", "ink bottle", "ink tank"] },
  // Electrical
  { categoryCode: "ELECTRICAL", categoryName: "Electrical Services", serviceTypeId: "socket", serviceLabel: "Socket Repair", keywords: ["socket repair", "power socket", "dead socket", "sparking socket", "plug not working", "electrical socket"] },
  { categoryCode: "ELECTRICAL", categoryName: "Electrical Services", serviceTypeId: "circuit_breaker", serviceLabel: "Circuit Breaker Fix", keywords: ["circuit breaker", "mcb tripping", "power trip", "electricity trip", "breaker keeps tripping", "power cut"] },
  { categoryCode: "ELECTRICAL", categoryName: "Electrical Services", serviceTypeId: "lighting", serviceLabel: "Lighting Installation", keywords: ["light install", "chandelier", "ceiling light", "led light", "spotlights", "lighting"] },
  { categoryCode: "ELECTRICAL", categoryName: "Electrical Services", serviceTypeId: "fan", serviceLabel: "Fan Installation", keywords: ["ceiling fan", "fan install", "fan not working", "fan replacement"] },
  { categoryCode: "ELECTRICAL", categoryName: "Electrical Services", serviceTypeId: "rewiring", serviceLabel: "House Rewiring", keywords: ["rewiring", "house wiring", "old wiring", "electrical wiring", "wiring upgrade"] },
  // Plumbing
  { categoryCode: "PLUMBING", categoryName: "Plumbing Services", serviceTypeId: "leak", serviceLabel: "Pipe Leak Repair", keywords: ["pipe leak", "water leak", "leaking pipe", "pipe burst", "water dripping", "plumbing leak"] },
  { categoryCode: "PLUMBING", categoryName: "Plumbing Services", serviceTypeId: "bathroom", serviceLabel: "Bathroom Plumbing", keywords: ["toilet not flushing", "blocked toilet", "bathroom leak", "shower repair", "tap leaking", "basin problem"] },
  { categoryCode: "PLUMBING", categoryName: "Plumbing Services", serviceTypeId: "pump", serviceLabel: "Water Pump", keywords: ["water pump", "pump repair", "low pressure", "no water pressure", "pump not working"] },
  { categoryCode: "PLUMBING", categoryName: "Plumbing Services", serviceTypeId: "kitchen", serviceLabel: "Kitchen Plumbing", keywords: ["kitchen sink", "blocked drain", "kitchen tap", "mixer tap", "sink leak"] },
  { categoryCode: "PLUMBING", categoryName: "Plumbing Services", serviceTypeId: "hot_water", serviceLabel: "Hot Water System", keywords: ["hot water", "geyser", "water heater", "no hot water", "heater install"] },
  // Network
  { categoryCode: "NETWORK", categoryName: "Internet & Network", serviceTypeId: "wifi_setup", serviceLabel: "WiFi Setup", keywords: ["wifi setup", "router setup", "wifi configure", "new router", "wifi install"] },
  { categoryCode: "NETWORK", categoryName: "Internet & Network", serviceTypeId: "troubleshoot", serviceLabel: "Internet Fix", keywords: ["wifi slow", "internet slow", "no internet", "wifi not working", "internet not working", "wifi disconnecting", "speed slow"] },
  { categoryCode: "NETWORK", categoryName: "Internet & Network", serviceTypeId: "mesh", serviceLabel: "Mesh WiFi", keywords: ["mesh wifi", "mesh network", "wifi coverage", "wifi dead zone", "extend wifi"] },
  { categoryCode: "NETWORK", categoryName: "Internet & Network", serviceTypeId: "office_lan", serviceLabel: "Office LAN", keywords: ["lan setup", "office network", "ethernet", "network cable", "office lan", "network switch"] },
  // Home Security
  { categoryCode: "HOME_SECURITY", categoryName: "Home Security", serviceTypeId: "doorbell", serviceLabel: "Video Doorbell", keywords: ["video doorbell", "ring doorbell", "smart doorbell", "doorbell camera"] },
  { categoryCode: "HOME_SECURITY", categoryName: "Home Security", serviceTypeId: "smart_lock", serviceLabel: "Smart Lock", keywords: ["smart lock", "digital lock", "fingerprint lock", "keyless entry", "door lock"] },
  { categoryCode: "HOME_SECURITY", categoryName: "Home Security", serviceTypeId: "alarm", serviceLabel: "Alarm System", keywords: ["alarm system", "burglar alarm", "security alarm", "home alarm", "intruder alarm"] },
  { categoryCode: "HOME_SECURITY", categoryName: "Home Security", serviceTypeId: "gate", serviceLabel: "Gate Automation", keywords: ["gate automation", "automatic gate", "gate motor", "electric gate", "gate remote"] },
  // Power Backup
  { categoryCode: "POWER_BACKUP", categoryName: "Power Backup", serviceTypeId: "ups", serviceLabel: "UPS Installation", keywords: ["ups install", "ups setup", "uninterruptible power", "computer ups", "office ups"] },
  { categoryCode: "POWER_BACKUP", categoryName: "Power Backup", serviceTypeId: "inverter", serviceLabel: "Inverter Setup", keywords: ["inverter install", "power inverter", "home inverter", "backup power"] },
  { categoryCode: "POWER_BACKUP", categoryName: "Power Backup", serviceTypeId: "generator", serviceLabel: "Generator Install", keywords: ["generator install", "standby generator", "power generator", "diesel generator"] },
  { categoryCode: "POWER_BACKUP", categoryName: "Power Backup", serviceTypeId: "battery", serviceLabel: "Battery Replacement", keywords: ["ups battery", "inverter battery", "battery replacement", "battery dead", "battery not charging"] },
  // Appliance Installation
  { categoryCode: "APPLIANCE_INSTALL", categoryName: "Appliance Install", serviceTypeId: "tv_mount", serviceLabel: "TV Wall Mount", keywords: ["tv mount", "wall mount tv", "tv bracket", "tv installation", "mount television"] },
  { categoryCode: "APPLIANCE_INSTALL", categoryName: "Appliance Install", serviceTypeId: "washing", serviceLabel: "Washing Machine Install", keywords: ["washing machine install", "washer install", "washing machine setup", "connect washing machine"] },
  { categoryCode: "APPLIANCE_INSTALL", categoryName: "Appliance Install", serviceTypeId: "water_heater", serviceLabel: "Water Heater Install", keywords: ["water heater install", "geyser install", "heater setup"] },
  { categoryCode: "APPLIANCE_INSTALL", categoryName: "Appliance Install", serviceTypeId: "ac_install", serviceLabel: "AC Installation", keywords: ["ac install new", "install air conditioner", "new ac setup", "split ac install"] },
];

export function searchServices(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  return SEARCH_INDEX
    .map((entry) => {
      let score = 0;
      for (const kw of entry.keywords) {
        if (kw.includes(q)) score += 10;
        for (const w of words) {
          if (kw.includes(w)) score += 3;
        }
      }
      if (entry.serviceLabel.toLowerCase().includes(q)) score += 8;
      if (entry.categoryName.toLowerCase().includes(q)) score += 5;
      return { ...entry, score };
    })
    .filter((e) => (e as any).score > 0)
    .sort((a, b) => (b as any).score - (a as any).score)
    .slice(0, 5);
}
