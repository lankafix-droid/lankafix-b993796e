/**
 * LankaFix Stage 12 — Provider ERP Types
 */
import type { CategoryCode, ProviderTier } from "./booking";

export type VerificationStatus = "pending" | "verified" | "suspended";

export type ShiftDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface ProviderProfile {
  providerId: string;
  companyName: string;
  businessRegistrationNumber: string;
  serviceCategories: CategoryCode[];
  operatingZones: string[];
  contactPhone: string;
  contactEmail: string;
  businessAddress: string;
  verificationStatus: VerificationStatus;
  ratingScore: number;
  totalCompletedJobs: number;
  businessHours: { start: string; end: string };
  emergencyEnabled: boolean;
  createdAt: string;
}

export interface TechnicianProfile {
  technicianId: string;
  technicianName: string;
  providerId: string;
  phoneNumber: string;
  skillsCategories: CategoryCode[];
  yearsOfExperience: number;
  certifications: string[];
  currentZone: string;
  ratingScore: number;
  totalCompletedJobs: number;
  performanceScore: number;
  dailyJobCapacity: number;
  maxConcurrentJobs: number;
  averageJobDurationMinutes: number;
  todayJobCount: number;
  shift: TechnicianShift;
  trainingStatus: Record<string, boolean>;
}

export interface TechnicianShift {
  startTime: string;  // "09:00"
  endTime: string;    // "18:00"
  workingDays: ShiftDay[];
}

export interface FleetSummary {
  totalTechnicians: number;
  online: number;
  busy: number;
  offline: number;
  totalCapacityToday: number;
  usedCapacityToday: number;
}

export interface ProviderPerformanceMetrics {
  averageResponseMinutes: number;
  jobAcceptanceRate: number;
  customerRating: number;
  completionRate: number;
  dailyJobCount: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  jobsByCategory: Record<string, number>;
  revenueByCategory: Record<string, number>;
}

export interface ServiceChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface JobDispute {
  id: string;
  jobId: string;
  raisedBy: "provider" | "technician" | "customer";
  reason: string;
  description: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export const DISPUTE_REASONS = [
  { value: "customer_refused_payment", label: "Customer Refused Payment" },
  { value: "incorrect_service_request", label: "Incorrect Service Request" },
  { value: "safety_issue", label: "Safety Issue" },
  { value: "scope_disagreement", label: "Scope Disagreement" },
  { value: "parts_unavailable", label: "Parts Unavailable" },
  { value: "other", label: "Other" },
] as const;

export type DisputeReason = typeof DISPUTE_REASONS[number]["value"];

/** Category → service checklist templates */
export const SERVICE_CHECKLISTS: Partial<Record<CategoryCode, string[]>> = {
  AC: ["Clean filters", "Check gas pressure", "Inspect wiring", "Test cooling performance", "Check drainage", "Inspect outdoor unit"],
  CCTV: ["Check camera alignment", "DVR/NVR health check", "Inspect cables", "Test night vision", "Firmware update", "Storage health check"],
  MOBILE: ["Battery health check", "Screen inspection", "Port cleaning", "Software diagnostics", "Water damage check"],
  IT: ["Hardware diagnostics", "OS health check", "Virus scan", "Network check", "Disk health", "Backup verification"],
  COPIER: ["Internal cleaning", "Roller inspection", "Toner alignment", "Paper feed test", "Print quality test", "Firmware check"],
  SOLAR: ["Panel cleaning", "Inverter inspection", "Cable check", "Output efficiency test", "Battery health check", "Mounting integrity"],
  SMART_HOME_OFFICE: ["Device connectivity", "Hub inspection", "Firmware updates", "Automation test", "Network optimization"],
  CONSUMER_ELEC: ["Power supply check", "Port inspection", "Firmware update", "Performance test", "Safety inspection"],
};

export const SHIFT_DAY_LABELS: Record<ShiftDay, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

export const VERIFICATION_STATUS_STYLES: Record<VerificationStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-warning/10 text-warning" },
  verified: { label: "Verified", color: "bg-success/10 text-success" },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-destructive" },
};
