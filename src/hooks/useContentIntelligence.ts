/**
 * useContentIntelligence — Fetches surfaced content for a given surface slot.
 * Returns enriched content items with AI briefs and category tags.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EnrichedContentItem, SurfaceCode } from '@/types/contentIntelligence';

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
  // Fetch surface state with content items
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

  // Fetch content items
  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .in('id', itemIds)
    .eq('status', 'published');

  if (!items?.length) return [];

  // Fetch AI briefs
  const { data: briefs } = await supabase
    .from('content_ai_briefs')
    .select('*')
    .in('content_item_id', itemIds);

  // Fetch category tags
  const { data: tags } = await supabase
    .from('content_category_tags')
    .select('*')
    .in('content_item_id', itemIds);

  const briefMap = new Map((briefs ?? []).map((b: any) => [b.content_item_id, b]));
  const tagMap = new Map<string, any[]>();
  (tags ?? []).forEach((t: any) => {
    const arr = tagMap.get(t.content_item_id) ?? [];
    arr.push(t);
    tagMap.set(t.content_item_id, arr);
  });

  // Preserve rank order from surface state
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
    queryFn: () => fetchSurfaceContent(surface, categoryCode, limit),
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchInterval: 10 * 60 * 1000, // refresh every 10 min
  });
}

/** Track a content event */
export async function trackContentEvent(
  contentItemId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('content_events').insert({
    content_item_id: contentItemId,
    user_id: user?.id ?? null,
    event_type: eventType,
    metadata: metadata ?? null,
  });
}
