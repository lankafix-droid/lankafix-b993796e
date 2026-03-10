import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are LankaFix's AI Photo Diagnosis engine. Analyze images of devices, appliances, or home systems to identify issues.

CAPABILITIES:
- Mobile phones: cracked screens, camera damage, water damage indicators, charging port damage
- AC units: leaking pipes, dirty condensers, ice buildup, installation issues
- Solar panels: dirt/debris, physical damage, roof suitability assessment
- CCTV: camera misalignment, cable damage, weathering
- Electrical: burn marks, exposed wiring, tripped breakers
- Plumbing: visible leaks, pipe corrosion, fixture damage
- Electronics: screen damage, overheating evidence, physical damage

RESPONSE FORMAT (JSON only):
{
  "detected_issues": [
    {
      "issue": "Cracked LCD screen",
      "confidence": 92,
      "severity": "high|medium|low",
      "description": "Visible spider-web crack pattern on the display, likely from impact"
    }
  ],
  "category_code": "MOBILE",
  "category_name": "Mobile & Device Repair",
  "recommended_service": "MOBILE_SCREEN",
  "recommended_service_name": "Screen Replacement",
  "overall_confidence": 92,
  "urgency": "medium",
  "estimated_price_range": "LKR 5,000 – 25,000",
  "booking_path": "direct|inspection|quote_required",
  "inspection_recommended": false,
  "additional_notes": "Price varies by phone model. OEM screens cost more than compatible ones.",
  "self_fix_possible": false,
  "self_fix_tip": null
}

RULES:
- If you cannot identify the device/issue clearly, set overall_confidence below 50 and recommend inspection
- Multiple issues can be detected from one image
- Always recommend inspection for safety-related issues (electrical, gas)
- Use Sri Lankan pricing (LKR)
- Be conservative with confidence — it's better to recommend inspection than misdiagnose`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, image_url, description, session_id } = await req.json();
    
    if (!image_base64 && !image_url) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build multimodal message
    const userContent: any[] = [];
    
    if (image_base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image_base64}` },
      });
    } else if (image_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: image_url },
      });
    }

    userContent.push({
      type: "text",
      text: description 
        ? `Analyze this image. The user describes the problem as: "${description}". Identify visible issues and recommend a service.`
        : "Analyze this image of a device or system. Identify any visible issues, damage, or problems and recommend the appropriate LankaFix service.",
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
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
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse AI photo response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log for ML training
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("ai_interaction_logs").insert({
        interaction_type: "photo_diagnosis",
        input_query: description || null,
        input_image_url: image_url || "base64_upload",
        ai_model: "google/gemini-2.5-flash",
        ai_response: parsed,
        confidence_score: parsed.overall_confidence,
        matched_category: parsed.category_code,
        matched_service: parsed.recommended_service,
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
    console.error("ai-photo-diagnose error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
