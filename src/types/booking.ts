export type CategoryCode = "AC" | "CCTV" | "MOBILE" | "IT" | "SOLAR" | "CONSUMER_ELEC" | "SMART_HOME_OFFICE" | "COPIER" | "PRINT_SUPPLIES";

export type ServiceMode = "on_site" | "drop_off" | "pickup_return" | "remote";

export type BookingStatus =
  | "requested"
  | "matching"
  | "awaiting_partner_confirmation"
  | "scheduled"
  | "assigned"
  | "tech_en_route"
  | "arrived"
  | "inspection_started"
  | "in_progress"
  | "quote_submitted"
  | "quote_revised"
  | "quote_approved"
  | "quote_rejected"
  | "repair_started"
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
  matching: "Matching Technician",
  awaiting_partner_confirmation: "Awaiting Confirmation",
  scheduled: "Scheduled",
  assigned: "Assigned",
  tech_en_route: "Tech En Route",
  arrived: "Technician Arrived",
  inspection_started: "Inspection Started",
  in_progress: "In Progress",
  quote_submitted: "Quote Submitted",
  quote_approved: "Quote Approved",
  quote_rejected: "Quote Rejected",
  quote_revised: "Quote Revised",
  repair_started: "Repair Started",
  completed: "Completed",
  rated: "Rated",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  requested: "bg-muted text-muted-foreground",
  matching: "bg-primary/10 text-primary",
  awaiting_partner_confirmation: "bg-warning/10 text-warning",
  scheduled: "bg-primary/10 text-primary",
  assigned: "bg-primary/10 text-primary",
  tech_en_route: "bg-warning/10 text-warning",
  arrived: "bg-success/10 text-success",
  inspection_started: "bg-primary/10 text-primary",
  in_progress: "bg-primary/10 text-primary",
  quote_submitted: "bg-warning/10 text-warning",
  quote_approved: "bg-success/10 text-success",
  quote_rejected: "bg-destructive/10 text-destructive",
  quote_revised: "bg-warning/10 text-warning",
  repair_started: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  rated: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export const BOOKING_TIMELINE_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Booking Created" },
  { status: "matching", label: "Matching Technician" },
  { status: "assigned", label: "Technician Assigned" },
  { status: "tech_en_route", label: "Technician En Route" },
  { status: "arrived", label: "Technician Arrived" },
  { status: "in_progress", label: "Work In Progress" },
  { status: "completed", label: "Service Completed" },
];

export const QUOTE_TIMELINE_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Booking Created" },
  { status: "matching", label: "Matching Technician" },
  { status: "assigned", label: "Technician Assigned" },
  { status: "tech_en_route", label: "Technician En Route" },
  { status: "arrived", label: "Technician Arrived" },
  { status: "inspection_started", label: "Inspection Started" },
  { status: "quote_submitted", label: "Quote Submitted" },
  { status: "quote_approved", label: "Quote Approved" },
  { status: "repair_started", label: "Repair Started" },
  { status: "completed", label: "Service Completed" },
];

// ============================================================
// Pre-check & Service Models
// ============================================================

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
  /** SLA: Normal response time in minutes */
  slaMinutesNormal?: number;
  /** SLA: Emergency response time in minutes */
  slaMinutesEmergency?: number;
  /** Typical job duration in minutes */
  typicalDurationMinutes?: number;
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

// ============================================================
// Quote Models
// ============================================================

export type PartQuality = "genuine" | "oem_grade" | "compatible";

export interface QuoteItem {
  description: string;
  amount: number;
  partQuality?: PartQuality;
  /** Stage 9: optional item toggle */
  optional?: boolean;
  /** Stage 9: warranty days per item */
  warrantyDays?: number;
  quantity?: number;
  unitPrice?: number;
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
  /** Stage 9: estimated completion time in minutes */
  estimatedCompletionMinutes?: number;
}

/** Stage 9: Quote lifecycle status */
export type QuoteStatus =
  | "pending_inspection"
  | "quote_generated"
  | "quote_sent"
  | "quote_revision_requested"
  | "quote_approved"
  | "quote_rejected"
  | "repair_in_progress";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending_inspection: "Pending Inspection",
  quote_generated: "Quote Generated",
  quote_sent: "Sent to Customer",
  quote_revision_requested: "Revision Requested",
  quote_approved: "Approved",
  quote_rejected: "Rejected",
  repair_in_progress: "Repair In Progress",
};

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
  /** Stage 9: quote lifecycle status */
  quoteStatus?: QuoteStatus;
  /** Stage 9: optional items excluded by customer */
  excludedOptionalItems?: string[];
  /** Stage 9: awaiting parts */
  awaitingParts?: boolean;
  awaitingPartsEta?: string;
  // Legacy flat fields for backward compat
  laborItems: QuoteItem[];
  partsItems: QuoteItem[];
  addOns: QuoteItem[];
  totals: { labor: number; parts: number; addOns: number; total: number };
  warranty: WarrantyTerms;
}

/** Stage 9: Quality explanation for transparency */
export const QUALITY_EXPLANATIONS: Record<PartQuality, string> = {
  genuine: "Original manufacturer part with full factory warranty",
  oem_grade: "High-quality equivalent meeting manufacturer specifications",
  compatible: "Budget-friendly alternative with basic warranty coverage",
};

// ============================================================
// Technician & Partner Models
// ============================================================

export type TechnicianAvailability = "available" | "busy" | "offline";

export interface TechnicianInfo {
  technicianId?: string;
  name: string;
  rating: number;
  eta: string;
  partnerName: string;
  partnerId?: string;
  jobsCompleted: number;
  verifiedSince: string;
  specializations: string[];
  currentZoneId?: string;
  availabilityStatus?: TechnicianAvailability;
  activeJobsCount?: number;
  tier?: ProviderTier;
}

// ============================================================
// Identity Masking Helpers
// ============================================================

/** Mask technician name to first name + last initial */
export function maskTechnicianName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

/** Get masked technician display for pre-booking (no identity) */
export function getPreBookingTechDisplay(rating?: number, jobsCompleted?: number) {
  return {
    name: "Verified LankaFix Technician",
    ratingBand: rating ? (rating >= 4.5 ? "⭐ Top Rated" : rating >= 4.0 ? "⭐ Highly Rated" : "⭐ Rated") : "⭐ Rated",
    experienceLevel: jobsCompleted ? (jobsCompleted >= 500 ? "Expert" : jobsCompleted >= 200 ? "Experienced" : "Qualified") : "Qualified",
  };
}

// ============================================================
// Job Outcome Types
// ============================================================

export type JobOutcome =
  | "completed"
  | "customer_rescheduled"
  | "site_inaccessible"
  | "requires_second_visit"
  | "part_not_available"
  | "customer_cancelled";

export const JOB_OUTCOME_LABELS: Record<JobOutcome, string> = {
  completed: "Completed",
  customer_rescheduled: "Customer Rescheduled",
  site_inaccessible: "Site Inaccessible",
  requires_second_visit: "Requires Second Visit",
  part_not_available: "Part Not Available",
  customer_cancelled: "Customer Cancelled",
};

// ============================================================
// Pre-Job Chat
// ============================================================

export interface ChatMessage {
  id: string;
  sender: "customer" | "technician";
  message: string;
  timestamp: string;
}

export type ProviderTier = "verified" | "pro" | "elite" | "enterprise";

export const PROVIDER_TIER_LABELS: Record<ProviderTier, string> = {
  verified: "Verified",
  pro: "Pro",
  elite: "Elite",
  enterprise: "Enterprise Partner",
};

export const PROVIDER_TIER_COLORS: Record<ProviderTier, string> = {
  verified: "bg-primary/10 text-primary border-primary/20",
  pro: "bg-success/10 text-success border-success/20",
  elite: "bg-warning/10 text-warning border-warning/20",
  enterprise: "bg-accent/10 text-accent-foreground border-accent/20",
};

/** Tier priority for dispatch scoring bonus */
export const PROVIDER_TIER_PRIORITY: Record<ProviderTier, number> = {
  verified: 0,
  pro: 3,
  elite: 6,
  enterprise: 10,
};

export interface Partner {
  id: string;
  name: string;
  companyName: string;
  verified: boolean;
  verifiedSince: string;
  licenseNumber?: string;
  rating: number;
  jobsCompleted: number;
  coverageZones: string[];
  categories: CategoryCode[];
  serviceCodes: string[];
  responseSlaByCategory: Partial<Record<CategoryCode, number>>;
  tier: ProviderTier;
}

// ============================================================
// Zone Model
// ============================================================

export interface Zone {
  id: string;
  city: string;
  area: string;
  label: string;
  geo?: { lat: number; lng: number };
  surgeFactor?: number;
}

// ============================================================
// Payment Models
// ============================================================

export type PaymentMethod = "cash" | "bank_transfer" | "card";

// ============================================================
// Stage 10: Payment OS Types
// ============================================================

export type CollectionMode = "cash_on_completion" | "bank_transfer" | "gateway" | "lankaqr";

export type PaymentLifecycleStatus =
  | "unpaid" | "deposit_pending" | "deposit_paid" | "partially_paid"
  | "fully_paid" | "escrow_held" | "settlement_pending" | "settled"
  | "refund_pending" | "refunded" | "failed";

export type SettlementStatus = "not_ready" | "pending" | "processing" | "settled" | "held";

export type RefundStatusDetailed = "none" | "requested" | "approved" | "processing" | "completed" | "rejected";

export interface PaymentLedgerEntry {
  id: string;
  bookingId: string;
  type: "deposit_collection" | "balance_collection" | "refund" | "commission" | "provider_settlement" | "technician_payout" | "manual_adjustment";
  amount: number;
  direction: "in" | "out";
  status: "pending" | "completed" | "failed";
  method?: CollectionMode;
  reference?: string;
  note?: string;
  createdAt: string;
}

export interface SettlementBreakdown {
  grossAmount: number;
  depositCollected: number;
  balanceCollected: number;
  refundAmount: number;
  netCollected: number;
  lankafixCommission: number;
  partnerShare: number;
  technicianShare: number;
  settlementStatus: SettlementStatus;
  settlementReadyAt?: string;
  settledAt?: string;
}

export interface ProviderWalletSummary {
  partnerId: string;
  pendingSettlement: number;
  releasedSettlement: number;
  totalCommissionGenerated: number;
  heldAmount: number;
  refundAdjustments: number;
}

export interface TechnicianEarningSummary {
  technicianId: string;
  today: number;
  week: number;
  month: number;
  pending: number;
  released: number;
}

export interface RefundRequest {
  id: string;
  bookingId: string;
  requestedBy: "customer" | "ops";
  reason: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: RefundStatusDetailed;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFinanceState {
  collectionMode: CollectionMode | null;
  paymentStatus: PaymentLifecycleStatus;
  depositAmount: number;
  balanceAmount: number;
  totalApprovedAmount: number;
  escrowHeldAmount: number;
  collectedAmount: number;
  refundAmount: number;
  settlement: SettlementBreakdown;
  ledgerEntries: PaymentLedgerEntry[];
  latestReceiptRef?: string;
}
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
  /** Dynamic pricing additions */
  baseVisitFee?: number;
  zoneFactorAmount?: number;
  complexityFactorAmount?: number;
  urgencyFactorAmount?: number;
  platformFee?: number;
}

// ============================================================
// Dispatch & Safety
// ============================================================

export type DispatchStatus = "pending" | "dispatched" | "arrived";

export interface GeoCheckPoint {
  lat: number;
  lng: number;
  at: string;
}

export interface SosState {
  active: boolean;
  reason?: SosReason;
  severity?: import("@/brand/trustSystem").SosSeverity;
  createdAt?: string;
  resolvedAt?: string;
}

// ============================================================
// Timeline
// ============================================================

export type TimelineActor = "system" | "technician" | "customer" | "partner" | "ops";

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

// ============================================================
// Booking Photo Evidence
// ============================================================

export interface BookingPhoto {
  url: string;
  type: "before" | "after" | "issue" | "invoice";
  uploadedAt: string;
}

// ============================================================
// Booking Payments
// ============================================================

export interface BookingPayments {
  deposit?: PaymentIntent;
  completion?: PaymentIntent;
}

// ============================================================
// Core Booking State
// ============================================================

export type SlaHealth = "on_time" | "at_risk" | "delayed";

export type TechRejectionReason =
  | "out_of_zone"
  | "unavailable"
  | "skill_mismatch"
  | "overload"
  | "customer_unreachable"
  | "other";

export const TECH_REJECTION_LABELS: Record<TechRejectionReason, string> = {
  out_of_zone: "Out of Zone",
  unavailable: "Unavailable",
  skill_mismatch: "Skill Mismatch",
  overload: "Overload",
  customer_unreachable: "Customer Unreachable",
  other: "Other",
};

export const PARTNER_QUOTE_REVIEW_CATEGORIES: CategoryCode[] = [
  "CCTV", "SOLAR", "COPIER", "SMART_HOME_OFFICE",
];

export interface WarrantyRecord {
  providerId: string;
  jobId: string;
  category: CategoryCode;
  serviceType: string;
  startDate: string;
  expiryDate: string;
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
  etaMinutes?: number;
  route?: { distanceKm: number; updatedAt: string };
  geoCheckIn?: GeoCheckPoint;
  geoCheckOut?: GeoCheckPoint;
  safetyFlag?: boolean;
  sos?: SosState;
  /** Supply-side fields */
  slaHealth?: SlaHealth;
  partnerInternalNote?: string;
  technicianInternalNote?: string;
  requiresPartnerQuoteReview?: boolean;
  rejectionReason?: TechRejectionReason;
  jobOutcome?: JobOutcome;
  chatMessages?: ChatMessage[];
  dispatchScore?: number;
  /** Live tracking */
  trackingData?: import("@/lib/trackingEngine").TrackingData;
  /** Stage 8: Warranty record */
  warranty?: WarrantyRecord;
  /** Stage 8: Communication relay */
  communicationRelay?: boolean;
}

// ============================================================
// Constants
// ============================================================

export const CANCELLABLE_STATUSES: BookingStatus[] = [
  "requested",
  "matching",
  "awaiting_partner_confirmation",
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

// ============================================================
// Technician App Scaffold Types (future)
// ============================================================

/** Technician-facing job view */
export interface TechJobView {
  jobId: string;
  customerName: string;
  categoryCode: CategoryCode;
  serviceCode: string;
  serviceName: string;
  address: string;
  zone: string;
  scheduledDate: string;
  scheduledTime: string;
  serviceMode: ServiceMode;
  isEmergency: boolean;
  status: BookingStatus;
  dispatchStatus: DispatchStatus;
}

/** Technician actions */
export type TechAction =
  | "accept_job"
  | "reject_job"
  | "navigate"
  | "request_start_otp"
  | "upload_before_photos"
  | "upload_after_photos"
  | "submit_quote"
  | "mark_arrived"
  | "mark_completed";
