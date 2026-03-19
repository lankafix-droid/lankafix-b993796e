/**
 * LankaFix — Distance Matrix Edge Function
 * Server-side Google Distance Matrix API call for real ETA/distance.
 * Keeps API key secure on the server.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { origins, destinations, mode = "driving" } = await req.json();

    if (!origins || !destinations) {
      return new Response(
        JSON.stringify({ error: "Missing origins or destinations" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Distance Matrix API
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", origins);
    url.searchParams.set("destinations", destinations);
    url.searchParams.set("mode", mode);
    url.searchParams.set("region", "lk");
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      return new Response(
        JSON.stringify({ error: `Google API error: ${data.status}`, details: data.error_message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract first result
    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      return new Response(
        JSON.stringify({
          error: "No route found",
          element_status: element?.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        distance_meters: element.distance.value,
        distance_text: element.distance.text,
        duration_seconds: element.duration.value,
        duration_text: element.duration.text,
        duration_in_traffic_seconds: element.duration_in_traffic?.value ?? null,
        duration_in_traffic_text: element.duration_in_traffic?.text ?? null,
        origin: data.origin_addresses?.[0],
        destination: data.destination_addresses?.[0],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
