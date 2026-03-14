import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * dispatch-orchestrator: Full dispatch lifecycle controller.
 * 
 * Orchestrates:
 * 1. Calls smart-dispatch (AI Dispatch Brain) for scoring
 * 2. Creates structured dispatch_offers with per-offer TTL
 * 3. Sends notifications to partners
 * 4. Supports sequential, parallel (top-3), and multi-tech modes
 * 5. Handles multi-tech lead/support coordination
 * 6. Logs every event to job_timeline for War Room
 * 7. Manages availability locks on acceptance
 * 8. Escalates to ops on exhaustion
 */

const MAX_DISPATCH_ROUNDS = 5;

/** Timer rules by job type */
function getAcceptWindow(isEmergency: boolean, isComplex: boolean, isPriority: boolean): number {
  if (isEmergency) return 20;
  if (isComplex) return 60;
  if (isPriority) return 30;
  return 40;
}

/** Multi-tech categories with default counts */
const MULTI_TECH_DEFAULTS: Record<string, number> = {
  AC: 2,
  SOLAR: 3,
  CCTV: 2,
  SMART_HOME_OFFICE: 2,
};

const COMPLEX_SERVICE_PATTERNS = ["install", "solar", "network_setup", "system_audit", "cctv_network"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, force_parallel = false, force_round } = await req.json();

    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard: skip if already assigned/completed
    if (["accepted", "ops_confirmed", "assigned"].includes(booking.dispatch_status || "")) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_dispatched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard: manual dispatch
    if (booking.dispatch_mode === "manual") {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "manual_dispatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentRound = force_round || (booking.dispatch_round || 0) + 1;
    const isEmergency = booking.is_emergency || false;
    const serviceType = booking.service_type || "";
    const isComplex = COMPLEX_SERVICE_PATTERNS.some(p => serviceType.toLowerCase().includes(p));
    const deviceDetails = booking.device_details || {};
    const isPriority = !!(deviceDetails as any)?.priority_service?.is_priority;

    // Determine multi-tech requirement
    const multiTechCount = MULTI_TECH_DEFAULTS[booking.category_code] || 1;
    const isMultiTech = multiTechCount > 1;

    // Determine offer mode
    let offerMode: "sequential" | "parallel" | "multi_tech" = "sequential";
    if (isMultiTech) offerMode = "multi_tech";
    else if (force_parallel || isEmergency) offerMode = "parallel";

    // Accept window
    const acceptWindow = getAcceptWindow(isEmergency, isComplex, isPriority);

    // 2. Update booking status
    await supabase.from("bookings").update({
      dispatch_status: "dispatching",
      dispatch_round: currentRound,
    }).eq("id", booking_id);

    // Timeline: dispatch started
    await supabase.from("job_timeline").insert({
      booking_id,
      status: "dispatch_round_started",
      actor: "dispatch_orchestrator",
      note: `Dispatch round ${currentRound} started (mode: ${offerMode}, window: ${acceptWindow}s)`,
      metadata: {
        round: currentRound,
        offer_mode: offerMode,
        accept_window: acceptWindow,
        is_emergency: isEmergency,
        multi_tech_count: multiTechCount,
      },
    });

    // 3. Collect previously excluded partner IDs
    const { data: prevOffers } = await supabase
      .from("dispatch_offers")
      .select("partner_id")
      .eq("booking_id", booking_id)
      .in("status", ["declined", "expired", "late_accept"]);

    const excludeIds = [...new Set((prevOffers || []).map((o: any) => o.partner_id))];

    // 4. Enrich with customer context
    const [historyRes, diagnosisRes] = await Promise.all([
      booking.customer_id
        ? supabase.from("bookings")
            .select("id, partner_id, customer_rating, status")
            .eq("customer_id", booking.customer_id)
            .eq("status", "completed")
            .limit(50)
        : Promise.resolve({ data: null }),
      supabase.from("diagnosis_outcomes")
        .select("severity_level")
        .eq("booking_id", booking_id)
        .maybeSingle(),
    ]);

    const completedBookings = historyRes.data || [];
    const partnerCounts: Record<string, number> = {};
    let totalRating = 0, ratingCount = 0;
    for (const b of completedBookings) {
      if (b.partner_id) partnerCounts[b.partner_id] = (partnerCounts[b.partner_id] || 0) + 1;
      if (b.customer_rating) { totalRating += b.customer_rating; ratingCount++; }
    }
    const repeatPartnerIds = Object.entries(partnerCounts).filter(([, c]) => c >= 2).map(([id]) => id);

    let customerPriority: string = "standard";
    if (completedBookings.length >= 10) customerPriority = "vip";
    else if (completedBookings.length >= 5) customerPriority = "repeat";

    const diagnosis = diagnosisRes?.data;
    const skillLevelRequired = diagnosis?.severity_level === "critical" ? 4
      : diagnosis?.severity_level === "major" ? 3
      : diagnosis?.severity_level === "moderate" ? 2
      : undefined;

    const quoteRequired = booking.pricing_archetype === "quote_required";
    const inspectionRequired = booking.pricing_archetype === "diagnostic_first";

    // 5. Call AI Dispatch Brain (smart-dispatch)
    const { data: dispatchResult, error: dispatchErr } = await supabase.functions.invoke("smart-dispatch", {
      body: {
        category_code: booking.category_code,
        service_type: booking.service_type,
        brand: (deviceDetails as any)?.brand,
        customer_lat: booking.customer_latitude,
        customer_lng: booking.customer_longitude,
        customer_zone: booking.zone_code,
        is_emergency: isEmergency,
        is_priority: isPriority,
        booking_id,
        dispatch_round: currentRound,
        exclude_partner_ids: excludeIds,
        max_rounds: MAX_DISPATCH_ROUNDS,
        skill_level_required: skillLevelRequired,
        quote_required: quoteRequired,
        inspection_required: inspectionRequired,
        customer_priority: customerPriority,
        multi_tech_count: multiTechCount,
        customer_service_history: {
          total_bookings: completedBookings.length,
          repeat_partner_ids: repeatPartnerIds,
          cancellation_count: 0,
          average_rating_given: ratingCount > 0 ? Math.round(totalRating / ratingCount * 10) / 10 : 0,
        },
      },
    });

    if (dispatchErr || !dispatchResult) {
      console.error("smart-dispatch error:", dispatchErr);
      await handleDispatchFailure(supabase, booking_id, currentRound, "smart_dispatch_error");
      return new Response(JSON.stringify({
        success: false, dispatch_status: "failed",
        error: "AI Dispatch Brain unavailable",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const candidates = dispatchResult.candidates || [];

    // 6. No candidates → escalate
    if (candidates.length === 0) {
      if (currentRound >= MAX_DISPATCH_ROUNDS) {
        await handleDispatchFailure(supabase, booking_id, currentRound, "all_rounds_exhausted");
        return new Response(JSON.stringify({
          success: true, dispatch_status: "escalated",
          message: `All ${MAX_DISPATCH_ROUNDS} rounds exhausted`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await handleDispatchFailure(supabase, booking_id, currentRound, "no_candidates_this_round");
      return new Response(JSON.stringify({
        success: true, dispatch_status: "escalated",
        message: "No candidates found",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7. Create dispatch_offers based on mode
    const now = new Date();
    const expiresAt = new Date(now.getTime() + acceptWindow * 1000).toISOString();
    const multiTechGroupId = isMultiTech ? crypto.randomUUID() : null;

    let offersToCreate: any[] = [];

    if (offerMode === "parallel") {
      // Top-3 parallel: first to accept wins
      const top3 = candidates.slice(0, 3);
      offersToCreate = top3.map((c: any, i: number) => ({
        booking_id,
        partner_id: c.partner_id,
        dispatch_round: currentRound,
        offer_mode: "parallel",
        category_code: booking.category_code,
        service_type: booking.service_type,
        customer_zone: booking.zone_code,
        estimated_distance_km: c.distance_km,
        eta_min_minutes: c.eta_min,
        eta_max_minutes: c.eta_max,
        price_estimate_lkr: booking.estimated_price_lkr,
        is_emergency: isEmergency,
        skill_level_required: dispatchResult.required_skill_level || 1,
        is_lead_technician: i === 0,
        accept_window_seconds: acceptWindow,
        expires_at: expiresAt,
        status: "pending",
        dispatch_score: c.score?.total,
        score_breakdown: c.score || {},
      }));
    } else if (offerMode === "multi_tech") {
      // Multi-tech: send to top N+2 candidates, lead first
      const leadId = dispatchResult.lead_partner_id;
      const teamCandidates = candidates.slice(0, multiTechCount + 2);
      offersToCreate = teamCandidates.map((c: any) => ({
        booking_id,
        partner_id: c.partner_id,
        dispatch_round: currentRound,
        offer_mode: "multi_tech",
        category_code: booking.category_code,
        service_type: booking.service_type,
        customer_zone: booking.zone_code,
        estimated_distance_km: c.distance_km,
        eta_min_minutes: c.eta_min,
        eta_max_minutes: c.eta_max,
        price_estimate_lkr: booking.estimated_price_lkr,
        is_emergency: isEmergency,
        skill_level_required: dispatchResult.required_skill_level || 1,
        is_lead_technician: c.partner_id === leadId,
        multi_tech_group_id: multiTechGroupId,
        accept_window_seconds: acceptWindow,
        expires_at: expiresAt,
        status: "pending",
        dispatch_score: c.score?.total,
        score_breakdown: c.score || {},
      }));
    } else {
      // Sequential: best candidate only
      const best = candidates[0];
      offersToCreate = [{
        booking_id,
        partner_id: best.partner_id,
        dispatch_round: currentRound,
        offer_mode: "sequential",
        category_code: booking.category_code,
        service_type: booking.service_type,
        customer_zone: booking.zone_code,
        estimated_distance_km: best.distance_km,
        eta_min_minutes: best.eta_min,
        eta_max_minutes: best.eta_max,
        price_estimate_lkr: booking.estimated_price_lkr,
        is_emergency: isEmergency,
        skill_level_required: dispatchResult.required_skill_level || 1,
        is_lead_technician: true,
        accept_window_seconds: acceptWindow,
        expires_at: expiresAt,
        status: "pending",
        dispatch_score: best.score?.total,
        score_breakdown: best.score || {},
      }];
    }

    // 8. Persist offers + notifications + booking update in parallel
    const { data: insertedOffers, error: offerErr } = await supabase
      .from("dispatch_offers")
      .insert(offersToCreate)
      .select("id, partner_id, is_lead_technician");

    if (offerErr) {
      console.error("Failed to create offers:", offerErr);
      throw offerErr;
    }

    // Update booking
    const bestCandidate = candidates[0];
    await supabase.from("bookings").update({
      dispatch_status: "pending_acceptance",
      dispatch_round: currentRound,
      dispatch_mode: offerMode === "parallel" ? "top_3" : offerMode === "multi_tech" ? "multi_tech" : "auto",
      selected_partner_id: bestCandidate.partner_id,
      promised_eta_minutes: bestCandidate.eta_minutes,
    }).eq("id", booking_id);

    // Send notifications to all offered partners
    const notifPromises = offersToCreate.map((offer: any) => {
      const candidate = candidates.find((c: any) => c.partner_id === offer.partner_id);
      return supabase.from("partner_notifications").insert({
        partner_id: offer.partner_id,
        booking_id,
        notification_type: "job_offer",
        title: isEmergency
          ? "🚨 Emergency Job Offer"
          : isMultiTech
            ? `👥 Team Job (${multiTechCount} techs)${offer.is_lead_technician ? " — Lead" : ""}`
            : isPriority ? "⚡ Priority Job Offer" : "New Job Offer",
        body: `${booking.category_code} service${booking.zone_code ? ` in ${booking.zone_code}` : ""} · ETA ${offer.eta_min_minutes}–${offer.eta_max_minutes} min${
          quoteRequired ? " · Quote Required" : ""
        }`,
        metadata: {
          offer_id: insertedOffers?.find((o: any) => o.partner_id === offer.partner_id)?.id,
          category_code: booking.category_code,
          service_type: booking.service_type,
          is_emergency: isEmergency,
          dispatch_score: offer.dispatch_score,
          accept_window_seconds: acceptWindow,
          eta_range: { min: offer.eta_min_minutes, max: offer.eta_max_minutes },
          skill_level_required: offer.skill_level_required,
          is_lead: offer.is_lead_technician,
          offer_mode: offerMode,
          multi_tech_count: isMultiTech ? multiTechCount : 1,
          customer_priority: customerPriority,
          quote_required: quoteRequired,
        },
        expires_at: expiresAt,
      });
    });

    // Timeline events
    const timelinePromises = offersToCreate.map((offer: any) =>
      supabase.from("job_timeline").insert({
        booking_id,
        status: "job_offer_sent",
        actor: "dispatch_orchestrator",
        note: `Job offer sent to ${candidates.find((c: any) => c.partner_id === offer.partner_id)?.partner?.full_name || offer.partner_id} (${offerMode}, window: ${acceptWindow}s, score: ${Math.round(offer.dispatch_score)})`,
        metadata: {
          partner_id: offer.partner_id,
          dispatch_round: currentRound,
          offer_mode: offerMode,
          accept_window_seconds: acceptWindow,
          dispatch_score: offer.dispatch_score,
          is_lead: offer.is_lead_technician,
          multi_tech_group_id: multiTechGroupId,
        },
      })
    );

    // Notification events for analytics
    const eventPromises = offersToCreate.map((offer: any) =>
      supabase.from("notification_events").insert({
        event_type: "partner_offer_sent",
        booking_id,
        partner_id: offer.partner_id,
        metadata: {
          dispatch_round: currentRound,
          offer_mode: offerMode,
          score: offer.dispatch_score,
          accept_window: acceptWindow,
        },
      })
    );

    await Promise.all([...notifPromises, ...timelinePromises, ...eventPromises]);

    return new Response(JSON.stringify({
      success: true,
      dispatch_status: "pending_acceptance",
      dispatch_round: currentRound,
      offer_mode: offerMode,
      accept_window_seconds: acceptWindow,
      offers_sent: offersToCreate.length,
      multi_tech_count: isMultiTech ? multiTechCount : 1,
      multi_tech_group_id: multiTechGroupId,
      lead_partner_id: dispatchResult.lead_partner_id,
      candidates_scored: dispatchResult.total_eligible,
      best_match: bestCandidate ? {
        partner_id: bestCandidate.partner_id,
        name: bestCandidate.partner?.full_name,
        score: bestCandidate.score?.total,
        eta_minutes: bestCandidate.eta_minutes,
        distance_km: bestCandidate.distance_km,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Handle dispatch failure — escalate and notify ops */
async function handleDispatchFailure(
  supabase: any,
  bookingId: string,
  round: number,
  reason: string,
) {
  await Promise.all([
    supabase.from("bookings").update({
      dispatch_status: "escalated",
      dispatch_round: round,
    }).eq("id", bookingId),
    supabase.from("dispatch_escalations").insert({
      booking_id: bookingId,
      reason,
      dispatch_rounds_attempted: round,
    }),
    supabase.from("job_timeline").insert({
      booking_id: bookingId,
      status: "dispatch_failed",
      actor: "dispatch_orchestrator",
      note: `Dispatch failed: ${reason} after round ${round}. Escalated to operations.`,
      metadata: { reason, round },
    }),
    supabase.from("notification_events").insert({
      event_type: "dispatch_escalated",
      booking_id: bookingId,
      metadata: { reason, round },
    }),
  ]);
}
