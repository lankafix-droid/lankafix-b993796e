import type { BookingStatus } from "@/types/booking";
import type { MascotState, MascotBadge } from "@/components/brand/MascotIcon";
import type { PartQuality } from "@/types/booking";

// Centralized status → mascot state mapping
export const statusToMascotState: Record<BookingStatus, MascotState> = {
  requested: "default",
  scheduled: "default",
  assigned: "verified",
  tech_en_route: "on_the_way",
  in_progress: "in_progress",
  quote_submitted: "verified",
  quote_approved: "verified",
  quote_rejected: "default",
  quote_revised: "verified",
  completed: "completed",
  rated: "completed",
  cancelled: "default",
};

// Quality badge config for quote options
export const QUALITY_BADGES: Record<PartQuality, { label: string; color: string }> = {
  genuine: { label: "Genuine", color: "bg-success/10 text-success border-success/20" },
  oem_grade: { label: "OEM Grade", color: "bg-primary/10 text-primary border-primary/20" },
  compatible: { label: "Compatible", color: "bg-warning/10 text-warning border-warning/20" },
};

// Valid status transitions map
export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["scheduled", "assigned", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["tech_en_route", "cancelled"],
  tech_en_route: ["in_progress", "cancelled"],
  in_progress: ["quote_submitted", "completed", "cancelled"],
  quote_submitted: ["quote_revised", "quote_approved", "quote_rejected", "cancelled"],
  quote_revised: ["quote_approved", "quote_rejected", "cancelled"],
  quote_approved: ["in_progress", "completed", "cancelled"],
  quote_rejected: ["quote_revised", "cancelled"],
  completed: ["rated"],
  rated: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// SOS severity levels
export type SosSeverity = "low" | "medium" | "high";

export const SOS_SEVERITY_CONFIG: Record<SosSeverity, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive" },
};
