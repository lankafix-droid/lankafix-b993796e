/**
 * Category-based evidence requirements for Service Proof Layer V2.
 * Determines min before/after photos per category.
 */
import type { CategoryCode } from "@/types/booking";

export interface EvidenceRule {
  requiresBefore: boolean;
  requiresAfter: boolean;
  minBeforePhotos: number;
  minAfterPhotos: number;
  privacyNote?: string;
}

const MANDATORY_CATEGORIES: CategoryCode[] = [
  "AC", "COPIER", "IT", "CCTV", "SMART_HOME_OFFICE", "ELECTRICAL",
  "CONSUMER_ELEC", "PLUMBING", "SOLAR", "HOME_SECURITY", "POWER_BACKUP",
  "APPLIANCE_INSTALL", "NETWORK",
];

const OPTIONAL_CATEGORIES: CategoryCode[] = [
  "PRINT_SUPPLIES",
];

export function getEvidenceRule(categoryCode: string): EvidenceRule {
  if (categoryCode === "MOBILE") {
    return {
      requiresBefore: true,
      requiresAfter: true,
      minBeforePhotos: 1,
      minAfterPhotos: 1,
      privacyNote: "Avoid capturing personal data visible on screen.",
    };
  }

  if (OPTIONAL_CATEGORIES.includes(categoryCode as CategoryCode)) {
    return {
      requiresBefore: false,
      requiresAfter: false,
      minBeforePhotos: 0,
      minAfterPhotos: 0,
    };
  }

  if (MANDATORY_CATEGORIES.includes(categoryCode as CategoryCode)) {
    return {
      requiresBefore: true,
      requiresAfter: true,
      minBeforePhotos: 1,
      minAfterPhotos: 1,
    };
  }

  return {
    requiresBefore: false,
    requiresAfter: true,
    minBeforePhotos: 0,
    minAfterPhotos: 1,
  };
}

// Evidence completion states for the proof workflow
export type EvidenceStatus =
  | "none"
  | "before_pending"
  | "before_uploaded"
  | "service_in_progress"
  | "after_pending"
  | "after_uploaded"
  | "customer_review_pending"
  | "customer_confirmed"
  | "dispute_open";

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  none: "Not Started",
  before_pending: "Before Evidence Pending",
  before_uploaded: "Before Evidence Uploaded",
  service_in_progress: "Service In Progress",
  after_pending: "After Evidence Pending",
  after_uploaded: "After Evidence Uploaded",
  customer_review_pending: "Customer Review Pending",
  customer_confirmed: "Service Confirmed",
  dispute_open: "Dispute Open",
};

export const EVIDENCE_STATUS_COLORS: Record<EvidenceStatus, string> = {
  none: "bg-muted text-muted-foreground",
  before_pending: "bg-warning/10 text-warning",
  before_uploaded: "bg-primary/10 text-primary",
  service_in_progress: "bg-primary/10 text-primary",
  after_pending: "bg-warning/10 text-warning",
  after_uploaded: "bg-primary/10 text-primary",
  customer_review_pending: "bg-warning/10 text-warning",
  customer_confirmed: "bg-success/10 text-success",
  dispute_open: "bg-destructive/10 text-destructive",
};

// Maintenance reminder intervals (months) by category
export const MAINTENANCE_INTERVALS: Partial<Record<CategoryCode, number>> = {
  AC: 6,
  IT: 12,
  COPIER: 6,
  NETWORK: 12,
  CCTV: 12,
  SOLAR: 6,
  ELECTRICAL: 12,
  PLUMBING: 12,
  SMART_HOME_OFFICE: 12,
  POWER_BACKUP: 6,
  CONSUMER_ELEC: 12,
};
