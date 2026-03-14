import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DISPATCH_ROUNDS = 5;

/**
 * dispatch-offer-timer: Periodic worker that expires stale dispatch offers.
 * 
 * Uses per-offer `expires_at` for precise TTL instead of flat 5-minute window.
 * On expiry:
 *   - Sequential mode → auto-trigger next dispatch round
 *   - Parallel mode → only escalate when ALL offers expired
 *   - Multi-tech mode → check if enough techs accepted; escalate if not
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();

    // 1. Find all expired pending offers
    const { data: expiredOffers, error: fetchErr } = await supabase
      .from("dispatch_offers")
      .select("id, booking_id, partner_id, dispatch_round, offer_mode, multi_tech_group_id, is_lead_technician")
      .eq("status", "pending")
      .lt("expires_at", now);

    if (fetchErr) throw fetchErr;

    if (!expiredOffers || expiredOffers.length === 0) {
      return new Response(JSON.stringify({ success: true, expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mark all expired offers
    const expiredIds = expiredOffers.map((o: any) => o.id);
    await supabase
      .from("dispatch_offers")
      .update({ status: "expired", responded_at: now })
      .in("id", expiredIds);

    // Also update dispatch_log for backward compat
    for (const offer of expiredOffers) {
      await supabase.from("dispatch_log")
        .update({ status: "timed_out", response: "offer_timer_expired", responded_at: now })
        .eq("booking_id", offer.booking_id)
        .eq("partner_id", offer.partner_id)
        .eq("status", "pending_acceptance");
    }

    // 3. Group by booking
    const bookingMap = new Map<string, typeof expiredOffers>();
    for (const offer of expiredOffers) {
      const list = bookingMap.get(offer.booking_id) || [];
      list.push(offer);
      bookingMap.set(offer.booking_id, list);
    }

    let totalExpired = expiredOffers.length;
    let retriggered = 0;
    let escalated = 0;

    for (const [bookingId, offers] of bookingMap) {
      // Check booking state
      const { data: booking } = await supabase
        .from("bookings")
        .select("dispatch_round, dispatch_status, category_code, service_type, customer_latitude, customer_longitude, zone_code, is_emergency")
        .eq("id", bookingId)
        .single();

      if (!booking) continue;
      if (["accepted", "ops_confirmed", "assigned"].includes(booking.dispatch_status || "")) continue;

      // For parallel/multi_tech: check if ANY pending offers remain for this booking
      const { data: remainingOffers } = await supabase
        .from("dispatch_offers")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("status", "pending")
        .limit(1);

      if (remainingOffers && remainingOffers.length > 0) {
        // Still have active offers — don't re-dispatch yet
        // Log the expired ones
        for (const offer of offers) {
          await supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "job_offer_expired",
            actor: "offer_timer",
            note: `Offer to ${offer.partner_id.slice(0, 8)} expired`,
            metadata: { partner_id: offer.partner_id, round: offer.dispatch_round },
          });
        }
        continue;
      }

      // All offers for this booking are now expired/declined
      // For multi-tech: check if we have enough accepted techs
      if (offers[0]?.offer_mode === "multi_tech" && offers[0]?.multi_tech_group_id) {
        const { data: acceptedOffers } = await supabase
          .from("dispatch_offers")
          .select("id, partner_id, is_lead_technician")
          .eq("multi_tech_group_id", offers[0].multi_tech_group_id)
          .eq("status", "accepted");

        const MULTI_TECH_DEFAULTS: Record<string, number> = { AC: 2, SOLAR: 3, CCTV: 2 };
        const requiredCount = MULTI_TECH_DEFAULTS[booking.category_code] || 2;

        if ((acceptedOffers?.length || 0) >= requiredCount) {
          // Enough techs accepted — mark booking as team_assigned
          await supabase.from("bookings").update({
            dispatch_status: "team_assigned",
          }).eq("id", bookingId);
          
          await supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "team_assigned",
            actor: "offer_timer",
            note: `Technician team assembled: ${acceptedOffers?.length} of ${requiredCount} required`,
            metadata: { accepted_count: acceptedOffers?.length, required: requiredCount },
          });
          continue;
        }
      }

      // Log expiry events
      for (const offer of offers) {
        await supabase.from("job_timeline").insert({
          booking_id: bookingId,
          status: "job_offer_expired",
          actor: "offer_timer",
          note: `Offer expired (partner: ${offer.partner_id.slice(0, 8)}, round: ${offer.dispatch_round})`,
          metadata: { partner_id: offer.partner_id, round: offer.dispatch_round, offer_mode: offer.offer_mode },
        });
      }

      const currentRound = booking.dispatch_round || 1;

      if (currentRound >= MAX_DISPATCH_ROUNDS) {
        // Escalate
        await Promise.all([
          supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId),
          supabase.from("dispatch_escalations").insert({
            booking_id: bookingId,
            reason: "all_rounds_timeout",
            dispatch_rounds_attempted: currentRound,
          }),
          supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "dispatch_failed",
            actor: "offer_timer",
            note: `All ${MAX_DISPATCH_ROUNDS} dispatch rounds exhausted (timeout). Escalated to operations.`,
            metadata: { round: currentRound, reason: "all_rounds_timeout" },
          }),
          supabase.from("notification_events").insert({
            event_type: "dispatch_escalated",
            booking_id: bookingId,
            metadata: { reason: "all_rounds_timeout", round: currentRound },
          }),
        ]);
        escalated++;
      } else {
        // Re-trigger orchestrator for next round
        const { error: reErr } = await supabase.functions.invoke("dispatch-orchestrator", {
          body: { booking_id: bookingId, force_round: currentRound + 1 },
        });

        if (reErr) {
          console.error(`Re-dispatch failed for ${bookingId}:`, reErr);
          await supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId);
          escalated++;
        } else {
          await supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "dispatch_retry",
            actor: "offer_timer",
            note: `All offers expired — auto-retrying round ${currentRound + 1}`,
            metadata: { expired_count: offers.length, next_round: currentRound + 1 },
          });
          retriggered++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      expired: totalExpired,
      retriggered,
      escalated,
      bookings_processed: bookingMap.size,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-offer-timer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
