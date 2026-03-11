/**
 * LankaFix Category Launch Configuration
 * Controls which categories are operational, consultation-only, or coming soon.
 */

export type CategoryLaunchState = "operational" | "consultation" | "coming_soon";

export interface CategoryLaunchConfig {
  code: string;
  state: CategoryLaunchState;
  label?: string;
}

const CATEGORY_LAUNCH_MAP: Record<string, CategoryLaunchState> = {
  // Operational — full booking & dispatch
  AC: "operational",
  MOBILE: "operational",
  IT: "operational",
  CONSUMER_ELEC: "operational",
  CCTV: "operational",
  SOLAR: "operational",
  SMART_HOME_OFFICE: "operational",
  COPIER: "operational",

  // Consultation — user submits requirement, LankaFix assigns manually
  NETWORK: "consultation",
  HOME_SECURITY: "consultation",
  POWER_BACKUP: "consultation",

  // Coming Soon — category visible but booking disabled
  ELECTRICAL: "coming_soon",
  PLUMBING: "coming_soon",
  APPLIANCE_INSTALL: "coming_soon",
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
