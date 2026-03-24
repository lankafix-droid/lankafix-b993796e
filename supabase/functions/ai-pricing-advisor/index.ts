import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Sri Lankan Market Price Bands (LKR) ───
const MARKET_BANDS: Record<string, { min: number; max: number; typical: number }> = {
  ac_inspection: { min: 1500, max: 2500, typical: 1500 },
  ac_general_service: { min: 3000, max: 5000, typical: 3500 },
  ac_full_service: { min: 5000, max: 7500, typical: 5500 },
  ac_gas_refill: { min: 8000, max: 18000, typical: 12000 },
  ac_installation: { min: 12000, max: 25000, typical: 15000 },
  ac_relocation: { min: 8000, max: 18000, typical: 10000 },
  ac_water_leakage: { min: 3500, max: 8000, typical: 5000 },
  mobile_screen: { min: 6000, max: 45000, typical: 18000 },
  mobile_battery: { min: 3500, max: 12000, typical: 6500 },
  mobile_charging: { min: 2500, max: 6000, typical: 3500 },
  mobile_software: { min: 1500, max: 3500, typical: 2000 },
  mobile_water_damage: { min: 5000, max: 25000, typical: 12000 },
  mobile_board: { min: 8000, max: 35000, typical: 18000 },
  it_laptop_screen: { min: 12000, max: 45000, typical: 22000 },
  it_laptop_battery: { min: 6000, max: 18000, typical: 10000 },
  it_laptop_motherboard: { min: 8000, max: 35000, typical: 18000 },
  it_laptop_keyboard: { min: 5000, max: 15000, typical: 8500 },
  it_laptop_overheat: { min: 2500, max: 6000, typical: 3500 },
  it_remote_support: { min: 1500, max: 5000, typical: 2500 },
  it_data_recovery: { min: 5000, max: 25000, typical: 12000 },
  copier_inspection: { min: 1500, max: 3000, typical: 2000 },
  copier_service: { min: 3500, max: 8000, typical: 5000 },
  copier_repair: { min: 5000, max: 25000, typical: 12000 },
  network_setup: { min: 2000, max: 8000, typical: 4000 },
  network_troubleshoot: { min: 1500, max: 5000, typical: 3000 },
  cctv_inspection: { min: 1000, max: 2000, typical: 1500 },
  cctv_install_per_cam: { min: 2500, max: 6000, typical: 4000 },
  cctv_troubleshoot: { min: 1500, max: 4000, typical: 2500 },
  solar_inspection: { min: 2000, max: 5000, typical: 3000 },
  solar_maintenance: { min: 5000, max: 12000, typical: 7500 },
  electrical_inspection: { min: 1500, max: 3000, typical: 2000 },
  electrical_wiring: { min: 3000, max: 15000, typical: 6000 },
  plumbing_repair: { min: 2500, max: 12000, typical: 5000 },
  elec_tv_panel: { min: 6000, max: 35000, typical: 15000 },
  elec_washing: { min: 3500, max: 12000, typical: 6000 },
  elec_fridge: { min: 3500, max: 15000, typical: 7500 },
};

const COMPLEXITY_FACTORS: Record<string, string[]> = {
  AC: ["BTU capacity", "split vs window", "inverter model", "gas type (R32/R410a)", "ceiling height", "outdoor unit access"],
  MOBILE: ["device brand tier (Samsung flagship vs budget)", "screen type (OLED/LCD/AMOLED)", "part grade (OEM/aftermarket)", "water damage severity"],
  IT: ["device age", "SSD/HDD type", "OS version", "data sensitivity", "business vs personal"],
  CCTV: ["number of cameras", "indoor vs outdoor", "wiring distance", "NVR/DVR type", "remote access setup"],
  SOLAR: ["panel count", "inverter capacity", "roof type", "shading", "grid-tie vs hybrid"],
  COPIER: ["mono vs color", "drum condition", "usage volume", "OEM vs compatible parts"],
  NETWORK: ["number of access points", "building size", "cable vs wireless", "existing infrastructure"],
};

const WARRANTY_TEMPLATES: Record<string, string> = {
  AC: "90 days labor warranty. 6 months on compressor repair. Gas refill covered for 3 months if leak is repaired.",
  MOBILE: "90 days labor. Screen/battery per grade: OEM 6 months, aftermarket 3 months. Water damage: limited 30-day warranty.",
  IT: "90 days labor. 6 months on replaced parts. Data recovery: best-effort, no guarantee on corrupted sectors.",
  CCTV: "90 days labor. 12 months on new cameras/DVR. Existing equipment as-is.",
  SOLAR: "90 days labor. Panel manufacturer warranty applies. Inverter per brand policy.",
  COPIER: "90 days labor. 6 months on replaced parts. Toner/consumables excluded.",
  NETWORK: "90 days labor. Equipment per manufacturer warranty.",
  ELECTRICAL: "90 days labor. 12 months on wiring work.",
  PLUMBING: "90 days labor. 6 months on replaced fittings.",
  CONSUMER_ELEC: "90 days labor. Parts per grade.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startMs = Date.now();

  try {
    const body = await req.json();
    const {
      category_code,
      service_type,
      service_key,
      issue_description,
      device_brand,
      device_model,
      is_emergency = false,
      zone_code,
      // Optional: existing quote data for validation
      proposed_labor,
      proposed_parts = [],
      proposed_total,
    } = body;

    if (!category_code) {
      return new Response(JSON.stringify({ error: "category_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Deterministic pricing data
    const band = service_key ? MARKET_BANDS[service_key] : null;
    const complexityFactors = COMPLEXITY_FACTORS[category_code] || [];
    const warrantyTemplate = WARRANTY_TEMPLATES[category_code] || "30 days labor warranty.";

    // 2. Build context for AI
    const deviceInfo = [device_brand, device_model].filter(Boolean).join(" ");
    const partsInfo = (proposed_parts as any[]).length > 0
      ? (proposed_parts as any[]).map((p: any) => `${p.name}: LKR ${p.amount}`).join(", ")
      : "none listed";

    // 3. Call Lovable AI for contextual analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are the LankaFix AI Pricing Advisor for Sri Lanka's technical repair market.

RULES:
- All prices in LKR (Sri Lankan Rupees). 1 USD ≈ 300 LKR.
- You provide ADVISORY guidance only. Final pricing is set by the technician.
- Never fabricate specific prices. Use market bands when available.
- Be honest about uncertainty. If you can't assess, say "requires inspection."
- Consider Sri Lankan market conditions: import costs, local labor rates, parts availability.
- Factor in device tier: budget phones cost less to repair than flagships.

You MUST respond using the generate_pricing_advice tool.`;

    const userPrompt = `Analyze this repair job and provide pricing guidance:

Category: ${category_code}
Service Type: ${service_type || "not specified"}
Issue: ${issue_description || "not described"}
Device: ${deviceInfo || "not specified"}
Emergency: ${is_emergency ? "Yes" : "No"}
Zone: ${zone_code || "not specified"}

Market Price Band: ${band ? `LKR ${band.min.toLocaleString()}–${band.max.toLocaleString()} (typical: ${band.typical.toLocaleString()})` : "no benchmark available"}
Complexity Factors for ${category_code}: ${complexityFactors.join(", ")}

${proposed_total ? `Proposed Quote: LKR ${proposed_total.toLocaleString()} (labor: ${proposed_labor || 0}, parts: ${partsInfo})` : "No quote submitted yet — provide guidance for quoting."}

Provide:
1. Complexity assessment (low/medium/high/specialist)
2. Recommended price positioning within the market band
3. Key factors that would push price higher or lower
4. Parts likelihood and estimated cost range
5. Time estimate
6. Any risk warnings
7. Customer-facing explanation of the pricing`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_pricing_advice",
              description: "Return structured pricing guidance for the repair job.",
              parameters: {
                type: "object",
                properties: {
                  complexity_level: {
                    type: "string",
                    enum: ["low", "medium", "high", "specialist"],
                    description: "Job complexity assessment",
                  },
                  complexity_reasoning: {
                    type: "string",
                    description: "Brief explanation of why this complexity level was assigned (1-2 sentences)",
                  },
                  recommended_price_range: {
                    type: "object",
                    properties: {
                      min_lkr: { type: "number" },
                      max_lkr: { type: "number" },
                      sweet_spot_lkr: { type: "number", description: "Most competitive price point" },
                    },
                    required: ["min_lkr", "max_lkr", "sweet_spot_lkr"],
                  },
                  price_factors_up: {
                    type: "array",
                    items: { type: "string" },
                    description: "Factors that push price higher",
                  },
                  price_factors_down: {
                    type: "array",
                    items: { type: "string" },
                    description: "Factors that push price lower",
                  },
                  parts_assessment: {
                    type: "object",
                    properties: {
                      likely_needed: { type: "boolean" },
                      estimated_parts_cost_min: { type: "number" },
                      estimated_parts_cost_max: { type: "number" },
                      common_parts: {
                        type: "array",
                        items: { type: "string" },
                      },
                      parts_availability: {
                        type: "string",
                        enum: ["readily_available", "may_need_ordering", "specialist_sourcing"],
                      },
                    },
                    required: ["likely_needed"],
                  },
                  time_estimate: {
                    type: "object",
                    properties: {
                      min_minutes: { type: "number" },
                      max_minutes: { type: "number" },
                      includes_diagnostics: { type: "boolean" },
                    },
                    required: ["min_minutes", "max_minutes"],
                  },
                  risk_warnings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["info", "warning", "critical"] },
                        message: { type: "string" },
                      },
                      required: ["severity", "message"],
                    },
                  },
                  customer_explanation: {
                    type: "string",
                    description: "Customer-friendly explanation of the expected cost and what it covers (2-3 sentences)",
                  },
                  quote_validation: {
                    type: "object",
                    description: "Only if a proposed quote was provided",
                    properties: {
                      is_fair: { type: "boolean" },
                      feedback: { type: "string" },
                      approval_likelihood: {
                        type: "string",
                        enum: ["very_likely", "likely", "uncertain", "unlikely"],
                      },
                    },
                  },
                  upsell_opportunities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        service: { type: "string" },
                        reason: { type: "string" },
                        estimated_cost_lkr: { type: "number" },
                      },
                      required: ["service", "reason"],
                    },
                  },
                },
                required: [
                  "complexity_level",
                  "complexity_reasoning",
                  "recommended_price_range",
                  "price_factors_up",
                  "price_factors_down",
                  "parts_assessment",
                  "time_estimate",
                  "risk_warnings",
                  "customer_explanation",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_pricing_advice" } },
      }),
    });

    let aiAdvice: any = null;
    const responseTimeMs = Date.now() - startMs;

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          aiAdvice = JSON.parse(toolCall.function.arguments);
        } catch {
          console.error("Failed to parse AI advice");
        }
      }
    } else {
      const errStatus = aiResponse.status;
      if (errStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errStatus === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", errStatus);
    }

    // 4. Log interaction
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("ai_interaction_logs").insert({
        interaction_type: "pricing_advisor",
        input_query: issue_description || `${category_code}/${service_type}`,
        matched_category: category_code,
        matched_service: service_type,
        confidence_score: aiAdvice ? (aiAdvice.complexity_level === "low" ? 0.9 : aiAdvice.complexity_level === "medium" ? 0.75 : 0.6) : null,
        confidence_bucket: aiAdvice?.complexity_level === "low" ? "high" : aiAdvice?.complexity_level === "medium" ? "medium" : "low",
        response_time_ms: responseTimeMs,
        ai_model: "google/gemini-2.5-flash-lite",
        metadata: {
          category_code,
          service_key,
          device_brand,
          device_model,
          is_emergency,
          has_ai_advice: !!aiAdvice,
          market_band: band,
          proposed_total,
        },
      });
    } catch (logErr) {
      console.error("Pricing advisor log error:", logErr);
    }

    // 5. Build response
    return new Response(
      JSON.stringify({
        // Deterministic data (always reliable)
        market_band: band,
        complexity_factors: complexityFactors,
        warranty_template: warrantyTemplate,
        is_emergency,

        // AI-enhanced analysis (advisory only)
        ai_advice: aiAdvice,
        ai_available: !!aiAdvice,

        // Metadata
        response_time_ms: responseTimeMs,
        advisory_notice: "AI pricing guidance is advisory only. Final pricing is set by the technician and approved by the customer.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-pricing-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
