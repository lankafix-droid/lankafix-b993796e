import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENDPOINT = "ai-photo-diagnose";
const RATE_LIMIT = 5;

const VALID_CATEGORIES = [
  "AC", "CCTV", "MOBILE", "IT", "SOLAR", "ELECTRICAL", "PLUMBING",
  "ELECTRONICS", "NETWORK", "SMARTHOME", "SECURITY", "POWER_BACKUP",
  "COPIER", "SUPPLIES", "APPLIANCE_INSTALL",
];
const VALID_URGENCIES = ["high", "medium", "low"];
const VALID_SEVERITIES = ["high", "medium", "low"];
const VALID_BOOKING_PATHS = ["direct", "inspection", "quote_required"];

const SAFETY_OVERRIDES: Record<string, string> = {
  ELECTRICAL: "inspection",
  SOLAR: "quote_required",
};

const SAFETY_KEYWORDS: { pattern: RegExp; booking_path: string }[] = [
  { pattern: /\b(gas|refrigerant|freon|r22|r410)\b/i, booking_path: "inspection" },
  { pattern: /\b(water\s*damage|water\s*damaged|fell\s*in\s*water|wet)\b/i, booking_path: "inspection" },
  { pattern: /\b(sparking|shock|electri|short\s*circuit|fire|burning)\b/i, booking_path: "inspection" },
];

function getConfidenceBucket(confidence: number): string {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

const INSPECTION_FALLBACK = {
  detected_issues: [{ issue: "Unable to identify specific issue", confidence: 30, severity: "medium" as const, description: "On-site inspection recommended for accurate diagnosis" }],
  category_code: "INSPECTION_REQUIRED",
  category_name: "General Inspection",
  recommended_service: "GENERAL_INSPECTION",
  recommended_service_name: "General Inspection",
  overall_confidence: 40,
  urgency: "medium",
  estimated_price_range: "Contact for quote",
  booking_path: "inspection",
  inspection_recommended: true,
  additional_notes: "We couldn't confidently identify the issue from the photo. A verified technician will inspect and diagnose on-site.",
  self_fix_possible: false,
  self_fix_tip: null,
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function applySafetyOverrides(parsed: any, description: string): { result: any; safety_override_applied: boolean; override_reason: string | null } {
  let safety_override_applied = false;
  let override_reason: string | null = null;

  const categoryOverride = SAFETY_OVERRIDES[parsed.category_code];
  if (categoryOverride) {
    parsed.booking_path = categoryOverride;
    if (categoryOverride === "inspection") parsed.inspection_recommended = true;
    safety_override_applied = true;
    override_reason = `category_rule_${parsed.category_code.toLowerCase()}`;
  }

  for (const rule of SAFETY_KEYWORDS) {
    if (rule.pattern.test(description)) {
      parsed.booking_path = rule.booking_path;
      if (rule.booking_path === "inspection") parsed.inspection_recommended = true;
      safety_override_applied = true;
      const matched = description.match(rule.pattern)?.[0]?.toLowerCase().replace(/\s+/g, "_") || "keyword";
      override_reason = `${matched}_detected`;
      break;
    }
  }

  if (Array.isArray(parsed.detected_issues)) {
    for (const issue of parsed.detected_issues) {
      for (const rule of SAFETY_KEYWORDS) {
        if (rule.pattern.test(issue.issue || "") || rule.pattern.test(issue.description || "")) {
          parsed.booking_path = rule.booking_path;
          if (rule.booking_path === "inspection") parsed.inspection_recommended = true;
          if (!safety_override_applied) {
            safety_override_applied = true;
            const matched = (issue.issue || issue.description || "").match(rule.pattern)?.[0]?.toLowerCase().replace(/\s+/g, "_") || "issue_keyword";
            override_reason = `${matched}_detected`;
          }
          break;
        }
      }
    }
  }

  return { result: parsed, safety_override_applied, override_reason };
}

function validateAndSanitize(raw: any): any {
  if (!raw || typeof raw !== "object") return { ...INSPECTION_FALLBACK };

  const category_code = VALID_CATEGORIES.includes(raw.category_code) ? raw.category_code : null;
  if (!category_code) return { ...INSPECTION_FALLBACK };

  const urgency = VALID_URGENCIES.includes(raw.urgency) ? raw.urgency : "medium";
  const overall_confidence = typeof raw.overall_confidence === "number"
    ? Math.max(0, Math.min(100, Math.round(raw.overall_confidence))) : 50;

  const inspection_recommended = overall_confidence < 60 ? true : !!raw.inspection_recommended;
  const booking_path = overall_confidence < 60 ? "inspection"
    : VALID_BOOKING_PATHS.includes(raw.booking_path) ? raw.booking_path : "inspection";

  const detected_issues = Array.isArray(raw.detected_issues)
    ? raw.detected_issues.slice(0, 5).map((issue: any) => ({
        issue: typeof issue?.issue === "string" ? issue.issue.slice(0, 150) : "Unknown issue",
        confidence: typeof issue?.confidence === "number" ? Math.max(0, Math.min(100, Math.round(issue.confidence))) : 50,
        severity: VALID_SEVERITIES.includes(issue?.severity) ? issue.severity : "medium",
        description: typeof issue?.description === "string" ? issue.description.slice(0, 300) : "",
      }))
    : [{ issue: "Unable to identify specific issue", confidence: 30, severity: "medium" as const, description: "Inspection recommended" }];

  return {
    detected_issues,
    category_code,
    category_name: typeof raw.category_name === "string" ? raw.category_name.slice(0, 100) : category_code,
    recommended_service: typeof raw.recommended_service === "string" ? raw.recommended_service.slice(0, 80) : "GENERAL",
    recommended_service_name: typeof raw.recommended_service_name === "string" ? raw.recommended_service_name.slice(0, 100) : "General Inspection",
    overall_confidence,
    urgency,
    estimated_price_range: typeof raw.estimated_price_range === "string" ? raw.estimated_price_range.slice(0, 60) : "Contact for quote",
    booking_path,
    inspection_recommended,
    additional_notes: typeof raw.additional_notes === "string" ? raw.additional_notes.slice(0, 500) : null,
    self_fix_possible: !!raw.self_fix_possible,
    self_fix_tip: typeof raw.self_fix_tip === "string" ? raw.self_fix_tip.slice(0, 300) : null,
  };
}

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

  const startTime = Date.now();

  try {
    const supabase = getSupabaseClient();

    // Atomic rate limiting via RPC
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
      _identifier: clientIp,
      _endpoint: ENDPOINT,
      _max_requests: RATE_LIMIT,
      _window_seconds: 60,
    });

    if (rlError) {
      console.error("Rate limit check failed:", rlError);
    } else if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_base64, image_url, description, session_id } = await req.json();

    if (!image_base64 && !image_url) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (image_base64 && image_base64.length > 13_300_000) {
      return new Response(JSON.stringify({ error: "Image too large (max 10MB). Please compress and retry." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (description && (typeof description !== "string" || description.length > 500)) {
      return new Response(JSON.stringify({ error: "Description must be under 500 characters." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
      const rawParsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      parsed = validateAndSanitize(rawParsed);
    } catch {
      console.error("Failed to parse AI photo response:", content);
      parsed = { ...INSPECTION_FALLBACK };
    }

    const { result: safeResult, safety_override_applied, override_reason } = applySafetyOverrides(parsed, description || "");
    parsed = safeResult;

    // Include safety flags in response
    parsed.safety_override_applied = safety_override_applied;
    if (safety_override_applied) {
      parsed.override_reason = override_reason;
    }

    const responseTimeMs = Date.now() - startTime;
    const imageSizeBytes = image_base64 ? Math.round(image_base64.length * 0.75) : null;
    const confidenceBucket = getConfidenceBucket(parsed.overall_confidence);

    try {
      await supabase.from("ai_interaction_logs").insert({
        interaction_type: "photo_diagnosis",
        input_query: description || null,
        input_image_url: image_url || "base64_upload",
        ai_model: "google/gemini-2.5-flash",
        ai_response: parsed,
        confidence_score: parsed.overall_confidence,
        confidence_bucket: confidenceBucket,
        matched_category: parsed.category_code,
        matched_service: parsed.recommended_service,
        urgency_level: parsed.urgency,
        session_id: session_id || null,
        response_time_ms: responseTimeMs,
        image_size_bytes: imageSizeBytes,
        client_platform: "web",
        metadata: {
          safety_override_applied,
          override_reason,
        },
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
