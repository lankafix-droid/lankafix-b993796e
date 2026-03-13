import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PILOT_CATEGORIES = ["AC", "MOBILE", "CONSUMER_ELEC", "IT"];
const PILOT_ZONES = ["col_03", "col_04", "col_05", "nugegoda", "maharagama"];
const PILOT_ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  col_03: { lat: 6.9110, lng: 79.8510 },
  col_04: { lat: 6.8968, lng: 79.8567 },
  col_05: { lat: 6.8870, lng: 79.8630 },
  nugegoda: { lat: 6.8720, lng: 79.8890 },
  maharagama: { lat: 6.8480, lng: 79.9240 },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scenario } = await req.json();
    if (!scenario) {
      return new Response(JSON.stringify({ error: "scenario required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const category = pick(PILOT_CATEGORIES);
    const zone = pick(PILOT_ZONES);
    const coords = PILOT_ZONE_COORDS[zone];
    const results: Record<string, any> = { scenario, category, zone, steps: [], events: [], errors: [] };

    const log = (step: string, ok: boolean, detail?: string) => {
      results.steps.push({ step, ok, detail: detail || "" });
    };

    // Helper: create a simulation booking
    const createSimBooking = async (overrides: Record<string, any> = {}) => {
      const payload: any = {
        category_code: category,
        zone_code: zone,
        customer_latitude: coords.lat,
        customer_longitude: coords.lng,
        status: "requested",
        dispatch_status: "pending",
        dispatch_mode: "auto",
        is_emergency: false,
        service_type: "repair",
        booking_source: "pilot_simulation",
        notes: `[SIMULATION] ${scenario}`,
        customer_address: { line1: "Simulation Address", city: "Colombo", zone },
        device_details: { simulation: true, scenario },
        ...overrides,
      };
      const { data, error } = await supabase.from("bookings").insert(payload).select("*").single();
      if (error) {
        log("create_booking", false, error.message);
        return null;
      }
      log("create_booking", true, `id=${data.id}`);
      return data;
    };

    // Helper: log timeline
    const logTimeline = async (bookingId: string, status: string, note: string) => {
      await supabase.from("job_timeline").insert({ booking_id: bookingId, status, actor: "simulation", note });
    };

    // Helper: log automation event
    const logAutomation = async (eventType: string, bookingId: string | null, severity: string, reason: string) => {
      await supabase.from("automation_event_log").insert({
        event_type: eventType,
        booking_id: bookingId,
        severity,
        trigger_reason: reason,
        action_taken: "simulation_logged",
        metadata: { simulation: true, scenario },
      });
      results.events.push(eventType);
    };

    // ── SCENARIO HANDLERS ──

    if (scenario === "simulate_normal_booking") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      // Find a partner
      const { data: partners } = await supabase.from("partners")
        .select("id")
        .contains("categories_supported", [category])
        .eq("verification_status", "verified")
        .limit(1);

      const partner = partners?.[0];
      if (!partner) {
        log("find_partner", false, "No verified partner for category");
        await logAutomation("supply_gap_detected", booking.id, "high", `No partner for ${category} in ${zone}`);
      } else {
        log("find_partner", true, `partner_id=${partner.id}`);

        // Simulate dispatch accept
        await supabase.from("bookings").update({
          partner_id: partner.id, dispatch_status: "accepted", status: "confirmed", assigned_at: new Date().toISOString(),
        }).eq("id", booking.id);
        log("dispatch_accept", true);
        await logTimeline(booking.id, "assigned", "Technician assigned (simulation)");

        // Simulate quote
        const { data: quote } = await supabase.from("quotes").insert({
          booking_id: booking.id, partner_id: partner.id, status: "submitted",
          labour_lkr: 2500, parts_cost_lkr: 1500, total_lkr: 4000, warranty_days: 30,
          submitted_at: new Date().toISOString(),
        }).select("id").single();
        log("quote_submitted", !!quote, quote ? `quote_id=${quote.id}` : "insert failed");

        if (quote) {
          await supabase.from("quotes").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", quote.id);
          log("quote_approved", true);
        }

        // Complete
        await supabase.from("bookings").update({
          status: "completed", completed_at: new Date().toISOString(),
          final_price_lkr: 4000, payment_status: "paid", customer_rating: 5,
        }).eq("id", booking.id);
        log("booking_completed", true);
        await logTimeline(booking.id, "completed", "Service completed (simulation)");
      }

      results.booking_id = booking.id;
      results.success = results.steps.every((s: any) => s.ok);

    } else if (scenario === "simulate_emergency_booking") {
      const booking = await createSimBooking({ is_emergency: true });
      if (!booking) return respond(results);

      log("emergency_flag", booking.is_emergency === true, `is_emergency=${booking.is_emergency}`);
      await logTimeline(booking.id, "emergency_created", "Emergency booking created (simulation)");
      await logAutomation("emergency_booking", booking.id, "high", "Emergency booking simulation");

      // Trigger dispatch-engine
      const { error: dispErr } = await supabase.functions.invoke("dispatch-engine", {
        body: { booking_id: booking.id },
      });
      log("dispatch_engine_invoked", !dispErr, dispErr?.message || "ok");

      results.booking_id = booking.id;
      results.success = !dispErr;

    } else if (scenario === "simulate_no_provider_available") {
      // Use an unlikely zone/category combo
      const booking = await createSimBooking({ zone_code: "galle", customer_latitude: 6.0535, customer_longitude: 80.2210 });
      if (!booking) return respond(results);

      const { error: dispErr, data: dispData } = await supabase.functions.invoke("dispatch-engine", {
        body: { booking_id: booking.id },
      });
      log("dispatch_engine_invoked", !dispErr, JSON.stringify(dispData || {}).slice(0, 200));

      // Check escalation
      const { data: esc } = await supabase.from("dispatch_escalations").select("id").eq("booking_id", booking.id).limit(1);
      const hasEsc = (esc?.length || 0) > 0;
      log("escalation_created", hasEsc || (dispData?.dispatch_status === "no_provider_found"), dispData?.dispatch_status);

      await logAutomation("dispatch_failed", booking.id, "critical", "No provider available simulation");
      results.booking_id = booking.id;
      results.success = true;

    } else if (scenario === "simulate_dispatch_timeout") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      // Set dispatching state then mark as timed out
      await supabase.from("bookings").update({ dispatch_status: "dispatching", dispatch_round: 1 }).eq("id", booking.id);
      log("set_dispatching", true);

      // After simulated timeout, move to next round
      await supabase.from("bookings").update({ dispatch_status: "pending", dispatch_round: 2 }).eq("id", booking.id);
      log("timeout_round_2", true);

      // Escalate after max rounds
      await supabase.from("bookings").update({ dispatch_status: "no_provider_found", dispatch_round: 3 }).eq("id", booking.id);
      await supabase.from("dispatch_escalations").insert({
        booking_id: booking.id, reason: "dispatch_timeout", dispatch_rounds_attempted: 3,
      });
      log("escalation_created", true);
      await logTimeline(booking.id, "dispatch_timeout", "Dispatch timed out after 3 rounds (simulation)");
      await logAutomation("dispatch_timeout", booking.id, "high", "All dispatch rounds exhausted");

      results.booking_id = booking.id;
      results.success = true;

    } else if (scenario === "simulate_partner_cancellation") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      const { data: partners } = await supabase.from("partners")
        .select("id").contains("categories_supported", [category]).eq("verification_status", "verified").limit(1);
      const partner = partners?.[0];

      if (partner) {
        await supabase.from("bookings").update({
          partner_id: partner.id, dispatch_status: "accepted", status: "confirmed",
        }).eq("id", booking.id);
        log("assigned", true);

        // Partner cancels
        await supabase.from("bookings").update({
          partner_id: null, dispatch_status: "pending", status: "requested",
          cancellation_reason: "partner_cancelled_simulation",
        }).eq("id", booking.id);
        log("partner_cancelled", true);
        await logTimeline(booking.id, "partner_cancelled", "Technician cancelled — returning to dispatch (simulation)");
        await logAutomation("partner_cancellation", booking.id, "high", "Partner cancelled assigned job");
      } else {
        log("no_partner_found", false, "Cannot simulate cancellation without partner");
      }

      results.booking_id = booking.id;
      results.success = !!partner;

    } else if (scenario === "simulate_stale_quote") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      const { data: partners } = await supabase.from("partners")
        .select("id").contains("categories_supported", [category]).eq("verification_status", "verified").limit(1);
      const partner = partners?.[0];

      if (partner) {
        await supabase.from("bookings").update({ partner_id: partner.id, status: "confirmed" }).eq("id", booking.id);
        // Create a quote with old submission date
        const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
        await supabase.from("quotes").insert({
          booking_id: booking.id, partner_id: partner.id, status: "submitted",
          labour_lkr: 3000, total_lkr: 3000, submitted_at: staleDate,
        });
        log("stale_quote_created", true, `submitted_at=${staleDate}`);
        await logAutomation("quote_stale", booking.id, "medium", "Quote pending >24h (simulation)");
      } else {
        log("no_partner", false);
      }

      results.booking_id = booking.id;
      results.success = !!partner;

    } else if (scenario === "simulate_low_rating") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      const { data: partners } = await supabase.from("partners")
        .select("id").contains("categories_supported", [category]).eq("verification_status", "verified").limit(1);
      const partner = partners?.[0];

      if (partner) {
        await supabase.from("bookings").update({
          partner_id: partner.id, status: "completed", completed_at: new Date().toISOString(),
          customer_rating: 1, customer_review: "Very poor service (simulation test)",
          final_price_lkr: 3000, payment_status: "paid",
        }).eq("id", booking.id);
        log("low_rating_set", true, "rating=1");
        await logAutomation("rating_low", booking.id, "critical", "Customer gave 1-star rating (simulation)");
        await logTimeline(booking.id, "low_rating", "Customer rated 1 star — trust recovery triggered (simulation)");

        // Flag partner
        await supabase.from("partner_warnings").insert({
          partner_id: partner.id, warning_type: "low_rating", severity: "high",
          description: "Low rating from simulation test",
        });
        log("partner_warning_created", true);
      } else {
        log("no_partner", false);
      }

      results.booking_id = booking.id;
      results.success = !!partner;

    } else if (scenario === "simulate_payment_failure") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      await supabase.from("bookings").update({
        status: "completed", completed_at: new Date().toISOString(),
        final_price_lkr: 5000, payment_status: "failed",
      }).eq("id", booking.id);
      log("payment_failed", true);
      await logAutomation("payment_failed", booking.id, "high", "Payment failed at checkout (simulation)");
      await logTimeline(booking.id, "payment_failed", "Payment failed — retry required (simulation)");

      results.booking_id = booking.id;
      results.success = true;

    } else if (scenario === "simulate_sla_breach") {
      const booking = await createSimBooking();
      if (!booking) return respond(results);

      // Set booking created 6 hours ago with no assignment
      const oldDate = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      await supabase.from("bookings").update({
        created_at: oldDate, sla_breached: true,
      }).eq("id", booking.id);
      log("sla_breach_flagged", true, "created_at set 6h ago");
      await logAutomation("sla_breach", booking.id, "critical", `SLA breached for ${category} (simulation)`);
      await logTimeline(booking.id, "sla_breached", "SLA threshold exceeded (simulation)");

      results.booking_id = booking.id;
      results.success = true;

    } else if (scenario === "simulate_out_of_zone_request") {
      // Create a notification event for out-of-zone demand
      await supabase.from("notification_events").insert({
        event_type: "zone_not_supported",
        metadata: {
          simulation: true,
          requested_area: "Matara",
          category_code: category,
          message: "Customer attempted booking from unsupported zone",
        },
      });
      log("out_of_zone_event_logged", true, "area=Matara");
      await logAutomation("expansion_lead_detected", null, "info", `Demand signal from Matara for ${category}`);

      results.booking_id = null;
      results.success = true;

    } else {
      return new Response(JSON.stringify({ error: `Unknown scenario: ${scenario}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return respond(results);
  } catch (e) {
    console.error("pilot-simulation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function respond(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
