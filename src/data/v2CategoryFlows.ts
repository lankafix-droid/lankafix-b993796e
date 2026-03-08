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
}

export interface V2DeviceQuestion {
  key: string;
  label: string;
  type: "select" | "text" | "toggle";
  options?: { label: string; value: string }[];
  required: boolean;
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
    { key: "brand", label: "Phone Brand", type: "select", options: [{ label: "Apple iPhone", value: "apple" }, { label: "Samsung", value: "samsung" }, { label: "Huawei", value: "huawei" }, { label: "Xiaomi", value: "xiaomi" }, { label: "Oppo", value: "oppo" }, { label: "Vivo", value: "vivo" }, { label: "Other", value: "other" }], required: true },
    { key: "model", label: "Phone Model", type: "text", required: true },
    { key: "touch_working", label: "Is touch still working?", type: "toggle", required: true },
    { key: "display_visible", label: "Is the display still visible?", type: "toggle", required: true },
    { key: "powers_on", label: "Does the phone power on?", type: "toggle", required: true },
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
    { label: "Broken Phone Screen", priceLabel: "From LKR 5,000", serviceTypeId: "screen", pricingArchetype: "fixed_price" },
    { label: "Battery Replacement", priceLabel: "From LKR 2,000", serviceTypeId: "battery", pricingArchetype: "fixed_price" },
    { label: "Charging Port Fix", priceLabel: "From LKR 1,500", serviceTypeId: "charging", pricingArchetype: "fixed_price" },
  ],
  partnerShops: [
    { name: "TechFix Colombo 7", location: "Colombo 7, near Majestic City", rating: 4.8, repairTimeEstimate: "1-2 hours", openHours: "9 AM – 7 PM", verified: true },
    { name: "PhoneDoc Bambalapitiya", location: "Bambalapitiya, Galle Road", rating: 4.6, repairTimeEstimate: "2-3 hours", openHours: "10 AM – 8 PM", verified: true },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  photoUploadHint: "Upload a photo of the damage to help the technician prepare the right parts",
  dataRiskDisclaimer: "By proceeding, you acknowledge that LankaFix and the assigned technician are not responsible for any data loss during the repair process. We strongly recommend backing up your data before handing over your device. Do not share your PIN or passwords unless absolutely necessary.",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "All repairs include warranty on parts and labor",
  pricingExplanation: "Mobile repairs use Fixed Pricing. You'll see the exact price before confirming. Parts cost varies by quality tier (Compatible, OEM, Genuine).",
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
    { id: "install", label: "Installation / Relocation", description: "New AC installation or unit relocation", icon: "PlusCircle" },
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
    { key: "brand", label: "Brand", type: "select", options: [{ label: "Samsung", value: "samsung" }, { label: "LG", value: "lg" }, { label: "Daikin", value: "daikin" }, { label: "Mitsubishi", value: "mitsubishi" }, { label: "Panasonic", value: "panasonic" }, { label: "Haier", value: "haier" }, { label: "Other", value: "other" }], required: false },
    { key: "capacity", label: "Capacity (BTU)", type: "select", options: [{ label: "9,000 BTU", value: "9000" }, { label: "12,000 BTU", value: "12000" }, { label: "18,000 BTU", value: "18000" }, { label: "24,000 BTU", value: "24000" }, { label: "Not Sure", value: "not_sure" }], required: false },
    { key: "units", label: "Number of Units", type: "select", options: [{ label: "1 Unit", value: "1" }, { label: "2 Units", value: "2" }, { label: "3 Units", value: "3" }, { label: "4+ Units", value: "4_plus" }], required: true },
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "House", value: "house" }, { label: "Apartment", value: "apartment" }, { label: "Office", value: "office" }, { label: "Shop / Showroom", value: "shop" }], required: true },
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
    { label: "Gas Refill", priceLabel: "From LKR 3,500", serviceTypeId: "gas", pricingArchetype: "fixed_price" },
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
  flowType: "fast_book",
  bookingModel: "fast_book",
  assignmentType: "technician",
  pricingArchetype: "diagnostic_first",
  heroTagline: "IT Problems? Expert Help Fast",
  heroSubtext: "Remote & on-site support for homes, offices and businesses",
  trustBadges: ["Verified Technician", "Data Safe", "Transparent Pricing", "Business Ready"],
  priceExample: "Support from LKR 2,000",
  serviceTypes: [
    { id: "laptop", label: "Laptop Repair", description: "Hardware or software issues with your laptop", icon: "Laptop" },
    { id: "desktop", label: "Desktop Repair", description: "PC not working, slow or crashing", icon: "Monitor" },
    { id: "network", label: "Network Issue", description: "WiFi, router, LAN or internet problems", icon: "Wifi" },
    { id: "printer", label: "Printer / Scanner", description: "Setup, paper jam or print quality issues", icon: "Printer" },
    { id: "software", label: "Software Help", description: "Installation, virus removal, backup", icon: "Code" },
    { id: "data_recovery", label: "Data Recovery", description: "Recover lost or deleted files", icon: "HardDrive" },
    { id: "not_sure", label: "Diagnose My Problem", description: "Let our IT specialist assess — takes less than 30 seconds", icon: "Stethoscope" },
  ],
  deviceQuestions: [
    { key: "environment", label: "Where do you need support?", type: "select", options: [{ label: "Home", value: "home" }, { label: "Office", value: "office" }, { label: "Retail / Shop", value: "retail" }, { label: "School / Institute", value: "school" }, { label: "Warehouse", value: "warehouse" }], required: true },
    { key: "issue", label: "Main Issue", type: "select", options: [{ label: "Slow System", value: "slow" }, { label: "Virus / Malware", value: "virus" }, { label: "Not Powering On", value: "no_power" }, { label: "WiFi Problem", value: "wifi" }, { label: "Printer Not Working", value: "printer" }, { label: "Setup / Install", value: "setup" }, { label: "Data Recovery", value: "data" }, { label: "Other", value: "other" }], required: true },
    { key: "device_count", label: "Number of Devices", type: "select", options: [{ label: "1 Device", value: "1" }, { label: "2-5 Devices", value: "2_5" }, { label: "5+ Devices", value: "5_plus" }], required: false },
  ],
  serviceModes: [
    { id: "remote", label: "Remote Support", description: "Expert help via screen sharing — no visit needed", icon: "Monitor", skipLocation: true, details: ["Available time slots shown", "30-min session", "Lower cost than on-site"] },
    { id: "onsite", label: "On-Site Visit", description: "Technician comes to your home or office", icon: "MapPin", details: ["Technician dispatched to you", "Full diagnosis on-site", "Same-day availability"] },
    { id: "inspection", label: "Inspection Only", description: "Diagnose the issue and get a detailed report", icon: "Search", details: ["Written diagnosis report", "Repair quote provided", "No obligation to proceed"] },
  ],
  packages: [
    { id: "remote", name: "Remote Support", description: "Expert help via remote access", priceType: "fixed", price: 2000, features: ["Screen sharing session", "30-min support", "Software fixes", "No visit needed"] },
    { id: "onsite", name: "On-Site Visit", description: "Technician visits your location", priceType: "starts_from", price: 3500, features: ["Home/office visit", "Hardware check", "Software diagnosis", "Network check"], popular: true },
    { id: "data_recovery", name: "Data Recovery", description: "Recover lost or deleted files", priceType: "inspection_required", price: 5000, priceMax: 15000, features: ["Drive assessment", "Recovery attempt", "Detailed report", "Quote before proceeding"] },
  ],
  quickServices: [
    { label: "Laptop Repair", priceLabel: "From LKR 3,500", serviceTypeId: "laptop", pricingArchetype: "diagnostic_first" },
    { label: "WiFi / Router Fix", priceLabel: "From LKR 2,000", serviceTypeId: "network", pricingArchetype: "fixed_price" },
    { label: "Virus Removal", priceLabel: "From LKR 2,000", serviceTypeId: "software", pricingArchetype: "fixed_price" },
  ],
  requiresCommitmentFee: false,
  commitmentFeeAmount: 0,
  commitmentFeeNote: "",
  cancellationNote: "Free cancellation within 10 minutes of booking",
  warrantyNote: "Software fixes warranted for 7 days. Hardware repairs per quote terms.",
  pricingExplanation: "Remote support is Fixed Price. On-site visits include a diagnostic fee. Parts and hardware repairs are quoted separately after diagnosis.",
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
    { key: "property_type", label: "Property Type", type: "select", options: [{ label: "Home", value: "home" }, { label: "Apartment", value: "apartment" }, { label: "Shop", value: "shop" }, { label: "Office", value: "office" }, { label: "Warehouse", value: "warehouse" }], required: true },
    { key: "camera_count", label: "Number of Cameras Needed", type: "select", options: [{ label: "2 Cameras", value: "2" }, { label: "4 Cameras", value: "4" }, { label: "8 Cameras", value: "8" }, { label: "16+ Cameras", value: "16_plus" }, { label: "Not Sure", value: "not_sure" }], required: true },
    { key: "indoor_outdoor", label: "Camera Location", type: "select", options: [{ label: "Indoor Only", value: "indoor" }, { label: "Outdoor Only", value: "outdoor" }, { label: "Both Indoor & Outdoor", value: "both" }], required: true },
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
    { key: "brand", label: "Brand", type: "text", required: false },
    { key: "model", label: "Model (if known)", type: "text", required: false },
    { key: "age", label: "Approximate Age", type: "select", options: [{ label: "Under 1 year", value: "lt_1y" }, { label: "1-3 years", value: "1_3y" }, { label: "3-5 years", value: "3_5y" }, { label: "Over 5 years", value: "gt_5y" }], required: true },
    { key: "issue_description", label: "Describe the problem", type: "text", required: true },
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
    { key: "bill_range", label: "Monthly Electricity Bill", type: "select", options: [{ label: "Under LKR 10,000", value: "lt_10k" }, { label: "LKR 10,000 - 20,000", value: "10_20k" }, { label: "LKR 20,000 - 40,000", value: "20_40k" }, { label: "Over LKR 40,000", value: "gt_40k" }], required: true },
    { key: "backup", label: "Battery backup needed?", type: "toggle", required: true },
    { key: "existing_solar", label: "Existing solar system?", type: "toggle", required: true },
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
    { key: "requirements", label: "What do you need?", type: "select", options: [{ label: "Smart Lighting", value: "lighting" }, { label: "Access Control", value: "access" }, { label: "Smart Locks", value: "locks" }, { label: "Energy Monitoring", value: "energy" }, { label: "Full Package", value: "full" }], required: true },
    { key: "wifi", label: "WiFi available?", type: "toggle", required: true },
  ],
  siteConditions: [
    { key: "wifi_available", label: "WiFi available?", type: "toggle" },
    { key: "solar_available", label: "Solar power available?", type: "toggle" },
    { key: "backup_required", label: "Battery backup required?", type: "toggle" },
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

// ─── EXPORTS ──────────────────────────────────────────────

export const v2CategoryFlows: Record<string, V2CategoryFlow> = {
  AC: AC_FLOW,
  MOBILE: MOBILE_FLOW,
  IT: IT_FLOW,
  CCTV: CCTV_FLOW,
  CONSUMER_ELEC: CONSUMER_ELEC_FLOW,
  SOLAR: SOLAR_FLOW,
  SMART_HOME_OFFICE: SMART_HOME_FLOW,
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
  { categoryCode: "IT", categoryName: "IT Support", serviceTypeId: "laptop", serviceLabel: "Laptop Repair", keywords: ["laptop repair", "laptop slow", "laptop not working", "laptop screen", "laptop battery"] },
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
