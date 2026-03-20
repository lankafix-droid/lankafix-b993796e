import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── VALIDATION ──

const VALID_USER_TYPES = ["home", "student", "family", "tuition", "home_office", "shop", "sme", "business", "institution"];
const VALID_MONO_COLOUR = ["mono", "colour", "either"];
const VALID_BUDGET = ["lowest_monthly", "balanced", "premium_reliability"];
const VALID_USAGE_INTENSITY = ["light", "moderate", "heavy"];
const VALID_SUPPORT_CATEGORIES = [
  "print_quality", "paper_jam", "consumable", "scanner", "network_wifi",
  "driver_software", "slow_printing", "noise", "general", "technician_visit", "replacement_review"
];
const VALID_URGENCY = ["low", "moderate", "high", "business_critical"];
const VALID_SUPPORT_MODES = ["self_help", "remote_troubleshooting", "technician_visit", "replacement_review"];
const VALID_METER_ACTIONS = ["auto_accept", "accept_with_note", "request_resubmission", "request_photo", "technician_verification", "admin_review"];

class ValidationError extends Error { constructor(msg: string) { super(msg); this.name = "ValidationError"; } }

function validateString(val: unknown, name: string, maxLen = 500): string {
  if (typeof val !== "string" || val.trim().length === 0) throw new ValidationError(`${name} is required`);
  if (val.length > maxLen) throw new ValidationError(`${name} exceeds max length ${maxLen}`);
  return val.trim();
}
function validateEnum(val: unknown, name: string, allowed: string[]): string {
  const s = validateString(val, name);
  if (!allowed.includes(s)) throw new ValidationError(`${name} must be one of: ${allowed.join(", ")}`);
  return s;
}
function validateInt(val: unknown, name: string, min = 0, max = 10000000): number {
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val);
  if (!Number.isInteger(n) || n < min || n > max) throw new ValidationError(`${name} must be integer ${min}-${max}`);
  return n;
}
function validateOptionalString(val: unknown, maxLen = 500): string | null {
  if (val == null || val === "") return null;
  if (typeof val !== "string") return null;
  return val.trim().slice(0, maxLen);
}
function validateBool(val: unknown, name: string): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  throw new ValidationError(`${name} must be boolean`);
}

// ── SUPABASE ──

type SC = ReturnType<typeof createClient>;
function getServiceClient(): SC {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// ── RATE LIMITING ──

async function checkRateLimit(sb: SC, id: string, endpoint: string, max = 10, windowSec = 60): Promise<boolean> {
  const { data } = await sb.rpc("check_rate_limit", { _identifier: id, _endpoint: endpoint, _max_requests: max, _window_seconds: windowSec });
  return data === true;
}

// ── AUTH ──

// Actions requiring authentication (write-path or user-specific)
const AUTH_REQUIRED_ACTIONS = ["support_triage", "meter_anomaly"];
// Actions that work without auth but benefit from it
const AUTH_OPTIONAL_ACTIONS = ["plan_insight", "advisor_chat"];

async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

// ── MAIN ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  let action = "unknown";
  let userId: string | null = null;

  try {
    const body = await req.json();
    action = validateString(body.action, "action", 50);
    const payload = body.payload;
    if (!payload || typeof payload !== "object") throw new ValidationError("payload is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const serviceClient = getServiceClient();

    // Auth enforcement
    userId = await extractUserId(req);
    if (AUTH_REQUIRED_ACTIONS.includes(action) && !userId) {
      return json({ error: "Authentication required for this action" }, 401);
    }

    // Rate limit
    const rateLimitId = userId || req.headers.get("x-forwarded-for") || "anon";
    const allowed = await checkRateLimit(serviceClient, rateLimitId, action, action === "advisor_chat" ? 15 : 10, 60);
    if (!allowed) return json({ error: "Rate limit exceeded. Please try again shortly." }, 429);

    // Dispatch
    let result: Record<string, unknown>;
    if (action === "plan_insight") result = await handlePlanInsight(payload, LOVABLE_API_KEY, serviceClient);
    else if (action === "support_triage") result = await handleSupportTriage(payload, LOVABLE_API_KEY, serviceClient, userId!);
    else if (action === "meter_anomaly") result = await handleMeterAnomaly(payload, LOVABLE_API_KEY, serviceClient);
    else if (action === "advisor_chat") result = await handleAdvisorChat(payload, LOVABLE_API_KEY, serviceClient);
    else return json({ error: "Unknown action" }, 400);

    // Log
    const latency = Date.now() - start;
    const hasError = "error" in result && !("fallback" in result && result.fallback);
    serviceClient.from("sps_ai_logs").insert({
      action, user_id: userId, latency_ms: latency,
      status: result.fallback ? "fallback" : hasError ? "error" : "ok",
      error_message: (result.error as string) || null,
      was_fallback: !!result.fallback,
      ai_model: "google/gemini-3-flash-preview",
    }).then(() => {});

    // Fallback responses still return 200 so frontend can render degraded output
    if (result.fallback) return json(result, 200);
    if (hasError) return json(result, (result.httpStatus as number) || 502);
    return json(result);

  } catch (e) {
    const latency = Date.now() - start;
    const isValidation = e instanceof ValidationError;
    console.error("sps-ai error:", e);
    try {
      getServiceClient().from("sps_ai_logs").insert({
        action, user_id: userId, latency_ms: latency,
        status: isValidation ? "validation_error" : "error",
        error_message: e instanceof Error ? e.message : "Unknown error",
      }).then(() => {});
    } catch { /* ignore */ }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, isValidation ? 400 : 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ── AI GATEWAY ──

async function callAI(messages: { role: string; content: string }[], apiKey: string, tools?: unknown[], toolChoice?: unknown): Promise<{ result?: unknown; error?: string; httpStatus?: number }> {
  const body: Record<string, unknown> = { model: "google/gemini-3-flash-preview", messages, temperature: 0.3 };
  if (tools) { body.tools = tools; body.tool_choice = toolChoice; }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const status = resp.status;
    if (status === 429) return { error: "Rate limited by AI gateway", httpStatus: 429 };
    if (status === 402) return { error: "AI credits exhausted", httpStatus: 402 };
    const t = await resp.text();
    console.error("AI gateway error:", status, t);
    return { error: "AI service unavailable", httpStatus: 502 };
  }

  const data = await resp.json();
  if (tools) {
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (call) {
      try { return { result: JSON.parse(call.function.arguments) }; } catch { /* fall through */ }
    }
  }
  return { result: data.choices?.[0]?.message?.content || "" };
}

// ── DB KNOWLEDGE FETCHERS ──

async function fetchPlansMetadata(sb: SC) {
  const { data } = await sb.from("sps_plans")
    .select("plan_code, plan_name, segment, best_for, printer_class, monthly_fee, included_pages, overage_rate, deposit_amount, support_level, min_term_months, pause_allowed, is_custom_quote, uptime_priority")
    .eq("is_active", true).order("sort_order");
  return data || [];
}

async function fetchKnowledgeArticles(sb: SC, category?: string) {
  let q = sb.from("sps_knowledge_articles").select("title, content, category").eq("is_active", true);
  if (category) q = q.eq("category", category);
  const { data } = await q.order("sort_order");
  return data || [];
}

function formatPlanForPrompt(pl: Record<string, unknown>) {
  return `- ${pl.plan_name} (${pl.plan_code}): Rs.${pl.monthly_fee}/mo, ${pl.included_pages}pp, overage Rs.${pl.overage_rate}/pg, deposit Rs.${pl.deposit_amount}, support: ${pl.support_level}, min ${pl.min_term_months}mo, pause: ${pl.pause_allowed}, custom: ${pl.is_custom_quote}`;
}

// ── PLAN INSIGHT ──

async function handlePlanInsight(payload: unknown, apiKey: string, sb: SC): Promise<Record<string, unknown>> {
  const p = payload as Record<string, unknown>;
  const inputs = p.inputs as Record<string, unknown>;
  if (!inputs) throw new ValidationError("inputs is required");

  const userType = validateEnum(inputs.userType, "userType", VALID_USER_TYPES);
  const monthlyPages = validateInt(inputs.monthlyPages, "monthlyPages", 1, 100000);
  const monoOrColour = validateEnum(inputs.monoOrColour, "monoOrColour", VALID_MONO_COLOUR);
  const budgetPreference = validateEnum(inputs.budgetPreference, "budgetPreference", VALID_BUDGET);
  const needsMultifunction = validateBool(inputs.needsMultifunction, "needsMultifunction");
  const seasonalUsage = validateBool(inputs.seasonalUsage, "seasonalUsage");
  const downtimeCritical = validateBool(inputs.downtimeCritical, "downtimeCritical");
  const usageIntensity = validateEnum(inputs.usageIntensity, "usageIntensity", VALID_USAGE_INTENSITY);
  const numUsers = validateInt(inputs.numUsers, "numUsers", 1, 500);

  const planCode = validateString((p.plan as Record<string, unknown>)?.plan_code, "plan.plan_code", 50);
  // Accept both numeric confidence (0-100) and semantic labels from frontend
  const CONFIDENCE_MAP: Record<string, number> = { recommended: 85, good_fit: 60, review_required: 30 };
  let confidence: number;
  if (typeof p.confidence === "number") {
    confidence = validateInt(p.confidence, "confidence", 0, 100);
  } else if (typeof p.confidence === "string" && p.confidence in CONFIDENCE_MAP) {
    confidence = CONFIDENCE_MAP[p.confidence];
  } else {
    throw new ValidationError("confidence must be a number (0-100) or one of: recommended, good_fit, review_required");
  }
  const reason = validateOptionalString(p.reason, 500);

  const plans = await fetchPlansMetadata(sb);
  const matchedPlan = plans.find((pl: Record<string, unknown>) => pl.plan_code === planCode);
  if (!matchedPlan) throw new ValidationError("Plan not found in active plans");

  const systemPrompt = `You are the LankaFix SPS Plan Advisor for Sri Lanka. Generate a structured insight using ONLY the plan metadata provided. Never fabricate pricing or promises. Output via the tool call.

Available plans (source of truth):
${plans.map(formatPlanForPrompt).join("\n")}`;

  const userPrompt = `Customer: ${userType}, ${monthlyPages} pages/mo, ${monoOrColour}, MFP:${needsMultifunction}, budget:${budgetPreference}, seasonal:${seasonalUsage}, critical:${downtimeCritical}, intensity:${usageIntensity}, users:${numUsers}
Recommended: ${formatPlanForPrompt(matchedPlan)}
Fit confidence: ${confidence}${reason ? `\nReason: ${reason}` : ""}`;

  const tools = [{
    type: "function", function: {
      name: "generate_plan_insight",
      parameters: {
        type: "object",
        properties: {
          why_fits: { type: "string" }, best_for_usage: { type: "string" },
          watchouts: { type: "string" }, upgrade_hint: { type: "string" },
          review_reason: { type: "string" }, savings_insight: { type: "string" },
          confidence_label: { type: "string", enum: ["strong", "moderate", "low"] },
        },
        required: ["why_fits", "best_for_usage", "watchouts", "confidence_label", "savings_insight"],
        additionalProperties: false,
      },
    },
  }];

  const res = await callAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    apiKey, tools, { type: "function", function: { name: "generate_plan_insight" } }
  );

  if (res.error) {
    // Fallback: return rule-based insight so frontend still renders
    return {
      insight: {
        why_fits: `${matchedPlan.plan_name} includes ${matchedPlan.included_pages} pages/mo at Rs.${matchedPlan.monthly_fee}, matching your stated volume.`,
        best_for_usage: `Designed for ${matchedPlan.best_for || matchedPlan.segment} users.`,
        watchouts: monthlyPages > (matchedPlan.included_pages as number) ? "Your expected pages exceed the plan limit — overage charges will apply." : "Stay within your page allowance to avoid overage.",
        confidence_label: confidence >= 70 ? "moderate" : "low",
        savings_insight: "SPS avoids the high upfront cost of purchasing a printer outright.",
        upgrade_hint: "", review_reason: "",
      },
      advisory_only: true, fallback: true,
    };
  }
  return { insight: res.result, advisory_only: true, fallback: false };
}

// ── SUPPORT TRIAGE (enriched context) ──

async function handleSupportTriage(payload: unknown, apiKey: string, sb: SC, userId: string): Promise<Record<string, unknown>> {
  const p = payload as Record<string, unknown>;
  const category = validateEnum(p.category, "category", VALID_SUPPORT_CATEGORIES);
  const description = validateString(p.description, "description", 2000);
  const assetType = validateOptionalString(p.assetType, 100);
  const planSupportLevel = validateOptionalString(p.planSupportLevel, 50);
  const contractId = validateOptionalString(p.contractId, 50);

  // Enrich: fetch structured context from DB
  let priorTicketCount = 0;
  let priorSameCategoryCount = 0;
  let assetTotalTickets = 0;
  let assetBrand = "";
  let assetModel = "";

  if (contractId) {
    // Get contract's asset info
    const { data: contract } = await sb.from("sps_contracts")
      .select("asset_id, plan_id, sps_assets(brand, model), sps_plans(support_level)")
      .eq("id", contractId).single();

    if (contract) {
      const asset = (contract as Record<string, unknown>).sps_assets as Record<string, unknown> | null;
      assetBrand = (asset?.brand as string) || "";
      assetModel = (asset?.model as string) || "";

      // Count prior tickets for this customer
      const { count: totalCount } = await sb.from("sps_support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", userId);
      priorTicketCount = totalCount || 0;

      // Count prior same-category tickets
      const { count: catCount } = await sb.from("sps_support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", userId).eq("category", category);
      priorSameCategoryCount = catCount || 0;

      // Count total tickets for this asset
      if ((contract as Record<string, unknown>).asset_id) {
        const { count: assetCount } = await sb.from("sps_support_tickets")
          .select("id", { count: "exact", head: true })
          .eq("asset_id", (contract as Record<string, unknown>).asset_id as string);
        assetTotalTickets = assetCount || 0;
      }
    }
  }

  const repeatSignal = priorSameCategoryCount >= 2 ? "REPEAT ISSUE (same category raised before)" : priorSameCategoryCount === 1 ? "Previously raised once" : "First time";
  const assetRisk = assetTotalTickets >= 5 ? "HIGH-TICKET ASSET (5+ total tickets)" : assetTotalTickets >= 3 ? "Moderate ticket history" : "Low ticket history";

  const systemPrompt = `You are LankaFix SPS Support Triage AI. Analyze the ticket with the enriched context provided. Be practical. Never auto-close tickets. Factor in repeat-issue signals and asset risk when assessing urgency and replacement risk. Output via tool call.`;

  const userPrompt = `Ticket: category=${category}, description="${description}"
Asset: ${assetBrand} ${assetModel} (${assetType || "unknown"})
Support level: ${planSupportLevel || "standard"}
History: ${priorTicketCount} prior tickets, ${repeatSignal}, asset: ${assetRisk}
Triage this.`;

  const tools = [{
    type: "function", function: {
      name: "triage_ticket",
      parameters: {
        type: "object",
        properties: {
          probable_issue: { type: "string" },
          confidence: { type: "integer" },
          urgency: { type: "string", enum: VALID_URGENCY },
          recommended_action: { type: "string" },
          support_mode: { type: "string", enum: VALID_SUPPORT_MODES },
          self_help_tips: { type: "array", items: { type: "string" } },
          repeat_risk: { type: "boolean" },
          replacement_risk: { type: "boolean" },
        },
        required: ["probable_issue", "confidence", "urgency", "recommended_action", "support_mode"],
        additionalProperties: false,
      },
    },
  }];

  const res = await callAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    apiKey, tools, { type: "function", function: { name: "triage_ticket" } }
  );

  if (res.error) {
    // Fallback: rules-based triage
    const isRepeat = priorSameCategoryCount >= 2;
    const isHighAsset = assetTotalTickets >= 5;
    return {
      triage: {
        probable_issue: category.replace(/_/g, " "),
        confidence: 30,
        urgency: isRepeat || isHighAsset ? "high" : "moderate",
        recommended_action: isRepeat ? "Escalate to technician — recurring issue" : "Standard troubleshooting",
        support_mode: isRepeat ? "technician_visit" : "remote_troubleshooting",
        self_help_tips: [],
        repeat_risk: isRepeat,
        replacement_risk: isHighAsset,
      },
      advisory_only: true, fallback: true,
      context: { prior_tickets: priorTicketCount, same_category: priorSameCategoryCount, asset_tickets: assetTotalTickets },
    };
  }
  return {
    triage: res.result, advisory_only: true, fallback: false,
    context: { prior_tickets: priorTicketCount, same_category: priorSameCategoryCount, asset_tickets: assetTotalTickets },
  };
}

// ── METER ANOMALY ──

async function handleMeterAnomaly(payload: unknown, apiKey: string, _sb: SC): Promise<Record<string, unknown>> {
  const p = payload as Record<string, unknown>;
  const currentReading = validateInt(p.currentReading, "currentReading", 0, 99999999);
  const previousReading = validateInt(p.previousReading, "previousReading", 0, 99999999);
  const daysSinceLast = validateInt(p.daysSinceLast, "daysSinceLast", 0, 3650);
  const includedPages = validateInt(p.includedPages, "includedPages", 0, 100000);
  const historicalAvgDaily = typeof p.historicalAvgDaily === "number" ? Math.max(0, p.historicalAvgDaily) : null;
  const hasPhoto = p.hasPhoto === true;
  const ocrExtractedValue = typeof p.ocrExtractedValue === "number" ? p.ocrExtractedValue : null;

  const anomaly = detectMeterAnomaly(currentReading, previousReading, daysSinceLast, includedPages, historicalAvgDaily, hasPhoto, ocrExtractedValue);

  if (anomaly.score < 30) {
    return { anomaly: { ...anomaly, explanation: "Reading appears normal.", suggested_action: "auto_accept" }, advisory_only: true };
  }

  const systemPrompt = `You are LankaFix SPS Meter Review AI. Analyze meter reading anomalies. Use respectful, non-accusatory language. Output via tool call.`;
  const userPrompt = `Current: ${currentReading}, Previous: ${previousReading}, Pages: ${currentReading - previousReading}, Days: ${daysSinceLast}, Daily: ${((currentReading - previousReading) / Math.max(daysSinceLast, 1)).toFixed(1)}, Hist avg: ${historicalAvgDaily?.toFixed(1) || "unknown"}, Included: ${includedPages}, Photo: ${hasPhoto}, Score: ${anomaly.score}, Type: ${anomaly.type}${ocrExtractedValue != null ? `, OCR: ${ocrExtractedValue}` : ""}`;

  const tools = [{
    type: "function", function: {
      name: "analyze_meter",
      parameters: {
        type: "object",
        properties: {
          explanation: { type: "string" },
          suggested_action: { type: "string", enum: VALID_METER_ACTIONS },
          customer_message: { type: "string" },
        },
        required: ["explanation", "suggested_action", "customer_message"],
        additionalProperties: false,
      },
    },
  }];

  const res = await callAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    apiKey, tools, { type: "function", function: { name: "analyze_meter" } }
  );

  if (res.error) {
    // Fallback: rules-only response
    return {
      anomaly: {
        ...anomaly,
        explanation: `Anomaly detected: ${anomaly.type.replace(/_/g, " ")}`,
        suggested_action: anomaly.score >= 70 ? "admin_review" : "request_resubmission",
        customer_message: "Your meter reading requires manual review. A LankaFix advisor may contact you.",
      },
      advisory_only: true, fallback: true,
    };
  }
  return { anomaly: { ...anomaly, ...(res.result as Record<string, unknown>) }, advisory_only: true, fallback: false };
}

function detectMeterAnomaly(current: number, previous: number, days: number, included: number, histAvgDaily: number | null, hasPhoto: boolean, ocrValue: number | null) {
  let score = 0;
  let type = "normal";
  const pagesPrinted = current - previous;
  const dailyRate = days > 0 ? pagesPrinted / days : pagesPrinted;

  if (pagesPrinted <= 0) return { score: 90, type: "negative_or_zero_growth" };

  const expectedDaily = histAvgDaily || (included / 30);
  if (dailyRate > expectedDaily * 3 && pagesPrinted > 100) { score += 50; type = "usage_spike"; }
  else if (dailyRate > expectedDaily * 2 && pagesPrinted > 50) { score += 25; type = "moderate_spike"; }

  if (pagesPrinted > included * 1.5 && days <= 35) { score += 20; type = score > 50 ? type : "overage_spike"; }
  if (dailyRate < expectedDaily * 0.1 && days > 14) { score += 15; type = score > 30 ? type : "suspiciously_low"; }
  if (!hasPhoto && score >= 30) score += 15;

  if (ocrValue != null && Math.abs(ocrValue - current) > 10) { score += 30; type = score > 50 ? "ocr_mismatch" : type; }

  return { score: Math.min(100, score), type };
}

// ── ADVISOR CHAT (full DB-driven knowledge) ──

async function handleAdvisorChat(payload: unknown, apiKey: string, sb: SC): Promise<Record<string, unknown>> {
  const p = payload as Record<string, unknown>;
  const question = validateString(p.question, "question", 1000);
  const pageContext = validateOptionalString(p.pageContext, 100);

  const [plans, articles] = await Promise.all([
    fetchPlansMetadata(sb),
    fetchKnowledgeArticles(sb),
  ]);

  const planKnowledge = plans.map(formatPlanForPrompt).join("\n");
  const faqKnowledge = articles.map((a: Record<string, unknown>) => `Q: ${a.title}\nA: ${a.content}`).join("\n\n");

  const systemPrompt = `You are the LankaFix SPS Help Assistant for Sri Lanka. Answer ONLY from the plan data and FAQ knowledge provided below. Never fabricate pricing, terms, or promises not in the source data.

PLAN DATA (source of truth):
${planKnowledge}

FAQ & POLICY KNOWLEDGE (source of truth):
${faqKnowledge}

RULES:
- If uncertain, say "A LankaFix advisor should confirm this for you."
- Keep answers brief, friendly, and Sri Lanka–relevant.
- Never invent plan names, prices, or terms not listed above.
- For deposit, refund, pause, upgrade, meter, support questions — use the FAQ answers above verbatim where possible.`;

  const res = await callAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: `Page: ${pageContext || "general"}\nQuestion: ${question}` }],
    apiKey
  );

  if (res.error) {
    // Fallback: try to match a knowledge article directly
    const lowerQ = question.toLowerCase();
    const match = articles.find((a: Record<string, unknown>) =>
      lowerQ.includes((a.title as string).toLowerCase().split(" ").slice(0, 3).join(" "))
    );
    return {
      answer: match
        ? `${(match as Record<string, unknown>).content} A LankaFix advisor should confirm specific details for your situation.`
        : "I'm unable to process your question right now. Please contact a LankaFix advisor for assistance.",
      confidence: match ? 50 : 20,
      escalate: true,
      advisory_only: true,
      fallback: true,
    };
  }

  const answer = res.result as string;
  const lowConfidence = answer.includes("advisor should confirm") || answer.includes("not sure") || answer.includes("cannot confirm");

  return { answer, confidence: lowConfidence ? 40 : 80, escalate: lowConfidence, advisory_only: true };
}
