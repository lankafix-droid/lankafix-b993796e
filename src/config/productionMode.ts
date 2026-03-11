/**
 * LankaFix Production Mode Configuration
 * Controls whether demo/mock data is allowed in the app.
 * 
 * In PRODUCTION mode:
 * - Only real verified partners from the database are shown
 * - Mock/demo providers are never displayed in customer flows
 * - Internal dashboards show a "DEMO DATA" banner
 * 
 * In DEMO mode:
 * - Mock data may be used for internal testing/demos
 * - Customer flows still prefer real data when available
 */

export type AppMode = "production" | "demo";

// Default to production — set to "demo" only for internal testing
const APP_MODE: AppMode = "production";

export function getAppMode(): AppMode {
  // Allow override via localStorage for internal testing
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("lankafix_app_mode");
    if (override === "demo") return "demo";
  }
  return APP_MODE;
}

export function isProductionMode(): boolean {
  return getAppMode() === "production";
}

export function isDemoMode(): boolean {
  return getAppMode() === "demo";
}

/**
 * Guard: Only use mock data if demo mode is active.
 * In production, returns empty array / null.
 */
export function demoOnly<T>(data: T): T | null {
  return isDemoMode() ? data : null;
}

export function demoOnlyArray<T>(data: T[]): T[] {
  return isDemoMode() ? data : [];
}
