import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchRequest {
  category_code: string;
  service_type?: string;
  booking_path?: string;
  urgency?: string;
  brand?: string;
  customer_lat?: number;
  customer_lng?: number;
  customer_zone?: string;
  is_emergency?: boolean;
  booking_id?: string;
}

// ── CATEGORY RULES ──
const CATEGORY_RULES: Record<string, {
  prefer_inspection?: boolean;
  prefer_quote?: boolean;
  prefer_specialization?: string[];
  brand_weight_boost?: boolean;
}> = {
  AC: { prefer_specialization: ["AC_REPAIR", "AC_GAS", "AC_INSTALL"], brand_weight_boost: true },
  MOBILE: { prefer_specialization: ["MOBILE_SCREEN", "MOBILE_BOARD", "MOBILE_WATER"], brand_weight_boost: true },
  IT: { prefer_specialization: ["REMOTE_SUPPORT", "NETWORK_SETUP"] },
  CCTV: { prefer_specialization: ["CCTV_INSTALL", "CCTV_REPAIR"], brand_weight_boost: true },
  SOLAR: { prefer_inspection: true, prefer_quote: true },
  ELECTRICAL: { prefer_inspection: true },
  PLUMBING: { prefer_specialization: ["PLUMBING_LEAK", "PLUMBING_INSTALL"] },
  ELECTRONICS: { prefer_specialization: ["TV_REPAIR", "APPLIANCE_REPAIR"], brand_weight_boost: true },
  NETWORK: { prefer_specialization: ["WIFI_SETUP", "NETWORK_CABLING"] },
};

// ── SAFETY KEYWORDS → force inspection ──
const SAFETY_KEYWORDS = [
  /\b(gas|refrigerant|freon)\b/i,
  /\b(water\s*damage)\b/i,
  /\b(sparking|shock|short\s*circuit|fire)\b/i,
];

// ── QUALITY EXCLUSION GATES ──
const QUALITY_GATES = {
  min_rating: 3.0,
  max_cancellation_rate: 30,
  max_strike_count: 3,
  min_on_time_rate: 60,
};

// ── SERVICE TYPE ALIASES for stricter matching ──
const SERVICE_TYPE_ALIASES: Record<string, string[]> = {
  AC_REPAIR: ["ac_repair", "ac_service", "ac_not_cooling", "ac_noisy"],
  AC_GAS: ["ac_gas", "gas_refill", "refrigerant", "ac_gas_topup"],
  AC_INSTALL: ["ac_install", "ac_installation", "split_ac_install"],
  MOBILE_SCREEN: ["screen_repair", "screen_replacement", "cracked_screen", "broken_screen"],
  MOBILE_BOARD: ["board_repair", "motherboard", "chip_level"],
  MOBILE_WATER: ["water_damage", "liquid_damage", "water_repair"],
  REMOTE_SUPPORT: ["remote_support", "remote_fix", "online_support"],
  NETWORK_SETUP: ["wifi_setup", "network_setup", "router_setup", "wifi_slow"],
  CCTV_INSTALL: ["cctv_install", "cctv_installation", "camera_install"],
  CCTV_REPAIR: ["cctv_repair", "camera_repair", "dvr_repair"],
  PLUMBING_LEAK: ["leak_repair", "pipe_leak", "water_leak"],
  PLUMBING_INSTALL: ["plumbing_install", "tap_install", "fixture_install"],
  TV_REPAIR: ["tv_repair", "television_repair"],
  APPLIANCE_REPAIR: ["appliance_repair", "washing_machine", "refrigerator_repair"],
  WIFI_SETUP: ["wifi_setup", "wifi_config", "wifi_slow"],
  NETWORK_CABLING: ["network_cabling", "cat6", "structured_cabling"],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeZone(z: string): string {
  return z.toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeServiceType(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "_").trim();
}

function calculateEtaMinutes(distanceKm: number): number {
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const multiplier = isPeak ? 1.6 : 1.3;
  const base = distanceKm < 3 ? 10 : distanceKm < 8 ? 20 : 40 + Math.round((distanceKm - 8) * 3);
  return Math.round(base * multiplier);
}

// ── Strict service type matching ──
function scoreServiceTypeMatch(partnerSpecs: string[], serviceType: string): number {
  const norm = normalizeServiceType(serviceType);

  // 1. Exact match
  if (partnerSpecs.some(s => normalizeServiceType(s) === norm)) return 100;

  // 2. Alias match
  for (const [canonical, aliases] of Object.entries(SERVICE_TYPE_ALIASES)) {
    const isServiceInAlias = aliases.includes(norm) || normalizeServiceType(canonical) === norm;
    if (isServiceInAlias) {
      const partnerMatchesCanonical = partnerSpecs.some(s => {
        const ns = normalizeServiceType(s);
        return ns === normalizeServiceType(canonical) || aliases.includes(ns);
      });
      if (partnerMatchesCanonical) return 85;
    }
  }

  // 3. Weak partial match — only if substring is 5+ chars to prevent false positives
  if (norm.length >= 5) {
    const hasPartial = partnerSpecs.some(s => {
      const ns = normalizeServiceType(s);
      return ns.includes(norm) || norm.includes(ns);
    });
    if (hasPartial) return 50;
  }

  return 0;
}

interface ScoredCandidate {
  partner_id: string;
  technician_name: string;
  business_name: string | null;
  photo_url: string | null;
  specializations: string[];
  rating: number;
  completed_jobs: number;
  distance_km: number;
  eta_minutes: number;
  match_score: number;
  match_reason: string;
  verified: boolean;
  availability_status: string;
  inspection_capable: boolean;
  express_capable: boolean;
  on_time_rate: number;
  score_breakdown: Record<string, number>;
}

function generateMatchReason(p: any, categoryCode: string, distKm: number): string {
  const reasons: string[] = [];
  if (distKm < 2) reasons.push("closest verified technician");
  else if (distKm < 5) reasons.push("nearby in your zone");

  const catNames: Record<string, string> = {
    AC: "AC service", MOBILE: "mobile repair", IT: "IT support",
    CCTV: "CCTV installation", SOLAR: "solar solutions", ELECTRICAL: "electrical work",
    PLUMBING: "plumbing", ELECTRONICS: "electronics repair", NETWORK: "networking",
    SMARTHOME: "smart home setup", SECURITY: "security systems", POWER_BACKUP: "power backup",
    COPIER: "copier repair", SUPPLIES: "print supplies", APPLIANCE_INSTALL: "appliance installation",
  };

  if ((p.categories_supported || []).includes(categoryCode)) {
    reasons.push(`strong ${catNames[categoryCode] || categoryCode} history`);
  }

  if (p.rating_average >= 4.8 && p.completed_jobs_count >= 200) reasons.push("top-rated performer");
  else if (p.rating_average >= 4.5) reasons.push("highly rated");

  if ((p.on_time_rate || 95) >= 97) reasons.push("excellent on-time rate");
  if (p.inspection_capable) reasons.push("inspection-capable");

  if (reasons.length === 0) reasons.push("available technician in your area");

  const combined = reasons.slice(0, 3).join(", ");
  return combined.charAt(0).toUpperCase() + combined.slice(1);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body: MatchRequest = await req.json();
    const {
      category_code, service_type, booking_path, urgency, brand,
      customer_lat, customer_lng, customer_zone,
      is_emergency = false, booking_id,
    } = body;

    if (!category_code) {
      return new Response(JSON.stringify({ error: "category_code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Query eligible verified partners
    const { data: partners, error: pErr } = await supabase
      .from("partners")
      .select("*")
      .eq("verification_status", "verified")
      .contains("categories_supported", [category_code])
      .neq("availability_status", "offline");

    if (pErr) throw pErr;

    const categoryRules = CATEGORY_RULES[category_code] || {};
    const needsInspection = booking_path === "inspection" || categoryRules.prefer_inspection;
    const needsQuote = booking_path === "quote_required" || categoryRules.prefer_quote;
    const normalizedZone = customer_zone ? normalizeZone(customer_zone) : null;
    const hasBrandWeight = categoryRules.brand_weight_boost && brand;

    let preferSafetyInspection = false;
    if (service_type) {
      for (const kw of SAFETY_KEYWORDS) {
        if (kw.test(service_type)) { preferSafetyInspection = true; break; }
      }
    }

    const scored: ScoredCandidate[] = [];

    for (const p of (partners || [])) {
      // ── QUALITY GATES: hard exclusion ──
      if ((p.rating_average || 0) > 0 && p.rating_average < QUALITY_GATES.min_rating) continue;
      if ((p.cancellation_rate || 0) > QUALITY_GATES.max_cancellation_rate) continue;
      if ((p.strike_count || 0) > QUALITY_GATES.max_strike_count) continue;
      if ((p.on_time_rate || 95) < QUALITY_GATES.min_on_time_rate) continue;

      // Capacity check
      if (p.availability_status === "busy" && (p.current_job_count || 0) >= (p.max_concurrent_jobs || 1)) continue;
      if ((p.current_job_count || 0) >= (p.max_jobs_per_day || 5)) continue;

      // ── ZONE ELIGIBILITY ──
      const partnerZones = ((p.service_zones || []) as string[]).map(normalizeZone);
      const hasZoneData = normalizedZone && partnerZones.length > 0;
      const zoneMatch = hasZoneData ? partnerZones.includes(normalizedZone!) : null;

      // If partner has zones defined and customer zone is known, but partner doesn't cover it → exclude
      if (hasZoneData && !zoneMatch) continue;

      // ── DISTANCE CALCULATION ──
      let distKm: number | null = null;
      let distanceSource = "none";

      if (customer_lat && customer_lng) {
        const pLat = p.current_latitude || p.base_latitude;
        const pLng = p.current_longitude || p.base_longitude;
        if (pLat && pLng) {
          distKm = haversineKm(customer_lat, customer_lng, pLat, pLng);
          distanceSource = p.current_latitude ? "gps" : "base";
        }
      }

      // No-coordinate fallback: use zone match or service area coverage
      if (distKm === null) {
        if (zoneMatch) {
          // In-zone partner without coordinates → assume moderate distance
          distKm = 4;
          distanceSource = "zone_match";
        } else if (partnerZones.length > 0 && normalizedZone) {
          // Partner has zones but doesn't match (already filtered out above, but safety)
          distKm = 15;
          distanceSource = "zone_mismatch";
        } else {
          // No zone data at all → assume default
          distKm = 8;
          distanceSource = "default";
        }
      }

      if (distKm > 20) continue;

      // ── SCORING (100-point scale) ──

      // Proximity (30%) — zone match boosts significantly
      let proximityScore: number;
      if (distKm < 2) proximityScore = 100;
      else if (distKm < 5) proximityScore = 85;
      else if (distKm < 8) proximityScore = 65;
      else if (distKm < 12) proximityScore = 45;
      else proximityScore = 25;

      // Zone bonus: in-zone outranks out-of-zone even if farther
      if (zoneMatch) proximityScore = Math.min(100, proximityScore + 15);

      // Specialization (20%) — strict matching
      let specScore = 40; // base for category match
      if (service_type && p.specializations) {
        const stMatch = scoreServiceTypeMatch(p.specializations as string[], service_type);
        if (stMatch > 0) specScore = Math.max(specScore, stMatch);
      }
      if (service_type && p.service_types_supported) {
        const stMatch = scoreServiceTypeMatch(p.service_types_supported as string[], service_type);
        if (stMatch > 0) specScore = Math.max(specScore, stMatch);
      }

      // Brand specialization — boosted for relevant categories
      let brandBonus = 0;
      if (brand && p.brand_specializations) {
        const brandMatch = (p.brand_specializations as string[]).some(
          (b: string) => b.toLowerCase() === brand.toLowerCase()
        );
        if (brandMatch) {
          brandBonus = hasBrandWeight ? 15 : 8;
          specScore = Math.min(100, specScore + brandBonus);
        } else if (hasBrandWeight) {
          // Brand matters for this category but partner doesn't have it → moderate penalty
          specScore = Math.max(20, specScore - 10);
        }
      }

      // Rating (15%)
      const ratingScore = Math.min(100, ((p.rating_average || 0) / 5) * 100);

      // Reliability (10%)
      const onTimeRate = p.on_time_rate || 90;
      const cancelRate = p.cancellation_rate || 0;
      const reliabilityScore = Math.min(100, onTimeRate - (cancelRate * 2));

      // Acceptance / Quote Approval (10%)
      const acceptScore = Math.min(100, (p.acceptance_rate || 70) + ((p.quote_approval_rate || 70) - 70));

      // Workload (10%)
      const currentJobs = p.current_job_count || 0;
      const maxConcurrent = p.max_concurrent_jobs || 1;
      const workloadScore = currentJobs === 0 ? 100 : Math.max(0, 100 - (currentJobs / maxConcurrent) * 80);

      // Emergency priority (5%)
      let emergencyScore = 50;
      if (is_emergency) {
        if (p.emergency_available && distKm < 3) emergencyScore = 100;
        else if (p.emergency_available) emergencyScore = 85;
        else if (distKm < 3) emergencyScore = 70;
        else emergencyScore = 30;
      }

      // Category-specific bonuses
      let categoryBonus = 0;
      if ((needsInspection || preferSafetyInspection) && p.inspection_capable) categoryBonus += 5;
      if (is_emergency && p.express_capable) categoryBonus += 3;
      if (needsQuote && (p.quote_approval_rate || 70) >= 85) categoryBonus += 3;

      // Penalties
      let penalty = 0;
      if ((p.strike_count || 0) > 0) penalty += (p.strike_count || 0) * 3;
      if ((p.late_arrival_count || 0) > 3) penalty += 5;
      if (distanceSource === "default") penalty += 3; // less confidence in ranking

      const breakdown: Record<string, number> = {
        proximity: Math.round(proximityScore * 0.30),
        specialization: Math.round(specScore * 0.20),
        rating: Math.round(ratingScore * 0.15),
        reliability: Math.round(reliabilityScore * 0.10),
        acceptance: Math.round(acceptScore * 0.10),
        workload: Math.round(workloadScore * 0.10),
        emergency: Math.round(emergencyScore * 0.05),
        category_bonus: categoryBonus,
        penalty: -penalty,
      };

      const totalScore = Math.max(0, Math.min(100,
        breakdown.proximity + breakdown.specialization + breakdown.rating +
        breakdown.reliability + breakdown.acceptance + breakdown.workload +
        breakdown.emergency + categoryBonus - penalty
      ));

      scored.push({
        partner_id: p.id,
        technician_name: p.full_name,
        business_name: p.business_name,
        photo_url: p.profile_photo_url,
        specializations: p.specializations || [],
        rating: p.rating_average || 0,
        completed_jobs: p.completed_jobs_count || 0,
        distance_km: Math.round(distKm * 10) / 10,
        eta_minutes: calculateEtaMinutes(distKm),
        match_score: totalScore,
        match_reason: generateMatchReason(p, category_code, distKm),
        verified: true,
        availability_status: p.availability_status,
        inspection_capable: p.inspection_capable || false,
        express_capable: p.express_capable || false,
        on_time_rate: p.on_time_rate || 90,
        score_breakdown: breakdown,
      });
    }

    scored.sort((a, b) => b.match_score - a.match_score);
    const top3 = scored.slice(0, 3);
    const noMatchFound = top3.length === 0;
    const matchDurationMs = Date.now() - startTime;

    // Log to match_logs
    try {
      await supabase.from("match_logs").insert({
        booking_id: booking_id || null,
        category_code,
        service_type: service_type || null,
        customer_zone: customer_zone || null,
        is_emergency,
        ranked_technicians: top3.map((t) => ({
          partner_id: t.partner_id,
          name: t.technician_name,
          score: t.match_score,
          reason: t.match_reason,
          distance_km: t.distance_km,
        })),
        selected_technician_id: top3[0]?.partner_id || null,
        auto_assigned: !noMatchFound,
        top_match_score: top3[0]?.match_score || null,
        top_match_reason: top3[0]?.match_reason || null,
        no_match_found: noMatchFound,
        total_candidates: scored.length,
        match_duration_ms: matchDurationMs,
      });
    } catch (logErr) {
      console.error("Failed to log match:", logErr);
    }

    return new Response(JSON.stringify({
      matches: top3,
      no_match_found: noMatchFound,
      total_candidates: scored.length,
      match_duration_ms: matchDurationMs,
      fallback_message: noMatchFound
        ? "No verified technicians available in your area right now. We recommend booking an inspection — we'll assign one as soon as possible."
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("technician-match error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      matches: [],
      no_match_found: true,
      fallback_message: "Matching service temporarily unavailable. Please try again.",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
