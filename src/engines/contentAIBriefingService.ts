/**
 * Content AI Briefing Service — Generates AI briefs for content items.
 * Used by the content-ingest edge function. This module defines the
 * briefing logic that can be shared/tested independently.
 */
import { SYSTEM_PROMPT, buildBriefingPrompt, BRIEF_TOOL_SCHEMA } from './contentPromptTemplates';

export interface BriefingInput {
  title: string;
  raw_excerpt: string | null;
  content_type: string;
  categories: string[];
}

export interface AIBriefResult {
  ai_headline: string;
  ai_summary_short: string;
  ai_summary_medium: string;
  ai_why_it_matters?: string | null;
  ai_lankafix_angle?: string | null;
  ai_banner_text?: string | null;
  ai_cta_label?: string;
  ai_keywords?: string[];
  ai_risk_flags?: string[];
  ai_quality_score: number;
}

/**
 * Call the Lovable AI Gateway to generate a brief.
 * Meant to run in edge function context where LOVABLE_API_KEY is available.
 */
export async function generateBrief(
  input: BriefingInput,
  apiKey: string,
  model = 'google/gemini-2.5-flash-lite'
): Promise<AIBriefResult | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildBriefingPrompt(input) },
        ],
        tools: [BRIEF_TOOL_SCHEMA],
        tool_choice: { type: 'function', function: { name: 'generate_brief' } },
      }),
    });

    if (!response.ok) {
      console.error('AI brief generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments) as AIBriefResult;
      // Clamp quality score
      result.ai_quality_score = Math.max(0, Math.min(1, result.ai_quality_score ?? 0.5));
      return result;
    }
    return null;
  } catch (e) {
    console.error('AI brief error:', e);
    return null;
  }
}

/** Validate a brief result has minimum required fields */
export function isValidBrief(brief: AIBriefResult | null): brief is AIBriefResult {
  if (!brief) return false;
  return !!(brief.ai_headline && brief.ai_summary_short && brief.ai_summary_medium);
}
