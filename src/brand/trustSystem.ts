import type { BookingStatus, BookingState, PartQuality } from "@/types/booking";
import type { MascotState, MascotBadge } from "@/components/brand/MascotIcon";
import {
  ShieldCheck, KeyRound, CheckCircle2, ListChecks, BadgeCheck,
  Siren, Headphones, MapPin, Clock, CreditCard, ReceiptText,
} from "lucide-react";

// ============================================================
// A1) Mascot state mapping
// ============================================================
export const statusToMascotState: Record<BookingStatus, MascotState> = {
  requested: "default",
  matching: "default",
  awaiting_partner_confirmation: "default",
  scheduled: "default",
  assigned: "verified",
  tech_en_route: "on_the_way",
  arrived: "verified",
  inspection_started: "in_progress",
  in_progress: "in_progress",
  quote_submitted: "verified",
  quote_revised: "verified",
  quote_approved: "verified",
  quote_rejected: "default",
  repair_started: "in_progress",
  completed: "completed",
  rated: "completed",
  cancelled: "default",
};

// ============================================================
// A2) Quality badges
// ============================================================
export const QUALITY_BADGES: Record<PartQuality, { label: string; color: string }> = {
  genuine: { label: "Genuine", color: "bg-success/10 text-success border-success/20" },
  oem_grade: { label: "OEM Grade", color: "bg-primary/10 text-primary border-primary/20" },
  compatible: { label: "Compatible", color: "bg-warning/10 text-warning border-warning/20" },
};

// ============================================================
// A3) Status transition guard
// ============================================================
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

// ============================================================
// A4) SOS severity
// ============================================================
export type SosSeverity = "low" | "medium" | "high";

export const SOS_SEVERITY_CONFIG: Record<SosSeverity, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive" },
};

// ============================================================
// A5) Trust icon registry (lucide components)
// ============================================================
export const TRUST_ICONS = {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ListChecks,
  BadgeCheck,
  Siren,
  Headphones,
  MapPin,
  Clock,
  CreditCard,
  ReceiptText,
} as const;

// ============================================================
// E2) Mascot message presets
// ============================================================
export type MascotMessageKey =
  | "welcome"
  | "estimate"
  | "assigned"
  | "on_the_way"
  | "in_progress"
  | "quote_ready"
  | "completed"
  | "warranty"
  | "sos"
  | "rating";

export interface MascotMessage {
  title: string;
  subtitle: string;
  state: MascotState;
  badge?: MascotBadge;
}

export const MASCOT_MESSAGES: Record<MascotMessageKey, MascotMessage> = {
  welcome: { title: "Welcome to LankaFix", subtitle: "Verified tech. Fixed fast.", state: "default" },
  estimate: { title: "Pricing Estimate", subtitle: "Here's the estimated cost. Final price after diagnosis.", state: "default" },
  assigned: { title: "Technician Assigned", subtitle: "Verified technician assigned to your job.", state: "verified", badge: "verified" },
  on_the_way: { title: "On the Way", subtitle: "Your technician is en route.", state: "on_the_way" },
  in_progress: { title: "Work In Progress", subtitle: "Your repair is being handled.", state: "in_progress" },
  quote_ready: { title: "Quote Ready", subtitle: "Review and approve your detailed quote.", state: "verified", badge: "verified" },
  completed: { title: "Job Completed", subtitle: "Your service has been completed successfully.", state: "completed", badge: "warranty" },
  warranty: { title: "Warranty Active", subtitle: "Your repair is protected.", state: "completed", badge: "warranty" },
  sos: { title: "Emergency Support", subtitle: "We're here to help — escalate immediately.", state: "emergency", badge: "emergency" },
  rating: { title: "Rate Your Experience", subtitle: "Help us improve with your feedback.", state: "completed" },
};

// ============================================================
// C12) Trust Score computation
// ============================================================
export function computeTrustScore(booking: BookingState): number {
  let score = 0;
  if (booking.technician) score += 15;
  if (booking.timelineEvents.length > 0) score += 10;
  if (booking.startOtpVerifiedAt) score += 20;
  if (booking.completionOtpVerifiedAt) score += 20;
  if (booking.pricing.quoteRequired) {
    if (booking.quote?.selectedOptionId || booking.status === "quote_approved") score += 15;
  } else {
    score += 15;
  }
  if (booking.photos.some((p) => p.type === "after")) score += 10;
  if (booking.payments.completion?.status === "paid") score += 10;
  return Math.min(score, 100);
}

// ============================================================
// C11) Refund eligibility
// ============================================================
export function getRefundEligibility(booking: BookingState): { refundPercent: number; reason: string } {
  const policy = booking.pricing.cancelPolicy;
  if (!policy) return { refundPercent: 0, reason: "No cancel policy defined." };

  const depositPaidAt = booking.payments.deposit?.paidAt;
  const reference = depositPaidAt || booking.createdAt;
  const elapsed = (Date.now() - new Date(reference).getTime()) / 60000;

  if (elapsed <= policy.freeCancelMinutes) {
    return { refundPercent: 100, reason: `Free cancellation (within ${policy.freeCancelMinutes} min).` };
  }
  if (booking.dispatchStatus === "pending") {
    return { refundPercent: policy.refundBeforeDispatchPercent, reason: "Technician not yet dispatched." };
  }
  return { refundPercent: policy.refundAfterDispatchPercent, reason: "Technician already dispatched." };
}
