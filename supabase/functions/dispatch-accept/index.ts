import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AcceptRequest {
  booking_id: string;
  partner_id: string;
  action: "accept" | "decline" | "timeout";
  decline_reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: AcceptRequest = await req.json();
    const { booking_id, partner_id, action, decline_reason } = body;

    if (!booking_id || !partner_id || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    if (action === "accept") {
      // Update booking — assign partner
      await supabase.from("bookings").update({
        partner_id,
        selected_partner_id: partner_id,
        dispatch_status: "accepted",
        status: "assigned",
        assigned_at: now,
        assignment_mode: "smart_dispatch",
      }).eq("id", booking_id);

      // Update dispatch_log
      await supabase.from("dispatch_log").update({
        status: "accepted",
        response: "accepted",
        responded_at: now,
      }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance");

      // Mark notification as actioned
      await supabase.from("partner_notifications").update({
        actioned_at: now,
        action_taken: "accepted",
      }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("notification_type", "job_offer");

      // Add timeline event
      await supabase.from("job_timeline").insert({
        booking_id,
        status: "assigned",
        actor: "system",
        note: `Partner accepted via smart dispatch`,
        metadata: { partner_id, action: "dispatch_accepted" },
      });

      return new Response(JSON.stringify({ success: true, status: "accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decline" || action === "timeout") {
      // Update dispatch_log for this partner
      await supabase.from("dispatch_log").update({
        status: action === "decline" ? "declined" : "timed_out",
        response: action === "decline" ? (decline_reason || "declined") : "timeout",
        responded_at: now,
      }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance");

      // Mark notification
      await supabase.from("partner_notifications").update({
        actioned_at: now,
        action_taken: action,
      }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("notification_type", "job_offer");

      // Get booking to check dispatch round and re-dispatch
      const { data: booking } = await supabase
        .from("bookings")
        .select("dispatch_round, category_code, customer_latitude, customer_longitude, zone_code, is_emergency, service_type")
        .eq("id", booking_id)
        .single();

      const currentRound = (booking?.dispatch_round || 1);
      const maxRounds = 5;

      if (currentRound >= maxRounds) {
        // Escalate to ops
        await supabase.from("bookings").update({
          dispatch_status: "escalated",
          dispatch_round: currentRound,
        }).eq("id", booking_id);

        await supabase.from("dispatch_escalations").insert({
          booking_id,
          reason: "all_partners_exhausted",
          dispatch_rounds_attempted: currentRound,
        });

        await supabase.from("job_timeline").insert({
          booking_id,
          status: "escalated",
          actor: "system",
          note: `All ${maxRounds} dispatch rounds exhausted — escalated to ops`,
        });

        return new Response(JSON.stringify({
          success: true,
          status: "escalated",
          message: "All dispatch rounds exhausted",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Collect already-tried partner IDs
      const { data: prevLogs } = await supabase
        .from("dispatch_log")
        .select("partner_id")
        .eq("booking_id", booking_id)
        .in("status", ["declined", "timed_out"]);

      const excludeIds = [...new Set((prevLogs || []).map((l: any) => l.partner_id))];

      // Update booking for next round
      const nextRound = currentRound + 1;
      await supabase.from("bookings").update({
        dispatch_status: "dispatching",
        dispatch_round: nextRound,
        selected_partner_id: null,
      }).eq("id", booking_id);

      // Trigger next dispatch round via recursive edge function call
      const dispatchPayload = {
        category_code: booking?.category_code,
        service_type: booking?.service_type,
        customer_lat: booking?.customer_latitude,
        customer_lng: booking?.customer_longitude,
        customer_zone: booking?.zone_code,
        is_emergency: booking?.is_emergency || false,
        booking_id,
        dispatch_round: nextRound,
        exclude_partner_ids: excludeIds,
      };

      // Fire smart-dispatch for next round
      await supabase.functions.invoke("smart-dispatch", { body: dispatchPayload });

      await supabase.from("job_timeline").insert({
        booking_id,
        status: "dispatching",
        actor: "system",
        note: `Partner ${action === "decline" ? "declined" : "timed out"} — dispatching round ${nextRound}`,
        metadata: { partner_id, action, round: nextRound },
      });

      return new Response(JSON.stringify({
        success: true,
        status: "next_round",
        dispatch_round: nextRound,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-accept error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
