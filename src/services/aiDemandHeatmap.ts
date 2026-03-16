/**
 * AI Demand Heatmap Intelligence
 * Generates demand insights across zones for internal planning.
 * Read-only — no marketplace mutations.
 */

export interface DemandInsight {
  zoneId: string;
  zoneName: string;
  categoryCode: string;
  categoryName: string;
  demandLevel: "low" | "moderate" | "high" | "spike";
  partnerShortage: boolean;
  trend: "rising" | "stable" | "declining";
  insightMessage: string;
  bookingCount7d: number;
  availablePartners: number;
  supplyDemandRatio: number;
}

export interface DemandHeatmapSummary {
  insights: DemandInsight[];
  topDemandZones: string[];
  shortageZones: string[];
  growthCategories: string[];
  totalBookings7d: number;
}

interface ZoneDemandData {
  zoneId: string;
  zoneName: string;
  categories: {
    code: string;
    name: string;
    bookings7d: number;
    bookings14d: number;
    availablePartners: number;
  }[];
}

/** Analyze zone demand data to generate insights */
export function analyzeDemand(zones: ZoneDemandData[]): DemandHeatmapSummary {
  const insights: DemandInsight[] = [];

  for (const zone of zones) {
    for (const cat of zone.categories) {
      const weeklyGrowth = cat.bookings14d > 0
        ? ((cat.bookings7d - cat.bookings14d / 2) / (cat.bookings14d / 2))
        : 0;

      const supplyRatio = cat.availablePartners > 0
        ? cat.availablePartners / Math.max(1, cat.bookings7d / 7)
        : 0;

      const demandLevel = cat.bookings7d > 20 ? "spike" : cat.bookings7d > 10 ? "high" : cat.bookings7d > 3 ? "moderate" : "low";
      const trend = weeklyGrowth > 0.2 ? "rising" : weeklyGrowth < -0.2 ? "declining" : "stable";
      const partnerShortage = supplyRatio < 1.5;

      let message = `${cat.name} demand is ${demandLevel} in ${zone.zoneName}`;
      if (trend === "rising") message += " and rising";
      if (partnerShortage) message += ". Partner shortage detected.";

      insights.push({
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        categoryCode: cat.code,
        categoryName: cat.name,
        demandLevel,
        partnerShortage,
        trend,
        insightMessage: message,
        bookingCount7d: cat.bookings7d,
        availablePartners: cat.availablePartners,
        supplyDemandRatio: Math.round(supplyRatio * 100) / 100,
      });
    }
  }

  const sorted = insights.sort((a, b) => b.bookingCount7d - a.bookingCount7d);
  const topDemandZones = [...new Set(sorted.slice(0, 5).map((i) => i.zoneName))];
  const shortageZones = [...new Set(insights.filter((i) => i.partnerShortage).map((i) => i.zoneName))];
  const growthCategories = [...new Set(insights.filter((i) => i.trend === "rising").map((i) => i.categoryName))];

  return {
    insights: sorted,
    topDemandZones,
    shortageZones,
    growthCategories,
    totalBookings7d: insights.reduce((s, i) => s + i.bookingCount7d, 0),
  };
}
