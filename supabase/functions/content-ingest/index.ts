/**
 * Content Ingestion Edge Function
 * Fetches content from sources, normalizes, deduplicates, applies AI briefs,
 * and surfaces to homepage slots.
 * 
 * Triggered on schedule or manually from ops.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Category intelligence map (subset for edge function)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  MOBILE: ['phone', 'smartphone', 'mobile', 'battery', 'screen', 'repair', 'iphone', 'samsung', 'android'],
  AC: ['air conditioning', 'hvac', 'cooling', 'ac service', 'inverter ac', 'heat wave', 'refrigerant'],
  IT: ['laptop', 'computer', 'cybersecurity', 'malware', 'data recovery', 'tech support', 'software'],
  CCTV: ['surveillance', 'security camera', 'cctv', 'monitoring', 'night vision'],
  SOLAR: ['solar panel', 'solar energy', 'inverter', 'renewable', 'battery storage', 'photovoltaic'],
  ELECTRICAL: ['electrical', 'wiring', 'circuit', 'power outage', 'electrician', 'surge'],
  PLUMBING: ['plumbing', 'pipe', 'leak', 'water heater', 'drain', 'faucet'],
  NETWORK: ['wifi', 'router', 'internet', 'broadband', 'network', 'fiber', '5g'],
  CONSUMER_ELEC: ['tv repair', 'electronics', 'appliance', 'smart tv', 'audio'],
  SMART_HOME_OFFICE: ['smart home', 'automation', 'iot', 'smart office', 'voice assistant'],
  POWER_BACKUP: ['ups', 'generator', 'power backup', 'battery backup', 'inverter'],
  HOME_SECURITY: ['home security', 'alarm', 'smart lock', 'access control', 'doorbell'],
};

function detectCategories(text: string): { code: string; confidence: number }[] {
  const lower = text.toLowerCase();
  const results: { code: string; confidence: number }[] = [];
  
  for (const [code, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    if (matches > 0) {
      results.push({ code, confidence: Math.min(0.95, 0.3 + (matches * 0.15)) });
    }
  }
  
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

function detectContentType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('scam') || lower.includes('fraud') || lower.includes('counterfeit')) return 'scam_alert';
  if (lower.includes('safety') || lower.includes('danger') || lower.includes('recall')) return 'safety_alert';
  if (lower.includes('innovation') || lower.includes('breakthrough') || lower.includes('new technology')) return 'innovation';
  if (lower.includes('trend') || lower.includes('growing') || lower.includes('rising')) return 'trend_signal';
  if (lower.includes('statistic') || lower.includes('percent') || lower.includes('survey')) return 'numbers_insight';
  if (lower.includes('how to') || lower.includes('tips') || lower.includes('guide')) return 'how_to';
  if (lower.includes('history') || lower.includes('on this day')) return 'on_this_day';
  return 'hot_topic';
}

function generateDedupeKey(title: string, source: string): string {
  const normalized = `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}::${source}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return `dedupe_${Math.abs(hash).toString(36)}`;
}

async function generateAIBrief(item: { title: string; raw_excerpt: string | null; content_type: string; categories: string[] }) {
  if (!LOVABLE_API_KEY) return null;
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a content intelligence assistant for LankaFix, a tech repair and home services marketplace in Sri Lanka. Generate concise, useful summaries. Never invent facts. Never sensationalize. Keep it professional and useful for consumers.`
          },
          {
            role: "user",
            content: `Summarize this for LankaFix users. Categories: ${item.categories.join(', ')}. Type: ${item.content_type}.

Title: ${item.title}
Excerpt: ${item.raw_excerpt ?? 'N/A'}

Return JSON with these fields:
- ai_headline: premium rewritten headline (max 80 chars)
- ai_summary_short: 1-sentence summary (max 120 chars)
- ai_summary_medium: 2-3 sentence summary
- ai_why_it_matters: why this matters to someone using tech/home services (1 sentence)
- ai_lankafix_angle: how this relates to LankaFix services (1 sentence)
- ai_banner_text: a bold stat or number from the content if available, otherwise null
- ai_cta_label: suggested CTA text (e.g. "Learn More", "Check Your Device")
- ai_keywords: array of 3-5 keywords
- ai_risk_flags: array of risk warnings if any, empty array if none
- ai_quality_score: 0.0-1.0 quality assessment`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_brief",
            description: "Generate AI content brief",
            parameters: {
              type: "object",
              properties: {
                ai_headline: { type: "string" },
                ai_summary_short: { type: "string" },
                ai_summary_medium: { type: "string" },
                ai_why_it_matters: { type: "string" },
                ai_lankafix_angle: { type: "string" },
                ai_banner_text: { type: ["string", "null"] },
                ai_cta_label: { type: "string" },
                ai_keywords: { type: "array", items: { type: "string" } },
                ai_risk_flags: { type: "array", items: { type: "string" } },
                ai_quality_score: { type: "number" },
              },
              required: ["ai_headline", "ai_summary_short", "ai_summary_medium", "ai_quality_score"],
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_brief" } },
      }),
    });

    if (!response.ok) {
      console.error("AI brief generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    return null;
  } catch (e) {
    console.error("AI brief error:", e);
    return null;
  }
}

// Surface code → content type mapping for slot publishing
const SURFACE_RULES: Record<string, { types: string[]; maxItems: number }> = {
  homepage_hot_now: { types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read'], maxItems: 8 },
  homepage_did_you_know: { types: ['knowledge_fact', 'on_this_day', 'history'], maxItems: 4 },
  homepage_innovations: { types: ['innovation', 'market_shift', 'trend_signal'], maxItems: 4 },
  homepage_safety: { types: ['safety_alert', 'scam_alert'], maxItems: 3 },
  homepage_numbers: { types: ['numbers_insight'], maxItems: 4 },
  homepage_popular: { types: ['most_read', 'hot_topic', 'how_to'], maxItems: 5 },
  ai_banner_forum: { types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal'], maxItems: 5 },
};

async function publishToSurfaces() {
  for (const [surfaceCode, rules] of Object.entries(SURFACE_RULES)) {
    // Get recent published items of matching types
    const { data: items } = await supabase
      .from('content_items')
      .select('id, content_type, freshness_score, source_trust_score, published_at')
      .eq('status', 'published')
      .in('content_type', rules.types)
      .order('freshness_score', { ascending: false })
      .limit(rules.maxItems * 2);

    if (!items?.length) continue;

    // Score and rank
    const ranked = items
      .map((item: any) => ({
        ...item,
        rank: (item.freshness_score ?? 50) * 0.4 + (item.source_trust_score ?? 0.7) * 100 * 0.3 +
              (item.published_at ? Math.max(0, 100 - (Date.now() - new Date(item.published_at).getTime()) / 3600000) : 0) * 0.3,
      }))
      .sort((a: any, b: any) => b.rank - a.rank)
      .slice(0, rules.maxItems);

    // Deactivate old surfaces for this slot
    await supabase
      .from('content_surface_state')
      .update({ active: false })
      .eq('surface_code', surfaceCode)
      .eq('active', true);

    // Insert new
    const surfaces = ranked.map((item: any) => ({
      surface_code: surfaceCode,
      content_item_id: item.id,
      rank_score: item.rank,
      active: true,
    }));

    if (surfaces.length > 0) {
      await supabase.from('content_surface_state').insert(surfaces);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? 'full'; // 'full' | 'ingest' | 'publish' | 'brief'

    let processed = 0;
    let published = 0;
    let briefed = 0;

    if (mode === 'full' || mode === 'ingest') {
      // Fetch active sources
      const { data: sources } = await supabase
        .from('content_sources')
        .select('*')
        .eq('active', true);

      if (sources?.length) {
        for (const source of sources) {
          // For now, handle internal_editorial type (seed content)
          // External API adapters would go here per source_type
          if (source.source_type === 'internal_editorial') {
            // Internal editorial content is inserted directly via ops
            continue;
          }
          // TODO: Add API adapters for news_api, wiki, trends etc.
        }
      }
    }

    if (mode === 'full' || mode === 'brief') {
      // Generate AI briefs for items without one
      const { data: unbriefed } = await supabase
        .from('content_items')
        .select('id, title, raw_excerpt, content_type')
        .in('status', ['new', 'processed'])
        .limit(10);

      if (unbriefed?.length) {
        for (const item of unbriefed) {
          // Get category tags
          const { data: tags } = await supabase
            .from('content_category_tags')
            .select('category_code')
            .eq('content_item_id', item.id);

          const categories = (tags ?? []).map((t: any) => t.category_code);
          
          const brief = await generateAIBrief({
            title: item.title,
            raw_excerpt: item.raw_excerpt,
            content_type: item.content_type,
            categories,
          });

          if (brief) {
            await supabase.from('content_ai_briefs').insert({
              content_item_id: item.id,
              ...brief,
              ai_model: 'google/gemini-2.5-flash-lite',
              prompt_version: 'v1',
            });

            // Auto-publish if quality is high enough
            const quality = brief.ai_quality_score ?? 0;
            const newStatus = quality >= 0.6 ? 'published' : 'needs_review';
            await supabase
              .from('content_items')
              .update({ status: newStatus, freshness_score: quality * 100 })
              .eq('id', item.id);

            briefed++;
            if (newStatus === 'published') published++;
          }
        }
      }
    }

    if (mode === 'full' || mode === 'publish') {
      await publishToSurfaces();
    }

    return new Response(
      JSON.stringify({ success: true, processed, briefed, published }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Content ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
