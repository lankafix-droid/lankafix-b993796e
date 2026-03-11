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
 * Called every 15-30 seconds when partner is en-route.
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

    // Validate accuracy — reject if > 100m (lenient for mobile GPS)
    if (accuracy && accuracy > 100) {
      return new Response(JSON.stringify({ error: "low_accuracy", message: "GPS accuracy too low" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate coordinate bounds (Sri Lanka: lat 5.9-9.8, lng 79.6-81.9)
    if (latitude < 5.5 || latitude > 10.0 || longitude < 79.0 || longitude > 82.5) {
      return new Response(JSON.stringify({ error: "out_of_bounds", message: "Coordinates outside Sri Lanka" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Update partner location
    const { error: updateErr } = await supabase
      .from("partners")
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_ping_at: now,
      })
      .eq("id", partner_id);

    if (updateErr) throw updateErr;

    // If booking_id provided, also update booking timeline with location metadata
    if (booking_id) {
      // Don't await — fire and forget for performance
      supabase.from("job_timeline").insert({
        booking_id,
        status: "location_update",
        actor: "partner",
        note: "Location updated",
        metadata: { latitude, longitude, accuracy, partner_id },
      }).then(() => {});
    }

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
