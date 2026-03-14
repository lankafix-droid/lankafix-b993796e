import { supabase } from "@/integrations/supabase/client";
import type { CategoryCode } from "@/types/booking";

// ─── Types ──────────────────────────────────────────────────────

export type BalanceStatus = "healthy" | "undersupplied" | "oversupplied" | "critical_shortage";

export interface CategorySupplyDemand {
  categoryCode: string;
  categoryLabel: string;
  // Supply metrics
  verifiedPartners: number;
  onlinePartners: number;
  avgResponseMinutes: number;
  // Demand metrics (last 30 days)
  totalBookings: number;
  pendingBookings: number;
  failedDispatches: number;
  // Derived
  supplyDemandRatio: number; // partners / bookings-per-day
  balanceStatus: BalanceStatus;
  recommendation: string;
}

export interface ZoneSupplyDemand {
  zoneCode: string;
  zoneLabel: string;
  categories: CategorySupplyDemand[];
  overallStatus: BalanceStatus;
}

// ─── Thresholds ─────────────────────────────────────────────────

const THRESHOLDS = {
  criticalShortageRatio: 0.05,  // < 0.05 partners per daily booking
  undersuppliedRatio: 0.15,     // < 0.15
  oversuppliedRatio: 0.8,       // > 0.8 partners per daily booking
  minBookingsForSignal: 3,      // need at least 3 bookings to evaluate
};

const CATEGORY_LABELS: Record<string, string> = {
  AC: "Air Conditioning",
  MOBILE: "Mobile Repair",
  IT: "IT & Computer",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  NETWORK: "Networking",
  CCTV: "CCTV & Security",
  SOLAR: "Solar Energy",
  CONSUMER_ELEC: "Electronics",
  COPIER: "Copier & Printer",
  SMART_HOME_OFFICE: "Smart Home",
  HOME_SECURITY: "Home Security",
  POWER_BACKUP: "Power Backup",
  APPLIANCE_INSTALL: "Appliance Install",
};

// ─── Core Analysis ──────────────────────────────────────────────

function classifyBalance(ratio: number, totalBookings: number): BalanceStatus {
  if (totalBookings < THRESHOLDS.minBookingsForSignal) return "healthy";
  if (ratio < THRESHOLDS.criticalShortageRatio) return "critical_shortage";
  if (ratio < THRESHOLDS.undersuppliedRatio) return "undersupplied";
  if (ratio > THRESHOLDS.oversuppliedRatio) return "oversupplied";
  return "healthy";
}

function generateRecommendation(status: BalanceStatus, categoryLabel: string, zone?: string): string {
  const location = zone ? ` in ${zone}` : "";
  switch (status) {
    case "critical_shortage":
      return `URGENT: Recruit ${categoryLabel} technicians${location}. Dispatch failures likely.`;
    case "undersupplied":
      return `Recruit additional ${categoryLabel} partners${location} to improve response times.`;
    case "oversupplied":
      return `${categoryLabel}${location} has excess supply. Pause recruitment; consider cross-training.`;
    case "healthy":
      return `${categoryLabel}${location} supply-demand is balanced. No action needed.`;
  }
}

/**
 * Analyze supply-demand balance across all categories.
 * Uses aggregated data from partners + bookings tables.
 */
export async function analyzeSupplyDemandBalance(): Promise<CategorySupplyDemand[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Fetch supply data
  const { data: partners } = await supabase
    .from("partners")
    .select("id, categories_supported, availability_status, verification_status, average_response_time_minutes, service_zones")
    .eq("verification_status", "verified");

  // Fetch demand data (last 30 days)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, category_code, status, dispatch_status, created_at")
    .gte("created_at", thirtyDaysAgo);

  if (!partners || !bookings) return [];

  const results: CategorySupplyDemand[] = [];

  for (const [code, label] of Object.entries(CATEGORY_LABELS)) {
    const categoryPartners = partners.filter(p =>
      p.categories_supported?.includes(code)
    );
    const onlinePartners = categoryPartners.filter(p =>
      p.availability_status === "online" || p.availability_status === "busy"
    );
    const categoryBookings = bookings.filter(b => b.category_code === code);
    const failedDispatches = categoryBookings.filter(b =>
      b.dispatch_status === "failed" || b.dispatch_status === "escalated"
    );
    const pendingBookings = categoryBookings.filter(b =>
      b.status === "requested" || b.status === "matching"
    );

    const dailyBookings = categoryBookings.length / 30;
    const ratio = dailyBookings > 0 ? categoryPartners.length / dailyBookings : 999;
    const status = classifyBalance(ratio, categoryBookings.length);

    const avgResponse = categoryPartners.reduce(
      (sum, p) => sum + (p.average_response_time_minutes || 15), 0
    ) / Math.max(categoryPartners.length, 1);

    results.push({
      categoryCode: code,
      categoryLabel: label,
      verifiedPartners: categoryPartners.length,
      onlinePartners: onlinePartners.length,
      avgResponseMinutes: Math.round(avgResponse),
      totalBookings: categoryBookings.length,
      pendingBookings: pendingBookings.length,
      failedDispatches: failedDispatches.length,
      supplyDemandRatio: Math.round(ratio * 100) / 100,
      balanceStatus: status,
      recommendation: generateRecommendation(status, label),
    });
  }

  // Sort: critical first, then undersupplied
  const priority: Record<BalanceStatus, number> = {
    critical_shortage: 0,
    undersupplied: 1,
    oversupplied: 2,
    healthy: 3,
  };
  results.sort((a, b) => priority[a.balanceStatus] - priority[b.balanceStatus]);

  return results;
}

/**
 * Get zone-level supply-demand breakdown for a specific zone.
 */
export async function analyzeZoneBalance(zoneCode: string): Promise<ZoneSupplyDemand | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: partners } = await supabase
    .from("partners")
    .select("id, categories_supported, availability_status, verification_status, service_zones, average_response_time_minutes")
    .eq("verification_status", "verified")
    .contains("service_zones", [zoneCode]);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, category_code, status, dispatch_status")
    .eq("zone_code", zoneCode)
    .gte("created_at", thirtyDaysAgo);

  if (!partners || !bookings) return null;

  const categories: CategorySupplyDemand[] = [];

  for (const [code, label] of Object.entries(CATEGORY_LABELS)) {
    const catPartners = partners.filter(p => p.categories_supported?.includes(code));
    const catBookings = bookings.filter(b => b.category_code === code);
    if (catPartners.length === 0 && catBookings.length === 0) continue;

    const dailyBookings = catBookings.length / 30;
    const ratio = dailyBookings > 0 ? catPartners.length / dailyBookings : 999;
    const status = classifyBalance(ratio, catBookings.length);

    categories.push({
      categoryCode: code,
      categoryLabel: label,
      verifiedPartners: catPartners.length,
      onlinePartners: catPartners.filter(p => p.availability_status === "online").length,
      avgResponseMinutes: Math.round(
        catPartners.reduce((s, p) => s + (p.average_response_time_minutes || 15), 0) /
        Math.max(catPartners.length, 1)
      ),
      totalBookings: catBookings.length,
      pendingBookings: catBookings.filter(b => b.status === "requested").length,
      failedDispatches: catBookings.filter(b => b.dispatch_status === "failed").length,
      supplyDemandRatio: Math.round(ratio * 100) / 100,
      balanceStatus: status,
      recommendation: generateRecommendation(status, label, zoneCode),
    });
  }

  const worstStatus = categories.reduce<BalanceStatus>((worst, c) => {
    const order: BalanceStatus[] = ["critical_shortage", "undersupplied", "oversupplied", "healthy"];
    return order.indexOf(c.balanceStatus) < order.indexOf(worst) ? c.balanceStatus : worst;
  }, "healthy");

  return {
    zoneCode,
    zoneLabel: zoneCode,
    categories,
    overallStatus: worstStatus,
  };
}

/**
 * Get recruitment priorities: categories with worst supply gaps.
 */
export function getRecruitmentPriorities(
  balanceData: CategorySupplyDemand[]
): Array<{ categoryCode: string; label: string; urgency: "critical" | "high" | "normal"; gap: number }> {
  return balanceData
    .filter(c => c.balanceStatus === "critical_shortage" || c.balanceStatus === "undersupplied")
    .map(c => ({
      categoryCode: c.categoryCode,
      label: c.categoryLabel,
      urgency: c.balanceStatus === "critical_shortage" ? "critical" as const : "high" as const,
      gap: Math.max(0, Math.ceil(c.totalBookings / 30) - c.verifiedPartners),
    }));
}

/**
 * Get onboarding throttle recommendations for oversupplied categories.
 */
export function getOnboardingThrottles(
  balanceData: CategorySupplyDemand[]
): Array<{ categoryCode: string; label: string; action: string }> {
  return balanceData
    .filter(c => c.balanceStatus === "oversupplied")
    .map(c => ({
      categoryCode: c.categoryCode,
      label: c.categoryLabel,
      action: `Pause ${c.categoryLabel} recruitment. ${c.verifiedPartners} partners for ${Math.round(c.totalBookings / 30)}/day bookings.`,
    }));
}
