import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Tier computation — mirrors src/engines/partnerTieringEngine.ts
 * HARDENED: under_review requires minimum evidence thresholds
 */
function computeTier(p: {
  performance_score: number;
  rating_average: number;
  completed_jobs_count: number;
  cancellation_rate: number;
  strike_count: number;
  on_time_rate: number;
}): { tier: string; reason: string } {
  const { performance_score: score, rating_average: rating, completed_jobs_count: jobs, cancellation_rate: cancelRate, strike_count: strikes, on_time_rate: onTime } = p;

  // Under Review — strikes always count (ops issue, not data sparsity)
  if (strikes >= 3) return { tier: "under_review", reason: `${strikes} strikes` };
  // Cancel-based: need ≥5 jobs evidence
  if (cancelRate >= 25 && jobs >= 5) return { tier: "under_review", reason: `Cancel rate ${cancelRate}% (${jobs} jobs)` };
  // Score-based: need ≥10 jobs evidence
  if (score > 0 && score <= 35 && jobs >= 10) return { tier: "under_review", reason: `Score ${score} (${jobs} jobs)` };
  // Rating-based: need ≥10 jobs evidence
  if (rating > 0 && rating <= 3.0 && jobs >= 10) return { tier: "under_review", reason: `Rating ${rating} (${jobs} jobs)` };

  // Low-data partners: stay verified
  if (jobs < 5) return { tier: "verified", reason: `New partner (${jobs} jobs)` };

  // Elite
  if (score >= 80 && rating >= 4.5 && jobs >= 20 && cancelRate <= 5 && strikes <= 0 && onTime >= 90) {
    return { tier: "elite", reason: `Score ${score}, Rating ${rating}, ${jobs} jobs, ${onTime}% on-time` };
  }

  // Pro
  if (score >= 60 && rating >= 3.8 && jobs >= 8 && cancelRate <= 15 && strikes <= 1) {
    return { tier: "pro", reason: `Score ${score}, Rating ${rating}, ${jobs} jobs` };
  }

  return { tier: "verified", reason: "Standard verified" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const { data: repeatData } = await supabase
      .from("service_relationships")
      .select("partner_id, total_bookings")
      .gte("total_bookings", 2);

    const repeatMap = new Map<string, number>();
    (repeatData || []).forEach((r: any) => {
      repeatMap.set(r.partner_id, (repeatMap.get(r.partner_id) || 0) + 1);
    });

    let updated = 0;
    const tierCounts: Record<string, number> = { elite: 0, pro: 0, verified: 0, under_review: 0 };

    for (const p of partners) {
      const ratingScore = Math.min(((p.rating_average || 0) / 5) * 100, 100);
      const cancelRate = p.cancellation_rate || 0;
      const completionScore = Math.max(0, 100 - cancelRate * 2.5);
      const avgResp = p.average_response_time_minutes || 30;
      const responseScore = avgResp <= 3 ? 100 : avgResp <= 5 ? 90 : avgResp <= 10 ? 75 : avgResp <= 20 ? 55 : avgResp <= 30 ? 35 : 15;
      const quoteApprovalScore = Math.min(p.quote_approval_rate || 80, 100);
      const onTimeScore = Math.min(p.on_time_rate || 90, 100);
      const repeatCustomers = repeatMap.get(p.id) || 0;
      const totalJobs = p.completed_jobs_count || 0;
      const repeatScore = totalJobs > 5 ? Math.min((repeatCustomers / totalJobs) * 200, 100) : 50;

      let score = Math.round(
        ratingScore * 0.25 + completionScore * 0.20 + responseScore * 0.15 +
        quoteApprovalScore * 0.15 + onTimeScore * 0.15 + repeatScore * 0.10
      );

      const strikes = p.strike_count || 0;
      if (strikes > 0) score = Math.max(0, score - strikes * 5);
      score = Math.max(0, Math.min(100, score));

      const { tier, reason } = computeTier({
        performance_score: score,
        rating_average: p.rating_average || 0,
        completed_jobs_count: totalJobs,
        cancellation_rate: cancelRate,
        strike_count: strikes,
        on_time_rate: p.on_time_rate || 95,
      });

      tierCounts[tier] = (tierCounts[tier] || 0) + 1;

      const { error: updateErr } = await supabase
        .from("partners")
        .update({ performance_score: score, reliability_tier: tier })
        .eq("id", p.id);

      if (!updateErr) updated++;
    }

    return new Response(JSON.stringify({
      success: true,
      updated,
      total_partners: partners.length,
      tier_distribution: tierCounts,
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
