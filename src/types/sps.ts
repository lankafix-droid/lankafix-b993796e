/**
 * LankaFix SPS — Smart Print Subscription Types
 */

export type SPSSegment =
  | "home"
  | "student"
  | "tuition"
  | "home_office"
  | "small_business"
  | "sme_office"
  | "business_institution"
  | "custom";

export type PrinterClass =
  | "mono_laser"
  | "mono_mfp_laser"
  | "ink_tank"
  | "cartridge"
  | "colour_laser"
  | "colour_mfp"
  | "copier"
  | "business_mfp"
  | "advanced";

export type SupportLevel = "basic" | "standard" | "priority" | "premium";

export type ServiceabilityClass = "SPS Eligible" | "Resale Only" | "Donor Only" | "Custom Quote Only";

export type AssetStatus = "available" | "assigned" | "maintenance" | "retired" | "reserved";

export type ContractStatus = "draft" | "pending_review" | "active" | "paused" | "ended" | "terminated" | "expired";

export type RequestStatus = "submitted" | "under_review" | "additional_details_needed" | "approved" | "rejected" | "ready_for_activation";

export type MeterVerificationStatus = "pending" | "verified" | "disputed" | "resubmit_required";

export type TicketStatus = "open" | "in_review" | "remote_troubleshooting" | "technician_assigned" | "waiting_for_customer" | "replacement_review" | "resolved" | "closed";

export type BillingStatus = "pending" | "invoiced" | "paid" | "overdue" | "waived";

export type FitConfidence = "recommended" | "good_fit" | "review_required";

export interface SPSPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  segment: SPSSegment;
  best_for: string;
  printer_class: PrinterClass;
  monthly_fee: number;
  included_pages: number;
  overage_rate: number;
  deposit_amount: number;
  setup_fee: number;
  support_level: SupportLevel;
  uptime_priority: string;
  min_term_months: number;
  meter_submission_type: string;
  pause_allowed: boolean;
  is_custom_quote: boolean;
  is_active: boolean;
  plan_description: string;
  features: string[];
  sort_order: number;
}

export interface SPSAsset {
  id: string;
  asset_code: string;
  serial_number: string | null;
  brand: string;
  model: string;
  asset_category: string;
  printer_type: string;
  copier_class: string | null;
  mono_or_colour: string;
  functions: string[];
  network_capable: boolean;
  duplex: boolean;
  max_paper_size: string;
  grade: string;
  cosmetic_grade: string;
  smartfix_certified: boolean;
  refurbishment_status: string;
  sps_eligible: boolean;
  serviceability_class: ServiceabilityClass;
  review_required: boolean;
  recommended_segment: string | null;
  monthly_duty_class: string;
  compatible_plan_ids: string[];
  status: AssetStatus;
}

export interface SPSContract {
  id: string;
  customer_id: string;
  plan_id: string;
  asset_id: string;
  contract_status: ContractStatus;
  start_date: string | null;
  end_date: string | null;
  min_term_months: number;
  deposit_amount: number;
  setup_fee: number;
  agreement_accepted: boolean;
  pause_status: string;
  contract_risk_status: string;
}

export interface SPSSubscriptionRequest {
  id: string;
  customer_id: string;
  submitted_plan_id: string | null;
  requested_segment: string | null;
  monthly_usage_band: string | null;
  mono_or_colour: string;
  multifunction_required: boolean;
  seasonal_usage: boolean;
  location: string | null;
  full_name: string;
  mobile: string;
  email: string | null;
  nic_or_company: string | null;
  preferred_install_date: string | null;
  billing_preference: string;
  notes: string | null;
  request_status: RequestStatus;
  fit_confidence: FitConfidence;
  admin_notes: string | null;
  created_at: string;
}

export interface SPSMeterReading {
  id: string;
  contract_id: string;
  asset_id: string;
  customer_id: string;
  reading_value: number;
  photo_url: string | null;
  submitted_at: string;
  verification_status: MeterVerificationStatus;
  anomaly_flag: boolean;
  notes: string | null;
}

export interface SPSSupportTicket {
  id: string;
  contract_id: string | null;
  asset_id: string | null;
  customer_id: string;
  category: string;
  priority: string;
  issue_description: string;
  status: TicketStatus;
  opened_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export interface SPSBillingCycle {
  id: string;
  contract_id: string;
  billing_month: string;
  base_fee: number;
  included_pages: number;
  actual_pages: number;
  overage_pages: number;
  overage_amount: number;
  total_due: number;
  billing_status: BillingStatus;
  due_date: string | null;
  paid_at: string | null;
  invoice_reference: string | null;
}

// Wizard types
export interface FindMyPlanInputs {
  userType: SPSSegment;
  monthlyPages: number;
  monoOrColour: "mono" | "colour" | "both";
  printOnly: boolean;
  needsWifi: boolean;
  a4Only: boolean;
  downtimeCritical: boolean;
  budgetPreference: "lowest" | "balanced" | "premium";
  numUsers: number;
  usageIntensity: "light" | "moderate" | "heavy";
  useCase: string;
  needsMultifunction: boolean;
  needsBackup: boolean;
  seasonalUsage: boolean;
}

export const SPS_SEGMENTS: { code: SPSSegment; label: string; icon: string; description: string }[] = [
  { code: "home", label: "Home", icon: "🏠", description: "Personal & household printing" },
  { code: "student", label: "Student / Family", icon: "🎓", description: "Study materials & family use" },
  { code: "tuition", label: "Tuition Class", icon: "📚", description: "Educational handouts & worksheets" },
  { code: "home_office", label: "Home Office", icon: "💻", description: "Remote work & freelancing" },
  { code: "small_business", label: "Shop / Small Business", icon: "🏪", description: "Invoices, receipts & business docs" },
  { code: "sme_office", label: "SME / Office", icon: "🏢", description: "Office teams & business operations" },
  { code: "business_institution", label: "Business / Institution", icon: "🏛️", description: "Large scale & multi-device needs" },
];

export const SPS_SUPPORT_CATEGORIES = [
  { code: "print_quality", label: "Print Quality Issue" },
  { code: "paper_jam", label: "Paper Jam" },
  { code: "consumable", label: "Consumable / Toner Issue" },
  { code: "scanner", label: "Scanner Issue" },
  { code: "network", label: "Network / Wi-Fi Issue" },
  { code: "driver", label: "Driver / Software Issue" },
  { code: "slow_printing", label: "Slow Printing" },
  { code: "strange_noise", label: "Strange Noise" },
  { code: "general", label: "General Issue" },
  { code: "technician_visit", label: "Need Technician Visit" },
  { code: "replacement_review", label: "Replacement Review" },
];

export const SEGMENT_LABELS: Record<SPSSegment, string> = {
  home: "Home & Personal",
  student: "Student & Family",
  tuition: "Tuition & Education",
  home_office: "Home Office",
  small_business: "Small Business",
  sme_office: "SME & Office",
  business_institution: "Business & Institution",
  custom: "Custom / Enterprise",
};

export const PRINTER_CLASS_LABELS: Record<PrinterClass, string> = {
  mono_laser: "Mono Laser",
  mono_mfp_laser: "Mono Multifunction Laser",
  ink_tank: "Ink Tank",
  cartridge: "Cartridge Printer",
  colour_laser: "Colour Laser",
  colour_mfp: "Colour Multifunction",
  copier: "Copier",
  business_mfp: "Business MFP",
  advanced: "Advanced / Custom",
};
