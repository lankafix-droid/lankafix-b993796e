/**
 * Service-type-aware warranty and reminder rules.
 * Falls back to category defaults if no service-type match.
 */

export interface ServiceTypeWarrantyRule {
  durationDays: number;
  text: string;
  conditional?: string;
}

export interface ServiceTypeReminderRule {
  months: number | null; // null = no reminder
}

/** service_type → warranty override */
const SERVICE_TYPE_WARRANTY: Record<string, ServiceTypeWarrantyRule> = {
  // MOBILE
  "screen_replacement": { durationDays: 90, text: "90-day screen replacement warranty" },
  "battery_replacement": { durationDays: 60, text: "60-day battery replacement warranty" },
  "water_damage": { durationDays: 14, text: "14-day limited water damage service warranty", conditional: "Does not cover progressive corrosion" },
  "motherboard_repair": { durationDays: 30, text: "30-day motherboard repair warranty — conditional on no physical damage" },
  // IT
  "software_fix": { durationDays: 14, text: "14-day software fix warranty" },
  "software_install": { durationDays: 14, text: "14-day software installation warranty" },
  "hardware_replacement": { durationDays: 90, text: "90-day hardware replacement warranty" },
  "network_setup": { durationDays: 30, text: "30-day network configuration warranty" },
  "data_recovery": { durationDays: 7, text: "7-day data recovery service warranty" },
  // AC
  "gas_refill": { durationDays: 30, text: "30-day AC gas refill warranty" },
  "compressor_replacement": { durationDays: 90, text: "90-day compressor replacement warranty" },
  "ac_cleaning": { durationDays: 14, text: "14-day AC cleaning service warranty" },
  "ac_full_service": { durationDays: 90, text: "90-day AC full service warranty" },
  // CONSUMER_ELEC
  "minor_repair": { durationDays: 30, text: "30-day minor repair warranty" },
  "major_repair": { durationDays: 90, text: "90-day major repair warranty" },
  "component_replacement": { durationDays: 90, text: "90-day component replacement warranty" },
  // COPIER
  "toner_replacement": { durationDays: 7, text: "7-day toner installation warranty" },
  "printer_maintenance": { durationDays: 30, text: "30-day printer maintenance warranty" },
  // ELECTRICAL
  "wiring_repair": { durationDays: 60, text: "60-day wiring repair warranty" },
  "switch_replacement": { durationDays: 60, text: "60-day switch/socket replacement warranty" },
};

/** service_type → reminder override */
const SERVICE_TYPE_REMINDER: Record<string, ServiceTypeReminderRule> = {
  "ac_full_service": { months: 6 },
  "ac_cleaning": { months: 3 },
  "gas_refill": { months: 6 },
  "compressor_replacement": { months: 12 },
  "printer_maintenance": { months: 6 },
  "toner_replacement": { months: null }, // no long-term reminder
  "software_fix": { months: null },
  "software_install": { months: null },
  "data_recovery": { months: null },
  "network_setup": { months: 12 },
  "hardware_replacement": { months: 12 },
  "water_damage": { months: null },
};

export function getServiceTypeWarranty(serviceType: string | null | undefined): ServiceTypeWarrantyRule | null {
  if (!serviceType) return null;
  const key = serviceType.toLowerCase().replace(/[\s-]+/g, "_");
  return SERVICE_TYPE_WARRANTY[key] || null;
}

export function getServiceTypeReminderMonths(serviceType: string | null | undefined): number | null | undefined {
  if (!serviceType) return undefined; // undefined = use category default
  const key = serviceType.toLowerCase().replace(/[\s-]+/g, "_");
  const rule = SERVICE_TYPE_REMINDER[key];
  if (!rule) return undefined; // no override, use category default
  return rule.months; // null = explicitly no reminder
}
