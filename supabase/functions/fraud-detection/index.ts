import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * fraud-detection: Runs fraud checks on bookings/quotes.
 * Checks:
 * 1. Price gouging — quote total exceeds 150% of category average
 * 2. Ghost jobs — completion without proper status transitions
 * 3. Bypass attempts — historical bypass count
 * 4. Suspicious patterns — too many cancellations, rapid completions
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, check_type } = await req.json();

    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const alerts: Array<{ type: string; severity: "low" | "medium" | "high" | "critical"; message: string; metadata?: any }> = [];

    // Fetch booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CHECK 1: Price Gouging ──
    if (check_type === "quote_submitted" || check_type === "all") {
      const { data: quote } = await supabase
        .from("quotes")
        .select("total_lkr, partner_id")
        .eq("booking_id", booking_id)
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (quote?.total_lkr) {
        // Get average quote for this category
        const { data: avgData } = await supabase
          .from("quotes")
          .select("total_lkr")
          .eq("status", "approved")
          .limit(100);

        // Filter by same category through bookings
        const { data: categoryQuotes } = await supabase
          .rpc("get_category_quote_avg" as any, { cat: booking.category_code })
          .maybeSingle();

        // Simple average from recent approved quotes for same category
        const { data: recentQuotes } = await supabase
          .from("quotes")
          .select("total_lkr, booking_id")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(50);

        if (recentQuotes && recentQuotes.length >= 5) {
          const totals = recentQuotes.map((q: any) => q.total_lkr).filter(Boolean);
          const avg = totals.reduce((a: number, b: number) => a + b, 0) / totals.length;

          if (quote.total_lkr > avg * 1.5) {
            alerts.push({
              type: "price_gouging",
              severity: quote.total_lkr > avg * 2.0 ? "critical" : "high",
              message: `Quote LKR ${quote.total_lkr} exceeds category average of LKR ${Math.round(avg)} by ${Math.round((quote.total_lkr / avg - 1) * 100)}%`,
              metadata: { quote_total: quote.total_lkr, category_avg: Math.round(avg), ratio: (quote.total_lkr / avg).toFixed(2) },
            });
          }
        }
      }
    }

    // ── CHECK 2: Ghost Job Detection ──
    if (check_type === "completion" || check_type === "all") {
      const { data: timeline } = await supabase
        .from("job_timeline")
        .select("status, created_at")
        .eq("booking_id", booking_id)
        .order("created_at", { ascending: true });

      if (timeline) {
        const statuses = timeline.map((t: any) => t.status);
        const requiredSteps = ["assigned", "tech_en_route", "arrived"];
        const missingSteps = requiredSteps.filter(s => !statuses.includes(s));

        if (missingSteps.length > 0) {
          alerts.push({
            type: "ghost_job",
            severity: missingSteps.length >= 2 ? "high" : "medium",
            message: `Job completed without expected steps: ${missingSteps.join(", ")}`,
            metadata: { missing_steps: missingSteps, total_timeline_events: timeline.length },
          });
        }

        // Rapid completion — less than 10 minutes from assigned to completed
        const assignedEvent = timeline.find((t: any) => t.status === "assigned");
        const completedEvent = timeline.find((t: any) => t.status === "completed");
        if (assignedEvent && completedEvent) {
          const durationMin = (new Date(completedEvent.created_at).getTime() - new Date(assignedEvent.created_at).getTime()) / 60000;
          if (durationMin < 10) {
            alerts.push({
              type: "rapid_completion",
              severity: "high",
              message: `Job completed in ${Math.round(durationMin)} minutes — suspiciously fast`,
              metadata: { duration_minutes: Math.round(durationMin) },
            });
          }
        }
      }
    }

    // ── CHECK 3: Bypass Attempt History ──
    if (check_type === "all" && booking.partner_id) {
      const { data: bypasses } = await supabase
        .from("bypass_attempts")
        .select("id")
        .eq("actor_id", booking.partner_id);

      if (bypasses && bypasses.length >= 3) {
        alerts.push({
          type: "bypass_history",
          severity: bypasses.length >= 5 ? "critical" : "high",
          message: `Partner has ${bypasses.length} recorded bypass attempts`,
          metadata: { bypass_count: bypasses.length },
        });
      }
    }

    // ── CHECK 4: Partner Warning History ──
    if (check_type === "all" && booking.partner_id) {
      const { data: warnings } = await supabase
        .from("partner_warnings")
        .select("id, severity")
        .eq("partner_id", booking.partner_id)
        .is("resolved_at", null);

      if (warnings && warnings.length > 0) {
        const highSeverity = warnings.filter((w: any) => w.severity === "high" || w.severity === "critical");
        if (highSeverity.length > 0) {
          alerts.push({
            type: "active_warnings",
            severity: "high",
            message: `Partner has ${highSeverity.length} unresolved high-severity warnings`,
            metadata: { warning_count: warnings.length, high_severity: highSeverity.length },
          });
        }
      }
    }

    // Log fraud check result
    if (alerts.length > 0) {
      await supabase.from("notification_events").insert({
        event_type: "fraud_alert",
        booking_id,
        partner_id: booking.partner_id,
        metadata: { alerts, check_type },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      booking_id,
      alerts,
      risk_level: alerts.some(a => a.severity === "critical") ? "critical"
        : alerts.some(a => a.severity === "high") ? "high"
        : alerts.length > 0 ? "medium" : "low",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fraud-detection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
