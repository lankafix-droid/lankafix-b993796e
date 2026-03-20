import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (action === "plan_insight") return handlePlanInsight(payload, LOVABLE_API_KEY);
    if (action === "support_triage") return handleSupportTriage(payload, LOVABLE_API_KEY);
    if (action === "meter_anomaly") return handleMeterAnomaly(payload, LOVABLE_API_KEY);
    if (action === "advisor_chat") return handleAdvisorChat(payload, LOVABLE_API_KEY);

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("sps-ai error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(messages: { role: string; content: string }[], apiKey: string, tools?: any[], toolChoice?: any) {
  const body: any = {
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

// ── PLAN INSIGHT ──
async function handlePlanInsight(payload: any, apiKey: string) {
  const { plan, inputs, confidence, reason } = payload;

  const systemPrompt = `You are the LankaFix SPS Plan Advisor for Sri Lanka. Given a customer's inputs and the recommended plan, generate a structured insight. Be helpful, honest, and locally relevant. Never fabricate pricing or promises. Output via the tool call.`;

  const userPrompt = `Customer profile:
- User type: ${inputs.userType}
- Monthly pages: ${inputs.monthlyPages}
- Mono/Colour: ${inputs.monoOrColour}
- Needs multifunction: ${inputs.needsMultifunction}
- Budget preference: ${inputs.budgetPreference}
- Seasonal usage: ${inputs.seasonalUsage}
- Downtime critical: ${inputs.downtimeCritical}
- Usage intensity: ${inputs.usageIntensity}
- Number of users: ${inputs.numUsers}

Recommended plan: ${plan.plan_name} (${plan.plan_code})
- Monthly fee: Rs. ${plan.monthly_fee}
- Included pages: ${plan.included_pages}
- Overage rate: Rs. ${plan.overage_rate}/page
- Printer class: ${plan.printer_class}
- Support level: ${plan.support_level}
- Pause allowed: ${plan.pause_allowed}
- Min term: ${plan.min_term_months} months
- Deposit: Rs. ${plan.deposit_amount}
- Custom quote: ${plan.is_custom_quote}

Fit confidence: ${confidence}
Reason: ${reason}

Generate a plan insight for this Sri Lankan customer.`;

  const tools = [{
    type: "function",
    function: {
      name: "generate_plan_insight",
      description: "Generate structured plan insight for customer",
      parameters: {
        type: "object",
        properties: {
          why_fits: { type: "string", description: "1-2 sentences on why this plan fits" },
          best_for_usage: { type: "string", description: "1 sentence on usage pattern match" },
          watchouts: { type: "string", description: "1-2 practical watch-outs or things to note" },
          upgrade_hint: { type: "string", description: "If relevant, note about upgrading. Empty if not applicable." },
          review_reason: { type: "string", description: "If LankaFix review recommended, explain why. Empty if not." },
          savings_insight: { type: "string", description: "Brief note on upfront savings vs buying outright" },
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

  if (res.error) return json({ error: res.error }, res.status);
  return json({ insight: res.result, advisory_only: true });
}

// ── SUPPORT TRIAGE ──
async function handleSupportTriage(payload: any, apiKey: string) {
  const { category, description, assetType, planSupportLevel, previousTickets } = payload;

  const systemPrompt = `You are LankaFix SPS Support Triage AI. Analyze the support ticket and recommend triage actions. Be practical and helpful. Never auto-close tickets. Output via tool call.`;

  const userPrompt = `Support ticket:
- Category: ${category}
- Description: ${description}
- Asset type: ${assetType || "unknown"}
- Plan support level: ${planSupportLevel || "standard"}
- Previous tickets count: ${previousTickets || 0}

Triage this support request.`;

  const tools = [{
    type: "function",
    function: {
      name: "triage_ticket",
      description: "Triage an SPS support ticket",
      parameters: {
        type: "object",
        properties: {
          probable_issue: { type: "string", description: "Most likely issue type" },
          confidence: { type: "integer", description: "Triage confidence 0-100" },
          urgency: { type: "string", enum: ["low", "moderate", "high", "business_critical"] },
          recommended_action: { type: "string", description: "First recommended action" },
          support_mode: { type: "string", enum: ["self_help", "remote_troubleshooting", "technician_visit", "replacement_review"] },
          self_help_tips: { type: "array", items: { type: "string" }, description: "Self-help suggestions if applicable" },
          repeat_risk: { type: "boolean", description: "Whether this looks like a recurring issue" },
          replacement_risk: { type: "boolean", description: "Whether replacement may be needed" },
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

  if (res.error) return json({ error: res.error }, res.status);
  return json({ triage: res.result, advisory_only: true });
}

// ── METER ANOMALY ──
async function handleMeterAnomaly(payload: any, apiKey: string) {
  const { currentReading, previousReading, daysSinceLast, includedPages, historicalAvgDaily, hasPhoto } = payload;

  // Rules-based anomaly detection first
  const anomaly = detectMeterAnomaly(currentReading, previousReading, daysSinceLast, includedPages, historicalAvgDaily, hasPhoto);

  if (anomaly.score < 30) {
    return json({ anomaly: { ...anomaly, explanation: "Reading appears normal.", suggested_action: "auto_accept" }, advisory_only: true });
  }

  // For suspicious readings, get AI explanation
  const systemPrompt = `You are LankaFix SPS Meter Review AI. Analyze meter reading anomalies. Use respectful, non-accusatory language. Output via tool call.`;
  const userPrompt = `Meter reading analysis:
- Current reading: ${currentReading}
- Previous verified: ${previousReading}
- Pages printed: ${currentReading - previousReading}
- Days since last: ${daysSinceLast}
- Daily average this period: ${((currentReading - previousReading) / Math.max(daysSinceLast, 1)).toFixed(1)}
- Historical avg daily: ${historicalAvgDaily?.toFixed(1) || "unknown"}
- Plan included pages: ${includedPages}
- Photo attached: ${hasPhoto}
- Rules anomaly score: ${anomaly.score}
- Rules anomaly type: ${anomaly.type}

Explain the anomaly and suggest action.`;

  const tools = [{
    type: "function",
    function: {
      name: "analyze_meter",
      description: "Analyze meter reading anomaly",
      parameters: {
        type: "object",
        properties: {
          explanation: { type: "string", description: "Brief, respectful explanation of the anomaly" },
          suggested_action: { type: "string", enum: ["accept_with_note", "request_resubmission", "request_photo", "technician_verification", "admin_review"] },
          customer_message: { type: "string", description: "Message to show customer (friendly, non-accusatory)" },
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
    return json({ anomaly: { ...anomaly, explanation: anomaly.type, suggested_action: "admin_review" }, advisory_only: true });
  }

  return json({ anomaly: { ...anomaly, ...(res.result as any) }, advisory_only: true });
}

function detectMeterAnomaly(current: number, previous: number, days: number, included: number, histAvgDaily: number | null, hasPhoto: boolean) {
  let score = 0;
  let type = "normal";
  const pagesPrinted = current - previous;
  const dailyRate = days > 0 ? pagesPrinted / days : pagesPrinted;

  // Negative or zero growth
  if (pagesPrinted <= 0) { score = 90; type = "negative_or_zero_growth"; return { score, type }; }

  // Massive spike (>3x expected)
  const expectedDaily = histAvgDaily || (included / 30);
  if (dailyRate > expectedDaily * 3 && pagesPrinted > 100) { score += 50; type = "usage_spike"; }
  else if (dailyRate > expectedDaily * 2 && pagesPrinted > 50) { score += 25; type = "moderate_spike"; }

  // Way over plan limit
  if (pagesPrinted > included * 1.5 && days <= 35) { score += 20; type = score > 50 ? type : "overage_spike"; }

  // Suspiciously low
  if (dailyRate < expectedDaily * 0.1 && days > 14) { score += 15; type = score > 30 ? type : "suspiciously_low"; }

  // No photo for high-anomaly
  if (!hasPhoto && score >= 30) { score += 15; }

  return { score: Math.min(100, score), type };
}

// ── ADVISOR CHAT ──
async function handleAdvisorChat(payload: any, apiKey: string) {
  const { question, pageContext } = payload;

  const systemPrompt = `You are the LankaFix SPS Help Assistant for Sri Lanka. Answer ONLY from LankaFix SPS knowledge:
- Plans: Home Lite (Rs.1990/200pp), Home Smart (Rs.2490/400pp), Family Print (Rs.2990/500pp), Student Study (Rs.1790/300pp), Tuition Print (Rs.3990/1000pp), Home Office Pro (Rs.3490/750pp), Small Biz Mono (Rs.2990/600pp), Biz Mono (Rs.4490/1500pp), Biz Multifunction (Rs.5990/2000pp), Biz Office Plus (Rs.7990/3000pp), Biz Colour & Institution (custom quote).
- All printers are SmartFix Certified used/refurbished devices.
- Deposits are refundable subject to inspection and agreement terms.
- Overage charges apply per extra page beyond included pages.
- Pause is available on Student Study, Family Print, and Tuition Print plans.
- Upgrades are possible with LankaFix review.
- All contracts need admin approval — no auto-activation.
- Meter readings submitted monthly, verified by LankaFix team.
- Support varies by plan: basic (phone), standard (+priority consumables), priority (+next-day tech), premium (+4hr response+backup).

If uncertain, say "A LankaFix advisor should confirm this for you." Keep answers brief, friendly, and Sri Lanka–relevant.`;

  const res = await callAI(
    [{ role: "system", content: systemPrompt }, { role: "user", content: `Page: ${pageContext || "general"}\nQuestion: ${question}` }],
    apiKey
  );

  if (res.error) return json({ error: res.error }, res.status);

  const answer = res.result as string;
  const lowConfidence = answer.includes("advisor should confirm") || answer.includes("not sure");

  return json({
    answer,
    confidence: lowConfidence ? 40 : 80,
    escalate: lowConfidence,
    advisory_only: true,
  });
}
