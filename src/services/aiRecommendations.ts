/**
 * AI Personalized Service Recommendations
 * Uses behavior signals to suggest relevant services.
 */

export interface ServiceRecommendation {
  categoryCode: string;
  categoryName: string;
  reason: string;
  priority: number;
  source: "booking_history" | "device_registry" | "seasonal" | "popular";
}

interface UserBehavior {
  previousBookings?: { category_code: string; created_at: string }[];
  devices?: { category_code: string }[];
  browsingHistory?: string[];
  location?: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  MOBILE: "Mobile Phone Repair",
  LAPTOP: "Laptop Repair",
  PRINTER: "Printer Repair",
  CCTV: "CCTV Solutions",
  AC: "AC Repair & Service",
  SOLAR: "Solar Solutions",
  SMARTHOME: "Smart Home",
  ELECTRONICS: "Consumer Electronics",
  IT: "IT Services",
  ELECTRICAL: "Electrical Services",
  PLUMBING: "Plumbing Services",
};

// Seasonal recommendations (month -> categories)
const SEASONAL: Record<number, string[]> = {
  3: ["AC", "SOLAR"], // Pre-summer
  4: ["AC", "SOLAR"],
  5: ["AC"],
  10: ["ELECTRICAL"], // Pre-monsoon
  11: ["ELECTRICAL", "PLUMBING"],
  12: ["ELECTRICAL"],
};

/** Generate personalized recommendations */
export function getPersonalizedRecommendations(
  behavior: UserBehavior,
  limit = 5
): ServiceRecommendation[] {
  const recs: ServiceRecommendation[] = [];
  const seen = new Set<string>();

  // From booking history
  if (behavior.previousBookings?.length) {
    const categoryCounts: Record<string, number> = {};
    for (const b of behavior.previousBookings) {
      categoryCounts[b.category_code] = (categoryCounts[b.category_code] || 0) + 1;
    }
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    for (const [code] of sorted.slice(0, 3)) {
      if (!seen.has(code)) {
        seen.add(code);
        recs.push({
          categoryCode: code,
          categoryName: CATEGORY_NAMES[code] || code,
          reason: "Based on your previous bookings",
          priority: 90,
          source: "booking_history",
        });
      }
    }
  }

  // From registered devices
  if (behavior.devices?.length) {
    for (const d of behavior.devices) {
      if (!seen.has(d.category_code)) {
        seen.add(d.category_code);
        recs.push({
          categoryCode: d.category_code,
          categoryName: CATEGORY_NAMES[d.category_code] || d.category_code,
          reason: "You have a registered device in this category",
          priority: 75,
          source: "device_registry",
        });
      }
    }
  }

  // Seasonal
  const month = new Date().getMonth() + 1;
  const seasonal = SEASONAL[month] || [];
  for (const code of seasonal) {
    if (!seen.has(code)) {
      seen.add(code);
      recs.push({
        categoryCode: code,
        categoryName: CATEGORY_NAMES[code] || code,
        reason: "Popular this time of year",
        priority: 60,
        source: "seasonal",
      });
    }
  }

  return recs.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
