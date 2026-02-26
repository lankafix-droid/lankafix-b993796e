export type CategoryCode = "AC" | "CCTV" | "MOBILE" | "IT" | "SOLAR" | "CONSUMER_ELEC" | "SMART_HOME_OFFICE";

export type ServiceMode = "on_site" | "drop_off" | "pickup_return" | "remote";

export type BookingStatus =
  | "requested"
  | "scheduled"
  | "assigned"
  | "tech_en_route"
  | "in_progress"
  | "quote_submitted"
  | "quote_approved"
  | "quote_rejected"
  | "quote_revised"
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

export interface QuoteOption {
  id: string;
  label: string; // "Option A", "Option B", etc.
  laborItems: QuoteItem[];
  partsItems: QuoteItem[];
  addOns: QuoteItem[];
  totals: { labor: number; parts: number; addOns: number; total: number };
  warranty: { labor: string; parts: string };
  partQuality: PartQuality;
}

export interface QuoteData {
  options: QuoteOption[];
  selectedOptionId: string | null;
  expiresAt: string;
  // Legacy flat fields for backward compat
  laborItems: QuoteItem[];
  partsItems: QuoteItem[];
  addOns: QuoteItem[];
  totals: { labor: number; parts: number; addOns: number; total: number };
  warranty: { labor: string; parts: string };
}

export interface TechnicianInfo {
  name: string;
  rating: number;
  eta: string;
  partnerName: string;
  jobsCompleted: number;
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
  photos: string[];
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
  // OTP fields
  startOtpRequired: boolean;
  completionOtpRequired: boolean;
  startOtpVerifiedAt: string | null;
  completionOtpVerifiedAt: string | null;
  // Payment
  payments: PaymentIntent[];
}

export const CANCELLABLE_STATUSES: BookingStatus[] = [
  "requested",
  "scheduled",
  "assigned",
  "tech_en_route",
];
