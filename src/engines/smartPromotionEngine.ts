/**
 * Smart Promotion Engine
 * 
 * Generates targeted promotional campaign suggestions based on:
 * - Seasonal demand patterns
 * - Booking history trends
 * - Supply-demand imbalances
 * - Customer behavior signals
 */

import { getSeasonalServices, type ServiceNode } from "@/engines/serviceKnowledgeGraph";

export interface PromotionSuggestion {
  id: string;
  title: string;
  description: string;
  targetAudience: "all" | "repeat" | "dormant" | "new" | "high_value";
  category: string;
  serviceCode?: string;
  discountType: "percentage" | "fixed" | "bundle" | "free_addon";
  discountValue: number;
  urgency: "high" | "medium" | "low";
  reason: string;
  estimatedImpact: string;
  validityDays: number;
}

// Sri Lankan seasonal patterns
const SEASONAL_CAMPAIGNS: Record<number, PromotionSuggestion[]> = {
  // March-May: Hot season → AC demand peaks
  3: [
    {
      id: "pre_summer_ac", title: "Pre-Summer AC Tune-Up", description: "Get your AC ready before the heat peaks — 10% off full service",
      targetAudience: "all", category: "AC", serviceCode: "AC_FULL_SERVICE",
      discountType: "percentage", discountValue: 10, urgency: "high",
      reason: "AC demand increases 40% in March-May. Early campaign captures pre-season bookings.",
      estimatedImpact: "15-20% increase in AC bookings", validityDays: 30,
    },
  ],
  4: [
    {
      id: "peak_heat_ac", title: "Beat the Heat — AC Emergency Priority", description: "Priority dispatch for AC emergencies during peak heat",
      targetAudience: "all", category: "AC",
      discountType: "free_addon", discountValue: 0, urgency: "high",
      reason: "Peak heat month. Emergency AC repairs surge. Priority service drives premium bookings.",
      estimatedImpact: "25% increase in emergency AC bookings", validityDays: 30,
    },
  ],
  // October-November: Monsoon → Electrical & Plumbing
  10: [
    {
      id: "monsoon_electrical", title: "Monsoon Safety Check", description: "Electrical safety inspection — protect your home this monsoon",
      targetAudience: "all", category: "ELECTRICAL", serviceCode: "ELECTRICAL_REPAIR",
      discountType: "percentage", discountValue: 15, urgency: "medium",
      reason: "Monsoon season causes electrical hazards. Preventive campaigns reduce emergency costs.",
      estimatedImpact: "20% increase in electrical bookings", validityDays: 45,
    },
    {
      id: "monsoon_plumbing", title: "Monsoon Plumbing Check", description: "Prevent water damage — drain and pipe inspection",
      targetAudience: "all", category: "PLUMBING", serviceCode: "PLUMBING_REPAIR",
      discountType: "percentage", discountValue: 10, urgency: "medium",
      reason: "Heavy rains increase plumbing issues. Proactive marketing captures demand.",
      estimatedImpact: "15% increase in plumbing bookings", validityDays: 45,
    },
  ],
  // January: New Year → CCTV & Security
  1: [
    {
      id: "new_year_security", title: "New Year Security Upgrade", description: "Start the year secure — CCTV installation at special rates",
      targetAudience: "all", category: "CCTV", serviceCode: "CCTV_INSTALL",
      discountType: "percentage", discountValue: 10, urgency: "low",
      reason: "New year budgets allocated. Security installations peak in January.",
      estimatedImpact: "20% increase in CCTV installs", validityDays: 30,
    },
  ],
};

// Behavioral campaigns
const BEHAVIORAL_CAMPAIGNS: PromotionSuggestion[] = [
  {
    id: "dormant_reactivation", title: "We Miss You — 15% Off", description: "It's been a while! Book any service at 15% off",
    targetAudience: "dormant", category: "ALL",
    discountType: "percentage", discountValue: 15, urgency: "medium",
    reason: "Users inactive for 60+ days. Re-engagement campaigns recover 8-12% of dormant users.",
    estimatedImpact: "8-12% dormant user reactivation", validityDays: 14,
  },
  {
    id: "repeat_loyalty", title: "Loyal Customer Reward", description: "Your 3rd booking this year — free diagnosis on us",
    targetAudience: "repeat", category: "ALL",
    discountType: "free_addon", discountValue: 0, urgency: "low",
    reason: "Repeat customers have 3x lifetime value. Loyalty rewards increase retention by 15%.",
    estimatedImpact: "15% increase in repeat booking rate", validityDays: 30,
  },
  {
    id: "first_booking_bundle", title: "First-Time Bundle", description: "Book 2 services, get 20% off the second",
    targetAudience: "new", category: "ALL",
    discountType: "bundle", discountValue: 20, urgency: "medium",
    reason: "New users who book 2+ services in first month have 60% higher retention.",
    estimatedImpact: "25% increase in multi-service adoption", validityDays: 30,
  },
];

/**
 * Generate promotion suggestions for the current month.
 */
export function getSeasonalPromotions(): PromotionSuggestion[] {
  const month = new Date().getMonth() + 1;
  return SEASONAL_CAMPAIGNS[month] || [];
}

/**
 * Generate behavioral promotion suggestions.
 */
export function getBehavioralPromotions(): PromotionSuggestion[] {
  return [...BEHAVIORAL_CAMPAIGNS];
}

/**
 * Get all current promotion suggestions (seasonal + behavioral).
 */
export function getAllPromotionSuggestions(): PromotionSuggestion[] {
  return [...getSeasonalPromotions(), ...getBehavioralPromotions()];
}

/**
 * Get supply-demand based promotion suggestions.
 * Suggests discounts for oversupplied categories and premium pricing for undersupplied ones.
 */
export function getSupplyDemandPromotions(
  supplyData: { category: string; technicianCount: number; bookingCount: number }[]
): PromotionSuggestion[] {
  const promos: PromotionSuggestion[] = [];

  for (const data of supplyData) {
    const ratio = data.technicianCount > 0 ? data.bookingCount / data.technicianCount : 0;

    if (ratio < 0.5 && data.technicianCount > 3) {
      // Oversupplied — promote to increase demand
      promos.push({
        id: `oversupply_${data.category.toLowerCase()}`,
        title: `${data.category} Special Offer`,
        description: `High technician availability — promote ${data.category} services`,
        targetAudience: "all", category: data.category,
        discountType: "percentage", discountValue: 10, urgency: "medium",
        reason: `${data.technicianCount} technicians but only ${data.bookingCount} bookings. Demand stimulation needed.`,
        estimatedImpact: "20% increase in category bookings", validityDays: 14,
      });
    }
  }

  return promos;
}
