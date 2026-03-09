/**
 * LankaFix Commission Analytics Engine
 * Tracks revenue, commission, category performance, and partner metrics.
 */
import type { BookingState, CategoryCode } from "@/types/booking";
import {
  calculateCommission,
  CATEGORY_TIER_MAP,
  TIER_LABELS,
  type CategoryTier,
} from "./commissionEngine";

// ─── Analytics Types ────────────────────────────────────────────

export interface CategoryRevenue {
  categoryCode: CategoryCode;
  tier: CategoryTier;
  tierLabel: string;
  totalJobValue: number;
  totalCommission: number;
  commissionRate: number;
  diagnosticFees: number;
  totalPlatformRevenue: number;
  jobCount: number;
  avgJobValue: number;
}

export interface PlatformAnalytics {
  totalRevenue: number;
  totalCommission: number;
  totalDiagnosticFees: number;
  totalJobValue: number;
  totalJobs: number;
  avgJobValue: number;
  avgCommissionRate: number;
  categoryBreakdown: CategoryRevenue[];
  tierBreakdown: Record<CategoryTier, { revenue: number; jobs: number; avgValue: number }>;
  topPartners: PartnerPerformance[];
  repeatCustomerRate: number;
}

export interface PartnerPerformance {
  partnerId: string;
  partnerName: string;
  totalJobs: number;
  totalJobValue: number;
  totalCommission: number;
  avgRating: number;
  completionRate: number;
}

// ─── Analytics Calculator ───────────────────────────────────────

export function computePlatformAnalytics(bookings: BookingState[]): PlatformAnalytics {
  const completedBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "rated"
  );

  const categoryMap: Record<string, CategoryRevenue> = {};
  const tierMap: Record<CategoryTier, { revenue: number; jobs: number; totalValue: number }> = {
    small_repair: { revenue: 0, jobs: 0, totalValue: 0 },
    medium_repair: { revenue: 0, jobs: 0, totalValue: 0 },
    project_install: { revenue: 0, jobs: 0, totalValue: 0 },
  };
  const partnerMap: Record<string, PartnerPerformance> = {};
  const customerSet = new Set<string>();
  const repeatCustomerSet = new Set<string>();

  let totalRevenue = 0;
  let totalCommission = 0;
  let totalDiagnosticFees = 0;
  let totalJobValue = 0;

  for (const b of completedBookings) {
    const jobValue = b.finance?.totalApprovedAmount || b.pricing.estimatedMin || 0;
    const diagFee = b.pricing.diagnosticFee + b.pricing.visitFee;
    const commission = calculateCommission(b.categoryCode, jobValue, diagFee);
    const tier = CATEGORY_TIER_MAP[b.categoryCode];

    totalJobValue += jobValue;
    totalCommission += commission.commissionAmount;
    totalDiagnosticFees += diagFee;
    totalRevenue += commission.totalPlatformRevenue;

    // Category breakdown
    if (!categoryMap[b.categoryCode]) {
      categoryMap[b.categoryCode] = {
        categoryCode: b.categoryCode,
        tier,
        tierLabel: TIER_LABELS[tier],
        totalJobValue: 0,
        totalCommission: 0,
        commissionRate: commission.commissionPercent,
        diagnosticFees: 0,
        totalPlatformRevenue: 0,
        jobCount: 0,
        avgJobValue: 0,
      };
    }
    const cat = categoryMap[b.categoryCode];
    cat.totalJobValue += jobValue;
    cat.totalCommission += commission.commissionAmount;
    cat.diagnosticFees += diagFee;
    cat.totalPlatformRevenue += commission.totalPlatformRevenue;
    cat.jobCount += 1;
    cat.avgJobValue = Math.round(cat.totalJobValue / cat.jobCount);

    // Tier breakdown
    tierMap[tier].revenue += commission.totalPlatformRevenue;
    tierMap[tier].jobs += 1;
    tierMap[tier].totalValue += jobValue;

    // Partner tracking
    const partnerId = b.technician?.partnerId || "unknown";
    if (!partnerMap[partnerId]) {
      partnerMap[partnerId] = {
        partnerId,
        partnerName: b.technician?.partnerName || "Unknown",
        totalJobs: 0,
        totalJobValue: 0,
        totalCommission: 0,
        avgRating: 0,
        completionRate: 100,
      };
    }
    partnerMap[partnerId].totalJobs += 1;
    partnerMap[partnerId].totalJobValue += jobValue;
    partnerMap[partnerId].totalCommission += commission.commissionAmount;

    // Customer repeat tracking
    const custKey = `${b.categoryCode}-${b.zone}`;
    if (customerSet.has(custKey)) {
      repeatCustomerSet.add(custKey);
    }
    customerSet.add(custKey);
  }

  const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.totalPlatformRevenue - a.totalPlatformRevenue);
  const topPartners = Object.values(partnerMap).sort((a, b) => b.totalJobValue - a.totalJobValue).slice(0, 10);

  const tierBreakdown = Object.fromEntries(
    Object.entries(tierMap).map(([k, v]) => [
      k,
      { revenue: v.revenue, jobs: v.jobs, avgValue: v.jobs > 0 ? Math.round(v.totalValue / v.jobs) : 0 },
    ])
  ) as Record<CategoryTier, { revenue: number; jobs: number; avgValue: number }>;

  return {
    totalRevenue,
    totalCommission,
    totalDiagnosticFees,
    totalJobValue,
    totalJobs: completedBookings.length,
    avgJobValue: completedBookings.length > 0 ? Math.round(totalJobValue / completedBookings.length) : 0,
    avgCommissionRate: totalJobValue > 0 ? Math.round((totalCommission / totalJobValue) * 100 * 10) / 10 : 0,
    categoryBreakdown,
    tierBreakdown,
    topPartners,
    repeatCustomerRate: customerSet.size > 0 ? Math.round((repeatCustomerSet.size / customerSet.size) * 100) : 0,
  };
}
