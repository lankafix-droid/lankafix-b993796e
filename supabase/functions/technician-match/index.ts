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

// Category-specific matching rules
const CATEGORY_RULES: Record<string, {
  prefer_inspection?: boolean;
  prefer_quote?: boolean;
  prefer_specialization?: string[];
  prefer_express?: boolean;
}> = {
  AC: { prefer_specialization: ["AC_REPAIR", "AC_GAS", "AC_INSTALL"] },
  MOBILE: { prefer_specialization: ["MOBILE_SCREEN", "MOBILE_BOARD", "MOBILE_WATER"] },
  IT: { prefer_specialization: ["REMOTE_SUPPORT", "NETWORK_SETUP"] },
  CCTV: { prefer_specialization: ["CCTV_INSTALL", "CCTV_REPAIR"] },
  SOLAR: { prefer_inspection: true, prefer_quote: true },
  ELECTRICAL: { prefer_inspection: true },
  PLUMBING: { prefer_specialization: ["PLUMBING_LEAK", "PLUMBING_INSTALL"] },
  ELECTRONICS: { prefer_specialization: ["TV_REPAIR", "APPLIANCE_REPAIR"] },
  NETWORK: { prefer_specialization: ["WIFI_SETUP", "NETWORK_CABLING"] },
};

// Safety keywords that force inspection-capable preference
const SAFETY_KEYWORDS = [
  /\b(gas|refrigerant|freon)\b/i,
  /\b(water\s*damage)\b/i,
  /\b(sparking|shock|short\s*circuit|fire)\b/i,
];

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

function calculateEtaMinutes(distanceKm: number): number {
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const multiplier = isPeak ? 1.6 : 1.3;
  let base = distanceKm < 3 ? 10 : distanceKm < 8 ? 20 : 40 + Math.round((distanceKm - 8) * 3);
  return Math.round(base * multiplier);
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

function generateMatchReason(
  p: any, categoryCode: string, distKm: number, topFactor: string
): string {
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

  // Capitalize first letter
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

    // Check if service_type triggers safety keyword preferences
    let preferSafetyInspection = false;
    if (service_type) {
      for (const kw of SAFETY_KEYWORDS) {
        if (kw.test(service_type)) { preferSafetyInspection = true; break; }
      }
    }

    // Score each partner
    const scored: ScoredCandidate[] = [];

    for (const p of (partners || [])) {
      // Capacity check
      if (p.availability_status === "busy" && (p.current_job_count || 0) >= (p.max_concurrent_jobs || 1)) continue;
      if ((p.current_job_count || 0) >= (p.max_jobs_per_day || 5)) continue;

      // Distance calculation
      let distKm = 8; // default if no coords
      if (customer_lat && customer_lng) {
        const pLat = p.current_latitude || p.base_latitude;
        const pLng = p.current_longitude || p.base_longitude;
        if (pLat && pLng) {
          distKm = haversineKm(customer_lat, customer_lng, pLat, pLng);
        }
      }
      if (distKm > 20) continue; // too far

      // ── SCORING (100-point scale) ──

      // Proximity (30%)
      let proximityScore: number;
      if (distKm < 2) proximityScore = 100;
      else if (distKm < 5) proximityScore = 85;
      else if (distKm < 8) proximityScore = 65;
      else if (distKm < 12) proximityScore = 45;
      else proximityScore = 25;

      // Zone bonus
      if (normalizedZone && p.service_zones) {
        const pZones = (p.service_zones as string[]).map(normalizeZone);
        if (pZones.includes(normalizedZone)) proximityScore = Math.min(100, proximityScore + 10);
      }

      // Specialization (20%)
      let specScore = 40; // base for category match (already filtered)
      if (service_type && p.specializations) {
        if ((p.specializations as string[]).some((s: string) => s.includes(service_type) || service_type.includes(s))) specScore = 100;
        else if ((p.specializations as string[]).length > 0) specScore = 60;
      }
      if (brand && p.brand_specializations) {
        if ((p.brand_specializations as string[]).some((b: string) => b.toLowerCase() === brand.toLowerCase())) specScore = Math.min(specScore + 25, 100);
      }
      // Service type specific match
      if (service_type && p.service_types_supported) {
        if ((p.service_types_supported as string[]).includes(service_type)) specScore = Math.min(specScore + 20, 100);
      }

      // Rating (15%)
      const ratingScore = Math.min(100, ((p.rating_average || 0) / 5) * 100);

      // Reliability (10%) — on_time_rate + low cancellation
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

      const topFactor = Object.entries(breakdown)
        .filter(([k]) => k !== "penalty" && k !== "category_bonus")
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "proximity";

      const eta = calculateEtaMinutes(distKm);

      scored.push({
        partner_id: p.id,
        technician_name: p.full_name,
        business_name: p.business_name,
        photo_url: p.profile_photo_url,
        specializations: p.specializations || [],
        rating: p.rating_average || 0,
        completed_jobs: p.completed_jobs_count || 0,
        distance_km: Math.round(distKm * 10) / 10,
        eta_minutes: eta,
        match_score: totalScore,
        match_reason: generateMatchReason(p, category_code, distKm, topFactor),
        verified: true,
        availability_status: p.availability_status,
        inspection_capable: p.inspection_capable || false,
        express_capable: p.express_capable || false,
        on_time_rate: p.on_time_rate || 90,
        score_breakdown: breakdown,
      });
    }

    // Sort by match score, return top 3
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
