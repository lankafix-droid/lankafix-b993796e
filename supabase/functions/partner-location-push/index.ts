import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * partner-location-push: Receives GPS coordinates from partner/technician app.
 * Updates current_latitude, current_longitude, last_location_ping_at on partners table.
 *
 * SECURITY: Verifies authenticated caller owns the partner_id (anti-spoofing).
 * TIMELINE: Does NOT insert a timeline row for every ping. Only updates partner fields.
 *           Milestone events (tracking_started, nearing_arrival, arrived) are separate.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { partner_id, latitude, longitude, accuracy, booking_id } = await req.json();

    if (!partner_id || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: "partner_id, latitude, longitude required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate accuracy — reject if > 100m
    if (accuracy && accuracy > 100) {
      return new Response(JSON.stringify({ error: "low_accuracy", message: "GPS accuracy too low" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate coordinate bounds (Sri Lanka: lat 5.5-10.0, lng 79.0-82.5)
    if (latitude < 5.5 || latitude > 10.0 || longitude < 79.0 || longitude > 82.5) {
      return new Response(JSON.stringify({ error: "out_of_bounds", message: "Coordinates outside Sri Lanka" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AUTH: Verify caller owns this partner_id ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = claimsData.claims.sub;

    // Service-role client for DB ops
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify partner_id belongs to the authenticated user
    const { data: partner, error: partnerErr } = await supabase
      .from("partners")
      .select("id, user_id")
      .eq("id", partner_id)
      .single();

    if (partnerErr || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (partner.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "forbidden", message: "You can only push location for your own partner account" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Update partner location (no timeline entry — continuous data only)
    const { error: updateErr } = await supabase
      .from("partners")
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_ping_at: now,
      })
      .eq("id", partner_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, timestamp: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("partner-location-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
