import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * LankaFix Booking Watchdog
 * Runs on a 1-minute cron schedule to detect and recover stuck bookings.
 *
 * Handles:
 * 1. Acceptance timeouts (re-dispatch)
 * 2. Payment-confirmed but unassigned bookings (retry dispatch)
 * 3. Customer abandonment (15min unpaid → mark abandoned)
 * 4. Stuck dispatching states
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const results = { timeouts: 0, retries: 0, abandonments: 0, escalations: 0 };

  try {
    // ─── 1. Acceptance Timeout Detection ───
    // Find bookings with pending_acceptance dispatch_log entries that have expired
    const { data: pendingLogs } = await supabase
      .from("dispatch_log")
      .select("id, booking_id, partner_id, created_at, dispatch_round")
      .eq("status", "pending_acceptance")
      .order("created_at", { ascending: true });

    for (const log of pendingLogs || []) {
      const createdAt = new Date(log.created_at);
      const elapsedSec = (now.getTime() - createdAt.getTime()) / 1000;

      // Check if booking is emergency for shorter window
      const { data: booking } = await supabase
        .from("bookings")
        .select("is_emergency, dispatch_status")
        .eq("id", log.booking_id)
        .single();

      const timeoutSec = booking?.is_emergency ? 30 : 60;

      if (elapsedSec > timeoutSec && booking?.dispatch_status !== "accepted" && booking?.dispatch_status !== "ops_confirmed") {
        // Trigger timeout via dispatch-accept
        await supabase.functions.invoke("dispatch-accept", {
          body: {
            booking_id: log.booking_id,
            partner_id: log.partner_id,
            action: "timeout",
          },
        });

        await supabase.from("job_timeline").insert({
          booking_id: log.booking_id,
          status: "watchdog_timeout",
          actor: "watchdog",
          note: `Acceptance timeout after ${Math.round(elapsedSec)}s (limit: ${timeoutSec}s)`,
          metadata: { partner_id: log.partner_id, elapsed_seconds: Math.round(elapsedSec) },
        });

        results.timeouts++;
      }
    }

    // ─── 2. Payment Confirmed but Not Dispatched ───
    // Bookings with protection_status=paid but dispatch_status still pending
    const sixtySecondsAgo = new Date(now.getTime() - 60_000).toISOString();
    const { data: paidUnassigned } = await supabase
      .from("bookings")
      .select("id, category_code, service_type, customer_latitude, customer_longitude, zone_code, is_emergency, dispatch_round, protection_paid_at")
      .eq("protection_status", "paid")
      .eq("dispatch_status", "pending")
      .not("customer_latitude", "is", null)
      .lt("protection_paid_at", sixtySecondsAgo);

    for (const booking of paidUnassigned || []) {
      const round = (booking.dispatch_round || 0) + 1;

      await supabase.from("bookings").update({
        dispatch_status: "dispatching",
        dispatch_round: round,
      }).eq("id", booking.id);

      await supabase.functions.invoke("smart-dispatch", {
        body: {
          category_code: booking.category_code,
          service_type: booking.service_type,
          customer_lat: booking.customer_latitude,
          customer_lng: booking.customer_longitude,
          customer_zone: booking.zone_code,
          is_emergency: booking.is_emergency || false,
          booking_id: booking.id,
          dispatch_round: round,
        },
      });

      await supabase.from("job_timeline").insert({
        booking_id: booking.id,
        status: "watchdog_retry_dispatch",
        actor: "watchdog",
        note: `Auto-retry dispatch for paid booking (round ${round})`,
      });

      results.retries++;
    }

    // ─── 3. Stuck Dispatching State ───
    // Bookings stuck in "dispatching" for >3 minutes with no pending_acceptance log
    const threeMinAgo = new Date(now.getTime() - 180_000).toISOString();
    const { data: stuckDispatching } = await supabase
      .from("bookings")
      .select("id, dispatch_round, category_code, service_type, customer_latitude, customer_longitude, zone_code, is_emergency")
      .eq("dispatch_status", "dispatching")
      .lt("updated_at", threeMinAgo);

    for (const booking of stuckDispatching || []) {
      // Check if there's still a pending acceptance
      const { data: activeLogs } = await supabase
        .from("dispatch_log")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("status", "pending_acceptance")
        .limit(1);

      if ((activeLogs || []).length === 0) {
        const round = (booking.dispatch_round || 0) + 1;

        if (round > 5) {
          // Escalate
          await supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", booking.id);
          await supabase.from("dispatch_escalations").insert({
            booking_id: booking.id,
            reason: "stuck_dispatching_watchdog",
            dispatch_rounds_attempted: round - 1,
          });
          await supabase.from("job_timeline").insert({
            booking_id: booking.id,
            status: "escalated",
            actor: "watchdog",
            note: "Stuck in dispatching state — escalated to ops",
          });
          results.escalations++;
        } else {
          // Retry
          await supabase.from("bookings").update({
            dispatch_status: "dispatching",
            dispatch_round: round,
          }).eq("id", booking.id);

          await supabase.functions.invoke("smart-dispatch", {
            body: {
              category_code: booking.category_code,
              service_type: booking.service_type,
              customer_lat: booking.customer_latitude,
              customer_lng: booking.customer_longitude,
              customer_zone: booking.zone_code,
              is_emergency: booking.is_emergency || false,
              booking_id: booking.id,
              dispatch_round: round,
            },
          });

          await supabase.from("job_timeline").insert({
            booking_id: booking.id,
            status: "watchdog_unstuck",
            actor: "watchdog",
            note: `Recovered stuck booking — retry dispatch round ${round}`,
          });
          results.retries++;
        }
      }
    }

    // ─── 4. Customer Abandonment Detection ───
    // Bookings created >15min ago with protection_status still pending
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60_000).toISOString();
    const { data: abandoned } = await supabase
      .from("bookings")
      .select("id")
      .eq("protection_status", "pending")
      .eq("status", "requested")
      .lt("created_at", fifteenMinAgo)
      .is("cancelled_at", null);

    for (const booking of abandoned || []) {
      await supabase.from("bookings").update({
        status: "cancelled",
        cancellation_reason: "payment_abandoned",
        cancelled_at: now.toISOString(),
      }).eq("id", booking.id);

      await supabase.from("job_timeline").insert({
        booking_id: booking.id,
        status: "abandoned",
        actor: "watchdog",
        note: "Booking abandoned — payment not completed within 15 minutes",
      });

      results.abandonments++;
    }

    console.log("[booking-watchdog] Run complete:", results);

    return new Response(JSON.stringify({ success: true, ...results, checked_at: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[booking-watchdog] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
