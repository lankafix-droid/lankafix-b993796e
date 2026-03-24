/**
 * Consumer Service Booking — Category & Issue definitions
 * Maps to existing category_code values used across the platform.
 * Enhanced with pricing hints, fulfillment archetypes, and subcategory guidance.
 */

export type FulfillmentArchetype = "instant" | "inspection_first" | "consultation" | "delivery";

export interface BookingCategory {
  code: string;
  label: string;
  icon: string;
  description: string;
  priceHint: string;
  archetype: FulfillmentArchetype;
  archetypeLabel: string;
  etaHint: string;
}

export interface CategoryIssue {
  id: string;
  label: string;
  hint?: string;
}

export const CONSUMER_CATEGORIES: BookingCategory[] = [
  {
    code: "MOBILE", label: "Mobile Phone Repair", icon: "📱",
    description: "Screen, battery, charging & more",
    priceHint: "From Rs 3,000", archetype: "instant",
    archetypeLabel: "Same-day fix", etaHint: "45–90 min",
  },
  {
    code: "IT", label: "Laptop & Computer", icon: "💻",
    description: "Hardware, software & performance issues",
    priceHint: "From Rs 2,000", archetype: "instant",
    archetypeLabel: "On-site support", etaHint: "60–120 min",
  },
  {
    code: "AC", label: "AC Repair & Service", icon: "❄️",
    description: "Cooling, gas refill & maintenance",
    priceHint: "From Rs 2,500", archetype: "inspection_first",
    archetypeLabel: "Inspection first", etaHint: "60–90 min",
  },
  {
    code: "COPIER", label: "Printer & Copier", icon: "🖨️",
    description: "Paper jams, ink & connectivity",
    priceHint: "From Rs 2,500", archetype: "instant",
    archetypeLabel: "On-site fix", etaHint: "60–90 min",
  },
  {
    code: "CCTV", label: "CCTV & Security", icon: "📹",
    description: "Installation, wiring & configuration",
    priceHint: "Site visit first", archetype: "consultation",
    archetypeLabel: "Professional consultation", etaHint: "Scheduled",
  },
  {
    code: "CONSUMER_ELEC", label: "Electronics Repair", icon: "📺",
    description: "TV, audio & home appliance repairs",
    priceHint: "Diagnosis first", archetype: "inspection_first",
    archetypeLabel: "Diagnose & quote", etaHint: "60–120 min",
  },
  {
    code: "SOLAR", label: "Solar Solutions", icon: "☀️",
    description: "Panels, inverters & batteries",
    priceHint: "Professional assessment", archetype: "consultation",
    archetypeLabel: "Professional consultation", etaHint: "Scheduled",
  },
  {
    code: "SMART_HOME_OFFICE", label: "Smart Home & Office", icon: "🏠",
    description: "Automation, IoT & integration",
    priceHint: "Custom quote", archetype: "consultation",
    archetypeLabel: "Consultation", etaHint: "Scheduled",
  },
  {
    code: "NETWORK", label: "IT & Network", icon: "🌐",
    description: "Network, server & cloud support",
    priceHint: "From Rs 3,000", archetype: "instant",
    archetypeLabel: "On-site support", etaHint: "60–120 min",
  },
];

export const CATEGORY_ISSUES: Record<string, CategoryIssue[]> = {
  MOBILE: [
    { id: "screen_broken", label: "Screen broken", hint: "Cracked, unresponsive, or display issues" },
    { id: "battery_problem", label: "Battery problem", hint: "Drains fast, swollen, or won't charge" },
    { id: "charging_issue", label: "Charging issue", hint: "Port damage or slow charging" },
    { id: "water_damage", label: "Water damage", hint: "Dropped in liquid or moisture damage" },
    { id: "camera_issue", label: "Camera issue", hint: "Blurry, black screen, or not focusing" },
    { id: "other", label: "Other / Not sure", hint: "We'll help diagnose the issue" },
  ],
  IT: [
    { id: "slow_performance", label: "Slow performance", hint: "Takes long to boot or run programs" },
    { id: "screen_issue", label: "Screen issue", hint: "Flickering, dead pixels, or no display" },
    { id: "keyboard_trackpad", label: "Keyboard / trackpad", hint: "Keys stuck, not typing, or trackpad unresponsive" },
    { id: "virus_malware", label: "Virus / malware", hint: "Pop-ups, slowdown, or suspicious behavior" },
    { id: "not_turning_on", label: "Not turning on", hint: "No power, blue screen, or boot loop" },
    { id: "data_recovery", label: "Data recovery", hint: "Lost files or damaged storage" },
    { id: "other", label: "Other / Not sure", hint: "We'll help diagnose the issue" },
  ],
  COPIER: [
    { id: "paper_jam", label: "Paper jam", hint: "Frequent or persistent paper jams" },
    { id: "print_quality", label: "Poor print quality", hint: "Streaks, fading, or smudges" },
    { id: "connectivity", label: "Connectivity issue", hint: "WiFi, USB, or network printing" },
    { id: "ink_toner", label: "Ink / toner problem", hint: "Not recognizing cartridge or low yield" },
    { id: "other", label: "Other / Not sure", hint: "We'll help diagnose the issue" },
  ],
  CCTV: [
    { id: "new_installation", label: "New installation", hint: "Full CCTV system setup" },
    { id: "camera_not_working", label: "Camera not working", hint: "No feed, offline, or damaged" },
    { id: "dvr_nvr_issue", label: "DVR / NVR issue", hint: "Recording or playback problems" },
    { id: "wiring_problem", label: "Wiring problem", hint: "Connection drops or cable damage" },
    { id: "upgrade", label: "System upgrade", hint: "Add cameras or upgrade equipment" },
    { id: "other", label: "Other / Not sure", hint: "We'll help assess your needs" },
  ],
  AC: [
    { id: "not_cooling", label: "Not cooling", hint: "Unit runs but room stays warm" },
    { id: "gas_refill", label: "Gas refill needed", hint: "Low refrigerant or weak cooling" },
    { id: "strange_noise", label: "Strange noise", hint: "Rattling, buzzing, or clicking" },
    { id: "water_leaking", label: "Water leaking", hint: "Dripping from indoor or outdoor unit" },
    { id: "general_service", label: "General service", hint: "Routine cleaning & maintenance" },
    { id: "new_installation", label: "New installation", hint: "Install a new AC unit" },
    { id: "other", label: "Other / Not sure", hint: "We'll help diagnose the issue" },
  ],
  SOLAR: [
    { id: "new_installation", label: "New installation", hint: "Complete solar system setup" },
    { id: "panel_issue", label: "Panel issue", hint: "Low output or physical damage" },
    { id: "inverter_problem", label: "Inverter problem", hint: "Error codes or no output" },
    { id: "battery_issue", label: "Battery issue", hint: "Not holding charge or degraded" },
    { id: "maintenance", label: "Maintenance check", hint: "Routine inspection & cleaning" },
    { id: "other", label: "Other / Not sure", hint: "We'll help assess your needs" },
  ],
  SMART_HOME_OFFICE: [
    { id: "new_setup", label: "New smart home setup", hint: "Automation, lighting, or IoT" },
    { id: "device_not_responding", label: "Device not responding", hint: "Offline or uncontrollable" },
    { id: "integration_issue", label: "Integration issue", hint: "Devices not working together" },
    { id: "other", label: "Other / Not sure", hint: "We'll help assess your needs" },
  ],
  CONSUMER_ELEC: [
    { id: "tv_no_display", label: "TV — no display", hint: "Black screen, no picture, or lines" },
    { id: "audio_issue", label: "Audio issue", hint: "No sound, distortion, or Bluetooth" },
    { id: "power_issue", label: "Power issue", hint: "Won't turn on or keeps shutting off" },
    { id: "remote_problem", label: "Remote / control", hint: "Remote not working or pairing" },
    { id: "other", label: "Other / Not sure", hint: "We'll help diagnose the issue" },
  ],
  NETWORK: [
    { id: "internet_slow", label: "Internet slow / dropping", hint: "Buffering, disconnections, or lag" },
    { id: "wifi_setup", label: "WiFi setup", hint: "New router, extender, or mesh" },
    { id: "network_setup", label: "Network setup", hint: "Office LAN, cabling, or switches" },
    { id: "server_issue", label: "Server issue", hint: "NAS, file server, or access" },
    { id: "other", label: "Other / Not sure", hint: "We'll help assess your needs" },
  ],
};

export function getIssuesForCategory(code: string): CategoryIssue[] {
  return CATEGORY_ISSUES[code] || [{ id: "other", label: "Other / Not sure", hint: "We'll help diagnose the issue" }];
}
