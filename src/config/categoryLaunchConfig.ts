/**
 * LankaFix Category Launch Configuration
 * Controls which categories are operational, consultation-only, or coming soon.
 * 
 * LIFECYCLE STATES:
 * - operational: Full booking, dispatch, and tracking enabled
 * - consultation: User submits requirement, LankaFix assigns partner manually. 
 *   Bookings are created with dispatch_mode='manual' to prevent auto-dispatch.
 * - coming_soon: Category visible but booking disabled. Shows waitlist.
 */

export type CategoryLaunchState = "operational" | "consultation" | "coming_soon";

export interface CategoryLaunchConfig {
  code: string;
  state: CategoryLaunchState;
  label?: string;
}

const CATEGORY_LAUNCH_MAP: Record<string, CategoryLaunchState> = {
  // ─── Operational — full booking & dispatch ───
  IT: "operational",
  CONSUMER_ELEC: "operational",
  SMART_HOME_OFFICE: "operational",
  SOLAR: "operational",

  // ─── Consultation — manual assignment only ───
  AC: "consultation",
  MOBILE: "consultation",
  CCTV: "consultation",
  COPIER: "consultation",
  NETWORK: "consultation",
  HOME_SECURITY: "consultation",
  POWER_BACKUP: "consultation",
  // Additional consultation categories per launch spec
  DATA_RECOVERY: "consultation",
  SERVER_INFRA: "consultation",
  ACCESS_CONTROL: "consultation",
  ADVANCED_SECURITY: "consultation",
  SOLAR_UPGRADE: "consultation",
  EV_CHARGING: "consultation",

  // ─── Print Supplies — operational (Consumables Ecosystem) ───
  PRINT_SUPPLIES: "operational",

  // ─── Coming Soon — booking disabled ───
  ELECTRICAL: "coming_soon",
  PLUMBING: "coming_soon",
  INTERNET_INSTALL: "coming_soon",
  APPLIANCE_INSTALL: "coming_soon",
  CLEANING: "coming_soon",
  PAINTING: "coming_soon",
  HOME_MAINTENANCE: "coming_soon",
};

export function getCategoryLaunchState(categoryCode: string): CategoryLaunchState {
  return CATEGORY_LAUNCH_MAP[categoryCode] || "coming_soon";
}

export function isCategoryOperational(categoryCode: string): boolean {
  return getCategoryLaunchState(categoryCode) === "operational";
}

export function isCategoryConsultation(categoryCode: string): boolean {
  return getCategoryLaunchState(categoryCode) === "consultation";
}

export function isCategoryComingSoon(categoryCode: string): boolean {
  return getCategoryLaunchState(categoryCode) === "coming_soon";
}

/**
 * STATUS MODEL REFERENCE
 * ══════════════════════
 * 
 * BOOKING STATUS (booking_status enum):
 *   requested → matching → assigned → tech_en_route → arrived →
 *   inspection_started → quote_submitted → quote_approved →
 *   repair_started → completed → rated
 *   (or cancelled at any point)
 * 
 * DISPATCH STATUS (text field on bookings):
 *   pending → dispatching → offered → accepted → declined → 
 *   timed_out → reassigned → escalated → manual
 * 
 *   NOTE: consultation bookings use dispatch_status = 'manual'
 *   to prevent auto-dispatch.
 * 
 * QUOTE STATUS (quote_status enum):
 *   draft → submitted → revised → approved → rejected → expired
 * 
 * TRACKER-VISIBLE STATES (mapped from booking_status):
 *   Submitted | Finding Provider | Provider Assigned | On the Way |
 *   Provider Arrived | Inspecting | Quote Ready | Approved |
 *   In Progress | Repair Started | Completed | Cancelled
 * 
 * NOTIFICATION EVENT TYPES:
 *   booking_created | booking_failed | dispatch_started |
 *   consultation_requested | zone_not_supported |
 *   provider_assigned | quote_received | job_completed
 */
