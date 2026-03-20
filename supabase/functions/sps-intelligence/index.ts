import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ── Cost Weight Model (extensible by printer_class / SLA / category) ──
interface CostWeights {
  ticket_cost: number;          // LKR per ticket
  high_priority_ticket_cost: number;
  technician_visit_cost: number;
  consumable_per_cycle: number; // LKR per billing cycle
  sla_multiplier: number;       // applied to support cost
}

const BASE_COST_WEIGHTS: CostWeights = {
  ticket_cost: 500,
  high_priority_ticket_cost: 1200,
  technician_visit_cost: 2500,
  consumable_per_cycle: 300,
  sla_multiplier: 1.0,
};

// Lookup table — future: move to DB table sps_cost_profiles
const COST_OVERRIDES: Record<string, Partial<CostWeights>> = {
  // by printer_class
  copier:        { ticket_cost: 800, technician_visit_cost: 4000, consumable_per_cycle: 600 },
  business_mfp:  { ticket_cost: 700, technician_visit_cost: 3500, consumable_per_cycle: 500 },
  colour_laser:  { ticket_cost: 600, consumable_per_cycle: 450 },
  colour_mfp:    { ticket_cost: 650, consumable_per_cycle: 500 },
  ink_tank:      { consumable_per_cycle: 200 },
  cartridge:     { consumable_per_cycle: 400 },
  // by support_level (SLA multiplier)
  premium:       { sla_multiplier: 1.5 },
  priority:      { sla_multiplier: 1.3 },
  standard:      { sla_multiplier: 1.0 },
  basic:         { sla_multiplier: 0.8 },
};

function resolveCostWeights(printerClass?: string, supportLevel?: string): CostWeights {
  const w = { ...BASE_COST_WEIGHTS };
  if (printerClass && COST_OVERRIDES[printerClass]) Object.assign(w, COST_OVERRIDES[printerClass]);
  if (supportLevel && COST_OVERRIDES[supportLevel]?.sla_multiplier) {
    w.sla_multiplier = COST_OVERRIDES[supportLevel].sla_multiplier!;
  }
  return w;
}

// ── Deterministic Scoring Engine ──

function scoreAssetHealth(tickets: any[], meterReadings: any[], _asset: any): {
  health_score: number; health_status: string; support_burden_score: number;
  repeat_issue_score: number; meter_risk_score: number; replacement_risk_score: number;
  trend_direction: string; top_reasons: string[]; suggested_action: string;
} {
  let score = 100;
  const reasons: string[] = [];

  const recent = tickets.filter((t: any) => {
    const d = new Date(t.opened_at || t.created_at);
    return d > new Date(Date.now() - 90 * 86400000);
  });
  const supportBurden = Math.min(recent.length * 12, 40);
  score -= supportBurden;
  if (recent.length >= 3) reasons.push(`${recent.length} support tickets in last 90 days`);

  const catCounts: Record<string, number> = {};
  tickets.forEach((t: any) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const maxRepeat = Math.max(0, ...Object.values(catCounts));
  const repeatScore = Math.min(maxRepeat * 8, 25);
  score -= repeatScore;
  if (maxRepeat >= 2) {
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    reasons.push(`Repeated ${topCat[0]} issues (${topCat[1]}x)`);
  }

  const anomalies = meterReadings.filter((m: any) => m.anomaly_flag);
  const meterRisk = Math.min(anomalies.length * 10, 20);
  score -= meterRisk;
  if (anomalies.length > 0) reasons.push(`${anomalies.length} meter anomalies detected`);

  const replacementTickets = tickets.filter((t: any) => t.category === "replacement_review" || t.status === "replacement_review");
  const replacementRisk = Math.min(replacementTickets.length * 15, 30);
  score -= replacementRisk;
  if (replacementTickets.length > 0) reasons.push(`${replacementTickets.length} replacement review(s) flagged`);

  score = Math.max(0, Math.min(100, score));
  const status = score >= 85 ? "excellent" : score >= 65 ? "stable" : score >= 45 ? "watchlist" : score >= 25 ? "at_risk" : "replace_soon";

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

function scoreContractProfitability(billingCycles: any[], tickets: any[], contract: any, plan: any, weights: CostWeights): {
  revenue_collected: number; support_cost: number; consumable_cost: number;
  repair_cost: number; overage_revenue: number; margin_estimate: number;
  profitability_status: string; payback_progress: number; breakeven_estimate_months: number | null;
  recommended_action: string;
} {
  const revenue = billingCycles.reduce((s: number, b: any) => s + (Number(b.total_due) || 0), 0);
  const overage = billingCycles.reduce((s: number, b: any) => s + (Number(b.overage_amount) || 0), 0);

  // Weighted cost model
  const standardTickets = tickets.filter((t: any) => t.priority !== "high" && t.category !== "technician_visit");
  const highTickets = tickets.filter((t: any) => t.priority === "high");
  const visitTickets = tickets.filter((t: any) => t.category === "technician_visit");

  const rawSupportCost = standardTickets.length * weights.ticket_cost
    + highTickets.length * weights.high_priority_ticket_cost
    + visitTickets.length * weights.technician_visit_cost;
  const supportCost = Math.round(rawSupportCost * weights.sla_multiplier);
  const repairCost = visitTickets.length * weights.technician_visit_cost;
  const consumableCost = billingCycles.length * weights.consumable_per_cycle;

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
  const includedPages = plan?.included_pages || 500;
  const avgPages = billingCycles.length > 0
    ? billingCycles.reduce((s: number, b: any) => s + (Number(b.actual_pages) || 0), 0) / billingCycles.length
    : includedPages;
  const usageRatio = avgPages / includedPages;
  const usageFit = usageRatio > 1.3 ? 30 : usageRatio > 1.1 ? 50 : usageRatio > 0.7 ? 85 : usageRatio > 0.4 ? 60 : 40;

  let upgrade = "none", downgrade = "none";
  if (usageRatio > 1.3) { upgrade = "strong"; reasons.push("Consistently exceeds page allowance"); }
  else if (usageRatio > 1.1) { upgrade = "possible"; reasons.push("Slightly above plan allowance"); }
  if (usageRatio < 0.4) { downgrade = "recommended"; reasons.push("Usage far below included pages"); }
  else if (usageRatio < 0.6) { downgrade = "possible"; reasons.push("Usage below plan capacity"); }

  const paidOnTime = billingCycles.filter((b: any) => b.billing_status === "paid").length;
  const billingStability = billingCycles.length > 0 ? Math.round((paidOnTime / billingCycles.length) * 100) : 50;

  const recentTickets = tickets.filter((t: any) => new Date(t.opened_at || t.created_at) > new Date(Date.now() - 90 * 86400000));
  const satisfaction = Math.max(10, 100 - recentTickets.length * 15);
  if (recentTickets.length >= 3) reasons.push("High support burden suggests dissatisfaction");

  const pauseRisk = contract?.pause_status === "paused" ? "high" : satisfaction < 40 ? "moderate" : "low";
  if (pauseRisk === "high") reasons.push("Contract currently paused");

  const churnPoints = (satisfaction < 40 ? 2 : 0) + (billingStability < 60 ? 1 : 0) + (pauseRisk === "high" ? 2 : 0) + (usageFit < 40 ? 1 : 0);
  const churnRisk = churnPoints >= 4 ? "critical" : churnPoints >= 3 ? "high" : churnPoints >= 1 ? "moderate" : "low";
  const renewal = churnRisk === "critical" ? "churn_risk" : churnRisk === "high" ? "weak" : satisfaction >= 70 && billingStability >= 80 ? "strong" : "stable";
  if (renewal === "strong") reasons.push("Consistent usage and smooth billing suggest strong renewal");

  if (reasons.length === 0) reasons.push("Contract metrics within normal range");

  const action = churnRisk === "critical" ? "Urgent retention review needed" :
    upgrade === "strong" ? "Recommend plan upgrade discussion" :
    downgrade === "recommended" ? "Review for smaller plan fit" :
    churnRisk === "high" ? "Proactive customer engagement recommended" : "Continue monitoring";

  return {
    renewal_signal: renewal, churn_risk: churnRisk, pause_risk: pauseRisk,
    upgrade_opportunity: upgrade, downgrade_opportunity: downgrade,
    usage_fit_score: usageFit, billing_stability_score: billingStability,
    satisfaction_proxy_score: satisfaction, reasons, suggested_action: action,
  };
}

// ── Structured Copilot Schema ──
const COPILOT_SCHEMA = {
  type: "object",
  properties: {
    summary:            { type: "string", description: "2-3 sentence factual summary" },
    watchouts:          { type: "string", description: "Key concerns to watch, or null if none" },
    recommended_action: { type: "string", description: "Concrete next step for admin" },
    why_it_matters:     { type: "string", description: "Business impact in 1 sentence" },
    advisor_note_draft: { type: "string", description: "Brief internal note for record" },
  },
  required: ["summary", "recommended_action"],
};

// ── AI Helpers ──
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

async function generateStructuredCopilotNote(context: string, apiKey: string): Promise<Record<string, string | null>> {
  const fallback = { summary: "Unable to generate AI summary at this time.", watchouts: null, recommended_action: "Review manually", why_it_matters: null, advisor_note_draft: null };
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 600,
        response_format: { type: "json_schema", json_schema: { name: "copilot_note", strict: true, schema: COPILOT_SCHEMA } },
        messages: [
          { role: "system", content: "You are LankaFix SPS Admin Copilot. Return a JSON object with fields: summary, watchouts, recommended_action, why_it_matters, advisor_note_draft. Be factual. Never invent data not in the context provided." },
          { role: "user", content: context },
        ],
      }),
    });
    if (!resp.ok) return fallback;
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    try {
      const parsed = JSON.parse(raw);
      return {
        summary: parsed.summary || fallback.summary,
        watchouts: parsed.watchouts || null,
        recommended_action: parsed.recommended_action || fallback.recommended_action,
        why_it_matters: parsed.why_it_matters || null,
        advisor_note_draft: parsed.advisor_note_draft || null,
      };
    } catch {
      // If structured parse fails, try regex extraction
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { summary: parsed.summary || raw.slice(0, 300), watchouts: parsed.watchouts || null, recommended_action: parsed.recommended_action || "Review manually", why_it_matters: parsed.why_it_matters || null, advisor_note_draft: parsed.advisor_note_draft || null };
        } catch { /* fall through */ }
      }
      return { ...fallback, summary: raw.slice(0, 300) || fallback.summary };
    }
  } catch { return fallback; }
}

// ── Alert Engine ──
interface AlertRule {
  type: string;
  priority: string;
  title: (ctx: any) => string;
  message: (ctx: any) => string;
  explanation: (ctx: any) => string;
  condition: (ctx: any) => boolean;
  dedupeKey: (ctx: any) => string;
  expiryDays: number;
}

const ALERT_RULES: AlertRule[] = [
  {
    type: "asset_health_critical", priority: "immediate",
    condition: (ctx) => ctx.health_score !== undefined && ctx.health_score < 25,
    title: (ctx) => `Asset ${ctx.asset_code || ctx.asset_id?.slice(0, 8)} needs replacement review`,
    message: (ctx) => `Health score dropped to ${ctx.health_score}. Status: ${ctx.health_status}.`,
    explanation: (ctx) => ctx.top_reasons?.join("; ") || "Critical health decline",
    dedupeKey: (ctx) => `asset_health_critical_${ctx.asset_id}`,
    expiryDays: 14,
  },
  {
    type: "asset_health_watchlist", priority: "watch",
    condition: (ctx) => ctx.health_score !== undefined && ctx.health_score >= 25 && ctx.health_score < 45,
    title: (ctx) => `Asset ${ctx.asset_code || ctx.asset_id?.slice(0, 8)} is at risk`,
    message: (ctx) => `Health score: ${ctx.health_score}. Trend: ${ctx.trend_direction}.`,
    explanation: (ctx) => ctx.top_reasons?.join("; ") || "Declining asset health",
    dedupeKey: (ctx) => `asset_health_at_risk_${ctx.asset_id}`,
    expiryDays: 30,
  },
  {
    type: "maintenance_high_risk", priority: "high",
    condition: (ctx) => ctx.maintenance_risk_level === "immediate_review" || ctx.maintenance_risk_level === "high",
    title: (ctx) => `High maintenance risk for asset ${ctx.asset_id?.slice(0, 8)}`,
    message: (ctx) => `Risk: ${ctx.maintenance_risk_level}. Predicted: ${ctx.predicted_issue_category || "general"}.`,
    explanation: (ctx) => ctx.contributing_factors?.join("; ") || "Elevated breakdown risk",
    dedupeKey: (ctx) => `maint_risk_${ctx.asset_id}`,
    expiryDays: 21,
  },
  {
    type: "contract_loss_making", priority: "high",
    condition: (ctx) => ctx.profitability_status === "loss_making",
    title: (ctx) => `Contract ${ctx.contract_id?.slice(0, 8)} is loss-making`,
    message: (ctx) => `Margin: LKR ${ctx.margin_estimate?.toLocaleString()}. Payback: ${ctx.payback_progress}%.`,
    explanation: (ctx) => `Support cost LKR ${ctx.support_cost?.toLocaleString()} eroding revenue of LKR ${ctx.revenue_collected?.toLocaleString()}`,
    dedupeKey: (ctx) => `contract_loss_${ctx.contract_id}`,
    expiryDays: 30,
  },
  {
    type: "contract_at_risk_margin", priority: "watch",
    condition: (ctx) => ctx.profitability_status === "at_risk",
    title: (ctx) => `Contract ${ctx.contract_id?.slice(0, 8)} margin is at risk`,
    message: (ctx) => `Margin: LKR ${ctx.margin_estimate?.toLocaleString()}. Action: ${ctx.recommended_action}.`,
    explanation: (ctx) => "Support costs approaching revenue threshold",
    dedupeKey: (ctx) => `contract_risk_${ctx.contract_id}`,
    expiryDays: 30,
  },
  {
    type: "churn_risk_critical", priority: "immediate",
    condition: (ctx) => ctx.churn_risk === "critical",
    title: (ctx) => `Critical churn risk on contract ${ctx.contract_id?.slice(0, 8)}`,
    message: (ctx) => `Churn: ${ctx.churn_risk}. Renewal: ${ctx.renewal_signal}.`,
    explanation: (ctx) => ctx.reasons?.join("; ") || "Multiple churn indicators detected",
    dedupeKey: (ctx) => `churn_critical_${ctx.contract_id}`,
    expiryDays: 14,
  },
  {
    type: "upgrade_opportunity", priority: "info",
    condition: (ctx) => ctx.upgrade_opportunity === "strong",
    title: (ctx) => `Upgrade opportunity for contract ${ctx.contract_id?.slice(0, 8)}`,
    message: (ctx) => `Usage fit: ${ctx.usage_fit_score}%. Customer consistently exceeds allowance.`,
    explanation: (ctx) => ctx.reasons?.join("; ") || "Usage above plan capacity",
    dedupeKey: (ctx) => `upgrade_opp_${ctx.contract_id}`,
    expiryDays: 60,
  },
  {
    type: "trend_worsening", priority: "watch",
    condition: (ctx) => ctx.trend_direction === "worsening" && ctx.health_score !== undefined && ctx.health_score < 65,
    title: (ctx) => `Asset ${ctx.asset_code || ctx.asset_id?.slice(0, 8)} health worsening`,
    message: (ctx) => `Score: ${ctx.health_score}, trend worsening over last 90 days.`,
    explanation: (ctx) => "Increasing support burden compared to prior period",
    dedupeKey: (ctx) => `trend_worsen_${ctx.asset_id}`,
    expiryDays: 21,
  },
];

async function evaluateAndCreateAlerts(
  ctx: Record<string, any>,
  supabaseAdmin: any,
): Promise<number> {
  let created = 0;
  for (const rule of ALERT_RULES) {
    if (!rule.condition(ctx)) continue;
    const dedupeKey = rule.dedupeKey(ctx);

    // Check for existing active/non-expired duplicate
    const { data: existing } = await supabaseAdmin
      .from("sps_ai_alerts")
      .select("id, generated_at")
      .eq("alert_type", rule.type)
      .eq("status", "active")
      .like("explanation", `%${dedupeKey}%`)  // dedupe via explanation containing key
      .limit(1);

    // Skip if active duplicate exists and hasn't expired
    if (existing && existing.length > 0) {
      const age = Date.now() - new Date(existing[0].generated_at).getTime();
      if (age < rule.expiryDays * 86400000) continue;
      // Expired — auto-expire old one
      await supabaseAdmin.from("sps_ai_alerts").update({ status: "expired" }).eq("id", existing[0].id);
    }

    await supabaseAdmin.from("sps_ai_alerts").insert({
      alert_type: rule.type,
      priority: rule.priority,
      asset_id: ctx.asset_id || null,
      contract_id: ctx.contract_id || null,
      customer_id: ctx.customer_id || null,
      title: rule.title(ctx),
      message: rule.message(ctx),
      explanation: `[${dedupeKey}] ${rule.explanation(ctx)}`,
      status: "active",
    });
    created++;
  }
  return created;
}

// ── Strict Admin Auth Guard ──
async function requireAdmin(req: Request, supabaseAdmin: any): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return json({ error: "Invalid or expired session" }, 401);
  }
  const { data: roleData } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleData) {
    return json({ error: "Admin access required" }, 403);
  }
  return { userId: user.id };
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const aiKey = Deno.env.get("LOVABLE_API_KEY") || "";

  try {
    const body = await req.json();
    const { action, asset_id, contract_id, entity_type, entity_id } = body;

    // ── Strict admin guard on EVERY action ──
    const authResult = await requireAdmin(req, supabaseAdmin);
    if (authResult instanceof Response) return authResult;
    const adminUserId = authResult.userId;

    // ── COMPUTE ASSET HEALTH ──
    if (action === "compute_asset_health" && asset_id) {
      const [ticketsRes, metersRes, assetRes] = await Promise.all([
        supabaseAdmin.from("sps_support_tickets").select("*").eq("asset_id", asset_id).order("opened_at", { ascending: false }).limit(100),
        supabaseAdmin.from("sps_meter_readings").select("*").eq("asset_id", asset_id).order("submitted_at", { ascending: false }).limit(50),
        supabaseAdmin.from("sps_assets").select("*").eq("id", asset_id).maybeSingle(),
      ]);

      const scores = scoreAssetHealth(ticketsRes.data || [], metersRes.data || [], assetRes.data);
      const explanation = await generateAIExplanation(
        `Asset ${assetRes.data?.asset_code || asset_id} health: score=${scores.health_score}, status=${scores.health_status}, reasons: ${scores.top_reasons.join("; ")}. Trend: ${scores.trend_direction}. Action: ${scores.suggested_action}`,
        aiKey
      );

      await supabaseAdmin.from("sps_ai_asset_health_scores").insert({
        asset_id, health_score: scores.health_score, health_status: scores.health_status,
        support_burden_score: scores.support_burden_score, repeat_issue_score: scores.repeat_issue_score,
        meter_risk_score: scores.meter_risk_score, replacement_risk_score: scores.replacement_risk_score,
        trend_direction: scores.trend_direction, top_reasons: scores.top_reasons,
        suggested_action: scores.suggested_action, confidence: "high",
      });

      // Alert engine
      await evaluateAndCreateAlerts({ ...scores, asset_id, asset_code: assetRes.data?.asset_code }, supabaseAdmin);

      return json({ ...scores, explanation, fallback: false });
    }

    // ── PREDICTIVE MAINTENANCE ──
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

      await evaluateAndCreateAlerts({ ...prediction, asset_id }, supabaseAdmin);

      return json({ ...prediction, explanation, fallback: false });
    }

    // ── CONTRACT PROFITABILITY ──
    if (action === "compute_contract_profitability" && contract_id) {
      const [contractRes, billingRes, ticketsRes] = await Promise.all([
        supabaseAdmin.from("sps_contracts").select("*").eq("id", contract_id).maybeSingle(),
        supabaseAdmin.from("sps_billing_cycles").select("*").eq("contract_id", contract_id).order("billing_month", { ascending: false }).limit(24),
        supabaseAdmin.from("sps_support_tickets").select("*").eq("contract_id", contract_id).order("opened_at", { ascending: false }).limit(100),
      ]);

      let plan: any = null;
      let printerClass: string | undefined;
      let supportLevel: string | undefined;
      if (contractRes.data?.plan_id) {
        const { data } = await supabaseAdmin.from("sps_plans").select("*").eq("id", contractRes.data.plan_id).maybeSingle();
        plan = data;
        printerClass = data?.printer_class;
        supportLevel = data?.support_level;
      }

      const weights = resolveCostWeights(printerClass, supportLevel);
      const profitability = scoreContractProfitability(billingRes.data || [], ticketsRes.data || [], contractRes.data, plan, weights);

      const explanation = await generateAIExplanation(
        `Contract ${contract_id} profitability: revenue=${profitability.revenue_collected}, margin=${profitability.margin_estimate}, status=${profitability.profitability_status}, payback=${profitability.payback_progress}%. Cost weights: printer_class=${printerClass || "default"}, sla=${supportLevel || "default"}`,
        aiKey
      );

      await supabaseAdmin.from("sps_ai_contract_profitability").insert({
        contract_id, ...profitability,
      });

      await evaluateAndCreateAlerts({ ...profitability, contract_id }, supabaseAdmin);

      return json({ ...profitability, explanation, fallback: false });
    }

    // ── CONTRACT SIGNALS ──
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

      await supabaseAdmin.from("sps_ai_contract_signals").insert({ contract_id, ...signals });

      await evaluateAndCreateAlerts({ ...signals, contract_id }, supabaseAdmin);

      return json({ ...signals, explanation, fallback: false });
    }

    // ── COPILOT NOTE (structured output) ──
    if (action === "generate_copilot_note" && entity_type && entity_id) {
      let contextStr = "";
      if (entity_type === "contract") {
        const [contract, billing, tickets] = await Promise.all([
          supabaseAdmin.from("sps_contracts").select("*").eq("id", entity_id).maybeSingle(),
          supabaseAdmin.from("sps_billing_cycles").select("*").eq("contract_id", entity_id).limit(6),
          supabaseAdmin.from("sps_support_tickets").select("*").eq("contract_id", entity_id).limit(20),
        ]);
        const latestHealth = contract.data?.asset_id
          ? (await supabaseAdmin.from("sps_ai_asset_health_scores").select("health_score,health_status,trend_direction").eq("asset_id", contract.data.asset_id).order("score_date", { ascending: false }).limit(1)).data?.[0]
          : null;
        const latestProfit = (await supabaseAdmin.from("sps_ai_contract_profitability").select("profitability_status,margin_estimate,payback_progress").eq("contract_id", entity_id).order("snapshot_date", { ascending: false }).limit(1)).data?.[0];
        contextStr = `Contract: status=${contract.data?.contract_status}, plan_id=${contract.data?.plan_id}\nBilling cycles: ${billing.data?.length || 0}, paid=${billing.data?.filter((b: any) => b.billing_status === "paid").length || 0}\nTickets: ${tickets.data?.length || 0}, recent(90d)=${tickets.data?.filter((t: any) => new Date(t.opened_at || t.created_at) > new Date(Date.now() - 90 * 86400000)).length || 0}\nAsset health: ${latestHealth ? `score=${latestHealth.health_score}, status=${latestHealth.health_status}, trend=${latestHealth.trend_direction}` : "not scored"}\nProfitability: ${latestProfit ? `status=${latestProfit.profitability_status}, margin=${latestProfit.margin_estimate}, payback=${latestProfit.payback_progress}%` : "not scored"}`;
      } else if (entity_type === "asset") {
        const [asset, tickets, health] = await Promise.all([
          supabaseAdmin.from("sps_assets").select("asset_code,brand,model,printer_type,grade,status,serviceability_class").eq("id", entity_id).maybeSingle(),
          supabaseAdmin.from("sps_support_tickets").select("category,priority,status,opened_at").eq("asset_id", entity_id).order("opened_at", { ascending: false }).limit(20),
          supabaseAdmin.from("sps_ai_asset_health_scores").select("health_score,health_status,trend_direction,top_reasons,suggested_action").eq("asset_id", entity_id).order("score_date", { ascending: false }).limit(1),
        ]);
        contextStr = `Asset: code=${asset.data?.asset_code}, brand=${asset.data?.brand}, model=${asset.data?.model}, type=${asset.data?.printer_type}, grade=${asset.data?.grade}, status=${asset.data?.status}\nTickets: total=${tickets.data?.length || 0}\nHealth: ${health.data?.[0] ? `score=${health.data[0].health_score}, status=${health.data[0].health_status}, trend=${health.data[0].trend_direction}, reasons=${health.data[0].top_reasons?.join("; ")}` : "not scored"}`;
      } else if (entity_type === "customer") {
        const [contracts, tickets] = await Promise.all([
          supabaseAdmin.from("sps_contracts").select("id,contract_status,plan_id").eq("customer_id", entity_id).limit(10),
          supabaseAdmin.from("sps_support_tickets").select("category,priority,status").eq("customer_id", entity_id).order("opened_at", { ascending: false }).limit(30),
        ]);
        contextStr = `Customer SPS position: ${contracts.data?.length || 0} contracts (${contracts.data?.filter((c: any) => c.contract_status === "active").length || 0} active)\nTotal tickets: ${tickets.data?.length || 0}`;
      }

      const note = await generateStructuredCopilotNote(contextStr, aiKey);
      const isFallback = note.summary === "Unable to generate AI summary at this time.";

      await supabaseAdmin.from("sps_ai_admin_copilot_notes").insert({
        entity_type, entity_id, note_type: "summary",
        summary: note.summary, watchouts: note.watchouts,
        recommended_action: note.recommended_action,
        why_it_matters: note.why_it_matters,
        advisor_note_draft: note.advisor_note_draft,
      });

      return json({ ...note, fallback: isFallback });
    }

    // ── DISMISS ALERT ──
    if (action === "dismiss_alert" && entity_id) {
      await supabaseAdmin.from("sps_ai_alerts").update({
        status: "dismissed", dismissed_at: new Date().toISOString(), dismissed_by: adminUserId,
      }).eq("id", entity_id);
      return json({ success: true });
    }

    return json({ error: "Unknown action or missing parameters" }, 400);
  } catch (e: any) {
    return json({ error: e.message || "Internal error", fallback: true }, 500);
  }
});
