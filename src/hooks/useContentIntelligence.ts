/**
 * useContentIntelligence — Fetches surfaced content for a given surface slot.
 * Returns enriched content items with AI briefs and category tags.
 * Includes evergreen fallback support for empty surfaces.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EnrichedContentItem, SurfaceCode } from '@/types/contentIntelligence';
import { EVERGREEN_FALLBACKS } from '@/engines/contentSurfaceFallbacks';

interface UseContentIntelligenceOptions {
  surface: SurfaceCode;
  categoryCode?: string;
  limit?: number;
}

async function fetchSurfaceContent(
  surface: SurfaceCode,
  categoryCode?: string,
  limit = 10
): Promise<EnrichedContentItem[]> {
  let query = supabase
    .from('content_surface_state')
    .select('*, content_item_id')
    .eq('surface_code', surface)
    .eq('active', true)
    .order('rank_score', { ascending: false })
    .limit(limit);

  if (categoryCode) {
    query = query.eq('category_code', categoryCode);
  }

  const { data: surfaces, error: surfErr } = await query;
  if (surfErr || !surfaces?.length) return [];

  const itemIds = surfaces.map((s: any) => s.content_item_id);

  const [{ data: items }, { data: briefs }, { data: tags }] = await Promise.all([
    supabase.from('content_items').select('*').in('id', itemIds).eq('status', 'published'),
    supabase.from('content_ai_briefs').select('*').in('content_item_id', itemIds),
    supabase.from('content_category_tags').select('*').in('content_item_id', itemIds),
  ]);

  if (!items?.length) return [];

  const briefMap = new Map((briefs ?? []).map((b: any) => [b.content_item_id, b]));
  const tagMap = new Map<string, any[]>();
  (tags ?? []).forEach((t: any) => {
    const arr = tagMap.get(t.content_item_id) ?? [];
    arr.push(t);
    tagMap.set(t.content_item_id, arr);
  });

  const itemMap = new Map((items as any[]).map(i => [i.id, i]));
  const rankMap = new Map(surfaces.map((s: any) => [s.content_item_id, s.rank_score]));

  return itemIds
    .filter((id: string) => itemMap.has(id))
    .map((id: string) => ({
      ...itemMap.get(id)!,
      ai_brief: briefMap.get(id) ?? null,
      category_tags: tagMap.get(id) ?? [],
    }))
    .sort((a: any, b: any) => (rankMap.get(b.id) ?? 0) - (rankMap.get(a.id) ?? 0));
}

/** Map surface codes to content types for fallback matching */
const SURFACE_CONTENT_TYPES: Record<string, string[]> = {
  homepage_hot_now: ['hot_topic', 'most_read'],
  homepage_did_you_know: ['knowledge_fact', 'history'],
  homepage_innovations: ['innovation', 'hot_topic'],
  homepage_safety: ['safety_alert', 'scam_alert'],
  homepage_numbers: ['numbers_insight'],
  homepage_popular: ['most_read', 'hot_topic', 'how_to'],
  ai_banner_forum: ['knowledge_fact', 'innovation', 'safety_alert'],
};

function buildEvergreenFallbacks(surface: SurfaceCode, categoryCode?: string, limit = 4): EnrichedContentItem[] {
  const types = SURFACE_CONTENT_TYPES[surface] ?? [];
  let fallbacks = EVERGREEN_FALLBACKS.filter(f => types.includes(f.content_type));
  if (categoryCode) {
    const catMatches = fallbacks.filter(f => f.category_code === categoryCode);
    fallbacks = catMatches.length > 0 ? catMatches : fallbacks;
  }
  return fallbacks.slice(0, limit).map((f, i) => ({
    id: `evergreen-${surface}-${i}`,
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
    published_at: new Date().toISOString(),
    fetched_at: null,
    freshness_score: 50,
    source_trust_score: 1.0,
    status: 'published' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ai_brief: {
      id: `evergreen-brief-${i}`,
      content_item_id: `evergreen-${surface}-${i}`,
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
      generated_at: new Date().toISOString(),
    },
    category_tags: [{
      id: `evergreen-tag-${i}`,
      content_item_id: `evergreen-${surface}-${i}`,
      category_code: f.category_code,
      confidence_score: 1.0,
      reason: 'Evergreen LankaFix content',
    }],
  }));
}

export function useContentIntelligence({
  surface,
  categoryCode,
  limit = 10,
}: UseContentIntelligenceOptions) {
  return useQuery({
    queryKey: ['content-intelligence', surface, categoryCode, limit],
    queryFn: async () => {
      const liveContent = await fetchSurfaceContent(surface, categoryCode, limit);
      if (liveContent.length > 0) return liveContent;
      // Fallback to evergreen content
      return buildEvergreenFallbacks(surface, categoryCode, limit);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

/** Track a content event (fire-and-forget) */
export async function trackContentEvent(
  contentItemId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  // Skip tracking for evergreen items
  if (contentItemId.startsWith('evergreen-')) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('content_events').insert([{
      content_item_id: contentItemId,
      user_id: user?.id ?? undefined,
      event_type: eventType,
      metadata: (metadata as any) ?? undefined,
    }]);
  } catch {
    // Silent fail for analytics
  }
}
