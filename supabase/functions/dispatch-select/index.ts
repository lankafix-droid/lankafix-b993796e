import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * dispatch-select: Customer selects a partner from top-3 matches.
 * Persists selection to backend and sends notification.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, partner_id, eta_minutes } = await req.json();

    if (!booking_id || !partner_id) {
      return new Response(JSON.stringify({ error: "booking_id and partner_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Update booking with customer's selection
    await supabase.from("bookings").update({
      selected_partner_id: partner_id,
      dispatch_status: "pending_acceptance",
      promised_eta_minutes: eta_minutes || null,
    }).eq("id", booking_id);

    // Update dispatch_log — mark selected
    await supabase.from("dispatch_log").update({
      status: "pending_acceptance",
    }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "backup");

    // Send notification to selected partner
    const { data: booking } = await supabase
      .from("bookings")
      .select("category_code, zone_code, is_emergency, service_type")
      .eq("id", booking_id)
      .single();

    await supabase.from("partner_notifications").insert({
      partner_id,
      booking_id,
      notification_type: "job_offer",
      title: booking?.is_emergency ? "🚨 Emergency Job Offer" : "New Job Offer",
      body: `${booking?.category_code || ""} service — customer selected you`,
      metadata: {
        category_code: booking?.category_code,
        service_type: booking?.service_type,
        is_emergency: booking?.is_emergency,
        customer_selected: true,
        accept_window_seconds: 60,
      },
      expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    await supabase.from("job_timeline").insert({
      booking_id,
      status: "customer_selected_partner",
      actor: "customer",
      note: `Customer selected partner from top matches`,
      metadata: { partner_id },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-select error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
