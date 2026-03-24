/**
 * Category Landing Page Configuration
 * Rich content config for each LankaFix service category's landing page.
 * Drives the reusable CategoryLandingPage template.
 */

export interface ServiceOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
  /** Maps to fulfillment archetype outcome */
  outcome?: "booking" | "inspection" | "consultation" | "callback" | "diagnosis";
}

export interface CommonIssue {
  id: string;
  label: string;
  emoji?: string;
}

export interface TrustPoint {
  label: string;
  icon?: string;
}

export interface CategoryLandingContent {
  code: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Short tagline for the trust strip area */
  valueProposition: string;
  trustPoints: TrustPoint[];
  services: ServiceOption[];
  commonIssues: CommonIssue[];
  whyLankaFix: string[];
  /** Quick action labels */
  quickActions: { label: string; action: string; primary?: boolean }[];
  /** Urgency options available */
  urgencyOptions: { id: string; label: string; hint?: string }[];
  /** Service modes available */
  serviceModes: { id: string; label: string; available: boolean }[];
}

const DEFAULT_URGENCY = [
  { id: "asap", label: "ASAP", hint: "Within 2 hours" },
  { id: "today", label: "Today", hint: "Anytime today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "schedule", label: "Schedule Later" },
];

export const CATEGORY_LANDING_CONFIG: Record<string, CategoryLandingContent> = {
  AC: {
    code: "AC",
    heroTitle: "AC Service & Repair",
    heroSubtitle: "Expert cooling solutions for homes and offices across Greater Colombo",
    valueProposition: "Certified AC technicians, transparent pricing, fast response",
    trustPoints: [
      { label: "Verified Technicians" },
      { label: "Fast Response" },
      { label: "All Brands Covered" },
      { label: "90-Day Warranty" },
    ],
    services: [
      { id: "general_service", label: "General Service", description: "Routine cleaning & maintenance", outcome: "booking" },
      { id: "repair", label: "Repair", description: "Fix cooling, noise, or leaking issues", outcome: "inspection" },
      { id: "gas_topup", label: "Gas Top-Up", description: "Refrigerant recharge for all AC types", outcome: "booking" },
      { id: "installation", label: "New Installation", description: "Professional AC installation", outcome: "consultation" },
      { id: "relocation", label: "Relocation", description: "Move your AC unit safely", outcome: "booking" },
      { id: "inspection", label: "Inspection", description: "Full diagnostic check", outcome: "inspection" },
      { id: "amc", label: "Annual Maintenance", description: "Scheduled care plan", outcome: "consultation" },
    ],
    commonIssues: [
      { id: "not_cooling", label: "Not cooling", emoji: "🥵" },
      { id: "water_leaking", label: "Water leaking", emoji: "💧" },
      { id: "strange_noise", label: "Strange noise", emoji: "🔊" },
      { id: "bad_smell", label: "Bad smell", emoji: "👃" },
      { id: "remote_issue", label: "Remote not working", emoji: "📡" },
      { id: "high_bill", label: "High electricity bill", emoji: "⚡" },
    ],
    whyLankaFix: [
      "Structured diagnostic process before any repair",
      "Transparent pricing with no hidden charges",
      "Genuine parts and refrigerant only",
      "Post-service quality check and warranty",
    ],
    quickActions: [
      { label: "Book AC Service", action: "start_flow", primary: true },
      { label: "Request Inspection", action: "inspection" },
      { label: "Get Callback", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
    ],
  },

  MOBILE: {
    code: "MOBILE",
    heroTitle: "Mobile Phone Repairs",
    heroSubtitle: "Professional repairs for all smartphone brands — screen, battery, charging & more",
    valueProposition: "Certified mobile technicians, genuine parts, 30-day repair warranty",
    trustPoints: [
      { label: "Genuine Parts" },
      { label: "Fast Response" },
      { label: "All Brands" },
      { label: "30-Day Warranty" },
    ],
    services: [
      { id: "screen_replacement", label: "Screen Replacement", description: "Cracked or unresponsive display", outcome: "booking" },
      { id: "battery_replacement", label: "Battery Replacement", description: "Swollen, draining, or dead battery", outcome: "booking" },
      { id: "charging_repair", label: "Charging Port Repair", description: "Not charging or loose connection", outcome: "booking" },
      { id: "camera_repair", label: "Camera Repair", description: "Blurry, black screen, or not focusing", outcome: "booking" },
      { id: "water_damage", label: "Water Damage Recovery", description: "Liquid damage diagnosis & repair", outcome: "diagnosis" },
      { id: "software_issue", label: "Software Issue", description: "Stuck, slow, or software errors", outcome: "booking" },
      { id: "full_diagnosis", label: "Full Diagnosis", description: "Complete device health check", outcome: "diagnosis" },
    ],
    commonIssues: [
      { id: "cracked_screen", label: "Cracked screen", emoji: "📱" },
      { id: "battery_drain", label: "Battery draining fast", emoji: "🔋" },
      { id: "not_charging", label: "Won't charge", emoji: "🔌" },
      { id: "water_damage", label: "Water damage", emoji: "💦" },
      { id: "camera_blurry", label: "Camera blurry", emoji: "📷" },
      { id: "phone_slow", label: "Phone running slow", emoji: "🐌" },
    ],
    whyLankaFix: [
      "Certified technicians with brand-specific training",
      "Genuine replacement parts with warranty",
      "Data safety protocols — your data stays yours",
      "Transparent diagnosis before any repair starts",
    ],
    quickActions: [
      { label: "Get Technician", action: "start_flow", primary: true },
      { label: "Diagnose My Phone", action: "diagnosis" },
      { label: "Request Callback", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
      { id: "drop_off", label: "Drop-Off", available: true },
      { id: "pickup_return", label: "Pickup & Return", available: true },
    ],
  },

  IT: {
    code: "IT",
    heroTitle: "IT Repairs & Support",
    heroSubtitle: "Laptop, desktop, network & software support for home and business",
    valueProposition: "Expert IT support, remote or on-site, fast turnaround",
    trustPoints: [
      { label: "Remote + On-Site" },
      { label: "Fast Response" },
      { label: "Data Protection" },
      { label: "Business Ready" },
    ],
    services: [
      { id: "laptop_repair", label: "Laptop Repair", description: "Hardware issues, screen, keyboard, battery", outcome: "booking" },
      { id: "desktop_repair", label: "Desktop Repair", description: "Performance, power, component issues", outcome: "booking" },
      { id: "software_support", label: "Software Support", description: "OS, drivers, virus removal, setup", outcome: "booking" },
      { id: "network_support", label: "Network Support", description: "WiFi, LAN, router configuration", outcome: "booking" },
      { id: "remote_support", label: "Remote Support", description: "Quick fixes via remote access", outcome: "booking" },
      { id: "data_recovery", label: "Data Recovery", description: "Recover lost or corrupted files", outcome: "diagnosis" },
      { id: "printer_support", label: "Printer Support", description: "Setup, drivers, connectivity", outcome: "booking" },
    ],
    commonIssues: [
      { id: "slow_pc", label: "Slow computer", emoji: "🐌" },
      { id: "no_power", label: "Won't turn on", emoji: "⚫" },
      { id: "virus", label: "Virus / malware", emoji: "🦠" },
      { id: "wifi_issue", label: "WiFi not working", emoji: "📶" },
      { id: "blue_screen", label: "Blue screen error", emoji: "🔵" },
      { id: "data_loss", label: "Lost data", emoji: "📁" },
    ],
    whyLankaFix: [
      "Certified IT professionals with verified credentials",
      "Remote support available for quick software issues",
      "Data safety and privacy protocols enforced",
      "Both home and business environments supported",
    ],
    quickActions: [
      { label: "Get IT Support", action: "start_flow", primary: true },
      { label: "Remote Support", action: "remote" },
      { label: "Request Callback", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
      { id: "remote", label: "Remote Support", available: true },
    ],
  },

  CONSUMER_ELEC: {
    code: "CONSUMER_ELEC",
    heroTitle: "Electronics Repair",
    heroSubtitle: "TV, audio, home appliance diagnostics and repair",
    valueProposition: "Expert diagnosis, transparent quoting, all major brands",
    trustPoints: [
      { label: "Diagnose First" },
      { label: "All Brands" },
      { label: "Transparent Quote" },
      { label: "Warranty" },
    ],
    services: [
      { id: "tv_repair", label: "TV Repair", description: "Display, power, sound issues", outcome: "inspection" },
      { id: "audio_repair", label: "Audio System Repair", description: "Speakers, soundbars, amplifiers", outcome: "inspection" },
      { id: "appliance_repair", label: "Appliance Repair", description: "Washing machines, fridges, etc.", outcome: "inspection" },
      { id: "diagnosis", label: "Full Diagnosis", description: "Complete device health check", outcome: "diagnosis" },
    ],
    commonIssues: [
      { id: "tv_no_display", label: "TV black screen", emoji: "📺" },
      { id: "no_sound", label: "No sound", emoji: "🔇" },
      { id: "power_issue", label: "Won't turn on", emoji: "🔌" },
      { id: "remote_issue", label: "Remote not working", emoji: "📡" },
    ],
    whyLankaFix: [
      "Inspection-first approach — diagnosis before commitment",
      "Transparent quote with no obligation",
      "Genuine parts sourced from authorized channels",
      "Post-repair warranty on all work",
    ],
    quickActions: [
      { label: "Book Inspection", action: "start_flow", primary: true },
      { label: "Request Callback", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
    ],
  },

  CCTV: {
    code: "CCTV",
    heroTitle: "CCTV & Security",
    heroSubtitle: "Professional installation, wiring, and configuration for homes and businesses",
    valueProposition: "Expert site assessment, quality equipment, clean installation",
    trustPoints: [
      { label: "Site Assessment" },
      { label: "All Brands" },
      { label: "Clean Wiring" },
      { label: "Remote Setup" },
    ],
    services: [
      { id: "new_installation", label: "New Installation", description: "Full CCTV system setup", outcome: "consultation" },
      { id: "camera_repair", label: "Camera Repair", description: "Fix offline or damaged cameras", outcome: "booking" },
      { id: "dvr_nvr_issue", label: "DVR/NVR Support", description: "Recording and playback issues", outcome: "booking" },
      { id: "system_upgrade", label: "System Upgrade", description: "Add cameras or upgrade hardware", outcome: "consultation" },
      { id: "wiring_fix", label: "Wiring Repair", description: "Connection drops or cable issues", outcome: "booking" },
    ],
    commonIssues: [
      { id: "camera_offline", label: "Camera offline", emoji: "📹" },
      { id: "no_recording", label: "Not recording", emoji: "💾" },
      { id: "blurry_feed", label: "Blurry footage", emoji: "🌫️" },
      { id: "new_setup", label: "Need new system", emoji: "🏠" },
    ],
    whyLankaFix: [
      "Professional site assessment before any commitment",
      "Clean, professional cable management",
      "Remote viewing setup included",
      "Ongoing support and maintenance plans",
    ],
    quickActions: [
      { label: "Schedule Visit", action: "start_flow", primary: true },
      { label: "Request Quote", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
    ],
  },

  SOLAR: {
    code: "SOLAR",
    heroTitle: "Solar Solutions",
    heroSubtitle: "Panels, inverters, batteries — installation, maintenance & repair",
    valueProposition: "Professional site assessment, certified installers, ROI-focused advice",
    trustPoints: [
      { label: "Site Assessment" },
      { label: "Certified Installers" },
      { label: "ROI Guidance" },
      { label: "Long-Term Support" },
    ],
    services: [
      { id: "new_installation", label: "New Solar System", description: "Full system design and installation", outcome: "consultation" },
      { id: "panel_repair", label: "Panel Repair", description: "Low output or physical damage", outcome: "inspection" },
      { id: "inverter_repair", label: "Inverter Repair", description: "Error codes or no output", outcome: "inspection" },
      { id: "battery_service", label: "Battery Service", description: "Not holding charge or degraded", outcome: "inspection" },
      { id: "maintenance", label: "Maintenance Check", description: "Routine inspection and cleaning", outcome: "booking" },
    ],
    commonIssues: [
      { id: "low_output", label: "Low power output", emoji: "⚡" },
      { id: "inverter_error", label: "Inverter error", emoji: "🔴" },
      { id: "panel_damage", label: "Panel damage", emoji: "☀️" },
      { id: "battery_issue", label: "Battery issue", emoji: "🔋" },
    ],
    whyLankaFix: [
      "Free energy assessment and ROI calculation",
      "Certified solar installers with warranty",
      "Post-installation monitoring support",
      "Government subsidy guidance included",
    ],
    quickActions: [
      { label: "Book Assessment", action: "start_flow", primary: true },
      { label: "Request Quote", action: "callback" },
    ],
    urgencyOptions: [
      { id: "this_week", label: "This Week" },
      { id: "next_week", label: "Next Week" },
      { id: "this_month", label: "This Month" },
      { id: "schedule", label: "Schedule Later" },
    ],
    serviceModes: [
      { id: "on_site", label: "Site Visit", available: true },
    ],
  },

  SMART_HOME_OFFICE: {
    code: "SMART_HOME_OFFICE",
    heroTitle: "Smart Home & Office",
    heroSubtitle: "Automation, IoT, lighting, and integration solutions",
    valueProposition: "Expert consultation, compatible solutions, future-proof setup",
    trustPoints: [
      { label: "Expert Consultation" },
      { label: "All Ecosystems" },
      { label: "Clean Setup" },
      { label: "Training Included" },
    ],
    services: [
      { id: "new_setup", label: "New Smart Setup", description: "Design and install smart systems", outcome: "consultation" },
      { id: "device_fix", label: "Device Troubleshooting", description: "Fix offline or unresponsive devices", outcome: "booking" },
      { id: "integration", label: "Integration Support", description: "Connect and sync your devices", outcome: "booking" },
      { id: "consultation", label: "Consultation", description: "Plan your smart home project", outcome: "consultation" },
    ],
    commonIssues: [
      { id: "device_offline", label: "Device offline", emoji: "📡" },
      { id: "wont_connect", label: "Won't connect", emoji: "🔗" },
      { id: "new_project", label: "New project", emoji: "🏠" },
      { id: "voice_issue", label: "Voice control issue", emoji: "🎤" },
    ],
    whyLankaFix: [
      "Ecosystem-agnostic — works with all smart brands",
      "Professional wiring and configuration",
      "User training after setup",
      "Ongoing support plans available",
    ],
    quickActions: [
      { label: "Book Consultation", action: "start_flow", primary: true },
      { label: "Request Callback", action: "callback" },
    ],
    urgencyOptions: [
      { id: "this_week", label: "This Week" },
      { id: "next_week", label: "Next Week" },
      { id: "this_month", label: "This Month" },
      { id: "schedule", label: "Schedule Later" },
    ],
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
    ],
  },

  COPIER: {
    code: "COPIER",
    heroTitle: "Copier & Printer Repair",
    heroSubtitle: "Paper jams, print quality, connectivity — all brands supported",
    valueProposition: "Fast diagnosis, genuine parts, business-ready support",
    trustPoints: [
      { label: "All Brands" },
      { label: "Fast Turnaround" },
      { label: "Genuine Parts" },
      { label: "Business Ready" },
    ],
    services: [
      { id: "repair", label: "Repair", description: "Fix jams, quality, or hardware issues", outcome: "booking" },
      { id: "maintenance", label: "Maintenance", description: "Routine cleaning and service", outcome: "booking" },
      { id: "setup", label: "Setup & Install", description: "New printer setup and configuration", outcome: "booking" },
      { id: "network_print", label: "Network Printing", description: "WiFi, LAN, or cloud printing setup", outcome: "booking" },
    ],
    commonIssues: [
      { id: "paper_jam", label: "Paper jam", emoji: "📄" },
      { id: "poor_quality", label: "Poor print quality", emoji: "🖨️" },
      { id: "offline", label: "Printer offline", emoji: "🔴" },
      { id: "toner_issue", label: "Toner/ink issue", emoji: "🎨" },
    ],
    whyLankaFix: [
      "Business-critical response times",
      "All major copier and printer brands",
      "Genuine consumables and parts",
      "Network and cloud printing expertise",
    ],
    quickActions: [
      { label: "Book Repair", action: "start_flow", primary: true },
      { label: "Request Callback", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
    ],
  },

  NETWORK: {
    code: "NETWORK",
    heroTitle: "IT & Network Support",
    heroSubtitle: "WiFi, LAN, server, and cloud infrastructure for homes and businesses",
    valueProposition: "Fast setup, secure configuration, business-grade support",
    trustPoints: [
      { label: "Business Grade" },
      { label: "Secure Setup" },
      { label: "Remote + On-Site" },
      { label: "Extended Support" },
    ],
    services: [
      { id: "wifi_setup", label: "WiFi Setup", description: "Router, extender, or mesh setup", outcome: "booking" },
      { id: "network_setup", label: "Network Setup", description: "Office LAN, cabling, switches", outcome: "consultation" },
      { id: "troubleshooting", label: "Troubleshooting", description: "Fix slow or dropping connections", outcome: "booking" },
      { id: "server_support", label: "Server Support", description: "NAS, file server, or access issues", outcome: "booking" },
    ],
    commonIssues: [
      { id: "slow_internet", label: "Slow internet", emoji: "📶" },
      { id: "wifi_dropping", label: "WiFi dropping", emoji: "❌" },
      { id: "new_setup", label: "Need new setup", emoji: "🔧" },
      { id: "security_concern", label: "Security concern", emoji: "🔒" },
    ],
    whyLankaFix: [
      "Enterprise-grade networking expertise",
      "Secure and optimized configurations",
      "Remote monitoring and support available",
      "Scalable solutions for growing businesses",
    ],
    quickActions: [
      { label: "Get Support", action: "start_flow", primary: true },
      { label: "Request Callback", action: "callback" },
    ],
    urgencyOptions: DEFAULT_URGENCY,
    serviceModes: [
      { id: "on_site", label: "On-Site Visit", available: true },
      { id: "remote", label: "Remote Support", available: true },
    ],
  },
};

/** Get landing config for a category, with fallback */
export function getCategoryLandingConfig(code: string): CategoryLandingContent | null {
  return CATEGORY_LANDING_CONFIG[code] || null;
}
