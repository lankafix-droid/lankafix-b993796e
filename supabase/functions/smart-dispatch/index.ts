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
  new_partner_boost: number;
  vehicle_bonus: number;
  zone_preference: number;
  /** Phase 5: additive performance signal */
  performance_signal: number;
  /** Phase 5: additive reliability tier signal */
  tier_signal: number;
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

function calculateETA(distanceKm: number, vehicleType: string = "motorcycle"): {
  minutes: number; etaMin: number; etaMax: number; traffic: string; trafficLabel: string;
} {
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const isLate = hour >= 21 || hour < 6;
  const traffic = isPeak ? "peak" : isLate ? "light" : "normal";
  const multiplier = isPeak ? 1.6 : isLate ? 1.0 : 1.3;

  let base = 10;
  if (distanceKm >= 3) base = 20;
  if (distanceKm >= 8) base = 40;
  if (distanceKm >= 15) base = 60 + Math.round((distanceKm - 15) * 3);

  if (vehicleType === "motorcycle") base = Math.round(base * 0.8);
  else if (vehicleType === "van") base = Math.round(base * 1.15);

  const minutes = Math.round(base * multiplier);
  const etaMin = Math.max(5, Math.round(minutes * 0.7));
  const etaMax = Math.round(minutes * 1.3);
  const trafficLabel = traffic === "peak" ? "Heavy traffic" : traffic === "light" ? "Light traffic" : "Normal traffic";

  return { minutes, etaMin, etaMax, traffic, trafficLabel };
}

function normalizeZone(z: string): string {
  return z.toLowerCase().replace(/[\s_-]+/g, "");
}

function getStalenessFactor(lastPingAt: string | null): { factor: number; label: string } {
  if (!lastPingAt) return { factor: 0.5, label: "no_gps" };
  const diffMin = (Date.now() - new Date(lastPingAt).getTime()) / 60000;
  if (diffMin <= 5) return { factor: 1.0, label: "live" };
  if (diffMin <= 15) return { factor: 0.85, label: "recent" };
  if (diffMin <= 30) return { factor: 0.70, label: "stale" };
  return { factor: 0.50, label: "very_stale" };
}

function resolvePartnerLocation(
  p: any,
  zoneCentroids: Map<string, { lat: number; lng: number }>,
): { lat: number; lng: number; source: string } | null {
  if (p.current_latitude && p.current_longitude) {
    return { lat: p.current_latitude, lng: p.current_longitude, source: "current_gps" };
  }
  if (p.base_latitude && p.base_longitude) {
    return { lat: p.base_latitude, lng: p.base_longitude, source: "base_location" };
  }
  if (p.service_zones && p.service_zones.length > 0) {
    for (const zone of p.service_zones) {
      const centroid = zoneCentroids.get(normalizeZone(zone));
      if (centroid) return { lat: centroid.lat, lng: centroid.lng, source: "zone_centroid" };
    }
  }
  return null;
}

const VAN_PREFERRED_CATEGORIES = ["AC", "APPLIANCE", "CCTV", "SOLAR", "SMARTHOME"];

/**
 * Phase 5 — Performance & Tier Scoring
 * 
 * Additive signals, not hard blockers:
 * - performance_score: 0-100 → normalized to small weight contribution
 * - reliability_tier: bonus for elite/pro, neutral for verified, slight penalty for under_review
 * - Missing data defaults to neutral (50) — never excludes a partner
 */
const TIER_SCORE_MAP: Record<string, number> = {
  elite: 100,
  pro: 75,
  verified: 50,  // neutral default
  under_review: 20,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: DispatchRequest = await req.json();
    const {
      category_code, service_type, brand, customer_lat, customer_lng,
      is_emergency, booking_id, customer_zone,
      dispatch_round = 1, exclude_partner_ids = [],
    } = body;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Load config + zone centroids in parallel
    const [settingsRes, zonesRes] = await Promise.all([
      supabase.from("platform_settings").select("key, value")
        .in("key", ["dispatch_weights", "dispatch_modes", "dispatch_limits"]),
      supabase.from("service_zones").select("zone_code, zone_name, center_latitude, center_longitude"),
    ]);

    const configMap: Record<string, any> = {};
    (settingsRes.data || []).forEach((s: any) => { configMap[s.key] = s.value; });

    const rawWeights = configMap.dispatch_weights || {};
    const weights = {
      proximity: rawWeights.proximity ?? 0.30,
      specialization: rawWeights.specialization ?? 0.20,
      rating: rawWeights.rating ?? 0.15,
      response_speed: rawWeights.response_speed ?? 0.10,
      workload: rawWeights.workload ?? 0.10,
      completion_rate: rawWeights.completion_rate ?? 0.10,
      emergency_priority: rawWeights.emergency_priority ?? 0.05,
      // Phase 5 — configurable via platform_settings.dispatch_weights
      performance_signal: rawWeights.performance_signal ?? 0.03,
      tier_signal: rawWeights.tier_signal ?? 0.02,
    };
    const modes = configMap.dispatch_modes || {};
    const limits = configMap.dispatch_limits || {
      max_distance_km: 20, emergency_max_distance_km: 15,
      low_density_fallback_km: 20,
    };

    const zoneCentroids = new Map<string, { lat: number; lng: number }>();
    (zonesRes.data || []).forEach((z: any) => {
      if (z.center_latitude && z.center_longitude) {
        zoneCentroids.set(normalizeZone(z.zone_code), { lat: z.center_latitude, lng: z.center_longitude });
      }
    });

    const dispatchMode = modes[category_code] || "auto";
    const initialMaxDist = is_emergency
      ? (limits.emergency_max_distance_km || 15)
      : (limits.max_distance_km || 20);
    const normalizedCustomerZone = customer_zone ? normalizeZone(customer_zone) : null;

    // 2. Query eligible partners — now includes performance_score and reliability_tier
    let query = supabase
      .from("partners")
      .select("*")
      .eq("verification_status", "verified")
      .contains("categories_supported", [category_code]);

    query = query.neq("availability_status", "offline");

    const { data: partners, error: partnerError } = await query;
    if (partnerError) throw partnerError;

    if (!partners || partners.length === 0) {
      if (booking_id) {
        await Promise.all([
          supabase.from("dispatch_escalations").insert({
            booking_id, reason: "no_eligible_partners", dispatch_rounds_attempted: dispatch_round,
          }),
          supabase.from("bookings").update({ dispatch_status: "escalated", dispatch_round }).eq("id", booking_id),
        ]);
      }
      return new Response(JSON.stringify({
        dispatch_mode: dispatchMode, candidates: [], best_match: null,
        total_eligible: 0, dispatch_round, escalate_to_ops: true,
        message: "No eligible partners found",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Score each partner
    const scored: Array<{
      partner_id: string; partner: any; distance_km: number;
      eta_minutes: number; eta_min: number; eta_max: number;
      traffic: string; traffic_label: string; location_source: string;
      score: ScoreBreakdown;
    }> = [];

    for (const p of partners) {
      if (exclude_partner_ids.includes(p.id)) continue;

      if (p.availability_status === "busy" && (p.current_job_count || 0) >= (p.max_concurrent_jobs || 1)) continue;
      if ((p.current_job_count || 0) >= (p.max_jobs_per_day || 5)) continue;

      const loc = resolvePartnerLocation(p, zoneCentroids);
      if (!loc) continue;

      const dist = haversineKm(customer_lat, customer_lng, loc.lat, loc.lng);
      const effectiveMaxDist = initialMaxDist;
      if (dist > effectiveMaxDist) continue;

      const staleness = getStalenessFactor(p.last_location_ping_at);

      let zoneMatch = false;
      if (normalizedCustomerZone && p.service_zones && p.service_zones.length > 0) {
        const partnerZonesNorm = (p.service_zones as string[]).map(normalizeZone);
        zoneMatch = partnerZonesNorm.includes(normalizedCustomerZone);
      }

      // ── SCORING ──

      let proximityRaw: number;
      if (dist < 2) proximityRaw = 100;
      else if (dist < 5) proximityRaw = 85;
      else if (dist < 8) proximityRaw = 65;
      else if (dist < 12) proximityRaw = 45;
      else if (dist < 18) proximityRaw = 25;
      else proximityRaw = 10;

      proximityRaw = Math.round(proximityRaw * staleness.factor);

      if (loc.source === "base_location") proximityRaw = Math.round(proximityRaw * 0.9);
      else if (loc.source === "zone_centroid") proximityRaw = Math.round(proximityRaw * 0.7);

      const zonePreferenceRaw = zoneMatch ? 100 : (dist < 5 ? 60 : dist < 10 ? 30 : 0);

      let specRaw = 40;
      if (service_type && p.specializations) {
        if (p.specializations.includes(service_type)) specRaw = 100;
        else if (p.specializations.some((s: string) => service_type.includes(s) || s.includes(service_type))) specRaw = 70;
      }
      if (brand && p.brand_specializations) {
        if (p.brand_specializations.some((b: string) => b.toLowerCase() === brand.toLowerCase()))
          specRaw = Math.min(specRaw + 30, 100);
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
        if (p.emergency_available && dist < 3) emergencyRaw = 100;
        else if (p.emergency_available) emergencyRaw = 90;
        else if (dist < 3) emergencyRaw = 75;
        else if (dist < 6) emergencyRaw = 50;
        else emergencyRaw = 20;
      }

      let newPartnerBoostRaw = 0;
      if (completedJobs < 10) newPartnerBoostRaw = completedJobs < 3 ? 80 : 50;

      let vehicleBonusRaw = 50;
      const vehicleType = p.vehicle_type || "motorcycle";
      if (vehicleType === "motorcycle") vehicleBonusRaw = 70;
      if (vehicleType === "van" && VAN_PREFERRED_CATEGORIES.includes(category_code)) vehicleBonusRaw = 80;

      // ── Phase 5: Performance & Tier signals (additive, not blockers) ──
      // performance_score: null/0 → neutral 50
      const perfScore = p.performance_score ?? 0;
      const performanceSignalRaw = perfScore > 0 ? perfScore : 50; // neutral default

      // reliability_tier: missing → "verified" → neutral 50
      const tierValue = TIER_SCORE_MAP[p.reliability_tier || "verified"] ?? 50;

      // Penalties
      let penalty = 0;
      if ((p.strike_count || 0) > 0) penalty += (p.strike_count || 0) * 5;
      if ((p.late_arrival_count || 0) > 3) penalty += 10;
      if (cancelRate > 20) penalty += 15;

      const breakdown: ScoreBreakdown = {
        proximity: Math.round(proximityRaw * weights.proximity),
        specialization: Math.round(specRaw * weights.specialization),
        rating: Math.round(ratingRaw * weights.rating),
        response_speed: Math.round(responseRaw * weights.response_speed),
        workload: Math.round(workloadRaw * weights.workload),
        completion_rate: Math.round(completionRaw * weights.completion_rate),
        emergency_priority: Math.round(emergencyRaw * weights.emergency_priority),
        new_partner_boost: Math.round(newPartnerBoostRaw * 0.04),
        vehicle_bonus: Math.round(vehicleBonusRaw * 0.02),
        zone_preference: Math.round(zonePreferenceRaw * 0.04),
        // Phase 5: configurable additive signals (modest — max ~3pts + ~2pts)
        performance_signal: Math.round(performanceSignalRaw * weights.performance_signal),
        tier_signal: Math.round(tierValue * weights.tier_signal),
        total: 0,
      };

      breakdown.total = Math.max(0, Math.min(100,
        breakdown.proximity + breakdown.specialization + breakdown.rating +
        breakdown.response_speed + breakdown.workload + breakdown.completion_rate +
        breakdown.emergency_priority + breakdown.new_partner_boost +
        breakdown.vehicle_bonus + breakdown.zone_preference +
        breakdown.performance_signal + breakdown.tier_signal - penalty
      ));

      const eta = calculateETA(dist, vehicleType);

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
          // Phase 5: include for ops visibility
          performance_score: p.performance_score,
          reliability_tier: p.reliability_tier,
        },
        distance_km: Math.round(dist * 10) / 10,
        eta_minutes: eta.minutes,
        eta_min: eta.etaMin,
        eta_max: eta.etaMax,
        traffic: eta.traffic,
        traffic_label: eta.trafficLabel,
        location_source: loc.source,
        score: breakdown,
      });
    }

    if (scored.length === 0 && initialMaxDist < (limits.low_density_fallback_km || 20)) {
      // Re-run triggered on next dispatch round
    }

    scored.sort((a, b) => b.score.total - a.score.total);

    let resultCandidates = scored;
    if (dispatchMode === "auto") resultCandidates = scored.slice(0, 1);
    else if (dispatchMode === "top_3") resultCandidates = scored.slice(0, 3);

    const bestMatch = resultCandidates[0] || null;
    const acceptWindowSec = is_emergency ? 30 : 60;

    // 4. Persist dispatch logs + booking state + notifications
    if (booking_id) {
      const persistOps: Promise<any>[] = [];

      if (resultCandidates.length > 0) {
        const logEntries = scored.slice(0, 10).map((c, i) => ({
          booking_id,
          partner_id: c.partner_id,
          score: c.score.total,
          distance_km: c.distance_km,
          eta_minutes: c.eta_minutes,
          status: i === 0 ? "pending_acceptance" : "backup",
          dispatch_round,
          score_breakdown: {
            ...c.score,
            location_source: c.location_source,
            traffic: c.traffic,
            eta_range: `${c.eta_min}-${c.eta_max}`,
            // Phase 5: persist tier/perf for ops analytics
            partner_tier: c.partner.reliability_tier,
            partner_perf_score: c.partner.performance_score,
          },
        }));
        persistOps.push(supabase.from("dispatch_log").insert(logEntries));
      }

      const bookingUpdate: Record<string, any> = {
        dispatch_mode: dispatchMode,
        dispatch_round,
        dispatch_status: bestMatch ? "pending_acceptance" : "escalated",
      };
      if (bestMatch) {
        bookingUpdate.selected_partner_id = bestMatch.partner_id;
        bookingUpdate.promised_eta_minutes = bestMatch.eta_minutes;
      }
      persistOps.push(supabase.from("bookings").update(bookingUpdate).eq("id", booking_id));

      if (bestMatch) {
        // Phase 7: Partner notification with retry
        const notificationPayload = {
          partner_id: bestMatch.partner_id,
          booking_id,
          notification_type: "job_offer",
          title: is_emergency ? "🚨 Emergency Job Offer" : "New Job Offer",
          body: `${category_code} service in ${customer_zone || "your zone"} · ETA ${bestMatch.eta_min}–${bestMatch.eta_max} min`,
          metadata: {
            category_code, service_type, is_emergency,
            dispatch_score: bestMatch.score.total,
            accept_window_seconds: acceptWindowSec,
            eta_range: { min: bestMatch.eta_min, max: bestMatch.eta_max },
          },
          expires_at: new Date(Date.now() + acceptWindowSec * 1000).toISOString(),
        };

        const { error: notifError } = await supabase.from("partner_notifications").insert(notificationPayload);

        if (notifError) {
          console.warn("[smart-dispatch] Notification insert failed, retrying once:", notifError.message);
          // Retry once after 500ms
          await new Promise(r => setTimeout(r, 500));
          const { error: retryError } = await supabase.from("partner_notifications").insert(notificationPayload);

          if (retryError) {
            console.error("[smart-dispatch] Notification retry failed:", retryError.message);
            // Log incident for ops visibility
            await supabase.from("system_incidents").insert({
              incident_type: "partner_notification_failed",
              severity: "critical",
              source: "smart-dispatch",
              booking_id,
              partner_id: bestMatch.partner_id,
              error_message: retryError.message,
              metadata: { category_code, dispatch_round, retry_attempted: true },
            }).catch(() => {}); // non-blocking
          }
        }

        // Log notification event
        persistOps.push(supabase.from("notification_events").insert({
          event_type: "partner_offer_sent",
          booking_id,
          partner_id: bestMatch.partner_id,
          metadata: { category_code, dispatch_round, score: bestMatch.score.total },
        }));
      }

      if (!bestMatch) {
        persistOps.push(supabase.from("dispatch_escalations").insert({
          booking_id,
          reason: scored.length === 0 ? "no_eligible_partners" : "all_excluded",
          dispatch_rounds_attempted: dispatch_round,
        }));
      }

      await Promise.all(persistOps);
    }

    return new Response(JSON.stringify({
      dispatch_mode: dispatchMode,
      accept_window_seconds: acceptWindowSec,
      candidates: resultCandidates.map((c) => ({
        partner_id: c.partner_id,
        partner: {
          id: c.partner.id,
          full_name: c.partner.full_name,
          business_name: c.partner.business_name,
          rating_average: c.partner.rating_average,
          completed_jobs_count: c.partner.completed_jobs_count,
          experience_years: c.partner.experience_years,
          vehicle_type: c.partner.vehicle_type,
          brand_specializations: c.partner.brand_specializations,
          specializations: c.partner.specializations,
          availability_status: c.partner.availability_status,
          emergency_available: c.partner.emergency_available,
          profile_photo_url: c.partner.profile_photo_url,
        },
        distance_km: c.distance_km,
        eta_minutes: c.eta_minutes,
        eta_min: c.eta_min,
        eta_max: c.eta_max,
        traffic: c.traffic,
        traffic_label: c.traffic_label,
        // score breakdown intentionally omitted from public response — ops-only via dispatch_log
      })),
      best_match: bestMatch ? {
        partner_id: bestMatch.partner_id,
        partner: {
          id: bestMatch.partner.id,
          full_name: bestMatch.partner.full_name,
          business_name: bestMatch.partner.business_name,
          rating_average: bestMatch.partner.rating_average,
          completed_jobs_count: bestMatch.partner.completed_jobs_count,
          experience_years: bestMatch.partner.experience_years,
          vehicle_type: bestMatch.partner.vehicle_type,
          profile_photo_url: bestMatch.partner.profile_photo_url,
        },
        distance_km: bestMatch.distance_km,
        eta_minutes: bestMatch.eta_minutes,
        eta_min: bestMatch.eta_min,
        eta_max: bestMatch.eta_max,
        traffic: bestMatch.traffic,
        traffic_label: bestMatch.traffic_label,
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
