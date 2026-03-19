/**
 * Content Source Adapters — Modular source ingestion for LankaFix Content Intelligence.
 * Each adapter normalizes external data into a shared ContentIngestItem format.
 */

export interface ContentIngestItem {
  source_item_id: string;
  title: string;
  raw_excerpt: string | null;
  raw_body: string | null;
  canonical_url: string | null;
  image_url: string | null;
  source_name: string;
  source_country: string;
  language: string;
  published_at: string | null;
  source_trust_score: number;
  content_type_guess: string;
  raw_payload: Record<string, unknown> | null;
}

export interface SourceAdapter {
  id: string;
  name: string;
  fetch(config: SourceAdapterConfig): Promise<ContentIngestItem[]>;
}

export interface SourceAdapterConfig {
  source_id: string;
  source_name: string;
  base_url: string | null;
  source_vendor: string | null;
  trust_score: number;
  category_allowlist: string[] | null;
  category_blocklist: string[] | null;
  sri_lanka_bias: number | null;
  language_support: string[] | null;
}

/**
 * Internal Editorial Adapter — for manually curated LankaFix content.
 * Content is already in the DB, this is a pass-through.
 */
export const internalEditorialAdapter: SourceAdapter = {
  id: 'internal_editorial',
  name: 'Internal Editorial',
  async fetch() {
    // Internal content is inserted directly via ops panel
    return [];
  },
};

/**
 * Knowledge/Facts Adapter — generates evergreen content for fallback.
 * Uses static knowledge base for "Did You Know" / "On This Day" style content.
 */
export const knowledgeFactsAdapter: SourceAdapter = {
  id: 'knowledge',
  name: 'Knowledge Base',
  async fetch(config) {
    // Returns pre-curated facts relevant to LankaFix categories
    return [];
  },
};

/**
 * Generic News API Adapter — normalizes from common news API formats.
 */
export const newsApiAdapter: SourceAdapter = {
  id: 'news_api',
  name: 'News API',
  async fetch(config) {
    if (!config.base_url) return [];
    try {
      const resp = await fetch(config.base_url);
      if (!resp.ok) return [];
      const data = await resp.json();
      const articles = data.articles ?? data.results ?? data.data ?? [];
      return articles.slice(0, 20).map((a: any, i: number) => ({
        source_item_id: a.id ?? a.url ?? `${config.source_id}_${i}`,
        title: a.title ?? a.headline ?? '',
        raw_excerpt: a.description ?? a.excerpt ?? null,
        raw_body: a.content ?? a.body ?? null,
        canonical_url: a.url ?? a.link ?? null,
        image_url: a.urlToImage ?? a.image ?? a.thumbnail ?? null,
        source_name: config.source_name,
        source_country: a.country ?? 'global',
        language: a.language ?? 'en',
        published_at: a.publishedAt ?? a.published_at ?? a.pubDate ?? null,
        source_trust_score: config.trust_score,
        content_type_guess: 'hot_topic',
        raw_payload: a,
      }));
    } catch (e) {
      console.error(`[newsApiAdapter] fetch error for ${config.source_name}:`, e);
      return [];
    }
  },
};

/**
 * Trend/Innovation Adapter — for trend API sources.
 */
export const trendAdapter: SourceAdapter = {
  id: 'trends',
  name: 'Trends Feed',
  async fetch(config) {
    if (!config.base_url) return [];
    try {
      const resp = await fetch(config.base_url);
      if (!resp.ok) return [];
      const data = await resp.json();
      const items = data.trends ?? data.items ?? [];
      return items.slice(0, 15).map((t: any, i: number) => ({
        source_item_id: t.id ?? `${config.source_id}_trend_${i}`,
        title: t.title ?? t.name ?? '',
        raw_excerpt: t.description ?? t.summary ?? null,
        raw_body: null,
        canonical_url: t.url ?? null,
        image_url: t.image ?? null,
        source_name: config.source_name,
        source_country: t.country ?? 'global',
        language: 'en',
        published_at: t.published_at ?? null,
        source_trust_score: config.trust_score,
        content_type_guess: 'trend_signal',
        raw_payload: t,
      }));
    } catch {
      return [];
    }
  },
};

/** Registry of all adapters */
export const SOURCE_ADAPTERS: Record<string, SourceAdapter> = {
  news_api: newsApiAdapter,
  trends: trendAdapter,
  knowledge: knowledgeFactsAdapter,
  internal_editorial: internalEditorialAdapter,
  wiki: knowledgeFactsAdapter, // reuse for wiki-style
  partner_insight: internalEditorialAdapter, // partner content is also manually managed
};

export function getAdapter(sourceType: string): SourceAdapter | null {
  return SOURCE_ADAPTERS[sourceType] ?? null;
}
