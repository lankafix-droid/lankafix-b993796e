export type CategoryCode = "AC" | "CCTV" | "MOBILE" | "IT" | "SOLAR" | "CONSUMER_ELEC" | "SMART_HOME_OFFICE";

export type ServiceMode = "on_site" | "drop_off" | "pickup_return" | "remote";

export type BookingStatus =
  | "requested"
  | "scheduled"
  | "assigned"
  | "tech_en_route"
  | "in_progress"
  | "quote_submitted"
  | "quote_revised"
  | "quote_approved"
  | "quote_rejected"
  | "completed"
  | "rated"
  | "cancelled";

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  on_site: "On-Site",
  drop_off: "Drop-Off",
  pickup_return: "Pickup & Return",
  remote: "Remote",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  assigned: "Assigned",
  tech_en_route: "Tech En Route",
  in_progress: "In Progress",
  quote_submitted: "Quote Submitted",
  quote_approved: "Quote Approved",
  quote_rejected: "Quote Rejected",
  quote_revised: "Quote Revised",
  completed: "Completed",
  rated: "Rated",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  requested: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/10 text-primary",
  assigned: "bg-primary/10 text-primary",
  tech_en_route: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  quote_submitted: "bg-warning/10 text-warning",
  quote_approved: "bg-success/10 text-success",
  quote_rejected: "bg-destructive/10 text-destructive",
  quote_revised: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  rated: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export const BOOKING_TIMELINE_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Service Requested" },
  { status: "scheduled", label: "Scheduled" },
  { status: "assigned", label: "Technician Assigned" },
  { status: "tech_en_route", label: "Technician On The Way" },
  { status: "in_progress", label: "Work In Progress" },
  { status: "completed", label: "Job Completed" },
];

export const QUOTE_TIMELINE_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Inspection Requested" },
  { status: "scheduled", label: "Inspection Scheduled" },
  { status: "assigned", label: "Technician Assigned" },
  { status: "tech_en_route", label: "Technician On The Way" },
  { status: "in_progress", label: "Inspection In Progress" },
  { status: "quote_submitted", label: "Quote Submitted" },
  { status: "quote_approved", label: "Quote Approved" },
  { status: "completed", label: "Job Completed" },
];

export interface PrecheckQuestion {
  key: string;
  question: string;
  inputType: "boolean" | "single_select" | "text" | "photo_required";
  options?: { label: string; value: string }[];
  required: boolean;
}

export interface Service {
  code: string;
  name: string;
  description: string;
  allowedModes: ServiceMode[];
  requiresQuote: boolean;
  requiresDiagnostic: boolean;
  fromPrice: number;
  precheckQuestions: PrecheckQuestion[];
}

export interface Category {
  code: CategoryCode;
  name: string;
  description: string;
  icon: string;
  fromPrice: number;
  quoteRequired: boolean;
  tags: string[];
  services: Service[];
}

export type PartQuality = "genuine" | "oem_grade" | "compatible";

export interface QuoteItem {
  description: string;
  amount: number;
  partQuality?: PartQuality;
}

export interface WarrantyTerms {
  labor: string;
  parts: string;
  laborDays: number;
  partsDays: number;
}

export interface QuoteOption {
  id: string;
  label: string;
  laborItems: QuoteItem[];
  partsItems: QuoteItem[];
  addOns: QuoteItem[];
  totals: { labor: number; parts: number; addOns: number; total: number };
  warranty: WarrantyTerms;
  partQuality: PartQuality;
}

export interface QuoteData {
  options: QuoteOption[];
  selectedOptionId: string | null;
  recommendedOptionId: string;
  recommendedReason: string;
  scopeIncludes: string[];
  scopeExcludes: string[];
  notes: string;
  expiresAt: string;
  inspectionFindings: string[];
  approvedAt?: string;
  approvedBy?: "customer" | "system";
  // Legacy flat fields for backward compat
  laborItems: QuoteItem[];
  partsItems: QuoteItem[];
  addOns: QuoteItem[];
  totals: { labor: number; parts: number; addOns: number; total: number };
  warranty: WarrantyTerms;
}

export interface TechnicianInfo {
  name: string;
  rating: number;
  eta: string;
  partnerName: string;
  jobsCompleted: number;
  verifiedSince: string;
  specializations: string[];
}

export interface CancelPolicy {
  freeCancelMinutes: number;
  refundBeforeDispatchPercent: number;
  refundAfterDispatchPercent: number;
}

export interface PricingBreakdown {
  visitFee: number;
  diagnosticFee: number;
  emergencySurcharge: number;
  estimatedMin: number;
  estimatedMax: number;
  depositRequired: boolean;
  depositAmount: number;
  partsSeparate: boolean;
  quoteRequired: boolean;
  cancelPolicy: CancelPolicy;
}

export type PaymentMethod = "cash" | "bank_transfer" | "card";
export type PaymentStatus = "pending" | "paid" | "refund_initiated" | "refunded" | "failed";

export interface PaymentIntent {
  type: "deposit" | "completion";
  amount: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  refundableAmount: number;
  refundStatus: "none" | "partial" | "full";
  paidAt?: string;
  reference?: string;
  provider?: "manual" | "gateway";
}

export type DispatchStatus = "pending" | "dispatched" | "arrived";
export type TimelineActor = "system" | "technician" | "customer";

export interface TimelineEventMeta {
  optionId?: string;
  amount?: number;
  paymentKey?: "deposit" | "completion";
}

export interface TimelineEvent {
  timestamp: string;
  title: string;
  description?: string;
  actor: TimelineActor;
  meta?: TimelineEventMeta;
}

export interface BookingPayments {
  deposit?: PaymentIntent;
  completion?: PaymentIntent;
}

export interface BookingPhoto {
  url: string;
  type: "before" | "after" | "issue" | "invoice";
  uploadedAt: string;
}

export interface BookingState {
  jobId: string;
  categoryCode: CategoryCode;
  serviceCode: string;
  serviceName: string;
  categoryName: string;
  serviceMode: ServiceMode;
  isEmergency: boolean;
  precheckAnswers: Record<string, string | boolean>;
  photos: BookingPhoto[];
  zone: string;
  address: string;
  scheduledDate: string;
  scheduledTime: string;
  preferredWindow?: string;
  pricing: PricingBreakdown;
  technician: TechnicianInfo | null;
  status: BookingStatus;
  createdAt: string;
  quote: QuoteData | null;
  rating: number | null;
  cancelReason: string | null;
  startOtpRequired: boolean;
  completionOtpRequired: boolean;
  startOtpVerifiedAt: string | null;
  completionOtpVerifiedAt: string | null;
  payments: BookingPayments;
  timelineEvents: TimelineEvent[];
  dispatchStatus: DispatchStatus;
  dispatchedAt?: string;
  arrivedAt?: string;
}

export const CANCELLABLE_STATUSES: BookingStatus[] = [
  "requested",
  "scheduled",
  "assigned",
  "tech_en_route",
];

export const SOS_REASONS = [
  { value: "delay", label: "Technician Delay" },
  { value: "misconduct", label: "Technician Misconduct" },
  { value: "billing", label: "Billing Issue" },
  { value: "safety", label: "Safety Concern" },
] as const;

export type SosReason = typeof SOS_REASONS[number]["value"];
