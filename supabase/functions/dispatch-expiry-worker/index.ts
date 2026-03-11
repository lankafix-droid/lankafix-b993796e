import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OFFER_TTL_MINUTES = 5;
const MAX_DISPATCH_ROUNDS = 3;

/**
 * dispatch-expiry-worker: Runs periodically to expire stale dispatch offers.
 * Finds dispatch_log rows with status='pending_acceptance' older than 5 minutes,
 * marks them timed_out, and triggers next dispatch round.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cutoff = new Date(Date.now() - OFFER_TTL_MINUTES * 60 * 1000).toISOString();

    // Find expired pending offers
    const { data: expiredOffers, error: fetchErr } = await supabase
      .from("dispatch_log")
      .select("id, booking_id, partner_id, dispatch_round")
      .eq("status", "pending_acceptance")
      .lt("created_at", cutoff);

    if (fetchErr) throw fetchErr;

    if (!expiredOffers || expiredOffers.length === 0) {
      return new Response(JSON.stringify({ success: true, expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by booking_id
    const bookingMap = new Map<string, typeof expiredOffers>();
    for (const offer of expiredOffers) {
      const list = bookingMap.get(offer.booking_id) || [];
      list.push(offer);
      bookingMap.set(offer.booking_id, list);
    }

    const now = new Date().toISOString();
    let totalExpired = 0;
    let retriggered = 0;
    let escalated = 0;

    for (const [bookingId, offers] of bookingMap) {
      // Mark all expired offers as timed_out
      await supabase
        .from("dispatch_log")
        .update({ status: "timed_out", response: "timeout_worker", responded_at: now })
        .eq("booking_id", bookingId)
        .eq("status", "pending_acceptance")
        .lt("created_at", cutoff);

      totalExpired += offers.length;

      // Get booking for re-dispatch
      const { data: booking } = await supabase
        .from("bookings")
        .select("dispatch_round, dispatch_status, category_code, customer_latitude, customer_longitude, zone_code, is_emergency, service_type")
        .eq("id", bookingId)
        .single();

      if (!booking) continue;

      // Skip if already resolved
      if (["accepted", "ops_confirmed", "manual"].includes(booking.dispatch_status || "")) continue;

      const currentRound = booking.dispatch_round || 1;

      if (currentRound >= MAX_DISPATCH_ROUNDS) {
        // Escalate
        await Promise.all([
          supabase.from("bookings").update({
            dispatch_status: "escalated",
          }).eq("id", bookingId),
          supabase.from("dispatch_escalations").insert({
            booking_id: bookingId,
            reason: "timeout_all_rounds",
            dispatch_rounds_attempted: currentRound,
          }),
          supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "escalated",
            actor: "system",
            note: `Dispatch timeout — ${MAX_DISPATCH_ROUNDS} rounds exhausted. Escalated to ops.`,
          }),
          supabase.from("notification_events").insert({
            event_type: "dispatch_escalated",
            booking_id: bookingId,
          }),
        ]);
        escalated++;
      } else {
        // Collect excluded partner IDs
        const { data: prevLogs } = await supabase
          .from("dispatch_log")
          .select("partner_id")
          .eq("booking_id", bookingId)
          .in("status", ["declined", "timed_out", "late_accept"]);

        const excludeIds = [...new Set((prevLogs || []).map((l: any) => l.partner_id))];
        const nextRound = currentRound + 1;

        await supabase.from("bookings").update({
          dispatch_status: "dispatching",
          dispatch_round: nextRound,
          selected_partner_id: null,
        }).eq("id", bookingId);

        // Trigger next dispatch round
        await supabase.functions.invoke("smart-dispatch", {
          body: {
            category_code: booking.category_code,
            service_type: booking.service_type,
            customer_lat: booking.customer_latitude,
            customer_lng: booking.customer_longitude,
            customer_zone: booking.zone_code,
            is_emergency: booking.is_emergency || false,
            booking_id: bookingId,
            dispatch_round: nextRound,
            exclude_partner_ids: excludeIds,
          },
        });

        await supabase.from("job_timeline").insert({
          booking_id: bookingId,
          status: "dispatching",
          actor: "system",
          note: `Provider timed out — dispatching round ${nextRound}`,
          metadata: { round: nextRound },
        });

        retriggered++;
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
    console.error("dispatch-expiry-worker error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
