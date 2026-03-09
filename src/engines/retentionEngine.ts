/**
 * LankaFix Customer Retention Engine
 * Tracks repeat usage, generates service reminders, and recommends follow-up services.
 */
import type { CategoryCode } from "@/types/booking";

// ─── Retention Types ────────────────────────────────────────────

export interface ServiceReminder {
  id: string;
  customerId: string;
  categoryCode: CategoryCode;
  serviceLabel: string;
  lastServiceDate: string;
  nextDueDate: string;
  daysUntilDue: number;
  message: string;
  priority: "urgent" | "upcoming" | "future";
  sent: boolean;
}

export interface CrossSellRecommendation {
  triggerCategory: CategoryCode;
  triggerService: string;
  recommendedCategory: CategoryCode;
  recommendedService: string;
  reason: string;
  delayDays: number; // days after trigger to recommend
}

export interface RetentionMetrics {
  totalCustomers: number;
  activeCustomers30d: number;
  repeatRate: number;
  avgBookingsPerCustomer: number;
  churnRisk: number;
  topRetainedCategories: { category: CategoryCode; retentionRate: number }[];
  remindersSent: number;
  remindersConverted: number;
  conversionRate: number;
}

// ─── Maintenance Schedules ──────────────────────────────────────

export const MAINTENANCE_SCHEDULES: Record<string, { intervalMonths: number; label: string; category: CategoryCode }> = {
  ac_general_service: { intervalMonths: 6, label: "AC General Service", category: "AC" },
  ac_full_service: { intervalMonths: 12, label: "AC Full Service", category: "AC" },
  ac_gas_refill: { intervalMonths: 24, label: "AC Gas Refill Check", category: "AC" },
  cctv_maintenance: { intervalMonths: 12, label: "CCTV Annual Maintenance", category: "CCTV" },
  solar_maintenance: { intervalMonths: 6, label: "Solar Panel Cleaning", category: "SOLAR" },
  solar_inverter_check: { intervalMonths: 12, label: "Solar Inverter Inspection", category: "SOLAR" },
  generator_service: { intervalMonths: 6, label: "Generator Service", category: "POWER_BACKUP" },
  ups_battery_check: { intervalMonths: 12, label: "UPS Battery Health Check", category: "POWER_BACKUP" },
  network_health_check: { intervalMonths: 12, label: "Network Health Check", category: "NETWORK" },
  printer_service: { intervalMonths: 6, label: "Printer Maintenance", category: "COPIER" },
};

// ─── Cross-Sell Rules ───────────────────────────────────────────

export const CROSS_SELL_RULES: CrossSellRecommendation[] = [
  { triggerCategory: "CCTV", triggerService: "CCTV Installation", recommendedCategory: "CCTV", recommendedService: "Annual CCTV Maintenance Contract", reason: "Protect your investment with annual maintenance", delayDays: 30 },
  { triggerCategory: "AC", triggerService: "AC Installation", recommendedCategory: "AC", recommendedService: "AC Care Plan", reason: "Keep your new AC running efficiently", delayDays: 14 },
  { triggerCategory: "AC", triggerService: "AC Repair", recommendedCategory: "AC", recommendedService: "AC General Service", reason: "Prevent future breakdowns with regular maintenance", delayDays: 180 },
  { triggerCategory: "SOLAR", triggerService: "Solar Installation", recommendedCategory: "SOLAR", recommendedService: "Solar Maintenance Plan", reason: "Maximize your solar panel efficiency", delayDays: 30 },
  { triggerCategory: "IT", triggerService: "Laptop Repair", recommendedCategory: "IT", recommendedService: "Device Care Plan", reason: "Protect your device from future issues", delayDays: 7 },
  { triggerCategory: "ELECTRICAL", triggerService: "Electrical Wiring", recommendedCategory: "HOME_SECURITY", recommendedService: "Home Security Consultation", reason: "Complete your home upgrade with security", delayDays: 14 },
  { triggerCategory: "NETWORK", triggerService: "Network Setup", recommendedCategory: "SMART_HOME_OFFICE", recommendedService: "Smart Home Setup", reason: "Your network is ready for smart devices", delayDays: 30 },
  { triggerCategory: "MOBILE", triggerService: "Screen Replacement", recommendedCategory: "MOBILE", recommendedService: "Screen Protector & Case", reason: "Protect your new screen", delayDays: 1 },
];

// ─── Reminder Generator ─────────────────────────────────────────

export function generateReminders(
  completedServices: { customerId: string; categoryCode: CategoryCode; serviceKey: string; completedAt: string }[]
): ServiceReminder[] {
  const reminders: ServiceReminder[] = [];
  const now = new Date();

  for (const service of completedServices) {
    const schedule = MAINTENANCE_SCHEDULES[service.serviceKey];
    if (!schedule) continue;

    const completedDate = new Date(service.completedAt);
    const nextDue = new Date(completedDate);
    nextDue.setMonth(nextDue.getMonth() + schedule.intervalMonths);

    const daysUntilDue = Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const priority: ServiceReminder["priority"] =
      daysUntilDue <= 0 ? "urgent" :
      daysUntilDue <= 30 ? "upcoming" : "future";

    const message = daysUntilDue <= 0
      ? `Your ${schedule.label} is overdue! Book now to keep your ${schedule.category} in top condition.`
      : daysUntilDue <= 30
      ? `Your ${schedule.label} is due in ${daysUntilDue} days. Schedule now for priority service.`
      : `Next ${schedule.label} due in ${daysUntilDue} days.`;

    reminders.push({
      id: `REM-${service.customerId}-${service.serviceKey}`,
      customerId: service.customerId,
      categoryCode: schedule.category,
      serviceLabel: schedule.label,
      lastServiceDate: service.completedAt,
      nextDueDate: nextDue.toISOString(),
      daysUntilDue,
      message,
      priority,
      sent: false,
    });
  }

  return reminders.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

// ─── Cross-Sell Matcher ─────────────────────────────────────────

export function getCrossSellRecommendations(
  categoryCode: CategoryCode,
  serviceLabel: string
): CrossSellRecommendation[] {
  return CROSS_SELL_RULES.filter(
    (r) => r.triggerCategory === categoryCode
  );
}

// ─── Mock Data ──────────────────────────────────────────────────

export function generateMockRetentionMetrics(): RetentionMetrics {
  return {
    totalCustomers: 4850,
    activeCustomers30d: 1240,
    repeatRate: 32,
    avgBookingsPerCustomer: 2.4,
    churnRisk: 18,
    topRetainedCategories: [
      { category: "AC", retentionRate: 45 },
      { category: "IT", retentionRate: 38 },
      { category: "PLUMBING", retentionRate: 35 },
      { category: "CCTV", retentionRate: 28 },
      { category: "ELECTRICAL", retentionRate: 26 },
    ],
    remindersSent: 342,
    remindersConverted: 89,
    conversionRate: 26,
  };
}

export function generateMockReminders(): ServiceReminder[] {
  const now = new Date();
  return [
    { id: "REM-001", customerId: "c1", categoryCode: "AC", serviceLabel: "AC General Service", lastServiceDate: new Date(now.getTime() - 200 * 86400000).toISOString(), nextDueDate: new Date(now.getTime() - 17 * 86400000).toISOString(), daysUntilDue: -17, message: "Your AC General Service is overdue! Book now.", priority: "urgent", sent: true },
    { id: "REM-002", customerId: "c2", categoryCode: "SOLAR", serviceLabel: "Solar Panel Cleaning", lastServiceDate: new Date(now.getTime() - 160 * 86400000).toISOString(), nextDueDate: new Date(now.getTime() + 22 * 86400000).toISOString(), daysUntilDue: 22, message: "Solar panel cleaning due in 22 days.", priority: "upcoming", sent: false },
    { id: "REM-003", customerId: "c3", categoryCode: "CCTV", serviceLabel: "CCTV Annual Maintenance", lastServiceDate: new Date(now.getTime() - 300 * 86400000).toISOString(), nextDueDate: new Date(now.getTime() + 65 * 86400000).toISOString(), daysUntilDue: 65, message: "CCTV annual maintenance due in 65 days.", priority: "future", sent: false },
    { id: "REM-004", customerId: "c4", categoryCode: "AC", serviceLabel: "AC Full Service", lastServiceDate: new Date(now.getTime() - 350 * 86400000).toISOString(), nextDueDate: new Date(now.getTime() + 15 * 86400000).toISOString(), daysUntilDue: 15, message: "AC Full Service due in 15 days.", priority: "upcoming", sent: false },
    { id: "REM-005", customerId: "c5", categoryCode: "COPIER", serviceLabel: "Printer Maintenance", lastServiceDate: new Date(now.getTime() - 170 * 86400000).toISOString(), nextDueDate: new Date(now.getTime() + 10 * 86400000).toISOString(), daysUntilDue: 10, message: "Printer maintenance due in 10 days.", priority: "upcoming", sent: false },
  ];
}
