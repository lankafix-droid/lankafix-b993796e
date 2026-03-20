/**
 * Content Ingestion Edge Function — Full pipeline.
 * Modes: full, ingest, brief, publish, decay, cluster
 * Supports hybrid live + evergreen content intelligence.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Category keyword detection ───
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  MOBILE: ['phone', 'smartphone', 'mobile', 'battery', 'screen', 'repair', 'iphone', 'samsung', 'android', 'charger', 'tablet', 'galaxy', 'pixel', 'oneplus', 'display', 'sim card', 'case'],
  AC: ['air conditioning', 'hvac', 'cooling', 'ac service', 'inverter ac', 'heat wave', 'refrigerant', 'compressor', 'aircon', 'split unit', 'central air', 'energy star', 'btu', 'thermostat'],
  IT: ['laptop', 'computer', 'cybersecurity', 'malware', 'data recovery', 'tech support', 'software', 'server', 'ransomware', 'phishing', 'firewall', 'cloud', 'windows', 'mac', 'ssd', 'ram'],
  CCTV: ['surveillance', 'security camera', 'cctv', 'monitoring', 'night vision', 'nvr', 'dvr', 'ip camera', 'motion detection', 'video analytics', 'ptz'],
  SOLAR: ['solar panel', 'solar energy', 'inverter', 'renewable', 'battery storage', 'photovoltaic', 'net metering', 'solar installation', 'off-grid', 'on-grid', 'ceb tariff', 'solar rooftop'],
  ELECTRICAL: ['electrical', 'wiring', 'circuit', 'power outage', 'electrician', 'surge', 'mcb', 'circuit breaker', 'grounding', 'earthing', 'voltage', 'transformer', 'switchboard'],
  PLUMBING: ['plumbing', 'pipe', 'leak', 'water heater', 'drain', 'faucet', 'toilet', 'geyser', 'water pump', 'septic', 'water tank', 'valve', 'sewage'],
  NETWORK: ['wifi', 'router', 'internet', 'broadband', 'network', 'fiber', '5g', 'mesh', 'ethernet', 'switch', 'bandwidth', 'isp', 'modem', 'lan'],
  CONSUMER_ELEC: ['tv repair', 'electronics', 'appliance', 'smart tv', 'audio', 'speaker', 'washing machine', 'refrigerator', 'microwave', 'home theater', 'led tv'],
  SMART_HOME_OFFICE: ['smart home', 'automation', 'iot', 'smart office', 'voice assistant', 'alexa', 'google home', 'smart plug', 'smart lighting', 'zigbee'],
  POWER_BACKUP: ['ups', 'generator', 'power backup', 'battery backup', 'inverter backup', 'power bank', 'uninterruptible', 'standby power', 'load shedding'],
  HOME_SECURITY: ['home security', 'alarm', 'smart lock', 'access control', 'doorbell', 'intruder', 'burglar', 'motion sensor', 'perimeter', 'gate automation'],
  APPLIANCE_INSTALL: ['appliance installation', 'washer', 'dishwasher', 'oven installation', 'dryer', 'cooktop', 'range hood', 'water purifier'],
  COPIER: ['copier', 'copier maintenance', 'printer repair', 'toner', 'multifunction', 'xerox', 'canon printer', 'hp printer', 'laser printer'],
  PRINT_SUPPLIES: ['printing supplies', 'cartridge', 'ink', 'toner cartridge', 'refill', 'drum unit', 'print head'],
};

// Sri Lanka relevance signals — expanded
const SRI_LANKA_SIGNALS = [
  'sri lanka', 'colombo', 'kandy', 'galle', 'lk', 'ceylon', 'sinhala', 'tamil',
  'ceb', 'leco', 'rupee', 'lkr', 'monsoon', 'south asia', 'tropical',
  'dialog', 'mobitel', 'sri lankan', 'rajagiriya', 'nugegoda', 'dehiwala',
  'electricity tariff', 'load shedding', 'power cut', 'matara', 'jaffna',
  'kurunegala', 'negombo', 'puttalam', 'anuradhapura', 'ratnapura',
  'ceb bill', 'water board', 'nwsdb', 'slt', 'hutch', 'airtel',
];

// Commercial relevance signals
const COMMERCIAL_SIGNALS = [
  'repair', 'replace', 'fix', 'install', 'maintain', 'service', 'technician',
  'cost', 'price', 'save', 'warranty', 'genuine parts', 'certified', 'book',
  'quote', 'estimate', 'annual maintenance', 'preventive', 'diagnostic',
];

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

function detectSriLankaRelevance(text: string): number {
  const lower = text.toLowerCase();
  const matches = SRI_LANKA_SIGNALS.filter(s => lower.includes(s)).length;
  if (matches >= 3) return 0.95;
  if (matches >= 2) return 0.8;
  if (matches >= 1) return 0.6;
  return 0.2;
}

function detectCommercialRelevance(text: string): number {
  const lower = text.toLowerCase();
  const matches = COMMERCIAL_SIGNALS.filter(s => lower.includes(s)).length;
  return Math.min(1, matches * 0.15);
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
  if (lower.includes('market') || lower.includes('industry shift') || lower.includes('forecast')) return 'market_shift';
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

// ─── Similar title detection for duplicate suppression ───
function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
  return overlap / Math.max(wordsA.size, wordsB.size);
}

// ─── AI Briefing ───
async function generateAIBrief(item: { title: string; raw_excerpt: string | null; content_type: string; categories: string[]; sri_lanka_relevance: number }) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const slContext = item.sri_lanka_relevance > 0.5
      ? `\nSri Lanka Context: This content is relevant to Sri Lanka. Include "What this means in Sri Lanka" perspective where appropriate. Reference local conditions (monsoon, electricity costs, tropical climate, local market) if genuinely relevant.`
      : '';

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
            content: `You are a content intelligence assistant for LankaFix, Sri Lanka's trusted tech repair & home services marketplace.

RULES:
- Generate concise, useful, premium summaries for LankaFix users.
- NEVER invent facts, statistics, or claims not in the source.
- NEVER fabricate Sri Lanka relevance if none exists.
- NEVER sensationalize or use clickbait language.
- Keep tone professional, helpful, trustworthy, and simple.
- Focus on how the content helps someone making service decisions.
- For ai_why_it_matters: explain practical impact on homeowners/businesses.
- For ai_lankafix_angle: only include genuine connections to repair/maintenance/home services.
- If source quality is weak, give a lower quality score.
- When Sri Lanka context exists, emphasize practical local relevance.`
          },
          {
            role: "user",
            content: `Transform this for LankaFix users.

Content Type: ${item.content_type.replace(/_/g, ' ')}
Service Categories: ${item.categories.join(', ') || 'General'}
Sri Lanka Relevance: ${item.sri_lanka_relevance > 0.5 ? 'HIGH' : 'MODERATE'}
${slContext}

Title: ${item.title}
Excerpt: ${item.raw_excerpt ?? 'No excerpt available'}

Generate a structured brief. Be source-grounded only. Do not invent any facts.
For ai_quality_score: rate 0.0-1.0 based on source reliability, relevance to tech/home services, usefulness to Sri Lankan consumers, and content depth.`
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
                ai_summary_medium: { type: "string", description: "2-3 sentence useful summary focusing on practical impact" },
                ai_why_it_matters: { type: "string", description: "Why this matters to someone using tech/home services in Sri Lanka, 1-2 sentences" },
                ai_lankafix_angle: { type: ["string", "null"], description: "How this relates to LankaFix services. Null if no genuine connection." },
                ai_banner_text: { type: ["string", "null"], description: "Bold stat/number if available in source, null otherwise" },
                ai_cta_label: { type: "string", description: "CTA text like 'Learn More', 'Check Your Device', 'Book Service'" },
                ai_keywords: { type: "array", items: { type: "string" }, description: "3-5 keywords" },
                ai_risk_flags: { type: "array", items: { type: "string" }, description: "Risk warnings only if genuinely present in source" },
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
      const result = JSON.parse(toolCall.function.arguments);
      result.ai_quality_score = Math.max(0, Math.min(1, result.ai_quality_score ?? 0.5));
      return result;
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

// ─── Diversity constants ───
const MAX_ITEMS_PER_SOURCE_PER_SURFACE = 2;
const MAX_SURFACES_PER_ITEM = 3;
const SIMILAR_TITLE_THRESHOLD = 0.55;

// ─── Surface publishing with diversity governance ───
const SURFACE_RULES: Record<string, { types: string[]; maxItems: number; minQuality: number }> = {
  homepage_hero: { types: ['breaking_news', 'innovation', 'safety_alert', 'hot_topic'], maxItems: 3, minQuality: 0.6 },
  homepage_hot_now: { types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read'], maxItems: 8, minQuality: 0.5 },
  homepage_did_you_know: { types: ['knowledge_fact', 'on_this_day', 'history', 'how_to'], maxItems: 4, minQuality: 0.4 },
  homepage_innovations: { types: ['innovation', 'market_shift', 'trend_signal'], maxItems: 4, minQuality: 0.5 },
  homepage_safety: { types: ['safety_alert', 'scam_alert'], maxItems: 3, minQuality: 0.5 },
  homepage_numbers: { types: ['numbers_insight', 'market_shift'], maxItems: 4, minQuality: 0.4 },
  homepage_popular: { types: ['most_read', 'hot_topic', 'how_to', 'innovation'], maxItems: 5, minQuality: 0.4 },
  ai_banner_forum: { types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal'], maxItems: 5, minQuality: 0.6 },
};

async function publishToSurfaces() {
  // Track how many surfaces each item appears on (for diversity)
  const itemSurfaceCount = new Map<string, number>();

  const { data: excludedItems } = await supabase
    .from('content_items')
    .select('id, rejection_reason')
    .in('status', ['rejected', 'archived'])
    .limit(500);
  const excludedIds = new Set((excludedItems ?? []).map((e: any) => e.id));

  for (const [surfaceCode, rules] of Object.entries(SURFACE_RULES)) {
    // Check for manually pinned items (rank_score >= 990)
    const { data: pinnedSurfaces } = await supabase
      .from('content_surface_state')
      .select('content_item_id')
      .eq('surface_code', surfaceCode)
      .eq('active', true)
      .gte('rank_score', 990);
    const pinnedIds = new Set((pinnedSurfaces ?? []).map((p: any) => p.content_item_id));

    const { data: items } = await supabase
      .from('content_items')
      .select('id, content_type, freshness_score, source_trust_score, published_at, source_country, source_id, title')
      .eq('status', 'published')
      .in('content_type', rules.types)
      .order('freshness_score', { ascending: false })
      .limit(rules.maxItems * 6);

    if (!items?.length && pinnedIds.size === 0) continue;

    const allItems = items ?? [];
    const ids = allItems.map((i: any) => i.id);

    const [{ data: briefs }, { data: tags }] = await Promise.all([
      ids.length > 0
        ? supabase.from('content_ai_briefs').select('content_item_id, ai_quality_score').in('content_item_id', ids)
        : Promise.resolve({ data: [] }),
      ids.length > 0
        ? supabase.from('content_category_tags').select('content_item_id, category_code, confidence_score').in('content_item_id', ids)
        : Promise.resolve({ data: [] }),
    ]);

    const qualityMap = new Map((briefs ?? []).map((b: any) => [b.content_item_id, b.ai_quality_score ?? 0.5]));
    const catMap = new Map<string, string[]>();
    (tags ?? []).forEach((t: any) => {
      const arr = catMap.get(t.content_item_id) ?? [];
      arr.push(t.category_code);
      catMap.set(t.content_item_id, arr);
    });

    const ranked = allItems
      .filter((item: any) => !excludedIds.has(item.id) && !pinnedIds.has(item.id))
      .filter((item: any) => (qualityMap.get(item.id) ?? 0.5) >= rules.minQuality)
      .map((item: any) => {
        const quality = qualityMap.get(item.id) ?? 0.5;
        const isSriLankan = item.source_country === 'lk' || item.source_country === 'LK';
        const slBoost = isSriLankan ? 15 : 0;
        const safetyBoost = (item.content_type === 'safety_alert' || item.content_type === 'scam_alert') ? 10 : 0;

        return {
          ...item,
          quality,
          rank: (item.freshness_score ?? 50) * 0.30 +
                (item.source_trust_score ?? 0.7) * 100 * 0.20 +
                quality * 100 * 0.25 +
                (item.published_at ? Math.max(0, 100 - (Date.now() - new Date(item.published_at).getTime()) / 3600000) : 0) * 0.15 +
                slBoost + safetyBoost,
        };
      })
      .sort((a: any, b: any) => b.rank - a.rank);

    // ─── Apply diversity filters ───
    const selected: any[] = [];
    const sourceCountInSurface = new Map<string, number>();
    const selectedTitles: string[] = [];
    const maxSlots = rules.maxItems - pinnedIds.size;

    for (const item of ranked) {
      if (selected.length >= maxSlots) break;

      // Max surfaces per item (unless pinned)
      const surfCount = itemSurfaceCount.get(item.id) ?? 0;
      if (surfCount >= MAX_SURFACES_PER_ITEM) continue;

      // Max items per source per surface
      const srcCount = sourceCountInSurface.get(item.source_id ?? '') ?? 0;
      if (srcCount >= MAX_ITEMS_PER_SOURCE_PER_SURFACE) continue;

      // Similar title suppression
      const isDuplicate = selectedTitles.some(t => titleSimilarity(t, item.title) > SIMILAR_TITLE_THRESHOLD);
      if (isDuplicate) continue;

      selected.push(item);
      sourceCountInSurface.set(item.source_id ?? '', srcCount + 1);
      selectedTitles.push(item.title);
      itemSurfaceCount.set(item.id, surfCount + 1);
    }

    // Deactivate old (except pinned)
    if (pinnedIds.size > 0) {
      const { data: toDeactivate } = await supabase
        .from('content_surface_state')
        .select('id')
        .eq('surface_code', surfaceCode)
        .eq('active', true)
        .lt('rank_score', 990);
      if (toDeactivate?.length) {
        await supabase.from('content_surface_state').update({ active: false }).in('id', toDeactivate.map((d: any) => d.id));
      }
    } else {
      await supabase.from('content_surface_state').update({ active: false }).eq('surface_code', surfaceCode).eq('active', true);
    }

    // Insert new ranked items
    if (selected.length > 0) {
      await supabase.from('content_surface_state').insert(
        selected.map((item: any) => ({
          surface_code: surfaceCode,
          content_item_id: item.id,
          rank_score: Math.round(item.rank * 10) / 10,
          active: true,
          category_code: catMap.get(item.id)?.[0] ?? null,
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

  const ids = items.map((i: any) => i.id);
  const { data: tags } = await supabase.from('content_category_tags').select('content_item_id, category_code').in('content_item_id', ids);
  const tagMap = new Map<string, string[]>();
  (tags ?? []).forEach((t: any) => {
    const arr = tagMap.get(t.content_item_id) ?? [];
    arr.push(t.category_code);
    tagMap.set(t.content_item_id, arr);
  });

  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'for', 'on', 'with', 'and', 'or', 'but', 'not', 'by', 'at']);
  const getKeywords = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  const withKw = items.map((i: any) => ({
    id: i.id, title: i.title, content_type: i.content_type,
    category_codes: tagMap.get(i.id) ?? [],
    source_country: i.source_country,
    kw: getKeywords(i.title),
  }));
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

      const slCount = group.filter(g => g.source_country === 'lk' || g.source_country === 'LK').length;
      const slRelevance = Math.min(100, Math.round((slCount / group.length) * 100));

      // Compute commercial relevance from categories
      const commercialCats = new Set(['MOBILE', 'AC', 'IT', 'SOLAR', 'ELECTRICAL', 'PLUMBING']);
      const commercialRelevance = allCats.some(c => commercialCats.has(c)) ? 70 : 40;

      await supabase.from('content_trend_clusters').upsert({
        cluster_key: key,
        cluster_label: label.charAt(0).toUpperCase() + label.slice(1),
        category_code: topCat,
        momentum_score: Math.min(100, group.length * 25),
        content_count: group.length,
        sri_lanka_relevance_score: slRelevance,
        commercial_relevance_score: commercialRelevance,
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
    const results: Record<string, number> = {
      fetched: 0, normalized: 0, accepted: 0, rejected: 0,
      briefed: 0, published: 0, decayed: 0, archived: 0,
      clustered: 0, surfaces_refreshed: 0,
    };

    // 1. Ingest from sources
    if (mode === 'full' || mode === 'ingest') {
      const { data: sources } = await supabase.from('content_sources').select('*').eq('active', true);
      if (sources?.length) {
        for (const source of sources) {
          if (source.source_type === 'internal_editorial' || source.source_type === 'knowledge' || !source.base_url) continue;
          try {
            const resp = await fetch(source.base_url, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(10000),
            });
            if (!resp.ok) {
              console.warn(`Source ${source.source_name} returned ${resp.status}`);
              continue;
            }
            const data = await resp.json();
            const articles = data.articles ?? data.results ?? data.data ?? [];
            results.fetched += articles.length;

            for (const article of articles.slice(0, 15)) {
              const title = (article.title ?? article.headline ?? '').trim();
              if (!title || title.length < 10) continue;

              const dedupeKey = generateDedupeKey(title, source.source_name);
              const { data: existing } = await supabase.from('content_items').select('id').eq('dedupe_key', dedupeKey).limit(1);
              if (existing?.length) continue;

              // Similar title check against recent items
              const { data: recentItems } = await supabase
                .from('content_items')
                .select('title')
                .order('created_at', { ascending: false })
                .limit(30);
              const isSimilar = (recentItems ?? []).some((r: any) => titleSimilarity(r.title, title) > SIMILAR_TITLE_THRESHOLD);
              if (isSimilar) continue;

              const text = `${title} ${article.description ?? ''} ${article.content ?? ''}`;
              const categories = detectCategories(text);
              const contentType = detectContentType(text);
              const slRelevance = detectSriLankaRelevance(text);

              // Apply source category allowlist filtering
              if (source.category_allowlist?.length) {
                const catCodes = categories.map(c => c.code);
                const hasOverlap = catCodes.some((c: string) => source.category_allowlist.includes(c));
                if (!hasOverlap && categories.length > 0) {
                  // Still accept but reduce trust slightly
                }
              }

              const publishedAt = article.publishedAt ?? article.published_at ?? article.pubDate ?? null;
              const freshness = computeFreshness(contentType, publishedAt);
              const sourceSLBias = source.sri_lanka_bias ?? 0.3;
              const effectiveSLRelevance = Math.max(slRelevance, sourceSLBias);
              const sourceCountry = effectiveSLRelevance > 0.7 ? 'lk' : (article.country ?? 'global');

              const { data: inserted } = await supabase.from('content_items').insert({
                source_id: source.id,
                source_item_id: article.id ?? article.url ?? dedupeKey,
                content_type: contentType,
                title,
                raw_excerpt: (article.description ?? article.excerpt ?? '').slice(0, 1000) || null,
                raw_body: (article.content ?? article.body ?? '').slice(0, 10000) || null,
                canonical_url: article.url ?? article.link ?? null,
                image_url: article.urlToImage ?? article.image ?? article.image_url ?? null,
                source_name: source.source_name,
                source_country: sourceCountry,
                language: article.language ?? 'en',
                published_at: publishedAt,
                source_trust_score: source.trust_score,
                freshness_score: freshness,
                status: 'new',
                dedupe_key: dedupeKey,
                raw_payload: article,
              }).select('id').single();

              if (inserted) {
                results.normalized++;
                for (const cat of categories) {
                  await supabase.from('content_category_tags').insert({
                    content_item_id: inserted.id,
                    category_code: cat.code,
                    confidence_score: cat.confidence,
                  });
                }
                results.accepted++;
              }
            }
          } catch (e) {
            console.error(`Source fetch error for ${source.source_name}:`, e);
          }
        }

        await supabase.from('content_sources').update({ last_fetched_at: new Date().toISOString() }).eq('active', true);
      }
    }

    // 2. AI Briefing
    if (mode === 'full' || mode === 'brief') {
      const { data: unbriefed } = await supabase
        .from('content_items')
        .select('id, title, raw_excerpt, content_type, source_country')
        .in('status', ['new', 'processed'])
        .order('freshness_score', { ascending: false })
        .limit(10);

      if (unbriefed?.length) {
        for (const item of unbriefed) {
          const { data: existingBrief } = await supabase.from('content_ai_briefs').select('id').eq('content_item_id', item.id).limit(1);
          if (existingBrief?.length) continue;

          const { data: tags } = await supabase.from('content_category_tags').select('category_code').eq('content_item_id', item.id);
          const categories = (tags ?? []).map((t: any) => t.category_code);
          const slRelevance = detectSriLankaRelevance(`${item.title} ${item.raw_excerpt ?? ''}`);

          const brief = await generateAIBrief({
            title: item.title,
            raw_excerpt: item.raw_excerpt,
            content_type: item.content_type,
            categories,
            sri_lanka_relevance: slRelevance,
          });

          if (brief) {
            await supabase.from('content_ai_briefs').insert({
              content_item_id: item.id,
              ...brief,
              ai_model: 'google/gemini-2.5-flash-lite',
              prompt_version: 'v3-sl',
            });

            const quality = brief.ai_quality_score ?? 0;
            const newStatus = quality >= 0.5 ? 'published' : quality >= 0.3 ? 'needs_review' : 'rejected';
            await supabase.from('content_items').update({
              status: newStatus,
              freshness_score: computeFreshness(item.content_type, null),
            }).eq('id', item.id);

            results.briefed++;
            if (newStatus === 'published') results.published++;
            if (newStatus === 'rejected') results.rejected++;
          } else {
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

    console.log(`[content-ingest] Pipeline complete (mode=${mode}):`, JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, mode, ...results }),
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
