import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Category → archetype mapping
const ARCHETYPE_MAP: Record<string, string> = {
  AC: "instant",
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
  asap: 30,
  today: 15,
  tomorrow: 5,
  scheduled: 0,
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

    const archetype = ARCHETYPE_MAP[demand.category_code] || "instant";
    const urgency = demand.preferred_time || "scheduled";

    // Rule-based classification (no external AI call needed for this)
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

    // Emergency categories get a boost
    if (["ELECTRICAL", "PLUMBING", "AC"].includes(demand.category_code) && urgency === "asap") {
      priority_score += 20;
      estimated_complexity = "urgent";
    }

    // Cap at 100
    priority_score = Math.min(100, Math.round(priority_score));

    // Fetch best matching partners
    const { data: partners } = await supabase
      .from("partners")
      .select("id, full_name, rating_average, completed_jobs_count, availability_status, service_zones, categories_supported, average_response_time_minutes, on_time_rate, acceptance_rate")
      .eq("verification_status", "verified")
      .contains("categories_supported", [demand.category_code])
      .in("availability_status", ["online", "busy"])
      .order("rating_average", { ascending: false })
      .limit(10);

    // Score partners
    const scoredPartners = (partners || []).map((p: any) => {
      let score = 0;

      // Rating (0-25)
      score += Math.min(25, ((p.rating_average || 3) / 5) * 25);

      // Response speed (0-20)
      const respTime = p.average_response_time_minutes || 30;
      score += Math.max(0, 20 - respTime * 0.5);

      // Availability (0-20)
      score += p.availability_status === "online" ? 20 : 10;

      // Experience (0-15)
      score += Math.min(15, ((p.completed_jobs_count || 0) / 100) * 15);

      // On-time rate (0-10)
      score += ((p.on_time_rate || 50) / 100) * 10;

      // Zone match (0-10)
      if (demand.location && p.service_zones?.length) {
        const zoneMatch = p.service_zones.some((z: string) =>
          demand.location?.toLowerCase().includes(z.toLowerCase())
        );
        score += zoneMatch ? 10 : 0;
      }

      return {
        partner_id: p.id,
        partner_name: p.full_name,
        score: Math.round(score),
        rating: p.rating_average,
        response_time: p.average_response_time_minutes,
        availability: p.availability_status,
      };
    }).sort((a: any, b: any) => b.score - a.score);

    // Create lead from demand request
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        demand_request_id: demand.id,
        category_code: demand.category_code,
        request_type,
        ai_classification: { archetype, request_type, estimated_complexity, classified_at: new Date().toISOString() },
        ai_priority_score: priority_score,
        ai_suggested_partners: scoredPartners.slice(0, 5),
        estimated_complexity,
        customer_name: demand.name,
        customer_phone: demand.phone,
        customer_location: demand.location,
        description: demand.description,
        status: "new",
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
