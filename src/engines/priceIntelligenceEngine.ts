/**
 * Price Intelligence Engine
 * Provides transparent price estimates with confidence levels,
 * duration estimates, and parts probability data.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PriceEstimate {
  minPrice: number;
  maxPrice: number;
  avgPrice: number | null;
  currency: string;
  confidence: "rough_estimate" | "moderate_confidence" | "high_confidence";
  durationMinutes: { min: number; max: number; avg: number } | null;
  commonParts: { name: string; probability: number }[];
  priceFactors: string[];
  sampleSize: number;
  source: "db" | "engine" | "fallback";
}

export interface SeverityInfo {
  level: "minor" | "moderate" | "major" | "critical";
  label: string;
  color: string;
  description: string;
}

// Severity classification based on problem patterns
const SEVERITY_MAP: Record<string, Record<string, SeverityInfo["level"]>> = {
  MOBILE: {
    screen_broken: "moderate",
    battery_draining: "minor",
    not_charging: "moderate",
    not_turning_on: "major",
    software_issue: "minor",
    water_damage: "critical",
  },
  AC: {
    not_cooling: "moderate",
    leaking_water: "moderate",
    making_noise: "minor",
    not_turning_on: "major",
    need_cleaning: "minor",
  },
  IT: {
    laptop_slow: "minor",
    wifi_network: "moderate",
    desktop_not_on: "major",
    printer_connectivity: "minor",
    software_os: "minor",
  },
  CCTV: {
    camera_not_showing: "moderate",
    dvr_nvr_issue: "major",
    remote_not_working: "minor",
  },
  SOLAR: {
    low_output: "moderate",
    inverter_issue: "critical",
    battery_issue: "major",
  },
  CONSUMER_ELEC: {
    tv_not_on: "moderate",
    appliance_issue: "moderate",
  },
};

export const SEVERITY_CONFIG: Record<SeverityInfo["level"], Omit<SeverityInfo, "level">> = {
  minor: { label: "Minor", color: "text-emerald-600 bg-emerald-50", description: "Simple fix, usually resolved quickly" },
  moderate: { label: "Moderate", color: "text-amber-600 bg-amber-50", description: "Standard repair with common parts" },
  major: { label: "Major", color: "text-orange-600 bg-orange-50", description: "Complex repair, may require specialist parts" },
  critical: { label: "Critical", color: "text-red-600 bg-red-50", description: "Urgent attention needed, safety concern possible" },
};

export function getSeverity(categoryCode: string, problemKey: string): SeverityInfo {
  const level = SEVERITY_MAP[categoryCode]?.[problemKey] || "moderate";
  return { level, ...SEVERITY_CONFIG[level] };
}

// In-memory fallback prices (from servicePriceRanges.ts patterns)
const FALLBACK_PRICES: Record<string, { min: number; max: number; duration: number }> = {
  "MOBILE__screen_replacement": { min: 5000, max: 25000, duration: 60 },
  "MOBILE__battery_replacement": { min: 2000, max: 8000, duration: 30 },
  "MOBILE__charging_port": { min: 2500, max: 7000, duration: 45 },
  "MOBILE__water_damage": { min: 4000, max: 15000, duration: 120 },
  "MOBILE__software_fix": { min: 1500, max: 4500, duration: 45 },
  "AC__gas_refill": { min: 3500, max: 8000, duration: 45 },
  "AC__full_service": { min: 4500, max: 7000, duration: 90 },
  "AC__repair": { min: 2500, max: 15000, duration: 90 },
  "AC__installation": { min: 8000, max: 35000, duration: 180 },
  "IT__remote_support": { min: 2000, max: 5000, duration: 45 },
  "IT__onsite_support": { min: 3500, max: 12000, duration: 90 },
  "IT__network_setup": { min: 4000, max: 15000, duration: 120 },
  "CCTV__repair": { min: 5000, max: 20000, duration: 90 },
  "CCTV__installation": { min: 15000, max: 80000, duration: 240 },
  "CONSUMER_ELEC__tv_repair": { min: 3000, max: 25000, duration: 90 },
  "COPIER__repair": { min: 3000, max: 15000, duration: 60 },
  "SOLAR__maintenance": { min: 5000, max: 15000, duration: 120 },
  "SOLAR__repair": { min: 8000, max: 50000, duration: 180 },
};

/**
 * Get price estimate from DB or fallback engine.
 */
export async function getPriceEstimate(
  categoryCode: string,
  serviceType: string,
  deviceBrand?: string,
): Promise<PriceEstimate> {
  try {
    // Try DB first - device-specific then generic
    let query = supabase
      .from("service_price_intelligence" as any)
      .select("*")
      .eq("category_code", categoryCode)
      .eq("service_type", serviceType)
      .eq("is_active", true);

    if (deviceBrand) {
      query = query.eq("device_brand", deviceBrand);
    }

    const { data } = await query.limit(1);
    
    if (data && data.length > 0) {
      const row = data[0] as any;
      return {
        minPrice: row.min_price_lkr,
        maxPrice: row.max_price_lkr,
        avgPrice: row.avg_price_lkr,
        currency: row.currency || "LKR",
        confidence: row.confidence_level || "moderate_confidence",
        durationMinutes: row.avg_duration_minutes ? {
          min: row.min_duration_minutes || row.avg_duration_minutes * 0.6,
          max: row.max_duration_minutes || row.avg_duration_minutes * 1.5,
          avg: row.avg_duration_minutes,
        } : null,
        commonParts: Array.isArray(row.common_parts) ? row.common_parts : [],
        priceFactors: Array.isArray(row.price_factors) ? row.price_factors : [],
        sampleSize: row.sample_size || 0,
        source: "db",
      };
    }

    // If device-specific not found, try generic
    if (deviceBrand) {
      const { data: generic } = await supabase
        .from("service_price_intelligence" as any)
        .select("*")
        .eq("category_code", categoryCode)
        .eq("service_type", serviceType)
        .eq("device_brand", "")
        .eq("is_active", true)
        .limit(1);

      if (generic && generic.length > 0) {
        const row = generic[0] as any;
        return {
          minPrice: row.min_price_lkr,
          maxPrice: row.max_price_lkr,
          avgPrice: row.avg_price_lkr,
          currency: "LKR",
          confidence: "moderate_confidence",
          durationMinutes: row.avg_duration_minutes ? {
            min: row.min_duration_minutes || row.avg_duration_minutes * 0.6,
            max: row.max_duration_minutes || row.avg_duration_minutes * 1.5,
            avg: row.avg_duration_minutes,
          } : null,
          commonParts: Array.isArray(row.common_parts) ? row.common_parts : [],
          priceFactors: Array.isArray(row.price_factors) ? row.price_factors : [],
          sampleSize: row.sample_size || 0,
          source: "db",
        };
      }
    }
  } catch (e) {
    console.warn("Price intelligence DB lookup failed, using fallback:", e);
  }

  // Fallback to in-memory
  const key = `${categoryCode}__${serviceType}`;
  const fallback = FALLBACK_PRICES[key];
  if (fallback) {
    return {
      minPrice: fallback.min,
      maxPrice: fallback.max,
      avgPrice: Math.round((fallback.min + fallback.max) / 2),
      currency: "LKR",
      confidence: "rough_estimate",
      durationMinutes: { min: Math.round(fallback.duration * 0.6), max: Math.round(fallback.duration * 1.5), avg: fallback.duration },
      commonParts: [],
      priceFactors: [],
      sampleSize: 0,
      source: "fallback",
    };
  }

  return {
    minPrice: 0,
    maxPrice: 0,
    avgPrice: null,
    currency: "LKR",
    confidence: "rough_estimate",
    durationMinutes: null,
    commonParts: [],
    priceFactors: [],
    sampleSize: 0,
    source: "fallback",
  };
}

/**
 * Compute price confidence based on available data
 */
export function computePriceConfidence(params: {
  deviceModelKnown: boolean;
  serviceTypeConfirmed: boolean;
  diagnosisConfidence: "high" | "medium" | "low";
  hasPreviousRepairData: boolean;
}): "rough_estimate" | "moderate_confidence" | "high_confidence" {
  let score = 0;
  if (params.deviceModelKnown) score += 25;
  if (params.serviceTypeConfirmed) score += 30;
  if (params.diagnosisConfidence === "high") score += 25;
  else if (params.diagnosisConfidence === "medium") score += 15;
  if (params.hasPreviousRepairData) score += 20;

  if (score >= 70) return "high_confidence";
  if (score >= 40) return "moderate_confidence";
  return "rough_estimate";
}

/**
 * Format price range for display
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === 0 && max === 0) return "Contact for quote";
  if (min === max) return `Rs ${min.toLocaleString()}`;
  return `Rs ${min.toLocaleString()} – ${max.toLocaleString()}`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: { min: number; max: number }): string {
  const fmtTime = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    }
    return `${m}m`;
  };
  return `${fmtTime(minutes.min)} – ${fmtTime(minutes.max)}`;
}
