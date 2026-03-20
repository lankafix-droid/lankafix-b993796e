/**
 * Content Ingestion Edge Function — Full pipeline v9.
 * Modes: full, ingest, brief, publish, decay, cluster, dry_run, publish_preview, audit_sources, fetch_only, validate_sources, rescue_review
 * Now with: priority briefing, editorial rescue, calibrated quality scoring, Sri Lanka source prioritization.
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
const NEWSDATA_API_KEY = Deno.env.get("NEWSDATA_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Dynamic API key injection ───
function resolveSourceUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  // Replace demo key with real key if available
  if (baseUrl.includes('apikey=pub_demo') && NEWSDATA_API_KEY) {
    return baseUrl.replace('apikey=pub_demo', `apikey=${NEWSDATA_API_KEY}`);
  }
  return baseUrl;
}

// ─── RSS Feed parser (for free sources without API keys) ───
function parseRSSItems(xmlText: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
      return m?.[1]?.trim() ?? null;
    };
    const title = get('title');
    if (!title) continue;
    items.push({
      title,
      description: get('description'),
      url: get('link'),
      pubDate: get('pubDate'),
      content: get('content:encoded') ?? get('description'),
    });
  }
  return items;
}

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

const SRI_LANKA_SIGNALS = [
  'sri lanka', 'colombo', 'kandy', 'galle', 'lk', 'ceylon', 'sinhala', 'tamil',
  'ceb', 'leco', 'rupee', 'lkr', 'monsoon', 'south asia', 'tropical',
  'dialog', 'mobitel', 'sri lankan', 'rajagiriya', 'nugegoda', 'dehiwala',
  'electricity tariff', 'load shedding', 'power cut', 'matara', 'jaffna',
  'kurunegala', 'negombo', 'puttalam', 'anuradhapura', 'ratnapura',
  'ceb bill', 'water board', 'nwsdb', 'slt', 'hutch', 'airtel',
];

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

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function assessTitleQuality(title: string): { pass: boolean; reason: string } {
  if (title.length < 15) return { pass: false, reason: 'too_short' };
  if (title.length > 200) return { pass: false, reason: 'too_long' };
  const clickbait = /^(you won'?t believe|shocking|this is|omg|watch out|click here|breaking:?\s*$)/i;
  if (clickbait.test(title)) return { pass: false, reason: 'clickbait' };
  const upperRatio = (title.match(/[A-Z]/g) ?? []).length / title.length;
  if (upperRatio > 0.6 && title.length > 20) return { pass: false, reason: 'excessive_caps' };
  const generic = ['untitled', 'no title', 'test', 'lorem ipsum', 'sample', 'placeholder'];
  if (generic.some(g => title.toLowerCase().includes(g))) return { pass: false, reason: 'generic' };
  const words = title.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 3) return { pass: false, reason: 'low_information' };
  return { pass: true, reason: 'ok' };
}

type RelevanceBand = 'local_high' | 'local_medium' | 'regional' | 'global_high_utility' | 'global_low_utility';

function computeRelevanceBand(slRelevance: number, commercialRelevance: number, categoryConfidence: number): RelevanceBand {
  if (slRelevance >= 0.8 && commercialRelevance >= 0.3) return 'local_high';
  if (slRelevance >= 0.5) return 'local_medium';
  if (slRelevance >= 0.3 && categoryConfidence >= 0.4) return 'regional';
  if (commercialRelevance >= 0.4 || categoryConfidence >= 0.5) return 'global_high_utility';
  return 'global_low_utility';
}

function computeLocalUtilityScore(item: {
  source_country?: string; source_trust_score?: number; freshness_score?: number; content_type?: string;
}, slRelevance: number, commercialRelevance: number, categoryConfidence: number): number {
  const isLocal = item.source_country === 'lk' || item.source_country === 'LK';
  const localityScore = isLocal ? 0.9 : (slRelevance > 0.6 ? 0.6 : 0.2);
  const trustScore = Math.min(1, (item.source_trust_score ?? 0.5));
  const freshnessNorm = Math.min(1, (item.freshness_score ?? 30) / 100);
  const isSafety = item.content_type === 'safety_alert' || item.content_type === 'scam_alert';
  const safetyBonus = isSafety ? 0.15 : 0;
  return Math.min(1,
    localityScore * 0.25 + slRelevance * 0.20 + categoryConfidence * 0.15 +
    commercialRelevance * 0.15 + trustScore * 0.10 + freshnessNorm * 0.10 + safetyBonus + 0.05
  );
}

function computeHeroScore(item: any, quality: number, localUtility: number): number {
  const freshness = (item.freshness_score ?? 50) / 100;
  const hasImage = item.image_url ? 0.1 : 0;
  const headlineQuality = (item.title?.length > 30 && item.title?.length < 120) ? 0.05 : 0;
  const isSafety = (item.content_type === 'safety_alert' || item.content_type === 'scam_alert') ? 0.1 : 0;
  return (
    quality * 0.30 + freshness * 0.25 + localUtility * 0.20 +
    hasImage + headlineQuality + isSafety + (item.source_trust_score ?? 0.5) * 0.10
  );
}

// ─── AI Briefing ───
async function generateAIBrief(item: { title: string; raw_excerpt: string | null; content_type: string; categories: string[]; sri_lanka_relevance: number }) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const slContext = item.sri_lanka_relevance > 0.5
      ? `\nSri Lanka Context: This content has genuine Sri Lanka relevance. Include local perspective where supported by source text only.`
      : '';
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
- Keep tone professional, helpful, trustworthy, and simple.
- Focus on how the content helps someone making service/repair/maintenance decisions.
- For ai_why_it_matters: explain practical impact on homeowners/businesses. Source-grounded only.
- For ai_lankafix_angle: only include genuine connections to repair/maintenance/home services. Null if forced.

QUALITY SCORING GUIDE (ai_quality_score 0.0 to 1.0) — CALIBRATED:
- 0.80-1.0: Outstanding — deeply actionable, verified data, strong local relevance, comprehensive detail.
- 0.60-0.80: Strong — clear practical value, good depth, useful for decision-making.
- 0.45-0.60: Solid — relevant topic from credible source, useful even if brief. Most articles from reputable tech/news sources should land here.
- 0.30-0.45: Marginal — topic tangentially relevant, thin detail, limited actionability.
- 0.00-0.30: Poor — irrelevant to services/repair/tech, no useful information, spam-like.

CRITICAL CALIBRATION NOTES:
- An article from a reputable source (TechCrunch, Ars Technica, SecurityWeek, etc.) about technology, security, energy, or repair topics should score AT LEAST 0.50 even if the excerpt is brief.
- Sri Lanka-specific content with practical utility should score AT LEAST 0.55.
- Only score below 0.30 for genuinely irrelevant or spam content.
- Brief excerpts from quality sources are NOT low quality — they just have less detail. Score the TOPIC RELEVANCE and SOURCE CREDIBILITY, not just excerpt length.`
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

Generate a structured brief. Be source-grounded only. Do not invent any facts or numbers.`
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
                ai_why_it_matters: { type: "string", description: "Why this matters, 1-2 sentences. Source-grounded only." },
                ai_lankafix_angle: { type: ["string", "null"], description: "How this relates to LankaFix services. Null if no genuine connection." },
                ai_banner_text: { type: ["string", "null"], description: "A number/stat from the source text verbatim. Null if none exists." },
                ai_cta_label: { type: "string", description: "CTA text like 'Learn More', 'Check Your Device', 'Book Service'" },
                ai_keywords: { type: "array", items: { type: "string" }, description: "3-5 keywords" },
                ai_risk_flags: { type: "array", items: { type: "string" }, description: "Risk warnings only if genuinely present in source" },
                ai_quality_score: { type: "number", description: "0.0-1.0 per the calibration guide. Reputable source + relevant topic = 0.50 minimum." },
              },
              required: ["ai_headline", "ai_summary_short", "ai_summary_medium", "ai_quality_score"],
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_brief" } },
      }),
    });
    if (!response.ok) { console.error("AI brief generation failed:", response.status); return null; }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      result.ai_quality_score = Math.max(0, Math.min(1, result.ai_quality_score ?? 0.5));
      return result;
    }
    return null;
  } catch (e) { console.error("AI brief error:", e); return null; }
}

// ─── Freshness ───
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

const SURFACE_RULES: Record<string, { types: string[]; maxItems: number; minQuality: number; isHero?: boolean; categoryBound?: boolean }> = {
  homepage_hero: { types: ['breaking_news', 'innovation', 'safety_alert', 'hot_topic', 'market_shift'], maxItems: 3, minQuality: 0.50, isHero: true },
  homepage_hot_now: { types: ['breaking_news', 'hot_topic', 'trend_signal', 'most_read'], maxItems: 8, minQuality: 0.25 },
  homepage_did_you_know: { types: ['knowledge_fact', 'on_this_day', 'history', 'how_to'], maxItems: 4, minQuality: 0.20 },
  homepage_innovations: { types: ['innovation', 'market_shift', 'trend_signal'], maxItems: 4, minQuality: 0.25 },
  homepage_safety: { types: ['safety_alert', 'scam_alert'], maxItems: 3, minQuality: 0.30 },
  homepage_numbers: { types: ['numbers_insight', 'market_shift'], maxItems: 4, minQuality: 0.20 },
  homepage_popular: { types: ['most_read', 'hot_topic', 'how_to', 'innovation'], maxItems: 5, minQuality: 0.25 },
  ai_banner_forum: { types: ['breaking_news', 'innovation', 'safety_alert', 'trend_signal'], maxItems: 5, minQuality: 0.30 },
  category_featured: { types: ['breaking_news', 'hot_topic', 'innovation', 'safety_alert', 'trend_signal', 'how_to', 'market_shift'], maxItems: 1, minQuality: 0.25, categoryBound: true },
  category_feed: { types: ['breaking_news', 'hot_topic', 'innovation', 'safety_alert', 'scam_alert', 'trend_signal', 'how_to', 'knowledge_fact', 'numbers_insight', 'market_shift'], maxItems: 6, minQuality: 0.20, categoryBound: true },
};

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
  if ((source.sri_lanka_bias ?? 0) >= 0.7) return 'sl_relevant';
  if ((source.sri_lanka_bias ?? 0) < 0.3 && source.base_url) return 'global_only';
  return 'ready';
}

// ─── Pipeline run logging ───
async function createPipelineRun(mode: string, triggeredBy: string): Promise<string | null> {
  const { data } = await supabase.from('pipeline_runs').insert({
    mode, triggered_by: triggeredBy, status: 'running',
  }).select('id').single();
  return data?.id ?? null;
}

async function completePipelineRun(runId: string | null, results: Record<string, any>, status = 'completed') {
  if (!runId) return;
  await supabase.from('pipeline_runs').update({
    status,
    finished_at: new Date().toISOString(),
    duration_ms: results.duration_ms ?? 0,
    fetched: results.fetched ?? 0,
    normalized: results.normalized ?? 0,
    deduped: results.deduped ?? 0,
    title_rejected: results.title_rejected ?? 0,
    briefed: results.briefed ?? 0,
    published: results.published ?? 0,
    needs_review: results.needs_review ?? 0,
    rejected: results.rejected ?? 0,
    archived: results.archived ?? 0,
    decayed: results.decayed ?? 0,
    surfaces_refreshed: results.surfaces_refreshed ?? 0,
    clusters_created: results.clustered ?? 0,
    warnings_count: results.warnings_count ?? 0,
    errors_count: (results.source_errors?.length ?? 0),
    error_details: results.source_errors?.slice(0, 20) ?? [],
  }).eq('id', runId);
}

// ─── Failure alerting ───
async function generateAlerts(results: Record<string, any>, runId: string | null) {
  const alerts: any[] = [];

  // All sources failed
  if (results.fetched === 0 && results.source_errors?.length > 0) {
    alerts.push({
      alert_type: 'pipeline_failure',
      severity: 'critical',
      title: 'All sources failed to fetch',
      description: `${results.source_errors.length} source errors. No content ingested.`,
      pipeline_run_id: runId,
    });
  }

  // Zero published after a full run
  if (results.mode === 'full' && results.published === 0 && results.fetched > 0) {
    alerts.push({
      alert_type: 'quality_drop',
      severity: 'warning',
      title: 'Zero items published from live run',
      description: `Fetched ${results.fetched} items but none passed quality gates.`,
      pipeline_run_id: runId,
    });
  }

  // High reject rate
  const totalProcessed = (results.fetched ?? 0);
  const totalRejected = (results.title_rejected ?? 0) + (results.rejected ?? 0);
  if (totalProcessed > 5 && totalRejected / totalProcessed > 0.8) {
    alerts.push({
      alert_type: 'quality_drop',
      severity: 'warning',
      title: 'High rejection rate',
      description: `${Math.round(totalRejected / totalProcessed * 100)}% of fetched items were rejected.`,
      pipeline_run_id: runId,
    });
  }

  if (alerts.length > 0) {
    await supabase.from('content_alerts').insert(alerts);
  }

  return alerts.length;
}

// ─── Source validation ───
async function validateSources() {
  const { data: sources } = await supabase.from('content_sources').select('*').eq('active', true);
  if (!sources?.length) return [];

  const results = [];
  for (const source of sources) {
    const result: any = {
      id: source.id,
      name: source.source_name,
      type: source.source_type,
      has_url: !!source.base_url,
      trust_score: source.trust_score,
      tier: classifySourceTier(source),
      readiness: classifySourceReadiness(source),
      rollout_state: source.rollout_state ?? 'inactive',
      reachable: false,
      auth_ok: true,
      response_valid: false,
      fetched_count: 0,
      error: null,
    };

    if (!source.base_url || source.source_type === 'internal_editorial' || source.source_type === 'knowledge') {
      result.reachable = source.source_type === 'internal_editorial' || source.source_type === 'knowledge';
      result.response_valid = result.reachable;
      results.push(result);
      continue;
    }

    try {
      const resolvedUrl = resolveSourceUrl(source.base_url);
      const isRSS = source.source_type === 'rss' || resolvedUrl.includes('/feed') || resolvedUrl.includes('/rss');
      const resp = await fetch(resolvedUrl, {
        headers: { 'Accept': isRSS ? 'application/xml, text/xml' : 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      result.reachable = true;

      if (resp.status === 401 || resp.status === 403) {
        result.auth_ok = false;
        result.error = `Auth failure: HTTP ${resp.status}`;
        // Auto-quarantine on auth failure
        await supabase.from('content_sources').update({ rollout_state: 'failing' }).eq('id', source.id);
      } else if (!resp.ok) {
        result.error = `HTTP ${resp.status}`;
      } else {
        let articles: any[];
        if (isRSS) {
          const xmlText = await resp.text();
          articles = parseRSSItems(xmlText);
        } else {
          const data = await resp.json();
          articles = data.articles ?? data.results ?? data.data ?? [];
        }
        result.fetched_count = articles.length;
        result.response_valid = Array.isArray(articles) && articles.length > 0;
        result.has_real_key = !source.base_url.includes('pub_demo') || !!NEWSDATA_API_KEY;

        if (result.response_valid && source.rollout_state === 'inactive') {
          await supabase.from('content_sources').update({ rollout_state: 'validated' }).eq('id', source.id);
        }
      }
    } catch (e) {
      result.error = e instanceof Error ? e.message : 'Unknown error';
      result.reachable = false;
    }

    results.push(result);
  }

  // Generate alerts for consecutive failures
  const failingSources = results.filter(r => !r.reachable || !r.auth_ok);
  if (failingSources.length > 0) {
    for (const fs of failingSources) {
      await supabase.from('content_alerts').insert({
        alert_type: 'source_failure',
        severity: failingSources.length === results.length ? 'critical' : 'warning',
        title: `Source failing: ${fs.name}`,
        description: fs.error ?? 'Unreachable',
        source_id: fs.id,
      });
    }
  }

  return results;
}

// ─── Surface publishing with rollout mode awareness ───
async function publishToSurfaces(dryRun = false) {
  const itemSurfaceCount = new Map<string, number>();
  const preview: Record<string, any[]> = {};

  // Load surface configs for rollout mode
  const { data: surfaceConfigs } = await supabase.from('content_surface_config').select('*');
  const configMap = new Map((surfaceConfigs ?? []).map((c: any) => [c.surface_code, c]));

  const { data: excludedItems } = await supabase
    .from('content_items').select('id').in('status', ['rejected', 'archived']).limit(500);
  const excludedIds = new Set((excludedItems ?? []).map((e: any) => e.id));

  const CATEGORY_CODES = ['MOBILE', 'AC', 'IT', 'CCTV', 'SOLAR', 'CONSUMER_ELEC', 'SMART_HOME_OFFICE', 'ELECTRICAL', 'PLUMBING', 'NETWORK', 'POWER_BACKUP', 'HOME_SECURITY', 'APPLIANCE_INSTALL', 'COPIER', 'PRINT_SUPPLIES'];

  for (const [surfaceCode, rules] of Object.entries(SURFACE_RULES)) {
    const config = configMap.get(surfaceCode);

    // Skip frozen surfaces
    if (config?.frozen && !dryRun) {
      preview[surfaceCode] = [{ _frozen: true, _reason: 'Surface is frozen by ops' }];
      continue;
    }

    // Skip evergreen_only surfaces in live mode (they stay fallback)
    if (config?.rollout_mode === 'evergreen_only' && !dryRun) {
      continue;
    }

    const categories = rules.categoryBound ? CATEGORY_CODES : [null];

    for (const catCode of categories) {
      const previewKey = catCode ? `${surfaceCode}:${catCode}` : surfaceCode;

      let pinnedQuery = supabase
        .from('content_surface_state').select('content_item_id')
        .eq('surface_code', surfaceCode).eq('active', true).gte('rank_score', 990);
      if (catCode) pinnedQuery = pinnedQuery.eq('category_code', catCode);
      const { data: pinnedSurfaces } = await pinnedQuery;
      const pinnedIds = new Set((pinnedSurfaces ?? []).map((p: any) => p.content_item_id));

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
        ids.length > 0 ? supabase.from('content_ai_briefs').select('content_item_id, ai_quality_score').in('content_item_id', ids) : Promise.resolve({ data: [] }),
        ids.length > 0 ? supabase.from('content_category_tags').select('content_item_id, category_code, confidence_score').in('content_item_id', ids) : Promise.resolve({ data: [] }),
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
        confidenceMap.set(`${t.content_item_id}::${t.category_code}`, t.confidence_score ?? 0.3);
      });

      const ranked = allItems
        .filter((item: any) => !excludedIds.has(item.id) && !pinnedIds.has(item.id))
        .filter((item: any) => (qualityMap.get(item.id) ?? 0.5) >= rules.minQuality)
        .filter((item: any) => {
          if (!catCode) return true;
          const itemCats = catMap.get(item.id) ?? [];
          if (!itemCats.includes(catCode)) return false;
          return (confidenceMap.get(`${item.id}::${catCode}`) ?? 0) >= 0.35;
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

      // Diversity filters
      const selected: any[] = [];
      const sourceCountInSurface = new Map<string, number>();
      const selectedTitles: string[] = [];
      const contentTypeCount = new Map<string, number>();
      const maxSlots = rules.maxItems - pinnedIds.size;

      for (const item of ranked) {
        if (selected.length >= maxSlots) break;
        if ((itemSurfaceCount.get(item.id) ?? 0) >= MAX_SURFACES_PER_ITEM) continue;
        if ((sourceCountInSurface.get(item.source_id ?? '') ?? 0) >= MAX_ITEMS_PER_SOURCE_PER_SURFACE) continue;
        if ((contentTypeCount.get(item.content_type) ?? 0) >= MAX_SAME_CONTENT_TYPE_PER_SURFACE) continue;
        if (selectedTitles.some(t => titleSimilarity(t, item.title) > SIMILAR_TITLE_THRESHOLD)) continue;
        if (selected.length >= MAX_SAME_CATEGORY_CONSECUTIVE) {
          const recentCats = selected.slice(-MAX_SAME_CATEGORY_CONSECUTIVE).map((s: any) => s.categories?.[0]);
          const itemCat = item.categories?.[0];
          if (itemCat && recentCats.every((c: string) => c === itemCat)) continue;
        }
        selected.push(item);
        sourceCountInSurface.set(item.source_id ?? '', (sourceCountInSurface.get(item.source_id ?? '') ?? 0) + 1);
        selectedTitles.push(item.title);
        contentTypeCount.set(item.content_type, (contentTypeCount.get(item.content_type) ?? 0) + 1);
        itemSurfaceCount.set(item.id, (itemSurfaceCount.get(item.id) ?? 0) + 1);
      }

      preview[previewKey] = selected.map(s => ({
        id: s.id, title: s.title, content_type: s.content_type,
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

      if (dryRun) continue;

      // Deactivate old (except pinned)
      if (pinnedIds.size > 0) {
        let deactQuery = supabase.from('content_surface_state').select('id')
          .eq('surface_code', surfaceCode).eq('active', true).lt('rank_score', 990);
        if (catCode) deactQuery = deactQuery.eq('category_code', catCode);
        const { data: toDeactivate } = await deactQuery;
        if (toDeactivate?.length) {
          await supabase.from('content_surface_state').update({ active: false }).in('id', toDeactivate.map((d: any) => d.id));
        }
      } else {
        let clearQuery = supabase.from('content_surface_state').update({ active: false })
          .eq('surface_code', surfaceCode).eq('active', true);
        if (catCode) clearQuery = clearQuery.eq('category_code', catCode);
        await clearQuery;
      }

      if (selected.length > 0) {
        await supabase.from('content_surface_state').insert(
          selected.map((item: any) => ({
            surface_code: surfaceCode,
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

// ─── Freshness decay ───
async function runDecay() {
  const { data: items } = await supabase
    .from('content_items').select('id, content_type, published_at, freshness_score')
    .eq('status', 'published').limit(200);
  if (!items?.length) return { decayed: 0, archived: 0 };
  let decayed = 0, archived = 0;
  for (const item of items) {
    const newFreshness = computeFreshness(item.content_type, item.published_at);
    if (newFreshness === 0) {
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
    .from('content_items').select('id, title, content_type, published_at, source_country')
    .eq('status', 'published').order('published_at', { ascending: false }).limit(50);
  if (!items || items.length < 3) return 0;

  const ids = items.map((i: any) => i.id);
  const { data: tags } = await supabase.from('content_category_tags').select('content_item_id, category_code').in('content_item_id', ids);
  const tagMap = new Map<string, string[]>();
  (tags ?? []).forEach((t: any) => { (tagMap.get(t.content_item_id) ?? (tagMap.set(t.content_item_id, []), tagMap.get(t.content_item_id)!)).push(t.category_code); });

  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'for', 'on', 'with', 'and', 'or', 'but', 'not', 'by', 'at']);
  const getKeywords = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  const withKw = items.map((i: any) => ({
    id: i.id, title: i.title, kw: getKeywords(i.title),
    category_codes: tagMap.get(i.id) ?? [], source_country: i.source_country,
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
      if (withKw[j].kw.filter(w => setA.has(w)).length / Math.max(withKw[i].kw.length, 1) >= 0.3) {
        group.push(withKw[j]); assigned.add(withKw[j].id);
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
      const commercialCats = new Set(['MOBILE', 'AC', 'IT', 'SOLAR', 'ELECTRICAL', 'PLUMBING']);
      await supabase.from('content_trend_clusters').upsert({
        cluster_key: key,
        cluster_label: label.charAt(0).toUpperCase() + label.slice(1),
        category_code: topCat,
        momentum_score: Math.min(100, group.length * 25),
        content_count: group.length,
        sri_lanka_relevance_score: Math.min(100, Math.round((slCount / group.length) * 100)),
        commercial_relevance_score: allCats.some(c => commercialCats.has(c)) ? 70 : 40,
        active: true, last_seen_at: new Date().toISOString(),
      }, { onConflict: 'cluster_key' });
      clustered++;
    }
  }
  return clustered;
}

// ─── Source audit ───
async function auditSources() {
  const { data: sources } = await supabase.from('content_sources').select('*');
  if (!sources?.length) return [];
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
  return sources.map((s: any) => ({
    id: s.id, name: s.source_name, type: s.source_type, active: s.active,
    has_url: !!s.base_url, trust_score: s.trust_score,
    tier: classifySourceTier(s), readiness: classifySourceReadiness(s),
    rollout_state: s.rollout_state ?? 'inactive',
    sri_lanka_bias: s.sri_lanka_bias ?? 0, sl_relevant: (s.sri_lanka_bias ?? 0) >= 0.5,
    category_allowlist: s.category_allowlist, last_fetched_at: s.last_fetched_at,
    freshness_priority: s.freshness_priority, counts: countMap[s.id] ?? { published: 0, rejected: 0, total: 0, needs_review: 0 },
  }));
}

// ─── Ingestion from sources ───
async function ingestFromSources(tierLimit: string | undefined, results: Record<string, any>) {
  const { data: sources } = await supabase.from('content_sources').select('*').eq('active', true);
  if (!sources?.length) return;

  const fetchedSourceIds: string[] = [];

  for (const source of sources) {
    if (source.source_type === 'internal_editorial' || source.source_type === 'knowledge' || !source.base_url) continue;

    // Rollout state gate: quarantined sources skip
    if (source.rollout_state === 'quarantined') continue;

    // Tier filtering
    if (tierLimit) {
      const tier = classifySourceTier(source);
      if (tierLimit === 'tier1' && tier !== 'tier1_safe') continue;
      if (tierLimit === 'tier2' && tier === 'tier3_experimental') continue;
    }

    try {
      const resolvedUrl = resolveSourceUrl(source.base_url);
      const isRSS = source.source_type === 'rss' || resolvedUrl.includes('/feed') || resolvedUrl.includes('/rss') || resolvedUrl.endsWith('.xml');

      const resp = await fetch(resolvedUrl, {
        headers: { 'Accept': isRSS ? 'application/xml, text/xml, application/rss+xml' : 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        console.warn(`Source ${source.source_name} returned ${resp.status}`);
        results.source_errors.push(`${source.source_name}: HTTP ${resp.status}`);
        // Track auth failures for alerting
        if (resp.status === 401 || resp.status === 403) {
          await supabase.from('content_sources').update({ rollout_state: 'failing' }).eq('id', source.id);
        }
        continue;
      }
      fetchedSourceIds.push(source.id);

      let articles: any[];
      if (isRSS) {
        const xmlText = await resp.text();
        articles = parseRSSItems(xmlText);
      } else {
        const data = await resp.json();
        articles = data.articles ?? data.results ?? data.data ?? [];
      }
      results.fetched += articles.length;

      for (const article of articles.slice(0, 15)) {
        const title = (article.title ?? article.headline ?? '').trim();
        if (!title || title.length < 10) continue;

        const titleCheck = assessTitleQuality(title);
        if (!titleCheck.pass) { results.title_rejected++; continue; }

        const dedupeKey = generateDedupeKey(title, source.source_name);
        const { data: existing } = await supabase.from('content_items').select('id').eq('dedupe_key', dedupeKey).limit(1);
        if (existing?.length) { results.deduped++; continue; }

        const { data: recentItems } = await supabase.from('content_items').select('title').order('created_at', { ascending: false }).limit(30);
        if ((recentItems ?? []).some((r: any) => titleSimilarity(r.title, title) > SIMILAR_TITLE_THRESHOLD)) { results.deduped++; continue; }

        const text = `${title} ${article.description ?? ''} ${article.content ?? ''}`;
        const categories = detectCategories(text);
        const contentType = detectContentType(text);
        const slRelevance = detectSriLankaRelevance(text);
        const publishedAt = article.publishedAt ?? article.published_at ?? article.pubDate ?? null;
        const freshness = computeFreshness(contentType, publishedAt);
        const effectiveSLRelevance = Math.max(slRelevance, source.sri_lanka_bias ?? 0.3);
        const sourceCountry = effectiveSLRelevance > 0.7 ? 'lk' : (article.country ?? 'global');

        const { data: inserted } = await supabase.from('content_items').insert({
          source_id: source.id, source_item_id: article.id ?? article.url ?? dedupeKey,
          content_type: contentType, title,
          raw_excerpt: (article.description ?? article.excerpt ?? '').slice(0, 1000) || null,
          raw_body: (article.content ?? article.body ?? '').slice(0, 10000) || null,
          canonical_url: article.url ?? article.link ?? null,
          image_url: article.urlToImage ?? article.image ?? article.image_url ?? null,
          source_name: source.source_name, source_country: sourceCountry,
          language: article.language ?? 'en', published_at: publishedAt,
          source_trust_score: source.trust_score, freshness_score: freshness,
          status: 'new', dedupe_key: dedupeKey, raw_payload: article,
        }).select('id').single();

        if (inserted) {
          results.normalized++;
          for (const cat of categories) {
            await supabase.from('content_category_tags').insert({
              content_item_id: inserted.id, category_code: cat.code, confidence_score: cat.confidence,
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

  if (fetchedSourceIds.length > 0) {
    await supabase.from('content_sources').update({ last_fetched_at: new Date().toISOString() }).in('id', fetchedSourceIds);
  }
}

// ─── Brief items (priority-ordered: high-trust & SL-relevant first) ───
async function briefItems(results: Record<string, any>, batchSize = 8) {
  // First get items that don't have briefs yet
  const { data: unbriefed } = await supabase
    .from('content_items').select('id, title, raw_excerpt, content_type, source_country, source_trust_score, freshness_score, published_at')
    .in('status', ['new', 'processed'])
    .order('source_trust_score', { ascending: false })
    .order('freshness_score', { ascending: false })
    .limit(batchSize * 2);

  if (!unbriefed?.length) return;

  // Filter out already-briefed items
  const ids = unbriefed.map((u: any) => u.id);
  const { data: existingBriefs } = await supabase.from('content_ai_briefs').select('content_item_id').in('content_item_id', ids);
  const briefedIds = new Set((existingBriefs ?? []).map((b: any) => b.content_item_id));
  const toBrief = unbriefed.filter((u: any) => !briefedIds.has(u.id));

  if (!toBrief.length) return;

  // Priority sort: SL-relevant + high-trust first
  const sorted = toBrief.sort((a: any, b: any) => {
    const aSlR = detectSriLankaRelevance(`${a.title} ${a.raw_excerpt ?? ''}`);
    const bSlR = detectSriLankaRelevance(`${b.title} ${b.raw_excerpt ?? ''}`);
    const aScore = (a.source_trust_score ?? 0.5) * 0.4 + aSlR * 0.3 + (a.freshness_score ?? 10) / 100 * 0.3;
    const bScore = (b.source_trust_score ?? 0.5) * 0.4 + bSlR * 0.3 + (b.freshness_score ?? 10) / 100 * 0.3;
    return bScore - aScore;
  }).slice(0, batchSize);

  // Batch-fetch all category tags at once
  const sortedIds = sorted.map((s: any) => s.id);
  const { data: allTags } = await supabase.from('content_category_tags').select('content_item_id, category_code').in('content_item_id', sortedIds);
  const tagMap = new Map<string, string[]>();
  (allTags ?? []).forEach((t: any) => {
    const arr = tagMap.get(t.content_item_id) ?? [];
    arr.push(t.category_code);
    tagMap.set(t.content_item_id, arr);
  });

  for (const item of sorted) {
    const categories = tagMap.get(item.id) ?? [];
    const slRelevance = detectSriLankaRelevance(`${item.title} ${item.raw_excerpt ?? ''}`);

    const brief = await generateAIBrief({
      title: item.title, raw_excerpt: item.raw_excerpt,
      content_type: item.content_type, categories, sri_lanka_relevance: slRelevance,
    });

    if (brief) {
      await supabase.from('content_ai_briefs').insert({
        content_item_id: item.id, ...brief,
        ai_model: 'google/gemini-2.5-flash-lite', prompt_version: 'v10-calibrated',
      });
      const quality = brief.ai_quality_score ?? 0;
      const newStatus = quality >= 0.40 ? 'published' : quality >= 0.20 ? 'needs_review' : 'rejected';
      await supabase.from('content_items').update({
        status: newStatus, freshness_score: computeFreshness(item.content_type, item.published_at ?? null),
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

// ─── Editorial rescue: re-brief needs_review items with improved prompt ───
async function rescueReviewItems(results: Record<string, any>) {
  const { data: reviewItems } = await supabase
    .from('content_items').select('id, title, raw_excerpt, content_type, source_country, source_trust_score')
    .eq('status', 'needs_review')
    .order('source_trust_score', { ascending: false })
    .limit(10);
  if (!reviewItems?.length) return;

  let rescued = 0;
  for (const item of reviewItems) {
    // Check existing brief quality
    const { data: brief } = await supabase.from('content_ai_briefs')
      .select('ai_quality_score').eq('content_item_id', item.id).single();
    const currentQuality = brief?.ai_quality_score ?? 0;

    // If close to threshold and from trusted source, promote
    if (currentQuality >= 0.35 && (item.source_trust_score ?? 0) >= 0.75) {
      await supabase.from('content_items').update({ status: 'published' }).eq('id', item.id);
      rescued++;
      results.published = (results.published ?? 0) + 1;
    }
  }
  results.rescued = rescued;
}

// ─── Rollback last publish ───
async function rollbackLastPublish(surfaceCode?: string) {
  // Get the last completed publish run
  const { data: lastRun } = await supabase.from('pipeline_runs')
    .select('id, started_at')
    .in('mode', ['full', 'publish'])
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
  if (!lastRun) return { rolled_back: 0, error: 'No publish run found to rollback' };

  // Deactivate surface states created after that run started
  let query = supabase.from('content_surface_state')
    .update({ active: false })
    .gte('starts_at', lastRun.started_at)
    .eq('active', true)
    .lt('rank_score', 990); // Never rollback pinned items
  if (surfaceCode) query = query.eq('surface_code', surfaceCode);

  const { count } = await query.select('id', { count: 'exact', head: true });

  // Execute the deactivation
  let execQuery = supabase.from('content_surface_state')
    .update({ active: false })
    .gte('starts_at', lastRun.started_at)
    .eq('active', true)
    .lt('rank_score', 990);
  if (surfaceCode) execQuery = execQuery.eq('surface_code', surfaceCode);
  await execQuery;

  // Log as alert
  await supabase.from('content_alerts').insert({
    alert_type: 'source_failure',
    severity: 'info',
    title: `Rollback executed${surfaceCode ? ` for ${surfaceCode}` : ''}`,
    description: `Rolled back ~${count ?? 0} surface assignments from run ${lastRun.id}`,
    pipeline_run_id: lastRun.id,
  });

  return { rolled_back: count ?? 0, run_id: lastRun.id };
}

// ─── Source promotion ───
async function promoteSource(sourceId: string, targetState: string) {
  const validTransitions: Record<string, string[]> = {
    inactive: ['validated'],
    validated: ['pilot_live', 'inactive'],
    pilot_live: ['production_live', 'validated', 'quarantined'],
    production_live: ['quarantined', 'pilot_live'],
    failing: ['quarantined', 'validated', 'inactive'],
    quarantined: ['validated', 'inactive'],
  };

  const { data: source } = await supabase.from('content_sources')
    .select('rollout_state, source_name').eq('id', sourceId).single();
  if (!source) return { error: 'Source not found' };

  const current = source.rollout_state ?? 'inactive';
  const allowed = validTransitions[current] ?? ['inactive'];
  if (!allowed.includes(targetState)) {
    return { error: `Cannot transition from ${current} to ${targetState}. Allowed: ${allowed.join(', ')}` };
  }

  await supabase.from('content_sources').update({ rollout_state: targetState }).eq('id', sourceId);
  return { success: true, source: source.source_name, from: current, to: targetState };
}

// ─── Main handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? 'full';
    const triggeredBy = body.triggered_by ?? 'manual';
    const startTime = Date.now();

    // Create pipeline run record
    const runId = await createPipelineRun(mode, triggeredBy);

    const results: Record<string, any> = {
      mode, fetched: 0, normalized: 0, deduped: 0, accepted: 0, rejected: 0,
      briefed: 0, published: 0, decayed: 0, archived: 0, clustered: 0,
      surfaces_refreshed: 0, title_rejected: 0, needs_review: 0,
      source_errors: [] as string[], warnings_count: 0,
    };

    try {
      // Rollback mode
      if (mode === 'rollback') {
        const rollbackResult = await rollbackLastPublish(body.surface_code);
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, { ...results, mode: 'rollback' });
        return new Response(
          JSON.stringify({ success: true, mode, ...rollbackResult, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Source promotion mode
      if (mode === 'promote_source') {
        const promoResult = await promoteSource(body.source_id, body.target_state);
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, { ...results, mode: 'promote_source' });
        return new Response(
          JSON.stringify({ success: true, mode, ...promoResult, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Source validation mode
      if (mode === 'validate_sources') {
        const validation = await validateSources();
        const duration = Date.now() - startTime;
        results.duration_ms = duration;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, mode, sources: validation, duration_ms: duration }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Source audit mode
      if (mode === 'audit_sources') {
        const audit = await auditSources();
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, mode, sources: audit }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Dry run
      if (mode === 'dry_run' || mode === 'publish_preview') {
        const preview = await publishToSurfaces(true);
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, mode, preview, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decay
      if (mode === 'decay') {
        const decayResult = await runDecay();
        results.decayed = decayResult.decayed;
        results.archived = decayResult.archived;
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, mode, ...decayResult, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cluster
      if (mode === 'cluster') {
        results.clustered = await runClustering();
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, mode, clustered: results.clustered, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Brief only
      if (mode === 'brief') {
        await briefItems(results);
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, ...results, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rescue review items
      if (mode === 'rescue_review') {
        await rescueReviewItems(results);
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, ...results, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (mode === 'publish') {
        await publishToSurfaces(false);
        results.surfaces_refreshed = Object.keys(SURFACE_RULES).length;
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        return new Response(
          JSON.stringify({ success: true, ...results, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch only
      if (mode === 'fetch_only') {
        await ingestFromSources(body.tier_limit, results);
        results.duration_ms = Date.now() - startTime;
        await completePipelineRun(runId, results);
        await generateAlerts(results, runId);
        return new Response(
          JSON.stringify({ success: true, ...results, duration_ms: results.duration_ms }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Full or ingest mode
      if (mode === 'full' || mode === 'ingest') {
        await ingestFromSources(body.tier_limit, results);
      }

      if (mode === 'full') {
        // Smaller batch to stay within timeout
        await briefItems(results, 6);
        await rescueReviewItems(results);
        await publishToSurfaces(false);
        results.surfaces_refreshed = Object.keys(SURFACE_RULES).length;
        const decayResult = await runDecay();
        results.decayed = decayResult.decayed;
        results.archived = decayResult.archived;
        results.clustered = await runClustering();
      }

      results.duration_ms = Date.now() - startTime;
      await completePipelineRun(runId, results);
      results.warnings_count = await generateAlerts(results, runId);

      console.log(`[content-ingest] v9 Pipeline complete (mode=${mode}, ${results.duration_ms}ms):`, JSON.stringify(results));

      return new Response(
        JSON.stringify({ success: true, ...results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (innerError) {
      // Log failed run
      results.duration_ms = Date.now() - startTime;
      await completePipelineRun(runId, results, 'failed');
      throw innerError;
    }
  } catch (e) {
    console.error("Content ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
