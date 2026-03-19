import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Category → archetype mapping ──
const ARCHETYPE_MAP: Record<string, string> = {
  AC: "inspection_first",
  MOBILE: "instant",
  IT: "instant",
  ELECTRICAL: "instant",
  PLUMBING: "instant",
  NETWORK: "instant",
  CONSUMER_ELEC: "inspection_first",
  COPIER: "inspection_first",
  APPLIANCE_INSTALL: "inspection_first",
  CCTV: "consultation",
  SOLAR: "consultation",
  SMART_HOME_OFFICE: "consultation",
  HOME_SECURITY: "consultation",
  POWER_BACKUP: "consultation",
  PRINT_SUPPLIES: "delivery",
};

const URGENCY_BOOST: Record<string, number> = {
  asap: 30, today: 15, tomorrow: 5, scheduled: 0,
};

// ── Zone normalization (server-side copy) ──
const ZONE_ALIASES: Record<string, string[]> = {
  col_01: ["colombo 1", "fort", "colombo 01"],
  col_02: ["colombo 2", "slave island", "colombo 02"],
  col_03: ["colombo 3", "kollupitiya", "colpetty", "colombo 03"],
  col_04: ["colombo 4", "bambalapitiya", "colombo 04"],
  col_05: ["colombo 5", "havelock town", "havelock", "kirulapone", "colombo 05"],
  col_06: ["colombo 6", "wellawatte", "wellawatta", "colombo 06"],
  col_07: ["colombo 7", "cinnamon gardens", "colombo 07"],
  col_08: ["colombo 8", "borella", "maradana", "colombo 08"],
  col_09: ["colombo 9", "dematagoda", "colombo 09"],
  col_10: ["colombo 10", "maligawatte"],
  col_11: ["colombo 11", "pettah"],
  col_12: ["colombo 12", "hultsdorf"],
  col_13: ["colombo 13", "kotahena"],
  col_14: ["colombo 14", "grandpass"],
  col_15: ["colombo 15", "mattakkuliya"],
  nugegoda: ["nugegoda", "nawinna", "wijerama", "pagoda"],
  maharagama: ["maharagama"],
  dehiwala: ["dehiwala", "dehiwela"],
  mt_lavinia: ["mount lavinia", "mt lavinia", "mt. lavinia"],
  rajagiriya: ["rajagiriya"],
  battaramulla: ["battaramulla"],
  nawala: ["nawala", "narahenpita"],
  wattala: ["wattala", "hendala"],
  moratuwa: ["moratuwa", "rawathawatte"],
  thalawathugoda: ["thalawathugoda", "talawatugoda"],
  kottawa: ["kottawa", "pannipitiya"],
  piliyandala: ["piliyandala"],
  malabe: ["malabe", "kaduwela"],
  kelaniya: ["kelaniya", "peliyagoda"],
  kotte: ["kotte", "sri jayawardenepura", "ethul kotte", "pita kotte"],
  boralesgamuwa: ["boralesgamuwa", "pepiliyana"],
  negombo: ["negombo"],
};

function resolveZoneCode(location: string | null): { zone_code: string; confidence: string } {
  if (!location) return { zone_code: "", confidence: "unknown" };
  const normalized = location.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  // Exact match
  for (const [code, aliases] of Object.entries(ZONE_ALIASES)) {
    for (const alias of aliases) {
      if (normalized === alias || normalized === code) {
        return { zone_code: code, confidence: "exact" };
      }
    }
  }

  // Partial match
  for (const [code, aliases] of Object.entries(ZONE_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return { zone_code: code, confidence: "partial" };
      }
    }
  }

  return { zone_code: "", confidence: "unknown" };
}

// ── Archetype-aware scoring weights ──
const WEIGHT_PROFILES: Record<string, Record<string, number>> = {
  instant:          { availability: 0.25, response: 0.20, zone: 0.20, load: 0.10, rating: 0.10, reliability: 0.10, exp: 0.05 },
  inspection_first: { reliability: 0.25, ontime: 0.20, rating: 0.15, zone: 0.15, response: 0.10, exp: 0.10, availability: 0.05 },
  consultation:     { spec: 0.25, zone: 0.20, reliability: 0.15, exp: 0.15, rating: 0.15, response: 0.10 },
  delivery:         { availability: 0.30, response: 0.25, zone: 0.25, rating: 0.10, reliability: 0.10 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { demand_request_id } = await req.json();
    if (!demand_request_id) throw new Error("demand_request_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch demand request
    const { data: demand, error: fetchErr } = await supabase
      .from("demand_requests")
      .select("*")
      .eq("id", demand_request_id)
      .single();

    if (fetchErr || !demand) throw new Error("Demand request not found");

    // ── Classification ──
    const archetype = ARCHETYPE_MAP[demand.category_code] || "instant";
    const urgency = demand.preferred_time || "scheduled";

    let request_type: string;
    let estimated_complexity: string;
    let priority_score = demand.priority_score || 0;

    switch (archetype) {
      case "instant":
        request_type = "instant_job";
        estimated_complexity = "standard";
        priority_score += URGENCY_BOOST[urgency] || 0;
        break;
      case "inspection_first":
        request_type = "inspection_required";
        estimated_complexity = "moderate";
        priority_score += (URGENCY_BOOST[urgency] || 0) * 0.8;
        break;
      case "consultation":
      case "project_based":
        request_type = "consultation_required";
        estimated_complexity = "complex";
        priority_score += (URGENCY_BOOST[urgency] || 0) * 0.5;
        break;
      default:
        request_type = "callback_only";
        estimated_complexity = "standard";
    }

    if (["ELECTRICAL", "PLUMBING", "AC"].includes(demand.category_code) && urgency === "asap") {
      priority_score += 20;
      estimated_complexity = "urgent";
    }

    priority_score = Math.min(100, Math.round(priority_score));

    // ── Zone normalization ──
    const { zone_code, confidence: zoneConfidence } = resolveZoneCode(demand.location);

    // ── Partner matching with archetype-aware scoring ──
    const { data: partners } = await supabase
      .from("partners")
      .select("id, full_name, rating_average, completed_jobs_count, availability_status, service_zones, categories_supported, average_response_time_minutes, on_time_rate, acceptance_rate, cancellation_rate, current_job_count, updated_at, experience_years, specializations, performance_score")
      .eq("verification_status", "verified")
      .contains("categories_supported", [demand.category_code])
      .in("availability_status", ["online", "busy"])
      .order("rating_average", { ascending: false })
      .limit(20);

    const weights = WEIGHT_PROFILES[archetype] || WEIGHT_PROFILES.instant;

    const scoredPartners = (partners || []).map((p: any) => {
      let score = 0;

      // Availability
      const availScore = p.availability_status === "online" ? 100 : 40;
      score += availScore * (weights.availability || 0);

      // Response speed
      const respTime = p.average_response_time_minutes || 30;
      score += Math.max(0, 100 - respTime * 2) * (weights.response || 0);

      // Zone match (structured)
      let zoneScore = 50;
      let zoneMatch = "none";
      if (zone_code && p.service_zones?.length) {
        if (p.service_zones.includes(zone_code)) {
          zoneScore = 100; zoneMatch = "direct";
        } else {
          zoneScore = 0; zoneMatch = "none";
        }
      }
      score += zoneScore * (weights.zone || 0);

      // Rating
      score += Math.min(100, ((p.rating_average || 3) / 5) * 100) * (weights.rating || 0);

      // Reliability
      const reliability = ((p.acceptance_rate || 70) * 0.4 + (p.on_time_rate || 70) * 0.4 + (100 - (p.cancellation_rate || 10)) * 0.2);
      score += Math.min(100, reliability) * (weights.reliability || 0);

      // On-time (inspection_first)
      if (weights.ontime) score += (p.on_time_rate || 70) * weights.ontime;

      // Experience
      const expScore = Math.min(100, ((p.experience_years || 1) / 10) * 50 + ((p.completed_jobs_count || 0) / 200) * 50);
      score += expScore * (weights.exp || 0);

      // Specialization
      if (weights.spec) {
        score += (p.specializations?.includes(demand.category_code) ? 100 : 30) * weights.spec;
      }

      // Load balance
      if (weights.load) {
        score += Math.max(0, 100 - (p.current_job_count || 0) * 25) * weights.load;
      }

      // Availability freshness penalty
      if (p.updated_at) {
        const hoursAgo = (Date.now() - new Date(p.updated_at).getTime()) / 3600000;
        if (hoursAgo > 4) score -= 15;
        if (hoursAgo > 12) score -= 25;
      }

      return {
        partner_id: p.id,
        partner_name: p.full_name,
        score: Math.max(0, Math.min(100, Math.round(score))),
        rating: p.rating_average,
        response_time: p.average_response_time_minutes,
        availability: p.availability_status,
        zone_match: zoneMatch,
      };
    }).sort((a: any, b: any) => b.score - a.score);

    // ── Create lead ──
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        demand_request_id: demand.id,
        category_code: demand.category_code,
        request_type,
        ai_classification: {
          archetype,
          request_type,
          estimated_complexity,
          zone_confidence: zoneConfidence,
          classified_at: new Date().toISOString(),
        },
        ai_priority_score: priority_score,
        ai_suggested_partners: scoredPartners.slice(0, 5),
        estimated_complexity,
        customer_name: demand.name,
        customer_phone: demand.phone,
        customer_location: demand.location,
        description: demand.description,
        zone_code: zone_code || null,
        status: "new",
        routing_status: "pending",
        partner_response_status: "pending",
      })
      .select()
      .single();

    if (leadErr) throw new Error(`Lead creation failed: ${leadErr.message}`);

    return new Response(
      JSON.stringify({
        lead_id: lead.id,
        request_type,
        priority_score,
        estimated_complexity,
        zone_code,
        zone_confidence: zoneConfidence,
        suggested_partners: scoredPartners.slice(0, 5),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-demand error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
