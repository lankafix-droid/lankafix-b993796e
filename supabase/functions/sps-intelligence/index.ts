import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Deterministic Scoring Engine ──

function scoreAssetHealth(tickets: any[], meterReadings: any[], asset: any): {
  health_score: number; health_status: string; support_burden_score: number;
  repeat_issue_score: number; meter_risk_score: number; replacement_risk_score: number;
  trend_direction: string; top_reasons: string[]; suggested_action: string;
} {
  let score = 100;
  const reasons: string[] = [];

  // Support burden: tickets in last 90 days
  const recent = tickets.filter((t: any) => {
    const d = new Date(t.opened_at || t.created_at);
    return d > new Date(Date.now() - 90 * 86400000);
  });
  const supportBurden = Math.min(recent.length * 12, 40);
  score -= supportBurden;
  if (recent.length >= 3) reasons.push(`${recent.length} support tickets in last 90 days`);

  // Repeat issues: same category tickets
  const catCounts: Record<string, number> = {};
  tickets.forEach((t: any) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const maxRepeat = Math.max(0, ...Object.values(catCounts));
  const repeatScore = Math.min(maxRepeat * 8, 25);
  score -= repeatScore;
  if (maxRepeat >= 2) {
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    reasons.push(`Repeated ${topCat[0]} issues (${topCat[1]}x)`);
  }

  // Meter anomalies
  const anomalies = meterReadings.filter((m: any) => m.anomaly_flag);
  const meterRisk = Math.min(anomalies.length * 10, 20);
  score -= meterRisk;
  if (anomalies.length > 0) reasons.push(`${anomalies.length} meter anomalies detected`);

  // Replacement review signals
  const replacementTickets = tickets.filter((t: any) => t.category === "replacement_review" || t.status === "replacement_review");
  const replacementRisk = Math.min(replacementTickets.length * 15, 30);
  score -= replacementRisk;
  if (replacementTickets.length > 0) reasons.push(`${replacementTickets.length} replacement review(s) flagged`);

  score = Math.max(0, Math.min(100, score));

  const status = score >= 85 ? "excellent" : score >= 65 ? "stable" : score >= 45 ? "watchlist" : score >= 25 ? "at_risk" : "replace_soon";
  
  // Trend: compare recent vs older ticket density
  const older = tickets.filter((t: any) => {
    const d = new Date(t.opened_at || t.created_at);
    return d > new Date(Date.now() - 180 * 86400000) && d <= new Date(Date.now() - 90 * 86400000);
  });
  const trend = recent.length > older.length + 1 ? "worsening" : recent.length < older.length - 1 ? "improving" : "stable";

  const action = score < 25 ? "Review for retirement or donor status" :
    score < 45 ? "Schedule preventive maintenance visit" :
    score < 65 ? "Monitor closely; consider proactive customer contact" :
    "Continue normal operations";

  if (reasons.length === 0) reasons.push("No significant issues detected");

  return {
    health_score: score, health_status: status, support_burden_score: supportBurden,
    repeat_issue_score: repeatScore, meter_risk_score: meterRisk, replacement_risk_score: replacementRisk,
    trend_direction: trend, top_reasons: reasons, suggested_action: action,
  };
}

function scorePredictiveMaintenance(tickets: any[], meterReadings: any[], contract: any): {
  maintenance_risk_level: string; predicted_issue_category: string | null;
  confidence: string; trend_direction: string; contributing_factors: string[];
  suggested_action: string;
} {
  const factors: string[] = [];
  let riskPoints = 0;

  const recent = tickets.filter((t: any) => new Date(t.opened_at || t.created_at) > new Date(Date.now() - 60 * 86400000));
  if (recent.length >= 3) { riskPoints += 3; factors.push("High recent ticket volume"); }
  else if (recent.length >= 1) { riskPoints += 1; factors.push("Recent support activity"); }

  const catCounts: Record<string, number> = {};
  tickets.forEach((t: any) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const maxRepeat = Math.max(0, ...Object.values(catCounts));
  if (maxRepeat >= 3) { riskPoints += 3; factors.push("Repeated same-category failures"); }
  else if (maxRepeat >= 2) { riskPoints += 1; factors.push("Pattern of similar issues"); }

  const anomalies = meterReadings.filter((m: any) => m.anomaly_flag);
  if (anomalies.length >= 2) { riskPoints += 2; factors.push("Multiple meter anomalies"); }

  if (contract?.support_level === "premium" || contract?.support_level === "priority") {
    factors.push("High SLA criticality");
  }

  const riskLevel = riskPoints >= 6 ? "immediate_review" : riskPoints >= 4 ? "high" : riskPoints >= 2 ? "moderate" : "low";
  const predictedCategory = maxRepeat >= 2 ? Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null : null;
  const confidence = riskPoints >= 4 ? "high" : riskPoints >= 2 ? "medium" : "low";

  const older = tickets.filter((t: any) => {
    const d = new Date(t.opened_at || t.created_at);
    return d > new Date(Date.now() - 120 * 86400000) && d <= new Date(Date.now() - 60 * 86400000);
  });
  const trend = recent.length > older.length + 1 ? "worsening" : recent.length < older.length - 1 ? "improving" : "stable";

  const action = riskLevel === "immediate_review" ? "Schedule urgent technician review" :
    riskLevel === "high" ? "Prepare backup unit; contact customer proactively" :
    riskLevel === "moderate" ? "Monitor; consider preventive check" : "Continue monitoring";

  if (factors.length === 0) factors.push("No significant risk factors");

  return { maintenance_risk_level: riskLevel, predicted_issue_category: predictedCategory, confidence, trend_direction: trend, contributing_factors: factors, suggested_action: action };
}

function scoreContractProfitability(billingCycles: any[], tickets: any[], contract: any, plan: any): {
  revenue_collected: number; support_cost: number; consumable_cost: number;
  repair_cost: number; overage_revenue: number; margin_estimate: number;
  profitability_status: string; payback_progress: number; breakeven_estimate_months: number | null;
  recommended_action: string;
} {
  const revenue = billingCycles.reduce((s: number, b: any) => s + (Number(b.total_due) || 0), 0);
  const overage = billingCycles.reduce((s: number, b: any) => s + (Number(b.overage_amount) || 0), 0);
  // Estimate costs from ticket counts
  const supportCost = tickets.length * 500; // LKR 500 per ticket avg
  const repairCost = tickets.filter((t: any) => t.category === "technician_visit" || t.priority === "high").length * 2000;
  const consumableCost = billingCycles.length * 300; // base consumable per cycle

  const totalCost = supportCost + repairCost + consumableCost;
  const margin = revenue - totalCost;
  const depositRecovery = Number(contract?.deposit_amount) || 0;
  const setupFee = Number(contract?.setup_fee) || 0;
  const totalInvestment = depositRecovery + setupFee + totalCost;
  const payback = totalInvestment > 0 ? Math.min(100, (revenue / totalInvestment) * 100) : 100;

  const marginRatio = revenue > 0 ? margin / revenue : 0;
  const status = marginRatio >= 0.4 ? "strong" : marginRatio >= 0.2 ? "healthy" : marginRatio >= 0.05 ? "tight_margin" : marginRatio >= -0.1 ? "at_risk" : "loss_making";

  const monthlyRevenue = plan?.monthly_fee || 0;
  const breakevenMonths = monthlyRevenue > 0 && margin < 0 ? Math.ceil(Math.abs(margin) / (monthlyRevenue * 0.3)) : null;

  const action = status === "loss_making" ? "Review pricing or consider asset replacement" :
    status === "at_risk" ? "Watch support costs; review for plan upgrade" :
    status === "tight_margin" ? "Monitor; consider overage optimization" :
    "Continue as normal";

  return {
    revenue_collected: revenue, support_cost: supportCost, consumable_cost: consumableCost,
    repair_cost: repairCost, overage_revenue: overage, margin_estimate: margin,
    profitability_status: status, payback_progress: Math.round(payback * 100) / 100,
    breakeven_estimate_months: breakevenMonths, recommended_action: action,
  };
}

function scoreContractSignals(billingCycles: any[], tickets: any[], contract: any, plan: any): {
  renewal_signal: string; churn_risk: string; pause_risk: string;
  upgrade_opportunity: string; downgrade_opportunity: string;
  usage_fit_score: number; billing_stability_score: number; satisfaction_proxy_score: number;
  reasons: string[]; suggested_action: string;
} {
  const reasons: string[] = [];

  // Usage fit
  const includedPages = plan?.included_pages || 500;
  const avgPages = billingCycles.length > 0
    ? billingCycles.reduce((s: number, b: any) => s + (Number(b.actual_pages) || 0), 0) / billingCycles.length
    : includedPages;
  const usageRatio = avgPages / includedPages;
  const usageFit = usageRatio > 1.3 ? 30 : usageRatio > 1.1 ? 50 : usageRatio > 0.7 ? 85 : usageRatio > 0.4 ? 60 : 40;

  // Upgrade/downgrade
  let upgrade = "none";
  let downgrade = "none";
  if (usageRatio > 1.3) { upgrade = "strong"; reasons.push("Consistently exceeds page allowance"); }
  else if (usageRatio > 1.1) { upgrade = "possible"; reasons.push("Slightly above plan allowance"); }
  if (usageRatio < 0.4) { downgrade = "recommended"; reasons.push("Usage far below included pages"); }
  else if (usageRatio < 0.6) { downgrade = "possible"; reasons.push("Usage below plan capacity"); }

  // Billing stability
  const paidOnTime = billingCycles.filter((b: any) => b.billing_status === "paid").length;
  const billingStability = billingCycles.length > 0 ? Math.round((paidOnTime / billingCycles.length) * 100) : 50;

  // Satisfaction proxy (inverse of ticket burden)
  const recentTickets = tickets.filter((t: any) => new Date(t.opened_at || t.created_at) > new Date(Date.now() - 90 * 86400000));
  const satisfaction = Math.max(10, 100 - recentTickets.length * 15);
  if (recentTickets.length >= 3) reasons.push("High support burden suggests dissatisfaction");

  // Pause risk
  const pauseRisk = contract?.pause_status === "paused" ? "high" : satisfaction < 40 ? "moderate" : "low";
  if (pauseRisk === "high") reasons.push("Contract currently paused");

  // Churn risk
  const churnPoints = (satisfaction < 40 ? 2 : 0) + (billingStability < 60 ? 1 : 0) + (pauseRisk === "high" ? 2 : 0) + (usageFit < 40 ? 1 : 0);
  const churnRisk = churnPoints >= 4 ? "critical" : churnPoints >= 3 ? "high" : churnPoints >= 1 ? "moderate" : "low";

  // Renewal signal
  const renewal = churnRisk === "critical" ? "churn_risk" : churnRisk === "high" ? "weak" : satisfaction >= 70 && billingStability >= 80 ? "strong" : "stable";
  if (renewal === "strong") reasons.push("Consistent usage and smooth billing suggest strong renewal");

  if (reasons.length === 0) reasons.push("Contract metrics within normal range");

  const action = churnRisk === "critical" ? "Urgent retention review needed" :
    upgrade === "strong" ? "Recommend plan upgrade discussion" :
    downgrade === "recommended" ? "Review for smaller plan fit" :
    churnRisk === "high" ? "Proactive customer engagement recommended" :
    "Continue monitoring";

  return {
    renewal_signal: renewal, churn_risk: churnRisk, pause_risk: pauseRisk,
    upgrade_opportunity: upgrade, downgrade_opportunity: downgrade,
    usage_fit_score: usageFit, billing_stability_score: billingStability,
    satisfaction_proxy_score: satisfaction, reasons, suggested_action: action,
  };
}

// ── AI Explanation Helper ──
async function generateAIExplanation(context: string, apiKey: string): Promise<string> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 300,
        messages: [
          { role: "system", content: "You are a concise internal operations advisor for LankaFix SPS. Summarize the given data in 2-3 sentences for admin staff. Be factual, professional, actionable. Never invent data." },
          { role: "user", content: context },
        ],
      }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const aiKey = Deno.env.get("LOVABLE_API_KEY") || "";

  try {
    const { action, asset_id, contract_id, entity_type, entity_id } = await req.json();

    // Auth check — require admin
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!roleData) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "compute_asset_health" && asset_id) {
      // Fetch tickets and meter readings for this asset
      const [ticketsRes, metersRes, assetRes] = await Promise.all([
        supabaseAdmin.from("sps_support_tickets").select("*").eq("asset_id", asset_id).order("opened_at", { ascending: false }).limit(100),
        supabaseAdmin.from("sps_meter_readings").select("*").eq("asset_id", asset_id).order("submitted_at", { ascending: false }).limit(50),
        supabaseAdmin.from("sps_assets").select("*").eq("id", asset_id).maybeSingle(),
      ]);

      const scores = scoreAssetHealth(ticketsRes.data || [], metersRes.data || [], assetRes.data);

      // Generate AI explanation
      const explanation = await generateAIExplanation(
        `Asset ${assetRes.data?.asset_code || asset_id} health: score=${scores.health_score}, status=${scores.health_status}, reasons: ${scores.top_reasons.join("; ")}. Trend: ${scores.trend_direction}. Action: ${scores.suggested_action}`,
        aiKey
      );

      // Store to DB
      await supabaseAdmin.from("sps_ai_asset_health_scores").insert({
        asset_id, health_score: scores.health_score, health_status: scores.health_status,
        support_burden_score: scores.support_burden_score, repeat_issue_score: scores.repeat_issue_score,
        meter_risk_score: scores.meter_risk_score, replacement_risk_score: scores.replacement_risk_score,
        trend_direction: scores.trend_direction, top_reasons: scores.top_reasons,
        suggested_action: scores.suggested_action, confidence: "high",
      });

      return new Response(JSON.stringify({ ...scores, explanation, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "compute_predictive_maintenance" && asset_id) {
      const [ticketsRes, metersRes, contractRes] = await Promise.all([
        supabaseAdmin.from("sps_support_tickets").select("*").eq("asset_id", asset_id).order("opened_at", { ascending: false }).limit(100),
        supabaseAdmin.from("sps_meter_readings").select("*").eq("asset_id", asset_id).order("submitted_at", { ascending: false }).limit(50),
        supabaseAdmin.from("sps_contracts").select("*").eq("asset_id", asset_id).eq("contract_status", "active").maybeSingle(),
      ]);

      const prediction = scorePredictiveMaintenance(ticketsRes.data || [], metersRes.data || [], contractRes.data);

      const explanation = await generateAIExplanation(
        `Predictive maintenance for asset ${asset_id}: risk=${prediction.maintenance_risk_level}, predicted issue=${prediction.predicted_issue_category || "none"}, factors: ${prediction.contributing_factors.join("; ")}`,
        aiKey
      );

      await supabaseAdmin.from("sps_ai_predictive_maintenance").insert({
        asset_id, contract_id: contractRes.data?.id || null,
        maintenance_risk_level: prediction.maintenance_risk_level,
        predicted_issue_category: prediction.predicted_issue_category,
        confidence: prediction.confidence, trend_direction: prediction.trend_direction,
        contributing_factors: prediction.contributing_factors,
        suggested_action: prediction.suggested_action,
      });

      return new Response(JSON.stringify({ ...prediction, explanation, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "compute_contract_profitability" && contract_id) {
      const [contractRes, billingRes, ticketsRes, planRes] = await Promise.all([
        supabaseAdmin.from("sps_contracts").select("*").eq("id", contract_id).maybeSingle(),
        supabaseAdmin.from("sps_billing_cycles").select("*").eq("contract_id", contract_id).order("billing_month", { ascending: false }).limit(24),
        supabaseAdmin.from("sps_support_tickets").select("*").eq("contract_id", contract_id).order("opened_at", { ascending: false }).limit(100),
        null, // fetched after contract
      ]);

      let plan = null;
      if (contractRes.data?.plan_id) {
        const { data } = await supabaseAdmin.from("sps_plans").select("*").eq("id", contractRes.data.plan_id).maybeSingle();
        plan = data;
      }

      const profitability = scoreContractProfitability(billingRes.data || [], ticketsRes.data || [], contractRes.data, plan);

      const explanation = await generateAIExplanation(
        `Contract ${contract_id} profitability: revenue=${profitability.revenue_collected}, margin=${profitability.margin_estimate}, status=${profitability.profitability_status}, payback=${profitability.payback_progress}%`,
        aiKey
      );

      await supabaseAdmin.from("sps_ai_contract_profitability").insert({
        contract_id, ...profitability,
      });

      return new Response(JSON.stringify({ ...profitability, explanation, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "compute_contract_signals" && contract_id) {
      const [contractRes, billingRes, ticketsRes] = await Promise.all([
        supabaseAdmin.from("sps_contracts").select("*").eq("id", contract_id).maybeSingle(),
        supabaseAdmin.from("sps_billing_cycles").select("*").eq("contract_id", contract_id).order("billing_month", { ascending: false }).limit(12),
        supabaseAdmin.from("sps_support_tickets").select("*").eq("contract_id", contract_id).order("opened_at", { ascending: false }).limit(50),
      ]);

      let plan = null;
      if (contractRes.data?.plan_id) {
        const { data } = await supabaseAdmin.from("sps_plans").select("*").eq("id", contractRes.data.plan_id).maybeSingle();
        plan = data;
      }

      const signals = scoreContractSignals(billingRes.data || [], ticketsRes.data || [], contractRes.data, plan);

      const explanation = await generateAIExplanation(
        `Contract signals: renewal=${signals.renewal_signal}, churn=${signals.churn_risk}, upgrade=${signals.upgrade_opportunity}, reasons: ${signals.reasons.join("; ")}`,
        aiKey
      );

      await supabaseAdmin.from("sps_ai_contract_signals").insert({
        contract_id, ...signals,
      });

      return new Response(JSON.stringify({ ...signals, explanation, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_copilot_note" && entity_type && entity_id) {
      // Gather context based on entity type
      let contextStr = "";
      if (entity_type === "contract") {
        const [contract, billing, tickets] = await Promise.all([
          supabaseAdmin.from("sps_contracts").select("*").eq("id", entity_id).maybeSingle(),
          supabaseAdmin.from("sps_billing_cycles").select("*").eq("contract_id", entity_id).limit(6),
          supabaseAdmin.from("sps_support_tickets").select("*").eq("contract_id", entity_id).limit(20),
        ]);
        contextStr = `Contract: ${JSON.stringify(contract.data)}\nBilling cycles: ${billing.data?.length || 0}\nTickets: ${tickets.data?.length || 0}`;
      } else if (entity_type === "asset") {
        const [asset, tickets, health] = await Promise.all([
          supabaseAdmin.from("sps_assets").select("*").eq("id", entity_id).maybeSingle(),
          supabaseAdmin.from("sps_support_tickets").select("*").eq("asset_id", entity_id).limit(20),
          supabaseAdmin.from("sps_ai_asset_health_scores").select("*").eq("asset_id", entity_id).order("score_date", { ascending: false }).limit(1),
        ]);
        contextStr = `Asset: ${JSON.stringify(asset.data)}\nTickets: ${tickets.data?.length || 0}\nHealth: ${JSON.stringify(health.data?.[0] || {})}`;
      }

      // Use AI to generate structured copilot note
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 500,
            messages: [
              { role: "system", content: "You are LankaFix SPS Admin Copilot. Generate a structured JSON note with fields: summary (2 sentences), watchouts (key concerns), recommended_action, why_it_matters, advisor_note_draft (brief note for admin record). Be factual. Never invent data not in the context." },
              { role: "user", content: contextStr },
            ],
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || "";
          let note: any = {};
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) note = JSON.parse(jsonMatch[0]);
          } catch { note = { summary: content.slice(0, 500) }; }

          await supabaseAdmin.from("sps_ai_admin_copilot_notes").insert({
            entity_type, entity_id, note_type: "summary",
            summary: note.summary || null, watchouts: note.watchouts || null,
            recommended_action: note.recommended_action || null,
            why_it_matters: note.why_it_matters || null,
            advisor_note_draft: note.advisor_note_draft || null,
          });

          return new Response(JSON.stringify({ ...note, fallback: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch { /* fall through to fallback */ }

      return new Response(JSON.stringify({
        summary: "Unable to generate AI summary at this time.",
        watchouts: null, recommended_action: "Review manually",
        why_it_matters: null, advisor_note_draft: null, fallback: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "dismiss_alert") {
      const alertId = entity_id;
      const authHeader2 = req.headers.get("authorization");
      let userId = null;
      if (authHeader2) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader2.replace("Bearer ", ""));
        userId = user?.id;
      }
      await supabaseAdmin.from("sps_ai_alerts").update({
        status: "dismissed", dismissed_at: new Date().toISOString(), dismissed_by: userId,
      }).eq("id", alertId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Internal error", fallback: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
