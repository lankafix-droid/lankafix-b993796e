/**
 * Content Ingestion Edge Function — Full pipeline.
 * Modes: full, ingest, brief, publish, decay, cluster, dry_run, publish_preview, audit_sources
 * Supports hybrid live + evergreen content intelligence.
 * v6 — Expanded run modes, richer preview explainability, source readiness/tier governance.
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

// ─── Title Quality Gate — reject low-quality titles ───
function assessTitleQuality(title: string): { pass: boolean; reason: string } {
  if (title.length < 15) return { pass: false, reason: 'too_short' };
  if (title.length > 200) return { pass: false, reason: 'too_long' };

  const clickbait = /^(you won'?t believe|shocking|this is|omg|watch out|click here|breaking:?\s*$)/i;
  if (clickbait.test(title)) return { pass: false, reason: 'clickbait' };

  const upperRatio = (title.match(/[A-Z]/g) ?? []).length / title.length;
  if (upperRatio > 0.6 && title.length > 20) return { pass: false, reason: 'excessive_caps' };

  const generic = ['untitled', 'no title', 'test', 'lorem ipsum', 'sample', 'placeholder'];
  if (generic.some(g => title.toLowerCase().includes(g))) return { pass: false, reason: 'generic' };

  // Low information: very short meaningful words
  const words = title.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 3) return { pass: false, reason: 'low_information' };

  return { pass: true, reason: 'ok' };
}

// ─── Relevance Band ───
type RelevanceBand = 'local_high' | 'local_medium' | 'regional' | 'global_high_utility' | 'global_low_utility';

function computeRelevanceBand(slRelevance: number, commercialRelevance: number, categoryConfidence: number): RelevanceBand {
  if (slRelevance >= 0.8 && commercialRelevance >= 0.3) return 'local_high';
  if (slRelevance >= 0.5) return 'local_medium';
  if (slRelevance >= 0.3 && categoryConfidence >= 0.4) return 'regional';
  if (commercialRelevance >= 0.4 || categoryConfidence >= 0.5) return 'global_high_utility';
  return 'global_low_utility';
}

// ─── Local Utility Score ───
function computeLocalUtilityScore(item: {
  source_country?: string;
  source_trust_score?: number;
  freshness_score?: number;
  content_type?: string;
}, slRelevance: number, commercialRelevance: number, categoryConfidence: number): number {
  const isLocal = item.source_country === 'lk' || item.source_country === 'LK';
  const localityScore = isLocal ? 0.9 : (slRelevance > 0.6 ? 0.6 : 0.2);
  const trustScore = Math.min(1, (item.source_trust_score ?? 0.5));
  const freshnessNorm = Math.min(1, (item.freshness_score ?? 30) / 100);
  const isSafety = item.content_type === 'safety_alert' || item.content_type === 'scam_alert';
  const safetyBonus = isSafety ? 0.15 : 0;

  return Math.min(1,
    localityScore * 0.25 +
    slRelevance * 0.20 +
    categoryConfidence * 0.15 +
    commercialRelevance * 0.15 +
    trustScore * 0.10 +
    freshnessNorm * 0.10 +
    safetyBonus +
    0.05
  );
}

// ─── Hero Score ───
function computeHeroScore(item: any, quality: number, localUtility: number): number {
  const freshness = (item.freshness_score ?? 50) / 100;
  const hasImage = item.image_url ? 0.1 : 0;
  const headlineQuality = (item.title?.length > 30 && item.title?.length < 120) ? 0.05 : 0;
  const isSafety = (item.content_type === 'safety_alert' || item.content_type === 'scam_alert') ? 0.1 : 0;

  return (
    quality * 0.30 +
    freshness * 0.25 +
    localUtility * 0.20 +
    hasImage +
    headlineQuality +
    isSafety +
    (item.source_trust_score ?? 0.5) * 0.10
  );
}

// ─── AI Briefing with hardened safety ───
async function generateAIBrief(item: { title: string; raw_excerpt: string | null; content_type: string; categories: string[]; sri_lanka_relevance: number }) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const slContext = item.sri_lanka_relevance > 0.5
      ? `\nSri Lanka Context: This content has genuine Sri Lanka relevance. Include local perspective where supported by source text only.`
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

STRICT RULES:
- Generate concise, useful, premium summaries for LankaFix users.
- NEVER invent facts, statistics, numbers, or claims not explicitly in the source text.
- NEVER fabricate Sri Lanka market data, prices, percentages, or savings claims.
- NEVER invent urgency that doesn't exist in the source.
- NEVER sensationalize or use clickbait language.
- ai_banner_text must ONLY contain a number/stat that appears verbatim in the source. If none exists, return null.
- ai_risk_flags must ONLY contain risks genuinely described in the source.
- If source text is thin or vague, set ai_quality_score below 0.4 and keep summaries conservative.
- Keep tone professional, helpful, trustworthy, and simple.
- Focus on how the content helps someone making service/repair/maintenance decisions.
- For ai_why_it_matters: explain practical impact on homeowners/businesses. Source-grounded only.
- For ai_lankafix_angle: only include genuine connections to repair/maintenance/home services. Null if forced.`
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

Generate a structured brief. Be source-grounded only. Do not invent any facts or numbers.
For ai_quality_score: rate 0.0-1.0 based on source depth, relevance, and usefulness. Thin sources must score below 0.4.`
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
                ai_why_it_matters: { type: "string", description: "Why this matters to someone using tech/home services, 1-2 sentences. Source-grounded only." },
                ai_lankafix_angle: { type: ["string", "null"], description: "How this relates to LankaFix services. Null if no genuine connection." },
                ai_banner_text: { type: ["string", "null"], description: "A number/stat from the source text verbatim. Null if none exists." },
                ai_cta_label: { type: "string", description: "CTA text like 'Learn More', 'Check Your Device', 'Book Service'" },
                ai_keywords: { type: "array", items: { type: "string" }, description: "3-5 keywords" },
                ai_risk_flags: { type: "array", items: { type: "string" }, description: "Risk warnings only if genuinely present in source" },
                ai_quality_score: { type: "number", description: "0.0-1.0. Thin/vague sources MUST score below 0.4." },
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
const MAX_SAME_CATEGORY_CONSECUTIVE = 2;
const MAX_SAME_CONTENT_TYPE_PER_SURFACE = 3;

// ─── Surface-specific quality thresholds ───
const SURFACE_RULES: Record<string, { types: string[]; maxItems: number; minQuality: number; isHero?: boolean; categoryBound?: boolean }> = {
  homepage_hero: { types: ['breaking_news', 'innovation', 'safety_alert', 'hot_topic', 'market_shift'], maxItems: 3, minQuality: 0.6, isHero: true },
  homepage_hot_now: { types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read'], maxItems: 8, minQuality: 0.5 },
  homepage_did_you_know: { types: ['knowledge_fact', 'on_this_day', 'history', 'how_to'], maxItems: 4, minQuality: 0.4 },
  homepage_innovations: { types: ['innovation', 'market_shift', 'trend_signal'], maxItems: 4, minQuality: 0.5 },
  homepage_safety: { types: ['safety_alert', 'scam_alert'], maxItems: 3, minQuality: 0.55 },
  homepage_numbers: { types: ['numbers_insight', 'market_shift'], maxItems: 4, minQuality: 0.4 },
  homepage_popular: { types: ['most_read', 'hot_topic', 'how_to', 'innovation'], maxItems: 5, minQuality: 0.4 },
  ai_banner_forum: { types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal'], maxItems: 5, minQuality: 0.6 },
  category_featured: { types: ['breaking_news', 'hot_topic', 'innovation', 'safety_alert', 'trend_signal', 'how_to', 'market_shift'], maxItems: 1, minQuality: 0.5, categoryBound: true },
  category_feed: { types: ['breaking_news', 'hot_topic', 'innovation', 'safety_alert', 'scam_alert', 'trend_signal', 'how_to', 'knowledge_fact', 'numbers_insight', 'market_shift'], maxItems: 6, minQuality: 0.38, categoryBound: true },
};

// ─── Source tier classification ───
type SourceTier = 'tier1_safe' | 'tier2_controlled' | 'tier3_experimental';

function classifySourceTier(source: any): SourceTier {
  if (source.trust_score >= 0.8 && source.base_url) return 'tier1_safe';
  if (source.trust_score >= 0.7 && source.base_url) return 'tier2_controlled';
  return 'tier3_experimental';
}

type SourceReadiness = 'ready' | 'needs_url' | 'failing' | 'low_trust' | 'disabled' | 'sl_relevant' | 'global_only';

function classifySourceReadiness(source: any): SourceReadiness {
  if (!source.active) return 'disabled';
  if (!source.base_url) return 'needs_url';
  if (source.trust_score < 0.5) return 'low_trust';
  return 'ready';
}

// ─── Surface publishing with diversity governance ───
async function publishToSurfaces(dryRun = false) {
  const itemSurfaceCount = new Map<string, number>();
  const preview: Record<string, any[]> = {};

  const { data: excludedItems } = await supabase
    .from('content_items')
    .select('id')
    .in('status', ['rejected', 'archived'])
    .limit(500);
  const excludedIds = new Set((excludedItems ?? []).map((e: any) => e.id));

  const CATEGORY_CODES = ['MOBILE', 'AC', 'IT', 'CCTV', 'SOLAR', 'CONSUMER_ELEC', 'SMART_HOME_OFFICE', 'ELECTRICAL', 'PLUMBING', 'NETWORK', 'POWER_BACKUP', 'HOME_SECURITY', 'APPLIANCE_INSTALL', 'COPIER', 'PRINT_SUPPLIES'];

  for (const [surfaceCode, rules] of Object.entries(SURFACE_RULES)) {
    const categories = rules.categoryBound ? CATEGORY_CODES : [null];

    for (const catCode of categories) {
      const effectiveSurface = surfaceCode;
      const previewKey = catCode ? `${surfaceCode}:${catCode}` : surfaceCode;

      // Check for manually pinned items (rank_score >= 990)
      let pinnedQuery = supabase
        .from('content_surface_state')
        .select('content_item_id')
        .eq('surface_code', effectiveSurface)
        .eq('active', true)
        .gte('rank_score', 990);
      if (catCode) pinnedQuery = pinnedQuery.eq('category_code', catCode);
      const { data: pinnedSurfaces } = await pinnedQuery;
      const pinnedIds = new Set((pinnedSurfaces ?? []).map((p: any) => p.content_item_id));

      // Fetch candidates
      const itemQuery = supabase
        .from('content_items')
        .select('id, content_type, freshness_score, source_trust_score, published_at, source_country, source_id, title, image_url, source_name')
        .eq('status', 'published')
        .in('content_type', rules.types)
        .order('freshness_score', { ascending: false })
        .limit(rules.maxItems * 6);
      const { data: items } = await itemQuery;

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

      const confidenceMap = new Map<string, number>();
      (tags ?? []).forEach((t: any) => {
        const key = `${t.content_item_id}::${t.category_code}`;
        confidenceMap.set(key, t.confidence_score ?? 0.3);
      });

      const ranked = allItems
        .filter((item: any) => !excludedIds.has(item.id) && !pinnedIds.has(item.id))
        .filter((item: any) => (qualityMap.get(item.id) ?? 0.5) >= rules.minQuality)
        .filter((item: any) => {
          if (!catCode) return true;
          const itemCats = catMap.get(item.id) ?? [];
          if (!itemCats.includes(catCode)) return false;
          const conf = confidenceMap.get(`${item.id}::${catCode}`) ?? 0;
          return conf >= 0.35;
        })
        .map((item: any) => {
          const quality = qualityMap.get(item.id) ?? 0.5;
          const text = item.title ?? '';
          const slRelevance = detectSriLankaRelevance(text);
          const commercialRelevance = detectCommercialRelevance(text);
          const topCatConf = (tags ?? []).find((t: any) => t.content_item_id === item.id)?.confidence_score ?? 0.3;
          const localUtility = computeLocalUtilityScore(item, slRelevance, commercialRelevance, topCatConf);
          const relevanceBand = computeRelevanceBand(slRelevance, commercialRelevance, topCatConf);

          let rank: number;
          if (rules.isHero) {
            rank = computeHeroScore(item, quality, localUtility) * 100;
          } else {
            rank = (item.freshness_score ?? 50) * 0.25 +
                   (item.source_trust_score ?? 0.7) * 100 * 0.15 +
                   quality * 100 * 0.25 +
                   localUtility * 100 * 0.20 +
                   (item.published_at ? Math.max(0, 100 - (Date.now() - new Date(item.published_at).getTime()) / 3600000) : 0) * 0.15;
          }

          return { ...item, quality, rank, localUtility, relevanceBand, slRelevance, commercialRelevance, categories: catMap.get(item.id) ?? [] };
        })
        .sort((a: any, b: any) => b.rank - a.rank);

      // ─── Apply diversity filters ───
      const selected: any[] = [];
      const sourceCountInSurface = new Map<string, number>();
      const selectedTitles: string[] = [];
      const contentTypeCount = new Map<string, number>();
      const maxSlots = rules.maxItems - pinnedIds.size;

      for (const item of ranked) {
        if (selected.length >= maxSlots) break;

        const surfCount = itemSurfaceCount.get(item.id) ?? 0;
        if (surfCount >= MAX_SURFACES_PER_ITEM) continue;

        const srcCount = sourceCountInSurface.get(item.source_id ?? '') ?? 0;
        if (srcCount >= MAX_ITEMS_PER_SOURCE_PER_SURFACE) continue;

        const typeCount = contentTypeCount.get(item.content_type) ?? 0;
        if (typeCount >= MAX_SAME_CONTENT_TYPE_PER_SURFACE) continue;

        const isDuplicate = selectedTitles.some(t => titleSimilarity(t, item.title) > SIMILAR_TITLE_THRESHOLD);
        if (isDuplicate) continue;

        if (selected.length >= MAX_SAME_CATEGORY_CONSECUTIVE) {
          const recentCats = selected.slice(-MAX_SAME_CATEGORY_CONSECUTIVE).map((s: any) => s.categories?.[0]);
          const itemCat = item.categories?.[0];
          if (itemCat && recentCats.every((c: string) => c === itemCat)) continue;
        }

        selected.push(item);
        sourceCountInSurface.set(item.source_id ?? '', srcCount + 1);
        selectedTitles.push(item.title);
        contentTypeCount.set(item.content_type, typeCount + 1);
        itemSurfaceCount.set(item.id, surfCount + 1);
      }

      // Collect rich preview data with explainability
      preview[previewKey] = selected.map(s => ({
        id: s.id,
        title: s.title,
        content_type: s.content_type,
        source_name: s.source_name ?? '—',
        rank: Math.round(s.rank * 10) / 10,
        quality: Math.round((s.quality ?? 0) * 100) / 100,
        freshness: s.freshness_score ?? 0,
        local_utility: Math.round((s.localUtility ?? 0) * 100) / 100,
        relevance_band: s.relevanceBand,
        source_country: s.source_country,
        has_image: !!s.image_url,
        categories: s.categories ?? [],
        warnings: [
          ...(s.quality < rules.minQuality + 0.1 ? ['near_quality_threshold'] : []),
          ...(s.relevanceBand === 'global_low_utility' ? ['low_local_utility'] : []),
          ...(!s.image_url && rules.isHero ? ['no_hero_image'] : []),
        ],
      }));

      // In dry_run mode, skip actual DB writes
      if (dryRun) continue;

      // Deactivate old (except pinned)
      let deactQuery = supabase
        .from('content_surface_state')
        .select('id')
        .eq('surface_code', effectiveSurface)
        .eq('active', true)
        .lt('rank_score', 990);
      if (catCode) deactQuery = deactQuery.eq('category_code', catCode);

      if (pinnedIds.size > 0) {
        const { data: toDeactivate } = await deactQuery;
        if (toDeactivate?.length) {
          await supabase.from('content_surface_state').update({ active: false }).in('id', toDeactivate.map((d: any) => d.id));
        }
      } else {
        let clearQuery = supabase.from('content_surface_state').update({ active: false }).eq('surface_code', effectiveSurface).eq('active', true);
        if (catCode) clearQuery = clearQuery.eq('category_code', catCode);
        await clearQuery;
      }

      // Insert new ranked items
      if (selected.length > 0) {
        await supabase.from('content_surface_state').insert(
          selected.map((item: any) => ({
            surface_code: effectiveSurface,
            content_item_id: item.id,
            rank_score: Math.round(item.rank * 10) / 10,
            active: true,
            category_code: catCode ?? item.categories?.[0] ?? null,
          }))
        );
      }
    }
  }

  return preview;
}

// ─── Freshness decay job ───
async function runDecay() {
  const { data: items } = await supabase
    .from('content_items')
    .select('id, content_type, published_at, freshness_score')
    .eq('status', 'published')
    .limit(200);

  if (!items?.length) return { decayed: 0, archived: 0 };

  let decayed = 0;
  let archived = 0;
  for (const item of items) {
    const newFreshness = computeFreshness(item.content_type, item.published_at);
    const shouldArchive = newFreshness === 0;

    if (shouldArchive) {
      await supabase.from('content_items').update({ status: 'archived', freshness_score: 0 }).eq('id', item.id);
      await supabase.from('content_surface_state').update({ active: false }).eq('content_item_id', item.id);
      archived++;
    } else if (Math.abs((item.freshness_score ?? 0) - newFreshness) > 3) {
      await supabase.from('content_items').update({ freshness_score: newFreshness }).eq('id', item.id);
    }
    decayed++;
  }
  return { decayed, archived };
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

// ─── Source readiness audit ───
async function auditSources() {
  const { data: sources } = await supabase.from('content_sources').select('*');
  if (!sources?.length) return [];

  // Get item counts per source
  const ids = sources.map((s: any) => s.id);
  const { data: items } = await supabase.from('content_items').select('source_id, status').in('source_id', ids);
  const countMap: Record<string, { published: number; rejected: number; total: number; needs_review: number }> = {};
  (items ?? []).forEach((i: any) => {
    const c = countMap[i.source_id] ??= { published: 0, rejected: 0, total: 0, needs_review: 0 };
    c.total++;
    if (i.status === 'published') c.published++;
    if (i.status === 'rejected') c.rejected++;
    if (i.status === 'needs_review') c.needs_review++;
  });

  return sources.map((s: any) => {
    const counts = countMap[s.id] ?? { published: 0, rejected: 0, total: 0, needs_review: 0 };
    return {
      id: s.id,
      name: s.source_name,
      type: s.source_type,
      active: s.active,
      has_url: !!s.base_url,
      trust_score: s.trust_score,
      tier: classifySourceTier(s),
      readiness: classifySourceReadiness(s),
      sri_lanka_bias: s.sri_lanka_bias ?? 0,
      sl_relevant: (s.sri_lanka_bias ?? 0) >= 0.5,
      category_allowlist: s.category_allowlist,
      last_fetched_at: s.last_fetched_at,
      freshness_priority: s.freshness_priority,
      counts,
    };
  });
}

// ─── Main handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? 'full';
    const startTime = Date.now();
    const results: Record<string, any> = {
      mode,
      fetched: 0, normalized: 0, deduped: 0, accepted: 0, rejected: 0,
      briefed: 0, published: 0, decayed: 0, archived: 0,
      clustered: 0, surfaces_refreshed: 0,
      title_rejected: 0,
      source_errors: [] as string[],
      needs_review: 0,
    };

    // ─── Source audit mode ───
    if (mode === 'audit_sources') {
      const audit = await auditSources();
      return new Response(
        JSON.stringify({ success: true, mode, sources: audit }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Dry run / publish preview — ranks but does NOT write to surfaces ───
    if (mode === 'dry_run' || mode === 'publish_preview') {
      const preview = await publishToSurfaces(true);
      return new Response(
        JSON.stringify({ success: true, mode, preview, duration_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Decay only ───
    if (mode === 'decay') {
      const decayResult = await runDecay();
      return new Response(
        JSON.stringify({ success: true, mode, ...decayResult, duration_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Cluster only ───
    if (mode === 'cluster') {
      const clustered = await runClustering();
      return new Response(
        JSON.stringify({ success: true, mode, clustered, duration_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Brief only ───
    if (mode === 'brief') {
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
              prompt_version: 'v6-hardened',
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
            if (newStatus === 'needs_review') results.needs_review++;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, ...results, duration_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Publish only ───
    if (mode === 'publish') {
      await publishToSurfaces(false);
      results.surfaces_refreshed = Object.keys(SURFACE_RULES).length;
      return new Response(
        JSON.stringify({ success: true, ...results, duration_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Full or ingest mode ───
    // 1. Ingest from sources
    if (mode === 'full' || mode === 'ingest') {
      const { data: sources } = await supabase.from('content_sources').select('*').eq('active', true);
      if (sources?.length) {
        for (const source of sources) {
          if (source.source_type === 'internal_editorial' || source.source_type === 'knowledge' || !source.base_url) continue;

          // Staged rollout: tier-based filtering
          if (body.tier_limit) {
            const tier = classifySourceTier(source);
            if (body.tier_limit === 'tier1' && tier !== 'tier1_safe') continue;
            if (body.tier_limit === 'tier2' && tier === 'tier3_experimental') continue;
          }

          try {
            const resp = await fetch(source.base_url, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(10000),
            });
            if (!resp.ok) {
              console.warn(`Source ${source.source_name} returned ${resp.status}`);
              results.source_errors.push(`${source.source_name}: HTTP ${resp.status}`);
              continue;
            }
            const data = await resp.json();
            const articles = data.articles ?? data.results ?? data.data ?? [];
            results.fetched += articles.length;

            for (const article of articles.slice(0, 15)) {
              const title = (article.title ?? article.headline ?? '').trim();
              if (!title || title.length < 10) continue;

              // Title quality gate
              const titleCheck = assessTitleQuality(title);
              if (!titleCheck.pass) {
                results.title_rejected++;
                continue;
              }

              const dedupeKey = generateDedupeKey(title, source.source_name);
              const { data: existing } = await supabase.from('content_items').select('id').eq('dedupe_key', dedupeKey).limit(1);
              if (existing?.length) { results.deduped++; continue; }

              // Similar title check against recent items
              const { data: recentItems } = await supabase
                .from('content_items')
                .select('title')
                .order('created_at', { ascending: false })
                .limit(30);
              const isSimilar = (recentItems ?? []).some((r: any) => titleSimilarity(r.title, title) > SIMILAR_TITLE_THRESHOLD);
              if (isSimilar) { results.deduped++; continue; }

              const text = `${title} ${article.description ?? ''} ${article.content ?? ''}`;
              const categories = detectCategories(text);
              const contentType = detectContentType(text);
              const slRelevance = detectSriLankaRelevance(text);

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
            results.source_errors.push(`${source.source_name}: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

        await supabase.from('content_sources').update({ last_fetched_at: new Date().toISOString() }).eq('active', true);
      }
    }

    // 2. AI Briefing (full mode)
    if (mode === 'full') {
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
              prompt_version: 'v6-hardened',
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
            if (newStatus === 'needs_review') results.needs_review++;
          } else {
            await supabase.from('content_items').update({ status: 'processed' }).eq('id', item.id);
          }
        }
      }
    }

    // 3. Surface publishing (full mode)
    if (mode === 'full') {
      await publishToSurfaces(false);
      results.surfaces_refreshed = Object.keys(SURFACE_RULES).length;
    }

    // 4. Decay (full mode)
    if (mode === 'full') {
      const decayResult = await runDecay();
      results.decayed = decayResult.decayed;
      results.archived = decayResult.archived;
    }

    // 5. Clustering (full mode)
    if (mode === 'full') {
      results.clustered = await runClustering();
    }

    const duration = Date.now() - startTime;
    console.log(`[content-ingest] Pipeline complete (mode=${mode}, ${duration}ms):`, JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, duration_ms: duration, ...results }),
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
