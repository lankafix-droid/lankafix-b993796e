import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * dispatch-engine: Orchestrator that triggers after booking creation.
 * - Validates booking is dispatchable (not consultation, not already dispatched)
 * - Calls smart-dispatch to find and offer to providers
 * - Records notification events
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Guard: skip consultation / manual dispatch bookings
    if (booking.dispatch_mode === "manual" || booking.dispatch_status === "manual") {
      return new Response(JSON.stringify({
        success: true, skipped: true,
        reason: "consultation_booking",
        message: "Consultation bookings skip auto-dispatch",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Guard: skip if already dispatched/assigned
    if (["accepted", "assigned", "ops_confirmed"].includes(booking.dispatch_status || "")) {
      return new Response(JSON.stringify({
        success: true, skipped: true,
        reason: "already_dispatched",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Update booking to dispatching state
    await supabase.from("bookings").update({
      dispatch_status: "dispatching",
      dispatch_round: booking.dispatch_round || 1,
    }).eq("id", booking_id);

    // 5. Call smart-dispatch
    const { data: dispatchResult, error: dispatchErr } = await supabase.functions.invoke("smart-dispatch", {
      body: {
        category_code: booking.category_code,
        service_type: booking.service_type,
        customer_lat: booking.customer_latitude,
        customer_lng: booking.customer_longitude,
        customer_zone: booking.zone_code,
        is_emergency: booking.is_emergency || false,
        booking_id: booking_id,
        dispatch_round: booking.dispatch_round || 1,
        exclude_partner_ids: [],
      },
    });

    if (dispatchErr) {
      console.error("smart-dispatch invocation failed:", dispatchErr);
      // Record failure
      await Promise.all([
        supabase.from("bookings").update({
          dispatch_status: "no_provider_found",
        }).eq("id", booking_id),
        supabase.from("notification_events").insert({
          event_type: "dispatch_failed",
          booking_id,
          customer_id: booking.customer_id,
          metadata: { error: dispatchErr.message, category: booking.category_code },
        }),
        supabase.from("job_timeline").insert({
          booking_id,
          status: "dispatch_failed",
          actor: "system",
          note: "Unable to find available providers. Our team has been notified.",
        }),
      ]);

      return new Response(JSON.stringify({
        success: false,
        error: "Dispatch failed",
        dispatch_status: "no_provider_found",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 6. Check dispatch result
    const result = dispatchResult;
    const hasMatch = result?.best_match || (result?.candidates && result.candidates.length > 0);

    if (!hasMatch) {
      await Promise.all([
        supabase.from("notification_events").insert({
          event_type: "dispatch_failed",
          booking_id,
          customer_id: booking.customer_id,
          metadata: { reason: "no_candidates", category: booking.category_code },
        }),
        supabase.from("job_timeline").insert({
          booking_id,
          status: "searching",
          actor: "system",
          note: "Searching for available technicians in your area...",
        }),
      ]);
    }

    return new Response(JSON.stringify({
      success: true,
      dispatch_status: hasMatch ? "pending_acceptance" : "escalated",
      candidates_found: result?.candidates?.length || 0,
      best_match: result?.best_match ? {
        partner_id: result.best_match.partner_id,
        score: result.best_match.score?.total,
        eta_minutes: result.best_match.eta_minutes,
      } : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("dispatch-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
