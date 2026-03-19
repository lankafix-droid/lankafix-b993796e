/**
 * Content Ingestion Edge Function — Full pipeline.
 * Modes: full, ingest, brief, publish, decay, cluster
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

// ─── Category keyword detection ───
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  MOBILE: ['phone', 'smartphone', 'mobile', 'battery', 'screen', 'repair', 'iphone', 'samsung', 'android', 'charger'],
  AC: ['air conditioning', 'hvac', 'cooling', 'ac service', 'inverter ac', 'heat wave', 'refrigerant', 'compressor'],
  IT: ['laptop', 'computer', 'cybersecurity', 'malware', 'data recovery', 'tech support', 'software', 'server'],
  CCTV: ['surveillance', 'security camera', 'cctv', 'monitoring', 'night vision', 'nvr', 'dvr'],
  SOLAR: ['solar panel', 'solar energy', 'inverter', 'renewable', 'battery storage', 'photovoltaic', 'net metering'],
  ELECTRICAL: ['electrical', 'wiring', 'circuit', 'power outage', 'electrician', 'surge', 'mcb'],
  PLUMBING: ['plumbing', 'pipe', 'leak', 'water heater', 'drain', 'faucet', 'toilet'],
  NETWORK: ['wifi', 'router', 'internet', 'broadband', 'network', 'fiber', '5g', 'mesh'],
  CONSUMER_ELEC: ['tv repair', 'electronics', 'appliance', 'smart tv', 'audio', 'speaker'],
  SMART_HOME_OFFICE: ['smart home', 'automation', 'iot', 'smart office', 'voice assistant'],
  POWER_BACKUP: ['ups', 'generator', 'power backup', 'battery backup', 'inverter backup'],
  HOME_SECURITY: ['home security', 'alarm', 'smart lock', 'access control', 'doorbell'],
  APPLIANCE_INSTALL: ['appliance installation', 'washer', 'dishwasher', 'oven installation'],
  COPIER: ['copier', 'copier maintenance', 'printer repair', 'toner', 'multifunction'],
  PRINT_SUPPLIES: ['printing supplies', 'cartridge', 'ink', 'toner cartridge'],
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
  if (lower.includes('safety') || lower.includes('danger') || lower.includes('recall') || lower.includes('warning')) return 'safety_alert';
  if (lower.includes('innovation') || lower.includes('breakthrough') || lower.includes('new technology') || lower.includes('latest')) return 'innovation';
  if (lower.includes('trend') || lower.includes('growing') || lower.includes('rising') || lower.includes('surge')) return 'trend_signal';
  if (lower.includes('statistic') || lower.includes('percent') || lower.includes('survey') || lower.includes('data shows')) return 'numbers_insight';
  if (lower.includes('how to') || lower.includes('tips') || lower.includes('guide') || lower.includes('tutorial')) return 'how_to';
  if (lower.includes('history') || lower.includes('on this day') || lower.includes('years ago')) return 'on_this_day';
  if (lower.includes('fact') || lower.includes('did you know')) return 'knowledge_fact';
  return 'hot_topic';
}

function generateDedupeKey(title: string, source: string): string {
  const normalized = `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}::${source}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return `dedupe_${Math.abs(hash).toString(36)}`;
}

// ─── AI Briefing ───
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
            content: `You are a content intelligence assistant for LankaFix, Sri Lanka's trusted tech repair & home services marketplace. Generate concise, useful, premium summaries. NEVER invent facts. NEVER sensationalize. NEVER fabricate statistics. Keep tone professional, helpful, and trustworthy.`
          },
          {
            role: "user",
            content: `Transform this for LankaFix users.
Categories: ${item.categories.join(', ') || 'General'}
Type: ${item.content_type}

Title: ${item.title}
Excerpt: ${item.raw_excerpt ?? 'N/A'}

Return a structured brief with these fields. Be source-grounded only.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_brief",
            description: "Generate AI content brief for LankaFix",
            parameters: {
              type: "object",
              properties: {
                ai_headline: { type: "string", description: "Premium rewritten headline, max 80 chars" },
                ai_summary_short: { type: "string", description: "1-sentence summary, max 120 chars" },
                ai_summary_medium: { type: "string", description: "2-3 sentence useful summary" },
                ai_why_it_matters: { type: "string", description: "Why this matters to someone using tech/home services, 1 sentence" },
                ai_lankafix_angle: { type: "string", description: "How this relates to LankaFix services, 1 sentence" },
                ai_banner_text: { type: ["string", "null"], description: "Bold stat/number if available, null otherwise" },
                ai_cta_label: { type: "string", description: "CTA text like 'Learn More' or 'Check Your Device'" },
                ai_keywords: { type: "array", items: { type: "string" }, description: "3-5 keywords" },
                ai_risk_flags: { type: "array", items: { type: "string" }, description: "Risk warnings if any" },
                ai_quality_score: { type: "number", description: "0.0-1.0 quality assessment" },
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

// ─── Freshness decay ───
const FRESHNESS_MAX_HOURS: Record<string, number> = {
  breaking_news: 6, hot_topic: 48, innovation: 168, trend_signal: 72,
  safety_alert: 72, scam_alert: 168, knowledge_fact: 8760, history: 8760,
  on_this_day: 48, numbers_insight: 720, seasonal_tip: 720, how_to: 4380,
  most_read: 168, market_shift: 336,
};
const EVERGREEN_TYPES = new Set(['knowledge_fact', 'history', 'numbers_insight', 'seasonal_tip', 'how_to']);

function computeFreshness(contentType: string, publishedAt: string | null): number {
  if (!publishedAt) return EVERGREEN_TYPES.has(contentType) ? 30 : 10;
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  const maxAge = FRESHNESS_MAX_HOURS[contentType] ?? 48;
  if (ageHours > maxAge * 1.5 && !EVERGREEN_TYPES.has(contentType)) return 0;
  const decay = contentType === 'breaking_news' ? 12 : contentType === 'hot_topic' ? 3 : 1;
  return Math.max(5, Math.round(Math.min(100, 100 - ageHours * decay)));
}

// ─── Surface publishing ───
const SURFACE_RULES: Record<string, { types: string[]; maxItems: number; minQuality: number }> = {
  homepage_hot_now: { types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read'], maxItems: 8, minQuality: 0.5 },
  homepage_did_you_know: { types: ['knowledge_fact', 'on_this_day', 'history'], maxItems: 4, minQuality: 0.4 },
  homepage_innovations: { types: ['innovation', 'market_shift', 'trend_signal'], maxItems: 4, minQuality: 0.5 },
  homepage_safety: { types: ['safety_alert', 'scam_alert'], maxItems: 3, minQuality: 0.6 },
  homepage_numbers: { types: ['numbers_insight'], maxItems: 4, minQuality: 0.4 },
  homepage_popular: { types: ['most_read', 'hot_topic', 'how_to'], maxItems: 5, minQuality: 0.4 },
  ai_banner_forum: { types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal'], maxItems: 5, minQuality: 0.6 },
};

async function publishToSurfaces() {
  // Get editorially suppressed items (rejected with reason 'ops_suppressed')
  const { data: suppressed } = await supabase
    .from('content_items')
    .select('id')
    .eq('rejection_reason', 'ops_suppressed')
    .limit(200);
  const suppressedIds = new Set((suppressed ?? []).map((s: any) => s.id));

  for (const [surfaceCode, rules] of Object.entries(SURFACE_RULES)) {
    // Check for manually pinned items (rank_score = 999 means editorial pin)
    const { data: pinnedSurfaces } = await supabase
      .from('content_surface_state')
      .select('content_item_id')
      .eq('surface_code', surfaceCode)
      .eq('active', true)
      .gte('rank_score', 990);
    const pinnedIds = new Set((pinnedSurfaces ?? []).map((p: any) => p.content_item_id));

    const { data: items } = await supabase
      .from('content_items')
      .select('id, content_type, freshness_score, source_trust_score, published_at')
      .eq('status', 'published')
      .in('content_type', rules.types)
      .order('freshness_score', { ascending: false })
      .limit(rules.maxItems * 3);

    if (!items?.length && pinnedIds.size === 0) continue;

    // Get AI quality scores
    const allItems = items ?? [];
    const ids = allItems.map((i: any) => i.id);
    const { data: briefs } = ids.length > 0
      ? await supabase.from('content_ai_briefs').select('content_item_id, ai_quality_score').in('content_item_id', ids)
      : { data: [] };

    const qualityMap = new Map((briefs ?? []).map((b: any) => [b.content_item_id, b.ai_quality_score ?? 0.5]));

    const ranked = allItems
      .filter((item: any) => !suppressedIds.has(item.id) && !pinnedIds.has(item.id))
      .filter((item: any) => (qualityMap.get(item.id) ?? 0.5) >= rules.minQuality)
      .map((item: any) => ({
        ...item,
        rank: (item.freshness_score ?? 50) * 0.35 +
              (item.source_trust_score ?? 0.7) * 100 * 0.25 +
              (qualityMap.get(item.id) ?? 0.5) * 100 * 0.25 +
              (item.published_at ? Math.max(0, 100 - (Date.now() - new Date(item.published_at).getTime()) / 3600000) : 0) * 0.15,
      }))
      .sort((a: any, b: any) => b.rank - a.rank)
      .slice(0, rules.maxItems - pinnedIds.size);

    // Deactivate old (except pinned)
    if (pinnedIds.size > 0) {
      // Only deactivate non-pinned
      const { data: toDeactivate } = await supabase
        .from('content_surface_state')
        .select('id, content_item_id')
        .eq('surface_code', surfaceCode)
        .eq('active', true)
        .lt('rank_score', 990);
      if (toDeactivate?.length) {
        const deactivateIds = toDeactivate.map((d: any) => d.id);
        await supabase.from('content_surface_state').update({ active: false }).in('id', deactivateIds);
      }
    } else {
      await supabase.from('content_surface_state').update({ active: false }).eq('surface_code', surfaceCode).eq('active', true);
    }

    // Insert new ranked items
    if (ranked.length > 0) {
      await supabase.from('content_surface_state').insert(
        ranked.map((item: any) => ({
          surface_code: surfaceCode,
          content_item_id: item.id,
          rank_score: item.rank,
          active: true,
        }))
      );
    }
  }
}

// ─── Freshness decay job ───
async function runDecay() {
  const { data: items } = await supabase
    .from('content_items')
    .select('id, content_type, published_at, freshness_score')
    .eq('status', 'published')
    .limit(200);

  if (!items?.length) return 0;

  let updated = 0;
  for (const item of items) {
    const newFreshness = computeFreshness(item.content_type, item.published_at);
    const shouldArchive = newFreshness === 0;

    if (shouldArchive) {
      await supabase.from('content_items').update({ status: 'archived', freshness_score: 0 }).eq('id', item.id);
      await supabase.from('content_surface_state').update({ active: false }).eq('content_item_id', item.id);
    } else if (Math.abs((item.freshness_score ?? 0) - newFreshness) > 3) {
      await supabase.from('content_items').update({ freshness_score: newFreshness }).eq('id', item.id);
    }
    updated++;
  }
  return updated;
}

// ─── Trend clustering ───
async function runClustering() {
  const { data: items } = await supabase
    .from('content_items')
    .select('id, title, content_type, published_at, source_country')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!items || items.length < 3) return 0;

  // Get category tags for clustering
  const ids = items.map((i: any) => i.id);
  const { data: tags } = await supabase.from('content_category_tags').select('content_item_id, category_code').in('content_item_id', ids);
  const tagMap = new Map<string, string[]>();
  (tags ?? []).forEach((t: any) => {
    const arr = tagMap.get(t.content_item_id) ?? [];
    arr.push(t.category_code);
    tagMap.set(t.content_item_id, arr);
  });

  // Simple keyword clustering
  const candidates = items.map((i: any) => ({
    id: i.id,
    title: i.title,
    content_type: i.content_type,
    category_codes: tagMap.get(i.id) ?? [],
    published_at: i.published_at,
  }));

  // Extract keywords and group by overlap
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'for', 'on', 'with', 'and', 'or', 'but', 'not', 'by', 'at']);
  const getKeywords = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  const withKw = candidates.map(c => ({ ...c, kw: getKeywords(c.title) }));
  const assigned = new Set<string>();
  let clustered = 0;

  for (let i = 0; i < withKw.length; i++) {
    if (assigned.has(withKw[i].id)) continue;
    const group = [withKw[i]];
    assigned.add(withKw[i].id);

    for (let j = i + 1; j < withKw.length; j++) {
      if (assigned.has(withKw[j].id)) continue;
      const setA = new Set(withKw[i].kw);
      const overlap = withKw[j].kw.filter(w => setA.has(w)).length;
      if (overlap / Math.max(withKw[i].kw.length, 1) >= 0.3) {
        group.push(withKw[j]);
        assigned.add(withKw[j].id);
      }
    }

    if (group.length >= 2) {
      const sharedKw = group[0].kw.filter(kw => group.every(g => g.kw.includes(kw)));
      const key = (sharedKw.length > 0 ? sharedKw : group[0].kw).sort().slice(0, 4).join('_');
      const label = (sharedKw.length > 0 ? sharedKw : group[0].kw).slice(0, 3).join(' ');
      const allCats = group.flatMap(g => g.category_codes);
      const catCounts: Record<string, number> = {};
      allCats.forEach(c => { catCounts[c] = (catCounts[c] ?? 0) + 1; });
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const momentum = Math.min(100, group.length * 25);

      await supabase.from('content_trend_clusters').upsert({
        cluster_key: key,
        cluster_label: label.charAt(0).toUpperCase() + label.slice(1),
        category_code: topCat,
        momentum_score: momentum,
        content_count: group.length,
        sri_lanka_relevance_score: 50,
        commercial_relevance_score: 50,
        active: true,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'cluster_key' });
      clustered++;
    }
  }
  return clustered;
}

// ─── Main handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? 'full';
    const results: Record<string, number> = { processed: 0, briefed: 0, published: 0, decayed: 0, clustered: 0, surfaces_refreshed: 0 };

    // 1. Ingest from sources
    if (mode === 'full' || mode === 'ingest') {
      const { data: sources } = await supabase.from('content_sources').select('*').eq('active', true);
      if (sources?.length) {
        for (const source of sources) {
          if (source.source_type === 'internal_editorial' || !source.base_url) continue;
          try {
            const resp = await fetch(source.base_url);
            if (!resp.ok) continue;
            const data = await resp.json();
            const articles = data.articles ?? data.results ?? data.data ?? [];

            for (const article of articles.slice(0, 15)) {
              const title = (article.title ?? article.headline ?? '').trim();
              if (!title) continue;

              const dedupeKey = generateDedupeKey(title, source.source_name);
              const { data: existing } = await supabase.from('content_items').select('id').eq('dedupe_key', dedupeKey).limit(1);
              if (existing?.length) continue;

              const text = `${title} ${article.description ?? ''}`;
              const categories = detectCategories(text);
              const contentType = detectContentType(text);

              const { data: inserted } = await supabase.from('content_items').insert({
                source_id: source.id,
                source_item_id: article.id ?? article.url ?? dedupeKey,
                content_type: contentType,
                title,
                raw_excerpt: (article.description ?? article.excerpt ?? '').slice(0, 1000) || null,
                raw_body: (article.content ?? article.body ?? '').slice(0, 10000) || null,
                canonical_url: article.url ?? article.link ?? null,
                image_url: article.urlToImage ?? article.image ?? null,
                source_name: source.source_name,
                source_country: article.country ?? 'global',
                language: article.language ?? 'en',
                published_at: article.publishedAt ?? article.published_at ?? null,
                source_trust_score: source.trust_score,
                freshness_score: 80,
                status: 'new',
                dedupe_key: dedupeKey,
                raw_payload: article,
              }).select('id').single();

              if (inserted) {
                for (const cat of categories) {
                  await supabase.from('content_category_tags').insert({
                    content_item_id: inserted.id,
                    category_code: cat.code,
                    confidence_score: cat.confidence,
                  });
                }
                results.processed++;
              }
            }
          } catch (e) {
            console.error(`Source fetch error for ${source.source_name}:`, e);
          }
        }
      }
    }

    // 2. AI Briefing
    if (mode === 'full' || mode === 'brief') {
      const { data: unbriefed } = await supabase
        .from('content_items')
        .select('id, title, raw_excerpt, content_type')
        .in('status', ['new', 'processed'])
        .limit(10);

      if (unbriefed?.length) {
        for (const item of unbriefed) {
          // Skip if already briefed (idempotent)
          const { data: existingBrief } = await supabase.from('content_ai_briefs').select('id').eq('content_item_id', item.id).limit(1);
          if (existingBrief?.length) {
            // Already briefed — just ensure status is correct
            continue;
          }
          const { data: tags } = await supabase.from('content_category_tags').select('category_code').eq('content_item_id', item.id);
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
              prompt_version: 'v2',
            });

            const quality = brief.ai_quality_score ?? 0;
            const newStatus = quality >= 0.6 ? 'published' : quality >= 0.3 ? 'needs_review' : 'rejected';
            await supabase.from('content_items').update({
              status: newStatus,
              freshness_score: quality * 100,
            }).eq('id', item.id);

            results.briefed++;
            if (newStatus === 'published') results.published++;
          } else {
            // Mark as processed even without brief
            await supabase.from('content_items').update({ status: 'processed' }).eq('id', item.id);
          }
        }
      }
    }

    // 3. Surface publishing
    if (mode === 'full' || mode === 'publish') {
      await publishToSurfaces();
      results.surfaces_refreshed = Object.keys(SURFACE_RULES).length;
    }

    // 4. Decay
    if (mode === 'full' || mode === 'decay') {
      results.decayed = await runDecay();
    }

    // 5. Clustering
    if (mode === 'full' || mode === 'cluster') {
      results.clustered = await runClustering();
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
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
