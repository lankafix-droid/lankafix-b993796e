/**
 * Evergreen Resolver — Single source of truth for resolving evergreen fallback content.
 * Used by content rails, detail pages, and related insights.
 */
import { EVERGREEN_FALLBACKS, type EvergreenFallback } from '@/engines/contentSurfaceFallbacks';
import type { EnrichedContentItem, SurfaceCode } from '@/types/contentIntelligence';

/** Map surface codes to content types for fallback matching */
const SURFACE_CONTENT_TYPES: Record<string, string[]> = {
  homepage_hero: ['breaking_news', 'hot_topic', 'innovation'],
  homepage_hot_now: ['hot_topic', 'most_read'],
  homepage_did_you_know: ['knowledge_fact', 'history'],
  homepage_innovations: ['innovation', 'hot_topic'],
  homepage_safety: ['safety_alert', 'scam_alert'],
  homepage_numbers: ['numbers_insight'],
  homepage_popular: ['most_read', 'hot_topic', 'how_to'],
  ai_banner_forum: ['knowledge_fact', 'innovation', 'safety_alert'],
  category_featured: [],
  category_feed: [],
};

function fallbackToEnriched(f: EvergreenFallback, id: string): EnrichedContentItem {
  const now = new Date().toISOString();
  return {
    id,
    source_id: null,
    source_item_id: null,
    content_type: f.content_type as any,
    title: f.title,
    raw_excerpt: f.ai_summary_short,
    raw_body: null,
    canonical_url: null,
    image_url: null,
    source_name: 'LankaFix Intelligence',
    source_country: 'LK',
    language: 'en',
    published_at: now,
    fetched_at: null,
    freshness_score: 50,
    source_trust_score: 1.0,
    status: 'published' as const,
    created_at: now,
    updated_at: now,
    ai_brief: {
      id: `brief-${id}`,
      content_item_id: id,
      ai_headline: f.ai_headline,
      ai_summary_short: f.ai_summary_short,
      ai_summary_medium: f.ai_summary_medium,
      ai_why_it_matters: f.ai_why_it_matters,
      ai_lankafix_angle: f.ai_lankafix_angle,
      ai_banner_text: f.ai_banner_text,
      ai_cta_label: f.ai_cta_label,
      ai_keywords: f.ai_keywords,
      ai_risk_flags: [],
      ai_quality_score: 0.9,
      generated_at: now,
    },
    category_tags: [{
      id: `tag-${id}`,
      content_item_id: id,
      category_code: f.category_code,
      confidence_score: 1.0,
      reason: 'Evergreen LankaFix content',
    }],
  };
}

/** Get evergreen fallbacks for a surface, optionally filtered by category */
export function getEvergreenFallbacksForSurface(
  surface: SurfaceCode | string,
  categoryCode?: string,
  limit = 4
): EnrichedContentItem[] {
  const types = SURFACE_CONTENT_TYPES[surface] ?? [];

  let pool: EvergreenFallback[];
  if (types.length > 0) {
    pool = EVERGREEN_FALLBACKS.filter(f => types.includes(f.content_type));
  } else {
    // For category surfaces, match by category
    pool = categoryCode
      ? EVERGREEN_FALLBACKS.filter(f => f.category_code === categoryCode)
      : [...EVERGREEN_FALLBACKS];
  }

  if (categoryCode && types.length > 0) {
    const catMatches = pool.filter(f => f.category_code === categoryCode);
    if (catMatches.length > 0) pool = catMatches;
  }

  return pool.slice(0, limit).map((f, i) => {
    const id = `evergreen-${surface}-${i}`;
    return fallbackToEnriched(f, id);
  });
}

/** Resolve a single evergreen item by its ID (e.g. "evergreen-homepage_innovations-0") */
export function getEvergreenFallbackById(id: string): EnrichedContentItem | null {
  if (!id.startsWith('evergreen-')) return null;

  // Parse: evergreen-{surface}-{index}
  const withoutPrefix = id.slice('evergreen-'.length);
  const lastDash = withoutPrefix.lastIndexOf('-');
  if (lastDash < 0) return buildGenericEvergreen(id);

  const surface = withoutPrefix.slice(0, lastDash);
  const indexStr = withoutPrefix.slice(lastDash + 1);
  const index = parseInt(indexStr, 10);

  // Rebuild the same list that was used to generate this ID
  const items = getEvergreenFallbacksForSurface(surface as SurfaceCode);
  if (index >= 0 && index < items.length) {
    return items[index];
  }

  // Fallback: try matching by brute-force across all surfaces
  for (const [surfKey, types] of Object.entries(SURFACE_CONTENT_TYPES)) {
    const surfItems = getEvergreenFallbacksForSurface(surfKey as SurfaceCode);
    const match = surfItems.find(item => item.id === id);
    if (match) return match;
  }

  return buildGenericEvergreen(id);
}

/** Graceful generic fallback for malformed evergreen IDs */
function buildGenericEvergreen(id: string): EnrichedContentItem {
  const now = new Date().toISOString();
  return {
    id,
    source_id: null,
    source_item_id: null,
    content_type: 'knowledge_fact' as any,
    title: 'LankaFix Insight',
    raw_excerpt: 'This insight is part of LankaFix\'s knowledge and intelligence layer.',
    raw_body: null,
    canonical_url: null,
    image_url: null,
    source_name: 'LankaFix Intelligence',
    source_country: 'LK',
    language: 'en',
    published_at: now,
    fetched_at: null,
    freshness_score: 50,
    source_trust_score: 1.0,
    status: 'published' as const,
    created_at: now,
    updated_at: now,
    ai_brief: {
      id: `brief-${id}`,
      content_item_id: id,
      ai_headline: 'LankaFix Insight',
      ai_summary_short: 'This insight is part of LankaFix\'s knowledge and intelligence layer.',
      ai_summary_medium: 'LankaFix continuously curates knowledge, safety alerts, and industry insights relevant to Sri Lankan homeowners and businesses. Explore our services to stay informed and protected.',
      ai_why_it_matters: 'Staying informed helps you make better decisions about home and device maintenance.',
      ai_lankafix_angle: 'LankaFix connects you with verified professionals for all your service needs.',
      ai_banner_text: null,
      ai_cta_label: 'Explore Services',
      ai_keywords: ['LankaFix', 'knowledge', 'insights'],
      ai_risk_flags: [],
      ai_quality_score: 0.8,
      generated_at: now,
    },
    category_tags: [],
  };
}

/** Get related evergreen items for a detail page */
export function getRelatedEvergreenItems(
  currentId: string,
  categoryCode: string | null,
  contentType: string,
  limit = 3
): EnrichedContentItem[] {
  // Collect from all surfaces, dedupe, exclude current, score by relevance
  const seen = new Set<string>();
  const all: EnrichedContentItem[] = [];

  for (const surfKey of Object.keys(SURFACE_CONTENT_TYPES)) {
    for (const item of getEvergreenFallbacksForSurface(surfKey as SurfaceCode, undefined, 10)) {
      if (item.id !== currentId && !seen.has(item.title)) {
        seen.add(item.title);
        all.push(item);
      }
    }
  }

  // Score by relevance
  const scored = all.map(item => {
    let score = 0;
    const cats = (item.category_tags ?? []).map(t => t.category_code);
    if (categoryCode && cats.includes(categoryCode)) score += 50;
    if (item.content_type === contentType) score += 20;
    return { item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item);
}
