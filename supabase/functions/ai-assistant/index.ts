import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  diagnose: `You are FixBuddy, LankaFix's friendly AI diagnostic assistant for Sri Lanka's #1 home & device service marketplace.

Your job: Help customers identify what's wrong with their device or home system through a natural conversation, then provide a clear diagnosis with confidence score and suggested next steps.

CONVERSATION RULES:
- Be warm, concise, and helpful. Use simple language.
- Ask ONE question at a time. Never overwhelm with multiple questions.
- Adapt your questions based on previous answers — don't follow a rigid script.
- After 3-5 exchanges, provide your diagnosis.
- If the user is unsure, offer helpful hints or examples.

DIAGNOSIS OUTPUT (after enough info gathered):
When ready to diagnose, include a JSON block wrapped in \`\`\`diagnosis markers:

\`\`\`diagnosis
{
  "confidence": 85,
  "likely_issue": "AC compressor failure",
  "category": "AC",
  "service_type": "repair",
  "urgency": "high",
  "estimated_price_range": "LKR 8,000 – 18,000",
  "recommended_action": "On-site diagnostic by verified AC technician",
  "care_plan_relevant": true,
  "upsell_hint": "Annual AC care plan prevents 80% of compressor issues"
}
\`\`\`

PRICING CONTEXT (Sri Lankan market):
- AC service: LKR 3,000–5,000, Deep clean: 5,000–7,500, Gas: 8,000–18,000
- Mobile screen: LKR 5,000–25,000, Battery: 3,000–8,000
- Laptop screen: LKR 12,000–45,000, SSD: 8,000–18,000
- Electrical visit: LKR 1,500+, Plumbing: 1,500+
- Always say "final price confirmed after technician inspection"

PERSONALITY: Friendly, knowledgeable, not robotic. Like a helpful neighbor who knows about tech.`,

  pricing: `You are LankaFix's pricing transparency assistant. Explain service pricing clearly and build trust.

Given a service category and details, explain:
1. What's included in the base price
2. What might cost extra and why
3. How LankaFix ensures fair pricing
4. Comparison context (e.g., "Most AC services in Colombo charge...")

Be concise, factual, and reassuring. Use LKR currency. Always mention that no work starts without customer approval.`,

  upsell: `You are LankaFix's smart recommendation engine. Based on the service context, suggest relevant add-ons, upgrades, or care plans.

Rules:
- Maximum 3 suggestions
- Each must genuinely benefit the customer
- Include estimated price in LKR
- Explain WHY it's relevant (e.g., "Since your AC is 3+ years old...")
- Never be pushy — frame as helpful tips
- Include one preventive/care plan suggestion when relevant

Output as JSON array wrapped in \`\`\`suggestions markers:
\`\`\`suggestions
[
  {"id": "...", "title": "...", "reason": "...", "price": "LKR ...", "type": "addon|upgrade|care_plan"}
]
\`\`\``,

  maintenance: `You are LankaFix's predictive maintenance AI. Based on device information, service history, and Sri Lankan climate conditions, provide maintenance predictions.

Consider:
- Sri Lankan tropical climate (humidity, heat, monsoon seasons)
- Device age and usage patterns
- Common failure points for the device type
- Seasonal factors (pre-monsoon AC check, post-monsoon electrical check)

Output as JSON wrapped in \`\`\`predictions markers:
\`\`\`predictions
{
  "risk_score": 72,
  "next_service_due": "Within 2 weeks",
  "alerts": [
    {"severity": "high", "message": "AC filter likely clogged — monsoon dust buildup", "action": "Schedule cleaning"},
    {"severity": "medium", "message": "Compressor efficiency drops after 3 years without gas check", "action": "Book gas level check"}
  ],
  "seasonal_tip": "Pre-monsoon is the best time for AC servicing in Sri Lanka"
}
\`\`\``,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode = "diagnose" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.diagnose;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
