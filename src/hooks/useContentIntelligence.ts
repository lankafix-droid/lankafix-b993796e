/**
 * useContentIntelligence — Fetches surfaced content for a given surface slot.
 * Returns enriched content items with AI briefs and category tags.
 * Includes evergreen fallback support for empty surfaces.
 * Implements quality-gated hybrid blending: weak live items never displace stronger evergreen.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EnrichedContentItem, SurfaceCode } from '@/types/contentIntelligence';
import { getEvergreenFallbacksForSurface } from '@/engines/evergreenResolver';

interface UseContentIntelligenceOptions {
  surface: SurfaceCode;
  categoryCode?: string;
  limit?: number;
}

/** Minimum AI quality for a live item to be considered "strong" enough to keep over evergreen */
const MIN_LIVE_QUALITY = 0.45;

/** Get the user-visible display title for an item (AI headline preferred, fallback to raw title) */
function getDisplayTitle(item: EnrichedContentItem): string {
  return (item.ai_brief?.ai_headline ?? item.title ?? '').trim().toLowerCase();
}

/** Normalize a title for dedupe comparison */
function normalizeForDedupe(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
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



export function useContentIntelligence({
  surface,
  categoryCode,
  limit = 10,
}: UseContentIntelligenceOptions) {
  return useQuery({
    queryKey: ['content-intelligence', surface, categoryCode, limit],
    queryFn: async () => {
      const liveContent = await fetchSurfaceContent(surface, categoryCode, limit);

      // Quality-gate live content: only keep items with acceptable AI quality
      const strongLive = liveContent.filter(item => {
        const quality = item.ai_brief?.ai_quality_score ?? 0.5;
        return quality >= MIN_LIVE_QUALITY;
      });

      // If strong live content fully satisfies the limit, return it
      if (strongLive.length >= limit) return strongLive.slice(0, limit);

      // Hybrid blend: fill remaining slots with evergreen fallbacks
      if (strongLive.length > 0) {
        const remaining = limit - strongLive.length;
        const liveTitles = new Set(strongLive.map(i => i.title.toLowerCase()));
        const evergreen = getEvergreenFallbacksForSurface(surface, categoryCode, remaining + 4)
          .filter(eg => !liveTitles.has(eg.title.toLowerCase()))
          .slice(0, remaining);
        return [...strongLive, ...evergreen];
      }

      // No strong live content — full evergreen fallback
      return getEvergreenFallbacksForSurface(surface, categoryCode, limit);
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
