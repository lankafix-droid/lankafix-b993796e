import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DISPATCH_ROUNDS = 3;

interface AcceptRequest {
  booking_id: string;
  partner_id: string;
  action: "accept" | "decline" | "timeout" | "ops_confirm" | "ops_override";
  decline_reason?: string;
  override_partner_id?: string;
  ops_user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: AcceptRequest = await req.json();
    const { booking_id, partner_id, action, decline_reason, override_partner_id, ops_user_id } = body;

    if (!booking_id || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();

    // ── Ops manual confirmation ──
    if (action === "ops_confirm") {
      await Promise.all([
        supabase.from("bookings").update({
          partner_id, selected_partner_id: partner_id,
          dispatch_status: "ops_confirmed", status: "assigned",
          assigned_at: now, assignment_mode: "ops_manual",
        }).eq("id", booking_id),
        supabase.from("dispatch_log").update({
          status: "ops_confirmed", response: "ops_confirmed", responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id),
        supabase.from("partner_notifications").update({
          actioned_at: now, action_taken: "ops_confirmed",
        }).eq("booking_id", booking_id).eq("partner_id", partner_id),
        supabase.from("job_timeline").insert({
          booking_id, status: "assigned", actor: ops_user_id || "ops",
          note: "Partner confirmed manually by operations team",
          metadata: { partner_id, action: "ops_confirmed" },
        }),
      ]);
      return new Response(JSON.stringify({ success: true, status: "ops_confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Ops override ──
    if (action === "ops_override") {
      const assignId = override_partner_id || partner_id;
      await Promise.all([
        supabase.from("bookings").update({
          partner_id: assignId, selected_partner_id: assignId,
          dispatch_status: "ops_confirmed", status: "assigned",
          assigned_at: now, assignment_mode: "ops_override",
        }).eq("id", booking_id),
        supabase.from("job_timeline").insert({
          booking_id, status: "assigned", actor: ops_user_id || "ops",
          note: `Ops override: assigned partner ${assignId}`,
          metadata: { partner_id: assignId, action: "ops_override", overridden_from: partner_id },
        }),
      ]);
      return new Response(JSON.stringify({ success: true, status: "ops_override" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require partner_id for accept/decline/timeout
    if (!partner_id) {
      return new Response(JSON.stringify({ error: "partner_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACCEPT with race-condition guard ──
    if (action === "accept") {
      // Guard 1: Only update booking if dispatch_status is still pending_acceptance
      const { data: updatedBooking, error: bookingUpdateErr } = await supabase
        .from("bookings")
        .update({
          partner_id, selected_partner_id: partner_id,
          dispatch_status: "accepted", status: "assigned",
          assigned_at: now, assignment_mode: "smart_dispatch",
        })
        .eq("id", booking_id)
        .eq("dispatch_status", "pending_acceptance")  // Race-condition guard
        .select("id")
        .maybeSingle();

      if (bookingUpdateErr || !updatedBooking) {
        // Booking was already claimed or status changed — fail safely
        // Also update this partner's dispatch_log to reflect the late attempt
        await supabase.from("dispatch_log").update({
          status: "late_accept", response: "late_accept", responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance");

        return new Response(JSON.stringify({
          success: false,
          error: "already_claimed",
          message: "This job has already been assigned to another provider.",
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Guard passed — complete the accept
      await Promise.all([
        supabase.from("dispatch_log").update({
          status: "accepted", response: "accepted", responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),

        // Mark all other pending offers for this booking as superseded
        supabase.from("dispatch_log").update({
          status: "superseded", response: "another_accepted", responded_at: now,
        }).eq("booking_id", booking_id).neq("partner_id", partner_id).eq("status", "pending_acceptance"),

        supabase.from("partner_notifications").update({
          actioned_at: now, action_taken: "accepted",
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("notification_type", "job_offer"),

        supabase.from("job_timeline").insert({
          booking_id, status: "assigned", actor: "system",
          note: "Partner accepted via smart dispatch",
          metadata: { partner_id, action: "dispatch_accepted" },
        }),

        supabase.from("notification_events").insert({
          event_type: "provider_assigned", booking_id, partner_id,
        }),
      ]);

      return new Response(JSON.stringify({ success: true, status: "accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DECLINE / TIMEOUT ──
    if (action === "decline" || action === "timeout") {
      await Promise.all([
        supabase.from("dispatch_log").update({
          status: action === "decline" ? "declined" : "timed_out",
          response: action === "decline" ? (decline_reason || "declined") : "timeout",
          responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),

        supabase.from("partner_notifications").update({
          actioned_at: now, action_taken: action,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("notification_type", "job_offer"),
      ]);

      // Get booking for re-dispatch
      const { data: booking } = await supabase
        .from("bookings")
        .select("dispatch_round, category_code, customer_latitude, customer_longitude, zone_code, is_emergency, service_type")
        .eq("id", booking_id).single();

      const currentRound = booking?.dispatch_round || 1;

      if (currentRound >= MAX_DISPATCH_ROUNDS) {
        await Promise.all([
          supabase.from("bookings").update({
            dispatch_status: "escalated", dispatch_round: currentRound,
          }).eq("id", booking_id),
          supabase.from("dispatch_escalations").insert({
            booking_id, reason: "all_partners_exhausted", dispatch_rounds_attempted: currentRound,
          }),
          supabase.from("job_timeline").insert({
            booking_id, status: "escalated", actor: "system",
            note: `All ${MAX_DISPATCH_ROUNDS} dispatch rounds exhausted — escalated to ops`,
          }),
          supabase.from("notification_events").insert({
            event_type: "dispatch_escalated", booking_id,
          }),
        ]);

        return new Response(JSON.stringify({
          success: true, status: "escalated", message: "All dispatch rounds exhausted",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Collect already-tried partner IDs
      const { data: prevLogs } = await supabase
        .from("dispatch_log").select("partner_id")
        .eq("booking_id", booking_id).in("status", ["declined", "timed_out", "late_accept"]);

      const excludeIds = [...new Set((prevLogs || []).map((l: any) => l.partner_id))];
      const nextRound = currentRound + 1;

      await supabase.from("bookings").update({
        dispatch_status: "dispatching", dispatch_round: nextRound, selected_partner_id: null,
      }).eq("id", booking_id);

      // Fire next dispatch round
      await supabase.functions.invoke("smart-dispatch", {
        body: {
          category_code: booking?.category_code,
          service_type: booking?.service_type,
          customer_lat: booking?.customer_latitude,
          customer_lng: booking?.customer_longitude,
          customer_zone: booking?.zone_code,
          is_emergency: booking?.is_emergency || false,
          booking_id, dispatch_round: nextRound, exclude_partner_ids: excludeIds,
        },
      });

      await supabase.from("job_timeline").insert({
        booking_id, status: "dispatching", actor: "system",
        note: `Partner ${action === "decline" ? "declined" : "timed out"} — dispatching round ${nextRound}`,
        metadata: { partner_id, action, round: nextRound },
      });

      return new Response(JSON.stringify({
        success: true, status: "next_round", dispatch_round: nextRound,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-accept error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
