import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DispatchRequest {
  category_code: string;
  service_type?: string;
  brand?: string;
  customer_lat: number;
  customer_lng: number;
  customer_zone?: string;
  is_emergency: boolean;
  booking_id?: string;
  dispatch_round?: number;
  exclude_partner_ids?: string[];
}

interface ScoreBreakdown {
  proximity: number;
  specialization: number;
  rating: number;
  response_speed: number;
  workload: number;
  completion_rate: number;
  emergency_priority: number;
  total: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateETA(distanceKm: number): { minutes: number; traffic: string } {
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const multiplier = isPeak ? 1.6 : 1.3;
  let base = 10;
  if (distanceKm >= 3) base = 20;
  if (distanceKm >= 8) base = 40;
  if (distanceKm >= 15) base = 60 + Math.round((distanceKm - 15) * 3);
  return { minutes: Math.round(base * multiplier), traffic: isPeak ? "peak" : "normal" };
}

/** Normalize zone codes for matching — strips underscores, lowercases */
function normalizeZone(z: string): string {
  return z.toLowerCase().replace(/[\s_-]+/g, "");
}

/** Check if partner location ping is stale (> 30 min) */
function isLocationStale(lastPingAt: string | null): boolean {
  if (!lastPingAt) return true;
  const diff = Date.now() - new Date(lastPingAt).getTime();
  return diff > 30 * 60 * 1000; // 30 minutes
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: DispatchRequest = await req.json();
    const {
      category_code, service_type, brand, customer_lat, customer_lng,
      is_emergency, booking_id, customer_zone,
      dispatch_round = 1, exclude_partner_ids = [],
    } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Load dispatch config
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["dispatch_weights", "dispatch_modes", "dispatch_limits"]);

    const configMap: Record<string, any> = {};
    (settings || []).forEach((s: any) => { configMap[s.key] = s.value; });

    const weights = configMap.dispatch_weights || {
      proximity: 0.30, specialization: 0.20, rating: 0.15,
      response_speed: 0.10, workload: 0.10, completion_rate: 0.10, emergency_priority: 0.05,
    };
    const modes = configMap.dispatch_modes || {};
    const limits = configMap.dispatch_limits || { max_distance_km: 25, emergency_max_distance_km: 15, stale_location_minutes: 30 };

    const dispatchMode = modes[category_code] || "auto";
    const maxDist = is_emergency ? (limits.emergency_max_distance_km || 15) : (limits.max_distance_km || 25);

    // 2. Query eligible partners
    let query = supabase
      .from("partners")
      .select("*")
      .eq("verification_status", "verified")
      .neq("availability_status", "offline")
      .contains("categories_supported", [category_code]);

    if (is_emergency) {
      query = query.eq("emergency_available", true);
    }

    const { data: partners, error: partnerError } = await query;
    if (partnerError) throw partnerError;

    // Also load service_zones for normalized matching
    const { data: zoneRows } = await supabase.from("service_zones").select("zone_code, zone_name");
    const zoneCodeSet = new Set((zoneRows || []).map((z: any) => normalizeZone(z.zone_code)));

    const normalizedCustomerZone = customer_zone ? normalizeZone(customer_zone) : null;

    if (!partners || partners.length === 0) {
      // Escalate if booking_id provided
      if (booking_id) {
        await supabase.from("dispatch_escalations").insert({
          booking_id,
          reason: "no_eligible_partners",
          dispatch_rounds_attempted: dispatch_round,
        });
        await supabase.from("bookings").update({
          dispatch_status: "escalated",
          dispatch_round,
        }).eq("id", booking_id);
      }

      return new Response(JSON.stringify({
        dispatch_mode: dispatchMode,
        candidates: [],
        best_match: null,
        total_eligible: 0,
        escalate_to_ops: true,
        message: "No eligible partners found",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Score each partner
    const scored: Array<{
      partner_id: string;
      partner: any;
      distance_km: number;
      eta_minutes: number;
      traffic: string;
      score: ScoreBreakdown;
    }> = [];

    for (const p of partners) {
      // Exclude partners from previous failed rounds
      if (exclude_partner_ids.includes(p.id)) continue;

      const pLat = p.current_latitude ?? p.base_latitude;
      const pLng = p.current_longitude ?? p.base_longitude;
      if (!pLat || !pLng) continue;

      const dist = haversineKm(customer_lat, customer_lng, pLat, pLng);
      if (dist > maxDist) continue;
      if ((p.current_job_count || 0) >= (p.max_concurrent_jobs || 1)) continue;
      if ((p.completed_jobs_count || 0) + (p.current_job_count || 0) >= (p.max_jobs_per_day || 5) * 1.2) continue;

      // Zone matching — normalized
      if (normalizedCustomerZone && p.service_zones && p.service_zones.length > 0) {
        const partnerZonesNorm = (p.service_zones as string[]).map(normalizeZone);
        if (!partnerZonesNorm.includes(normalizedCustomerZone)) continue;
      }

      // Stale location penalty flag
      const locationStale = isLocationStale(p.last_location_ping_at);

      // --- SCORING ---
      let proximityRaw = dist < 2 ? 100 : dist < 5 ? 80 : dist < 8 ? 60 : dist < 12 ? 40 : dist < 18 ? 20 : 10;
      // Penalize stale location
      if (locationStale) proximityRaw = Math.round(proximityRaw * 0.4);

      let specRaw = 40;
      if (service_type && p.specializations) {
        if (p.specializations.includes(service_type)) specRaw = 100;
        else if (p.specializations.some((s: string) => service_type.includes(s) || s.includes(service_type))) specRaw = 70;
      }
      if (brand && p.brand_specializations) {
        if (p.brand_specializations.some((b: string) => b.toLowerCase() === brand.toLowerCase())) specRaw = Math.min(specRaw + 30, 100);
      }

      const ratingRaw = Math.min(((p.rating_average || 0) / 5) * 100, 100);

      const avgResp = p.average_response_time_minutes || 30;
      const responseRaw = avgResp <= 5 ? 100 : avgResp <= 10 ? 85 : avgResp <= 20 ? 65 : avgResp <= 30 ? 40 : 20;

      const currentJobs = p.current_job_count || 0;
      const maxConcurrent = p.max_concurrent_jobs || 1;
      const workloadRaw = currentJobs === 0 ? 100 : Math.max(0, 100 - (currentJobs / maxConcurrent) * 80);

      const completedJobs = p.completed_jobs_count || 0;
      const cancelRate = p.cancellation_rate || 0;
      const completionRaw = completedJobs > 50
        ? Math.max(0, 100 - cancelRate * 5)
        : completedJobs > 10 ? Math.max(0, 80 - cancelRate * 4) : 50;

      let emergencyRaw = 50;
      if (is_emergency) {
        emergencyRaw = p.emergency_available ? 100 : 0;
        if (p.emergency_available && dist < 5) emergencyRaw = 100;
      }

      let penalty = 0;
      if ((p.strike_count || 0) > 0) penalty += (p.strike_count || 0) * 5;
      if ((p.late_arrival_count || 0) > 3) penalty += 10;
      if ((p.cancellation_rate || 0) > 20) penalty += 15;
      if (locationStale) penalty += 10;

      const breakdown: ScoreBreakdown = {
        proximity: Math.round(proximityRaw * weights.proximity),
        specialization: Math.round(specRaw * weights.specialization),
        rating: Math.round(ratingRaw * weights.rating),
        response_speed: Math.round(responseRaw * weights.response_speed),
        workload: Math.round(workloadRaw * weights.workload),
        completion_rate: Math.round(completionRaw * weights.completion_rate),
        emergency_priority: Math.round(emergencyRaw * weights.emergency_priority),
        total: 0,
      };

      breakdown.total = Math.max(0, Math.min(100,
        breakdown.proximity + breakdown.specialization + breakdown.rating +
        breakdown.response_speed + breakdown.workload + breakdown.completion_rate +
        breakdown.emergency_priority - penalty
      ));

      const eta = calculateETA(dist);

      scored.push({
        partner_id: p.id,
        partner: {
          id: p.id,
          full_name: p.full_name,
          business_name: p.business_name,
          rating_average: p.rating_average,
          completed_jobs_count: p.completed_jobs_count,
          experience_years: p.experience_years,
          vehicle_type: p.vehicle_type,
          brand_specializations: p.brand_specializations,
          specializations: p.specializations,
          availability_status: p.availability_status,
          emergency_available: p.emergency_available,
          current_job_count: p.current_job_count,
          service_zones: p.service_zones,
          profile_photo_url: p.profile_photo_url,
          acceptance_rate: p.acceptance_rate,
          cancellation_rate: p.cancellation_rate,
        },
        distance_km: Math.round(dist * 10) / 10,
        eta_minutes: eta.minutes,
        traffic: eta.traffic,
        score: breakdown,
      });
    }

    scored.sort((a, b) => b.score.total - a.score.total);

    let resultCandidates = scored;
    if (dispatchMode === "auto") resultCandidates = scored.slice(0, 1);
    else if (dispatchMode === "top_3") resultCandidates = scored.slice(0, 3);

    const bestMatch = resultCandidates[0] || null;

    // 4. Persist dispatch logs + booking state + notifications
    if (booking_id) {
      // Log all candidates
      if (resultCandidates.length > 0) {
        const logEntries = resultCandidates.slice(0, 5).map((c, i) => ({
          booking_id,
          partner_id: c.partner_id,
          score: c.score.total,
          distance_km: c.distance_km,
          eta_minutes: c.eta_minutes,
          status: i === 0 ? "pending_acceptance" : "backup",
          dispatch_round,
          score_breakdown: c.score,
        }));
        await supabase.from("dispatch_log").insert(logEntries);
      }

      // Update booking dispatch state
      const bookingUpdate: Record<string, any> = {
        dispatch_mode: dispatchMode,
        dispatch_round,
        dispatch_status: bestMatch ? "pending_acceptance" : "escalated",
      };
      if (bestMatch) {
        bookingUpdate.selected_partner_id = bestMatch.partner_id;
        bookingUpdate.promised_eta_minutes = bestMatch.eta_minutes;
      }
      await supabase.from("bookings").update(bookingUpdate).eq("id", booking_id);

      // Send notification to best match partner
      if (bestMatch) {
        const acceptWindowSec = is_emergency ? 45 : 60;
        await supabase.from("partner_notifications").insert({
          partner_id: bestMatch.partner_id,
          booking_id,
          notification_type: "job_offer",
          title: is_emergency ? "🚨 Emergency Job Offer" : "New Job Offer",
          body: `${category_code} service in ${customer_zone || "your zone"}`,
          metadata: {
            category_code,
            service_type,
            is_emergency,
            estimated_value: null,
            dispatch_score: bestMatch.score.total,
            accept_window_seconds: acceptWindowSec,
          },
          expires_at: new Date(Date.now() + acceptWindowSec * 1000).toISOString(),
        });
      }

      // Escalate if no matches
      if (!bestMatch) {
        await supabase.from("dispatch_escalations").insert({
          booking_id,
          reason: scored.length === 0 ? "no_eligible_partners" : "all_excluded",
          dispatch_rounds_attempted: dispatch_round,
        });
      }
    }

    return new Response(JSON.stringify({
      dispatch_mode: dispatchMode,
      candidates: resultCandidates.map((c) => ({
        partner_id: c.partner_id,
        partner: c.partner,
        distance_km: c.distance_km,
        eta_minutes: c.eta_minutes,
        traffic: c.traffic,
        score: c.score,
      })),
      best_match: bestMatch ? {
        partner_id: bestMatch.partner_id,
        partner: bestMatch.partner,
        distance_km: bestMatch.distance_km,
        eta_minutes: bestMatch.eta_minutes,
        traffic: bestMatch.traffic,
        score: bestMatch.score,
      } : null,
      total_eligible: scored.length,
      dispatch_round,
      escalate_to_ops: scored.length === 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("smart-dispatch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
