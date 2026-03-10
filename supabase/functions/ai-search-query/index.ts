import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are LankaFix's AI Service Discovery engine for Sri Lanka's leading home & device service marketplace.

Given a user's natural language problem description, analyze it and return a structured JSON response.

AVAILABLE SERVICE CATEGORIES:
- AC (AC Service & Repair): gas top-up, full service, repair/diagnosis, installation
- CCTV (CCTV & Security): installation, repair, maintenance, remote viewing
- MOBILE (Mobile & Device Repair): screen replacement, battery, general repair, software
- IT (IT Repair & Support): remote support, on-site support, network setup, data recovery
- SOLAR (Solar Power): installation, maintenance, inverter repair
- ELECTRICAL (Electrical Services): wiring, switch/socket, MCB/DB, ceiling fan
- PLUMBING (Plumbing): leak repair, fixture install, drain cleaning, water heater
- ELECTRONICS (Consumer Electronics): TV repair, audio, appliance repair
- NETWORK (Internet & Network): WiFi setup, router config, network cabling
- SMARTHOME (Smart Home & Office): automation, smart locks, smart lighting
- SECURITY (Home Security): alarm systems, access control, intercom
- POWER_BACKUP (Power Backup): UPS, generator, inverter
- COPIER (Copier & Printer Repair): copier repair, printer repair, toner
- SUPPLIES (Print Supplies): cartridges, toner, paper
- APPLIANCE_INSTALL (Appliance Installation): washing machine, water purifier

RESPONSE FORMAT (JSON only, no markdown):
{
  "category_code": "AC",
  "category_name": "AC Service & Repair",
  "service_type": "AC_REPAIR",
  "service_name": "AC Repair / Diagnosis",
  "urgency": "high|medium|low",
  "confidence": 85,
  "booking_path": "direct|inspection|quote_required",
  "estimated_price_range": "LKR 2,500 – 5,000",
  "problem_summary": "AC not cooling properly, likely needs gas refill or compressor check",
  "alternative_services": [
    {"category_code": "AC", "service_type": "AC_FULL_SERVICE", "reason": "May need deep cleaning instead"}
  ],
  "follow_up_questions": ["How old is your AC unit?", "Is it a split or window type?"]
}

RULES:
- Always return valid JSON
- confidence: 0-100 (below 60 = suggest inspection)
- If multiple categories possible, pick the most likely and list alternatives
- Use Sri Lankan pricing context (LKR)
- urgency: "high" for safety/water/power issues, "medium" for comfort, "low" for maintenance
- booking_path: "direct" for clear issues, "inspection" for uncertain, "quote_required" for installations`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, session_id } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Query too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query.trim() },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log to database for ML training
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("ai_interaction_logs").insert({
        interaction_type: "search",
        input_query: query.trim(),
        ai_model: "google/gemini-3-flash-preview",
        ai_response: parsed,
        confidence_score: parsed.confidence,
        matched_category: parsed.category_code,
        matched_service: parsed.service_type,
        urgency_level: parsed.urgency,
        session_id: session_id || null,
      });
    } catch (logErr) {
      console.error("Failed to log AI interaction:", logErr);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-search-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
