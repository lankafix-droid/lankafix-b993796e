/**
 * Content Prompt Templates — AI briefing prompts for the content intelligence system.
 * Source-grounded, no hallucination, premium tone, Sri Lanka context-aware.
 */

export const SYSTEM_PROMPT = `You are a content intelligence assistant for LankaFix, Sri Lanka's trusted tech repair & home services marketplace.

RULES:
- Generate concise, useful, premium summaries for LankaFix users.
- NEVER invent facts, statistics, or claims not in the source.
- NEVER fabricate Sri Lanka relevance if none exists.
- NEVER sensationalize or use clickbait language.
- Keep tone professional, helpful, trustworthy, and simple.
- Focus on how the content helps someone making service decisions.
- When Sri Lanka context is relevant, emphasize local practical impact.
- For "Why This Matters": focus on what the user should DO, not just know.
- For "LankaFix Angle": only connect to services if genuine.
- If source quality is weak, give a lower quality score.`;

export function buildBriefingPrompt(item: {
  title: string;
  raw_excerpt: string | null;
  content_type: string;
  categories: string[];
}): string {
  return `Transform this content for LankaFix users in Sri Lanka.

Content Type: ${item.content_type.replace(/_/g, ' ')}
Service Categories: ${item.categories.join(', ') || 'General'}

Title: ${item.title}
Excerpt: ${item.raw_excerpt ?? 'No excerpt available'}

Generate a structured brief. Be source-grounded only. Do not invent any facts.
For ai_quality_score: rate 0.0-1.0 based on source reliability, relevance to tech/home services, and usefulness to Sri Lankan consumers.
For ai_why_it_matters: explain what this means practically — when to inspect, repair, or book service.
For ai_lankafix_angle: only include if there is a genuine connection to repair, maintenance, or home services.
For ai_risk_flags: only include if there are genuine consumer safety or scam concerns mentioned in the source.
For ai_cta_label: make it action-oriented — "Book AC Service", "Check Your Device", "Get Safety Inspection".`;
}

export const BRIEF_TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "generate_brief",
    description: "Generate AI content brief for LankaFix",
    parameters: {
      type: "object",
      properties: {
        ai_headline: { type: "string", description: "Premium rewritten headline, max 80 chars" },
        ai_summary_short: { type: "string", description: "1-sentence summary, max 120 chars" },
        ai_summary_medium: { type: "string", description: "2-3 sentence useful summary focusing on practical impact" },
        ai_why_it_matters: { type: "string", description: "Why this matters practically — what to do, when to act. 1-2 sentences." },
        ai_lankafix_angle: { type: ["string", "null"], description: "How this relates to LankaFix services. Null if no genuine connection." },
        ai_banner_text: { type: ["string", "null"], description: "Bold stat/number if available in source, null otherwise" },
        ai_cta_label: { type: "string", description: "Action CTA like 'Book AC Service' or 'Check Your Device'" },
        ai_keywords: { type: "array", items: { type: "string" }, description: "3-5 keywords" },
        ai_risk_flags: { type: "array", items: { type: "string" }, description: "Risk warnings only if genuinely present in source" },
        ai_quality_score: { type: "number", description: "0.0-1.0 quality assessment" },
      },
      required: ["ai_headline", "ai_summary_short", "ai_summary_medium", "ai_quality_score"],
    },
  },
};
