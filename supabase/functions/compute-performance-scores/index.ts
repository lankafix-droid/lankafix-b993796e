import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * compute-performance-scores: Batch computes partner performance scores.
 * Score = weighted combination of:
 *   - Rating (25%)
 *   - Completion rate (20%)
 *   - Response time (15%)
 *   - Quote approval rate (15%)
 *   - On-time rate (15%)
 *   - Repeat customer rate (10%)
 * 
 * Run daily via pg_cron or on-demand.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all verified partners
    const { data: partners, error: partnerErr } = await supabase
      .from("partners")
      .select("id, rating_average, completed_jobs_count, cancellation_rate, acceptance_rate, on_time_rate, quote_approval_rate, average_response_time_minutes, strike_count")
      .eq("verification_status", "verified");

    if (partnerErr) throw partnerErr;
    if (!partners || partners.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get repeat customer counts per partner (from service_relationships)
    const { data: repeatData } = await supabase
      .from("service_relationships")
      .select("partner_id, total_bookings")
      .gte("total_bookings", 2);

    const repeatMap = new Map<string, number>();
    (repeatData || []).forEach((r: any) => {
      repeatMap.set(r.partner_id, (repeatMap.get(r.partner_id) || 0) + 1);
    });

    let updated = 0;

    for (const p of partners) {
      // Rating score (0-100): normalized from 0-5 scale
      const ratingScore = Math.min(((p.rating_average || 0) / 5) * 100, 100);

      // Completion rate score: inverse of cancellation
      const cancelRate = p.cancellation_rate || 0;
      const completionScore = Math.max(0, 100 - cancelRate * 2.5);

      // Response time score
      const avgResp = p.average_response_time_minutes || 30;
      const responseScore = avgResp <= 3 ? 100 : avgResp <= 5 ? 90 : avgResp <= 10 ? 75 : avgResp <= 20 ? 55 : avgResp <= 30 ? 35 : 15;

      // Quote approval rate score
      const quoteApprovalScore = Math.min(p.quote_approval_rate || 80, 100);

      // On-time rate score
      const onTimeScore = Math.min(p.on_time_rate || 90, 100);

      // Repeat customer score
      const repeatCustomers = repeatMap.get(p.id) || 0;
      const totalJobs = p.completed_jobs_count || 0;
      const repeatScore = totalJobs > 5 ? Math.min((repeatCustomers / totalJobs) * 200, 100) : 50;

      // Weighted score
      let score = Math.round(
        ratingScore * 0.25 +
        completionScore * 0.20 +
        responseScore * 0.15 +
        quoteApprovalScore * 0.15 +
        onTimeScore * 0.15 +
        repeatScore * 0.10
      );

      // Penalties
      const strikes = p.strike_count || 0;
      if (strikes > 0) score = Math.max(0, score - strikes * 5);

      // Clamp 0-100
      score = Math.max(0, Math.min(100, score));

      const { error: updateErr } = await supabase
        .from("partners")
        .update({ performance_score: score })
        .eq("id", p.id);

      if (!updateErr) updated++;
    }

    return new Response(JSON.stringify({
      success: true,
      updated,
      total_partners: partners.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-performance-scores error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
