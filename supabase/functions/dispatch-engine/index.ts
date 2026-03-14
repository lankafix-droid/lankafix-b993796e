import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * dispatch-engine: Orchestrator that triggers after booking creation.
 * - Validates booking is dispatchable
 * - Enriches with customer context + diagnosis intelligence
 * - Calls smart-dispatch (AI Dispatch Brain) with full context
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

    const MAX_DISPATCH_ROUNDS = 3;

    // 5. Enrich with customer context (parallel queries)
    const deviceDetails = booking.device_details || {};
    const isPriority = !!(deviceDetails as any)?.priority_service?.is_priority;
    const diagnosticSummary = booking.diagnostic_summary || {};

    const [customerHistoryRes, diagnosisRes] = await Promise.all([
      // Customer service history
      booking.customer_id
        ? supabase.from("bookings")
            .select("id, partner_id, customer_rating, status")
            .eq("customer_id", booking.customer_id)
            .eq("status", "completed")
            .limit(50)
        : Promise.resolve({ data: null }),
      // Diagnosis outcome
      supabase.from("diagnosis_outcomes")
        .select("*")
        .eq("booking_id", booking_id)
        .maybeSingle(),
    ]);

    // Build customer context
    const completedBookings = customerHistoryRes.data || [];
    const totalBookings = completedBookings.length;
    const partnerCounts: Record<string, number> = {};
    let cancellationCount = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (const b of completedBookings) {
      if (b.partner_id) {
        partnerCounts[b.partner_id] = (partnerCounts[b.partner_id] || 0) + 1;
      }
      if (b.customer_rating) {
        totalRating += b.customer_rating;
        ratingCount++;
      }
    }

    // Find repeat partners (booked 2+ times)
    const repeatPartnerIds = Object.entries(partnerCounts)
      .filter(([, count]) => count >= 2)
      .map(([id]) => id);

    // Determine customer priority
    let customerPriority: "standard" | "repeat" | "subscriber" | "corporate" | "vip" = "standard";
    if (totalBookings >= 10) customerPriority = "vip";
    else if (totalBookings >= 5) customerPriority = "repeat";
    // TODO: check subscription status for "subscriber"
    // TODO: check corporate account for "corporate"

    // Extract diagnosis intelligence
    const diagnosis = diagnosisRes?.data;
    const skillLevelRequired = diagnosis?.severity_level === "critical" ? 4
      : diagnosis?.severity_level === "major" ? 3
      : diagnosis?.severity_level === "moderate" ? 2
      : undefined;

    const quoteRequired = booking.pricing_archetype === "quote_required"
      || !!(diagnosticSummary as any)?.quote_required;
    const inspectionRequired = !!(diagnosticSummary as any)?.inspection_required
      || booking.pricing_archetype === "diagnostic_first";

    // 6. Determine multi-tech count from service type
    const MULTI_TECH_SERVICES = ["ac_install", "solar_install", "cctv_network_install", "ac_installation"];
    const serviceType = booking.service_type || "";
    const isMultiTech = MULTI_TECH_SERVICES.some(s => serviceType.toLowerCase().includes(s));

    // 7. Call smart-dispatch with full AI Dispatch Brain context
    const currentRound = booking.dispatch_round || 1;
    const { data: dispatchResult, error: dispatchErr } = await supabase.functions.invoke("smart-dispatch", {
      body: {
        category_code: booking.category_code,
        service_type: booking.service_type,
        brand: (deviceDetails as any)?.brand,
        customer_lat: booking.customer_latitude,
        customer_lng: booking.customer_longitude,
        customer_zone: booking.zone_code,
        is_emergency: booking.is_emergency || false,
        is_priority: isPriority,
        booking_id: booking_id,
        dispatch_round: currentRound,
        exclude_partner_ids: [],
        max_rounds: MAX_DISPATCH_ROUNDS,
        // AI Dispatch Brain context
        skill_level_required: skillLevelRequired,
        quote_required: quoteRequired,
        inspection_required: inspectionRequired,
        customer_priority: customerPriority,
        multi_tech_count: isMultiTech ? 2 : 1,
        customer_service_history: {
          total_bookings: totalBookings,
          repeat_partner_ids: repeatPartnerIds,
          cancellation_count: cancellationCount,
          average_rating_given: ratingCount > 0 ? Math.round(totalRating / ratingCount * 10) / 10 : 0,
        },
      },
    });

    if (dispatchErr) {
      console.error("smart-dispatch invocation failed:", dispatchErr);
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

    // 8. Check dispatch result
    const result = dispatchResult;
    const hasMatch = result?.best_match || (result?.candidates && result.candidates.length > 0);

    if (!hasMatch) {
      await Promise.all([
        supabase.from("notification_events").insert({
          event_type: "dispatch_failed",
          booking_id,
          customer_id: booking.customer_id,
          metadata: {
            reason: "no_candidates",
            category: booking.category_code,
            customer_priority: customerPriority,
            skill_required: skillLevelRequired,
          },
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
      dispatch_mode: result?.dispatch_mode,
      candidates_found: result?.candidates?.length || 0,
      multi_tech_count: result?.multi_tech_count || 1,
      required_skill_level: result?.required_skill_level,
      customer_priority: customerPriority,
      best_match: result?.best_match ? {
        partner_id: result.best_match.partner_id,
        score: result.best_match.score?.total,
        eta_minutes: result.best_match.eta_minutes,
        skill_level: result.best_match.partner?.skill_level,
      } : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("dispatch-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
