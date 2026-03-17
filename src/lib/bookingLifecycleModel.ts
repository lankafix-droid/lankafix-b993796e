/**
 * Booking Lifecycle Model
 * Structured stages for the full booking journey with human-controlled transitions.
 * Advisory only — does not modify booking state.
 */

export type BookingLifecycleStage =
  | "booking_submitted"
  | "awaiting_operator_review"
  | "awaiting_partner_selection"
  | "awaiting_partner_response"
  | "awaiting_customer_confirmation"
  | "awaiting_quote"
  | "quote_ready"
  | "awaiting_quote_approval"
  | "partner_assigned"
  | "scheduled"
  | "en_route"
  | "service_in_progress"
  | "awaiting_completion_confirmation"
  | "completed"
  | "cancelled"
  | "escalated"
  | "dispute_opened";

export interface LifecycleStageInfo {
  stage: BookingLifecycleStage;
  label: string;
  description: string;
  trustNote: string;
  actor: "customer" | "operator" | "partner" | "system";
  actorLabel: string;
  colorClass: string;
  badgeBg: string;
  order: number;
}

export const LIFECYCLE_STAGES: Record<BookingLifecycleStage, LifecycleStageInfo> = {
  booking_submitted: {
    stage: "booking_submitted",
    label: "Booking Received",
    description: "Your service request has been received successfully.",
    trustNote: "A LankaFix operator will review your request and find the right technician for you. You'll be updated at each step.",
    actor: "customer",
    actorLabel: "You",
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
    order: 1,
  },
  awaiting_operator_review: {
    stage: "awaiting_operator_review",
    label: "Under Review",
    description: "A LankaFix operator is reviewing your request.",
    trustNote: "Our team personally checks every booking for quality and safety before proceeding. You'll hear from us shortly.",
    actor: "operator",
    actorLabel: "LankaFix Team",
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
    order: 2,
  },
  awaiting_partner_selection: {
    stage: "awaiting_partner_selection",
    label: "Finding Technician",
    description: "We're matching you with verified technicians nearby.",
    trustNote: "Only verified, rated, and background-checked professionals are considered. Our team selects the best match for your job.",
    actor: "operator",
    actorLabel: "LankaFix Team",
    colorClass: "text-accent",
    badgeBg: "bg-accent/10 text-accent",
    order: 3,
  },
  awaiting_partner_response: {
    stage: "awaiting_partner_response",
    label: "Awaiting Technician",
    description: "A matched technician is reviewing your request.",
    trustNote: "The technician will confirm availability shortly. If they're unavailable, we'll find another verified professional for you.",
    actor: "partner",
    actorLabel: "Technician",
    colorClass: "text-accent",
    badgeBg: "bg-accent/10 text-accent",
    order: 4,
  },
  awaiting_customer_confirmation: {
    stage: "awaiting_customer_confirmation",
    label: "Your Confirmation Needed",
    description: "Please review and confirm the details.",
    trustNote: "Nothing proceeds without your approval. Take your time to review — our support team is available if you need help.",
    actor: "customer",
    actorLabel: "You",
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
    order: 5,
  },
  awaiting_quote: {
    stage: "awaiting_quote",
    label: "Awaiting Quote",
    description: "The technician is preparing a detailed quote.",
    trustNote: "You'll see all costs — labour, parts, and any fees — before any work begins. No surprises, no hidden charges.",
    actor: "partner",
    actorLabel: "Technician",
    colorClass: "text-accent",
    badgeBg: "bg-accent/10 text-accent",
    order: 6,
  },
  quote_ready: {
    stage: "quote_ready",
    label: "Quote Ready",
    description: "A detailed quote has been submitted for your review.",
    trustNote: "Review every line item carefully. All charges are transparent. If anything seems unclear, contact LankaFix support for help.",
    actor: "partner",
    actorLabel: "Technician",
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
    order: 7,
  },
  awaiting_quote_approval: {
    stage: "awaiting_quote_approval",
    label: "Approval Needed",
    description: "Please review and approve the quote to proceed.",
    trustNote: "Work only begins after you approve. Your approval protects you from unexpected charges. Need help deciding? Contact our team.",
    actor: "customer",
    actorLabel: "You",
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
    order: 8,
  },
  partner_assigned: {
    stage: "partner_assigned",
    label: "Technician Assigned",
    description: "A verified technician has been assigned to your job.",
    trustNote: "Your technician's identity is verified by LankaFix. You'll be notified when they're on the way.",
    actor: "system",
    actorLabel: "LankaFix",
    colorClass: "text-green-600",
    badgeBg: "bg-green-500/10 text-green-700",
    order: 9,
  },
  scheduled: {
    stage: "scheduled",
    label: "Scheduled",
    description: "Your service has been scheduled.",
    trustNote: "You'll receive a reminder before the technician arrives. If timing changes, we'll let you know immediately.",
    actor: "system",
    actorLabel: "LankaFix",
    colorClass: "text-green-600",
    badgeBg: "bg-green-500/10 text-green-700",
    order: 10,
  },
  en_route: {
    stage: "en_route",
    label: "Technician En Route",
    description: "Your technician is on the way to your location.",
    trustNote: "Track their live location on the map. If there's a delay, our team will coordinate an updated arrival.",
    actor: "partner",
    actorLabel: "Technician",
    colorClass: "text-green-600",
    badgeBg: "bg-green-500/10 text-green-700",
    order: 11,
  },
  service_in_progress: {
    stage: "service_in_progress",
    label: "Service In Progress",
    description: "The technician is performing the service.",
    trustNote: "No additional work will begin without your separate approval. If you have any concerns, contact LankaFix support.",
    actor: "partner",
    actorLabel: "Technician",
    colorClass: "text-green-600",
    badgeBg: "bg-green-500/10 text-green-700",
    order: 12,
  },
  awaiting_completion_confirmation: {
    stage: "awaiting_completion_confirmation",
    label: "Confirm Completion",
    description: "Please confirm the service was completed satisfactorily.",
    trustNote: "Confirm only if you're satisfied. If something is wrong, report it before confirming. Your warranty rights are protected through proper reporting.",
    actor: "customer",
    actorLabel: "You",
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
    order: 13,
  },
  completed: {
    stage: "completed",
    label: "Completed",
    description: "Your service has been completed successfully.",
    trustNote: "Rate your experience to help other customers. Your warranty is now active — keep your Job ID for future claims.",
    actor: "system",
    actorLabel: "LankaFix",
    colorClass: "text-green-600",
    badgeBg: "bg-green-500/10 text-green-700",
    order: 14,
  },
  cancelled: {
    stage: "cancelled",
    label: "Cancelled",
    description: "This booking has been cancelled.",
    trustNote: "If you have questions about this cancellation, our support team is ready to help. You can rebook anytime.",
    actor: "system",
    actorLabel: "LankaFix",
    colorClass: "text-destructive",
    badgeBg: "bg-destructive/10 text-destructive",
    order: 15,
  },
  escalated: {
    stage: "escalated",
    label: "Escalated",
    description: "A senior operator is personally handling your booking.",
    trustNote: "Your case has been escalated for priority attention. A senior LankaFix team member is reviewing this to ensure the best outcome.",
    actor: "operator",
    actorLabel: "Senior Operator",
    colorClass: "text-amber-600",
    badgeBg: "bg-amber-500/10 text-amber-700",
    order: 16,
  },
  dispute_opened: {
    stage: "dispute_opened",
    label: "Under Review",
    description: "Your concern has been raised and our mediation team is reviewing it.",
    trustNote: "Our team will review this fairly and contact you with a resolution. No automatic actions are taken — a human operator handles every case.",
    actor: "operator",
    actorLabel: "LankaFix Mediation Team",
    colorClass: "text-red-600",
    badgeBg: "bg-red-500/10 text-red-700",
    order: 17,
  },
};

/** Map DB booking status to lifecycle stage */
export function mapBookingStatusToStage(
  status: string,
  dispatchStatus?: string | null
): BookingLifecycleStage {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "repair_started") return "service_in_progress";
  if (status === "quote_approved") return "partner_assigned";
  if (status === "quote_submitted") return "awaiting_quote_approval";
  if (status === "assigned" || status === "tech_confirmed") return "partner_assigned";
  if (status === "tech_en_route") return "en_route";
  if (status === "tech_arrived" || status === "inspecting") return "service_in_progress";

  // Dispatch-level mapping
  if (dispatchStatus === "escalated" || dispatchStatus === "no_provider_found") return "escalated";
  if (dispatchStatus === "dispatching" || dispatchStatus === "pending_acceptance") return "awaiting_partner_response";
  if (dispatchStatus === "accepted" || dispatchStatus === "ops_confirmed") return "partner_assigned";

  if (status === "requested" || status === "submitted") return "booking_submitted";
  if (status === "confirmed") return "awaiting_partner_selection";

  return "booking_submitted";
}

/** Get ordered stages for a booking's progress timeline */
export function getProgressStages(currentStage: BookingLifecycleStage): {
  completed: BookingLifecycleStage[];
  current: BookingLifecycleStage;
  pending: BookingLifecycleStage[];
} {
  const normalFlow: BookingLifecycleStage[] = [
    "booking_submitted",
    "awaiting_partner_selection",
    "partner_assigned",
    "en_route",
    "service_in_progress",
    "completed",
  ];

  const currentInfo = LIFECYCLE_STAGES[currentStage];
  const currentOrder = currentInfo.order;

  const completed = normalFlow.filter((s) => LIFECYCLE_STAGES[s].order < currentOrder);
  const pending = normalFlow.filter((s) => LIFECYCLE_STAGES[s].order > currentOrder);

  return { completed, current: currentStage, pending };
}
