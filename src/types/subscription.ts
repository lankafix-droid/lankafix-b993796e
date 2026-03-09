/**
 * LankaFix Stage 11 — Subscription / AMC Engine Types
 */
import type { CategoryCode } from "./booking";

export type DeviceCategoryCode = CategoryCode | "ROUTER";

export type PlanTier = "basic" | "standard" | "premium";

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending_renewal";

export type ServiceCreditStatus = "available" | "used" | "expired";

export type AmcJobStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "missed" | "rescheduled";

export interface RegisteredDevice {
  deviceId: string;
  deviceName: string;
  category: DeviceCategoryCode;
  brand: string;
  model: string;
  purchaseYear: number;
  installationLocation: string;
  warrantyStatus: "active" | "expired" | "unknown";
  createdAt: string;
}

export interface DeviceServiceRecord {
  id: string;
  deviceId: string;
  date: string;
  serviceType: string;
  technicianName: string;
  findings: string;
  partsReplaced: string[];
  photos: string[];
  rating?: number;
}

export interface ServiceCredit {
  id: string;
  subscriptionId: string;
  status: ServiceCreditStatus;
  usedForJobId?: string;
  usedAt?: string;
  expiresAt: string;
}

export interface CarePlanDefinition {
  id: string;
  category: DeviceCategoryCode;
  tier: PlanTier;
  name: string;
  annualPrice: number;
  visitsPerYear: number;
  serviceCredits: number;
  features: string[];
  serviceChecklist: string[];
  priorityDispatch: boolean;
  laborDiscount: number; // percent
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  deviceId: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  renewalDate: string;
  credits: ServiceCredit[];
  amcVisits: AmcVisit[];
  createdAt: string;
}

export interface AmcVisit {
  id: string;
  subscriptionId: string;
  scheduledDate: string;
  status: AmcJobStatus;
  technicianId?: string;
  technicianName?: string;
  completedAt?: string;
  serviceReport?: string;
  checklist: { item: string; completed: boolean }[];
}

export interface BundlePlan {
  id: string;
  name: string;
  description: string;
  deviceSlots: number;
  annualPrice: number;
  visitsPerYear: number;
  laborDiscount: number;
  priorityDispatch: boolean;
  features: string[];
}

export interface SubscriptionAnalytics {
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  renewalRate: number;
  churnRate: number;
  categoryDemand: Record<string, number>;
}

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  basic: "Basic Care",
  standard: "Standard Care",
  premium: "Premium Care",
};

export const PLAN_TIER_COLORS: Record<PlanTier, string> = {
  basic: "bg-muted text-muted-foreground",
  standard: "bg-primary/10 text-primary",
  premium: "bg-warning/10 text-warning",
};

export const DEVICE_CATEGORY_LABELS: Record<DeviceCategoryCode, string> = {
  AC: "AC / Air Conditioner",
  CCTV: "CCTV / Security Camera",
  IT: "Computer / Laptop",
  MOBILE: "Mobile / Tablet",
  COPIER: "Printer / Copier",
  SOLAR: "Solar System",
  SMART_HOME_OFFICE: "Smart Home / Office",
  CONSUMER_ELEC: "Consumer Electronics",
  PRINT_SUPPLIES: "Printing Supplies",
  ROUTER: "Router / WiFi",
  ELECTRICAL: "Electrical System",
  PLUMBING: "Plumbing System",
  NETWORK: "Network / Internet",
  HOME_SECURITY: "Home Security System",
  POWER_BACKUP: "Power Backup / UPS",
  APPLIANCE_INSTALL: "Appliance Installation",
};

export const SEASONAL_RECOMMENDATIONS: Partial<Record<DeviceCategoryCode, { months: number[]; reason: string }>> = {
  AC: { months: [3, 9], reason: "Pre-season maintenance before hot/humid months" },
  SOLAR: { months: [1, 4, 7, 10], reason: "Quarterly panel cleaning for optimal output" },
  COPIER: { months: [3, 9], reason: "Bi-annual preventive maintenance" },
  CCTV: { months: [6, 12], reason: "Semi-annual camera health inspection" },
};
