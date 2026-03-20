import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── VALIDATION SCHEMAS ──

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

function validateString(val: unknown, name: string, maxLen = 500): string {
  if (typeof val !== "string" || val.trim().length === 0) throw new Error(`${name} is required`);
  if (val.length > maxLen) throw new Error(`${name} exceeds max length ${maxLen}`);
  return val.trim();
}

function validateEnum(val: unknown, name: string, allowed: string[]): string {
  const s = validateString(val, name);
  if (!allowed.includes(s)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  return s;
}

function validateInt(val: unknown, name: string, min = 0, max = 10000000): number {
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be integer ${min}-${max}`);
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
  throw new Error(`${name} must be boolean`);
}

// ── SUPABASE CLIENT ──

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

// ── RATE LIMITING ──

async function checkRateLimit(supabase: ReturnType<typeof getServiceClient>, identifier: string, endpoint: string, maxReq = 10, windowSec = 60): Promise<boolean> {
  const { data } = await supabase.rpc("check_rate_limit", {
    _identifier: identifier,
    _endpoint: endpoint,
    _max_requests: maxReq,
    _window_seconds: windowSec,
  });
  return data === true;
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
    if (!payload || typeof payload !== "object") throw new Error("payload is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const serviceClient = getServiceClient();

    // Auth: extract user if present (optional for some actions, required for others)
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = getUserClient(authHeader);
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = claims?.claims?.sub as string || null;
    }

    // Rate limit by userId or IP
    const rateLimitId = userId || req.headers.get("x-forwarded-for") || "anon";
    const allowed = await checkRateLimit(serviceClient, rateLimitId, action, action === "advisor_chat" ? 15 : 10, 60);
    if (!allowed) return json({ error: "Rate limit exceeded. Please try again shortly." }, 429);

    let result: unknown;
    let wasFallback = false;
    let errorMsg: string | null = null;

    try {
      if (action === "plan_insight") result = await handlePlanInsight(payload, LOVABLE_API_KEY, serviceClient);
      else if (action === "support_triage") result = await handleSupportTriage(payload, LOVABLE_API_KEY, serviceClient);
      else if (action === "meter_anomaly") result = await handleMeterAnomaly(payload, LOVABLE_API_KEY, serviceClient);
      else if (action === "advisor_chat") result = await handleAdvisorChat(payload, LOVABLE_API_KEY, serviceClient);
      else return json({ error: "Unknown action" }, 400);
    } catch (aiErr) {
      errorMsg = aiErr instanceof Error ? aiErr.message : "AI processing error";
      wasFallback = true;
      result = { error: errorMsg, fallback: true };
    }

    // Log observability
    const latency = Date.now() - start;
    await serviceClient.from("sps_ai_logs").insert({
      action,
      user_id: userId,
      latency_ms: latency,
      status: errorMsg ? "error" : "ok",
      error_message: errorMsg,
      was_fallback: wasFallback,
      ai_model: "google/gemini-3-flash-preview",
    }).then(() => {});

    if (wasFallback) return json(result, 500);
    return json(result);
  } catch (e) {
    const latency = Date.now() - start;
    console.error("sps-ai error:", e);
    // Best-effort log
    try {
      const sc = getServiceClient();
      await sc.from("sps_ai_logs").insert({
        action,
        user_id: userId,
        latency_ms: latency,
        status: "error",
        error_message: e instanceof Error ? e.message : "Unknown error",
      });
    } catch { /* ignore logging failure */ }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 400);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── AI GATEWAY ──

async function callAI(messages: { role: string; content: string }[], apiKey: string, tools?: unknown[], toolChoice?: unknown) {
  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
    temperature: 0.3,
  };
  if (tools) { body.tools = tools; body.tool_choice = toolChoice; }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const status = resp.status;
    if (status === 429) return { error: "Rate limited, please try again shortly.", status: 429 };
    if (status === 402) return { error: "AI credits exhausted.", status: 402 };
    const t = await resp.text();
    console.error("AI gateway error:", status, t);
    return { error: "AI service unavailable", status: 500 };
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

// ── FETCH PLAN METADATA FROM DB (source of truth) ──

async function fetchPlansMetadata(supabase: ReturnType<typeof getServiceClient>) {
  const { data } = await supabase
    .from("sps_plans")
    .select("plan_code, plan_name, segment, best_for, printer_class, monthly_fee, included_pages, overage_rate, deposit_amount, support_level, min_term_months, pause_allowed, is_custom_quote, uptime_priority")
    .eq("is_active", true)
    .order("sort_order");
  return data || [];
}

async function fetchKnowledgeArticles(supabase: ReturnType<typeof getServiceClient>, category?: string) {
  let q = supabase.from("sps_knowledge_articles").select("title, content, category").eq("is_active", true);
  if (category) q = q.eq("category", category);
  const { data } = await q.order("sort_order");
  return data || [];
}

// ── PLAN INSIGHT (DB-driven) ──

async function handlePlanInsight(payload: unknown, apiKey: string, supabase: ReturnType<typeof getServiceClient>) {
  const p = payload as Record<string, unknown>;
  const inputs = p.inputs as Record<string, unknown>;
  if (!inputs) throw new Error("inputs is required");

  // Validate inputs
  const userType = validateEnum(inputs.userType, "userType", VALID_USER_TYPES);
  const monthlyPages = validateInt(inputs.monthlyPages, "monthlyPages", 1, 100000);
  const monoOrColour = validateEnum(inputs.monoOrColour, "monoOrColour", VALID_MONO_COLOUR);
  const budgetPreference = validateEnum(inputs.budgetPreference, "budgetPreference", VALID_BUDGET);
  const needsMultifunction = validateBool(inputs.needsMultifunction, "needsMultifunction");
  const seasonalUsage = validateBool(inputs.seasonalUsage, "seasonalUsage");
  const downtimeCritical = validateBool(inputs.downtimeCritical, "downtimeCritical");
  const usageIntensity = validateEnum(inputs.usageIntensity, "usageIntensity", VALID_USAGE_INTENSITY);
  const numUsers = validateInt(inputs.numUsers, "numUsers", 1, 500);

  // Validate plan reference
  const planCode = validateString((p.plan as Record<string, unknown>)?.plan_code, "plan.plan_code", 50);
  const confidence = validateInt(p.confidence, "confidence", 0, 100);
  const reason = validateOptionalString(p.reason, 500);

  // Fetch real plan data from DB
  const plans = await fetchPlansMetadata(supabase);
  const matchedPlan = plans.find((pl: Record<string, unknown>) => pl.plan_code === planCode);
  if (!matchedPlan) throw new Error("Plan not found in active plans");

  const planSummary = `${matchedPlan.plan_name} (${matchedPlan.plan_code}): Rs.${matchedPlan.monthly_fee}/mo, ${matchedPlan.included_pages} pages, overage Rs.${matchedPlan.overage_rate}/pg, deposit Rs.${matchedPlan.deposit_amount}, support: ${matchedPlan.support_level}, min ${matchedPlan.min_term_months}mo, pause: ${matchedPlan.pause_allowed}, custom: ${matchedPlan.is_custom_quote}`;

  const systemPrompt = `You are the LankaFix SPS Plan Advisor for Sri Lanka. Given a customer's inputs and the recommended plan metadata below, generate a structured insight. Be helpful, honest, and locally relevant. Never fabricate pricing or promises. All commercial facts come from the plan metadata provided. Output via the tool call.

Available plans (source of truth):
${plans.map((pl: Record<string, unknown>) => `- ${pl.plan_name}: Rs.${pl.monthly_fee}/mo, ${pl.included_pages}pp, ${pl.support_level} support, pause:${pl.pause_allowed}`).join("\n")}`;

  const userPrompt = `Customer: ${userType}, ${monthlyPages} pages/mo, ${monoOrColour}, MFP:${needsMultifunction}, budget:${budgetPreference}, seasonal:${seasonalUsage}, critical:${downtimeCritical}, intensity:${usageIntensity}, users:${numUsers}

Recommended: ${planSummary}
Fit confidence: ${confidence}
${reason ? `Reason: ${reason}` : ""}

Generate insight using ONLY the plan metadata above.`;

  const tools = [{
    type: "function",
    function: {
      name: "generate_plan_insight",
      description: "Generate structured plan insight",
      parameters: {
        type: "object",
        properties: {
          why_fits: { type: "string", description: "1-2 sentences on why this plan fits" },
          best_for_usage: { type: "string", description: "1 sentence on usage pattern match" },
          watchouts: { type: "string", description: "1-2 practical watch-outs" },
          upgrade_hint: { type: "string", description: "Upgrade note if relevant, empty if not" },
          review_reason: { type: "string", description: "If LankaFix review recommended, why. Empty if not." },
          savings_insight: { type: "string", description: "Brief note on upfront savings vs buying" },
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

  if (res.error) return { error: res.error, status: res.status };
  return { insight: res.result, advisory_only: true };
}

// ── SUPPORT TRIAGE (validated) ──

async function handleSupportTriage(payload: unknown, apiKey: string, supabase: ReturnType<typeof getServiceClient>) {
  const p = payload as Record<string, unknown>;
  const category = validateEnum(p.category, "category", VALID_SUPPORT_CATEGORIES);
  const description = validateString(p.description, "description", 2000);
  const assetType = validateOptionalString(p.assetType, 100);
  const planSupportLevel = validateOptionalString(p.planSupportLevel, 50);
  const previousTickets = typeof p.previousTickets === "number" ? Math.min(Math.max(0, Math.floor(p.previousTickets)), 999) : 0;

  const systemPrompt = `You are LankaFix SPS Support Triage AI. Analyze the support ticket and recommend triage actions. Be practical and helpful. Never auto-close tickets. Output via tool call.`;

  const userPrompt = `Ticket: category=${category}, description="${description}", asset=${assetType || "unknown"}, support_level=${planSupportLevel || "standard"}, prev_tickets=${previousTickets}. Triage this.`;

  const tools = [{
    type: "function",
    function: {
      name: "triage_ticket",
      description: "Triage an SPS support ticket",
      parameters: {
        type: "object",
        properties: {
          probable_issue: { type: "string", description: "Most likely issue type" },
          confidence: { type: "integer", description: "0-100" },
          urgency: { type: "string", enum: VALID_URGENCY },
          recommended_action: { type: "string", description: "First recommended action" },
          support_mode: { type: "string", enum: VALID_SUPPORT_MODES },
          self_help_tips: { type: "array", items: { type: "string" }, description: "Self-help suggestions" },
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

  if (res.error) return { error: res.error, status: res.status };
  return { triage: res.result, advisory_only: true };
}

// ── METER ANOMALY (validated, OCR-ready) ──

async function handleMeterAnomaly(payload: unknown, apiKey: string, _supabase: ReturnType<typeof getServiceClient>) {
  const p = payload as Record<string, unknown>;
  const currentReading = validateInt(p.currentReading, "currentReading", 0, 99999999);
  const previousReading = validateInt(p.previousReading, "previousReading", 0, 99999999);
  const daysSinceLast = validateInt(p.daysSinceLast, "daysSinceLast", 0, 3650);
  const includedPages = validateInt(p.includedPages, "includedPages", 0, 100000);
  const historicalAvgDaily = typeof p.historicalAvgDaily === "number" ? Math.max(0, p.historicalAvgDaily) : null;
  const hasPhoto = p.hasPhoto === true;
  // OCR placeholder fields
  const ocrExtractedValue = typeof p.ocrExtractedValue === "number" ? p.ocrExtractedValue : null;

  const anomaly = detectMeterAnomaly(currentReading, previousReading, daysSinceLast, includedPages, historicalAvgDaily, hasPhoto, ocrExtractedValue);

  if (anomaly.score < 30) {
    return { anomaly: { ...anomaly, explanation: "Reading appears normal.", suggested_action: "auto_accept" }, advisory_only: true };
  }

  const systemPrompt = `You are LankaFix SPS Meter Review AI. Analyze meter reading anomalies. Use respectful, non-accusatory language. Output via tool call.`;
  const userPrompt = `Current: ${currentReading}, Previous verified: ${previousReading}, Pages: ${currentReading - previousReading}, Days: ${daysSinceLast}, Daily avg: ${((currentReading - previousReading) / Math.max(daysSinceLast, 1)).toFixed(1)}, Hist avg: ${historicalAvgDaily?.toFixed(1) || "unknown"}, Included: ${includedPages}, Photo: ${hasPhoto}, Score: ${anomaly.score}, Type: ${anomaly.type}${ocrExtractedValue != null ? `, OCR value: ${ocrExtractedValue}` : ""}. Explain and suggest action.`;

  const tools = [{
    type: "function",
    function: {
      name: "analyze_meter",
      description: "Analyze meter reading anomaly",
      parameters: {
        type: "object",
        properties: {
          explanation: { type: "string", description: "Brief, respectful explanation" },
          suggested_action: { type: "string", enum: VALID_METER_ACTIONS },
          customer_message: { type: "string", description: "Friendly message to customer" },
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
    return { anomaly: { ...anomaly, explanation: anomaly.type, suggested_action: "admin_review" }, advisory_only: true };
  }
  return { anomaly: { ...anomaly, ...(res.result as Record<string, unknown>) }, advisory_only: true };
}

function detectMeterAnomaly(current: number, previous: number, days: number, included: number, histAvgDaily: number | null, hasPhoto: boolean, ocrValue: number | null) {
  let score = 0;
  let type = "normal";
  const pagesPrinted = current - previous;
  const dailyRate = days > 0 ? pagesPrinted / days : pagesPrinted;

  if (pagesPrinted <= 0) { score = 90; type = "negative_or_zero_growth"; return { score, type }; }

  const expectedDaily = histAvgDaily || (included / 30);
  if (dailyRate > expectedDaily * 3 && pagesPrinted > 100) { score += 50; type = "usage_spike"; }
  else if (dailyRate > expectedDaily * 2 && pagesPrinted > 50) { score += 25; type = "moderate_spike"; }

  if (pagesPrinted > included * 1.5 && days <= 35) { score += 20; type = score > 50 ? type : "overage_spike"; }
  if (dailyRate < expectedDaily * 0.1 && days > 14) { score += 15; type = score > 30 ? type : "suspiciously_low"; }
  if (!hasPhoto && score >= 30) { score += 15; }

  // OCR mismatch detection (future-ready)
  if (ocrValue != null && Math.abs(ocrValue - current) > 10) {
    score += 30;
    type = score > 50 ? "ocr_mismatch" : type;
  }

  return { score: Math.min(100, score), type };
}

// ── ADVISOR CHAT (DB-driven knowledge) ──

async function handleAdvisorChat(payload: unknown, apiKey: string, supabase: ReturnType<typeof getServiceClient>) {
  const p = payload as Record<string, unknown>;
  const question = validateString(p.question, "question", 1000);
  const pageContext = validateOptionalString(p.pageContext, 100);

  // Fetch knowledge from DB
  const [plans, articles] = await Promise.all([
    fetchPlansMetadata(supabase),
    fetchKnowledgeArticles(supabase),
  ]);

  const planKnowledge = plans.map((pl: Record<string, unknown>) =>
    `- ${pl.plan_name} (${pl.plan_code}): Rs.${pl.monthly_fee}/mo, ${pl.included_pages}pp, overage Rs.${pl.overage_rate}/pg, deposit Rs.${pl.deposit_amount}, support: ${pl.support_level}, min ${pl.min_term_months}mo, pause: ${pl.pause_allowed}, custom: ${pl.is_custom_quote}`
  ).join("\n");

  const faqKnowledge = articles.map((a: Record<string, unknown>) =>
    `Q: ${a.title}\nA: ${a.content}`
  ).join("\n\n");

  const systemPrompt = `You are the LankaFix SPS Help Assistant for Sri Lanka. Answer ONLY from the plan data and FAQ knowledge provided below. Never fabricate pricing, terms, or promises not in the source data.

PLAN DATA (source of truth):
${planKnowledge}

FAQ KNOWLEDGE (source of truth):
${faqKnowledge}

RULES:
- If uncertain, say "A LankaFix advisor should confirm this for you."
- Keep answers brief, friendly, and Sri Lanka–relevant.
- Never invent plan names, prices, or terms not listed above.`;

  const res = await callAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: `Page: ${pageContext || "general"}\nQuestion: ${question}` }],
    apiKey
  );

  if (res.error) return { error: res.error, status: res.status };

  const answer = res.result as string;
  const lowConfidence = answer.includes("advisor should confirm") || answer.includes("not sure") || answer.includes("cannot confirm");

  return {
    answer,
    confidence: lowConfidence ? 40 : 80,
    escalate: lowConfidence,
    advisory_only: true,
  };
}
