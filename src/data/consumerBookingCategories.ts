/**
 * Consumer Service Booking — Category & Issue definitions
 * Maps to existing category_code values used across the platform.
 */

export interface BookingCategory {
  code: string;
  label: string;
  icon: string;
  description: string;
}

export interface CategoryIssue {
  id: string;
  label: string;
}

export const CONSUMER_CATEGORIES: BookingCategory[] = [
  { code: "MOBILE", label: "Mobile Phone Repair", icon: "📱", description: "Screen, battery, charging & more" },
  { code: "IT", label: "Laptop Repair", icon: "💻", description: "Hardware, software & performance" },
  { code: "COPIER", label: "Printer Repair", icon: "🖨️", description: "Paper jams, ink & connectivity" },
  { code: "CCTV", label: "CCTV Installation", icon: "📹", description: "Setup, wiring & configuration" },
  { code: "AC", label: "AC Repair", icon: "❄️", description: "Cooling, gas refill & maintenance" },
  { code: "SOLAR", label: "Solar Solutions", icon: "☀️", description: "Panels, inverters & batteries" },
  { code: "SMART_HOME_OFFICE", label: "Smart Home Solutions", icon: "🏠", description: "Automation, IoT & integration" },
  { code: "CONSUMER_ELEC", label: "Consumer Electronics Repair", icon: "📺", description: "TV, audio & home appliances" },
  { code: "NETWORK", label: "IT Services", icon: "🌐", description: "Network, server & cloud support" },
];

export const CATEGORY_ISSUES: Record<string, CategoryIssue[]> = {
  MOBILE: [
    { id: "screen_broken", label: "Screen broken" },
    { id: "battery_problem", label: "Battery problem" },
    { id: "charging_issue", label: "Charging issue" },
    { id: "water_damage", label: "Water damage" },
    { id: "camera_issue", label: "Camera issue" },
    { id: "other", label: "Other / Unknown" },
  ],
  IT: [
    { id: "slow_performance", label: "Slow performance" },
    { id: "screen_issue", label: "Screen issue" },
    { id: "keyboard_trackpad", label: "Keyboard / trackpad problem" },
    { id: "virus_malware", label: "Virus / malware" },
    { id: "not_turning_on", label: "Not turning on" },
    { id: "other", label: "Other / Unknown" },
  ],
  COPIER: [
    { id: "paper_jam", label: "Paper jam" },
    { id: "print_quality", label: "Poor print quality" },
    { id: "connectivity", label: "Connectivity issue" },
    { id: "ink_toner", label: "Ink / toner problem" },
    { id: "other", label: "Other / Unknown" },
  ],
  CCTV: [
    { id: "new_installation", label: "New installation" },
    { id: "camera_not_working", label: "Camera not working" },
    { id: "dvr_nvr_issue", label: "DVR / NVR issue" },
    { id: "wiring_problem", label: "Wiring problem" },
    { id: "other", label: "Other / Unknown" },
  ],
  AC: [
    { id: "not_cooling", label: "Not cooling" },
    { id: "gas_refill", label: "Gas refill needed" },
    { id: "strange_noise", label: "Strange noise" },
    { id: "water_leaking", label: "Water leaking" },
    { id: "general_service", label: "General service / cleaning" },
    { id: "other", label: "Other / Unknown" },
  ],
  SOLAR: [
    { id: "new_installation", label: "New installation" },
    { id: "panel_issue", label: "Panel issue" },
    { id: "inverter_problem", label: "Inverter problem" },
    { id: "battery_issue", label: "Battery issue" },
    { id: "other", label: "Other / Unknown" },
  ],
  SMART_HOME_OFFICE: [
    { id: "new_setup", label: "New smart home setup" },
    { id: "device_not_responding", label: "Device not responding" },
    { id: "integration_issue", label: "Integration issue" },
    { id: "other", label: "Other / Unknown" },
  ],
  CONSUMER_ELEC: [
    { id: "tv_no_display", label: "TV no display" },
    { id: "audio_issue", label: "Audio issue" },
    { id: "power_issue", label: "Power issue" },
    { id: "remote_problem", label: "Remote / control problem" },
    { id: "other", label: "Other / Unknown" },
  ],
  NETWORK: [
    { id: "internet_slow", label: "Internet slow / dropping" },
    { id: "wifi_setup", label: "WiFi setup" },
    { id: "network_setup", label: "Network setup" },
    { id: "server_issue", label: "Server issue" },
    { id: "other", label: "Other / Unknown" },
  ],
};

export function getIssuesForCategory(code: string): CategoryIssue[] {
  return CATEGORY_ISSUES[code] || [{ id: "other", label: "Other / Unknown" }];
}
