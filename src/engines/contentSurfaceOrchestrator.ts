/**
 * Content Surface Orchestrator — Populates content_surface_state for all surfaces.
 * Ensures diversity, freshness thresholds, and fallback filling.
 */
import { DEFAULT_PUBLISH_RULES, rankForSurface, type PublishCandidate } from './contentPublishEngine';
import { EVERGREEN_FALLBACKS } from './contentSurfaceFallbacks';

export interface SurfaceAssignment {
  surface_code: string;
  content_item_id: string;
  rank_score: number;
  category_code: string | null;
}

/**
 * Orchestrate surface assignments from published candidates.
 * Ensures no single item dominates too many surfaces.
 */
export function orchestrateSurfaces(
  candidates: PublishCandidate[],
  categoryTags: Record<string, string[]>, // item_id -> category codes
  qualityScores: Record<string, number>,  // item_id -> ai_quality_score
): SurfaceAssignment[] {
  const assignments: SurfaceAssignment[] = [];
  const itemSurfaceCount = new Map<string, number>();

  // Enrich candidates with quality scores
  const enriched = candidates.map(c => ({
    ...c,
    ai_quality_score: qualityScores[c.id] ?? c.ai_quality_score,
    category_codes: categoryTags[c.id] ?? c.category_codes,
  }));

  for (const rule of DEFAULT_PUBLISH_RULES) {
    const ranked = rankForSurface(enriched, rule);

    // Diversity: limit each item to max 3 surfaces
    const filtered = ranked.filter(r => {
      const count = itemSurfaceCount.get(r.id) ?? 0;
      return count < 3;
    });

    for (const item of filtered) {
      const cats = categoryTags[item.id];
      assignments.push({
        surface_code: rule.slot_code,
        content_item_id: item.id,
        rank_score: item.rank_score,
        category_code: cats?.[0] ?? null,
      });
      itemSurfaceCount.set(item.id, (itemSurfaceCount.get(item.id) ?? 0) + 1);
    }
  }

  return assignments;
}

/**
 * Fill empty surfaces with evergreen fallback content.
 * Returns fallback items that should be created if no real content exists.
 */
export function getEvergreenFallbacksForSurface(
  surfaceCode: string,
  existingCount: number
): typeof EVERGREEN_FALLBACKS[number][] {
  const rule = DEFAULT_PUBLISH_RULES.find(r => r.slot_code === surfaceCode);
  if (!rule) return [];

  const needed = Math.max(0, Math.min(3, (rule.maxItems || 3) - existingCount));
  if (needed === 0) return [];

  // Filter fallbacks by content type match
  const matching = EVERGREEN_FALLBACKS.filter(f =>
    rule.content_types.includes(f.content_type)
  );

  return matching.slice(0, needed);
}
