/**
 * Content Normalizer — Transforms raw ingested items into LankaFix content schema.
 */
import type { ContentIngestItem } from './contentSourceAdapters';

export interface NormalizedContentItem {
  source_id: string;
  source_item_id: string;
  content_type: string;
  title: string;
  raw_excerpt: string | null;
  raw_body: string | null;
  canonical_url: string | null;
  image_url: string | null;
  source_name: string | null;
  source_country: string | null;
  language: string;
  published_at: string | null;
  fetched_at: string;
  raw_payload: Record<string, unknown> | null;
  dedupe_key: string;
  fetch_hash: string;
  source_trust_score: number | null;
  freshness_score: number;
  status: string;
}

function generateDedupeKey(title: string, source: string): string {
  const normalized = `${title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()}::${source}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return `dedupe_${Math.abs(hash).toString(36)}`;
}

function generateFetchHash(item: ContentIngestItem): string {
  const payload = `${item.title}|${item.canonical_url ?? ''}|${item.raw_excerpt ?? ''}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return `fh_${Math.abs(hash).toString(36)}`;
}

function computeFreshnessScore(publishedAt: string | null): number {
  if (!publishedAt) return 30;
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  if (ageHours < 1) return 100;
  if (ageHours < 6) return 90;
  if (ageHours < 24) return 75;
  if (ageHours < 72) return 55;
  if (ageHours < 168) return 35;
  return Math.max(5, 25 - Math.floor(ageHours / 168) * 5);
}

export function normalizeItem(
  sourceId: string,
  item: ContentIngestItem
): NormalizedContentItem {
  const title = (item.title ?? '').trim().slice(0, 500);
  if (!title) throw new Error('Content item has no title');

  return {
    source_id: sourceId,
    source_item_id: item.source_item_id,
    content_type: item.content_type_guess || 'hot_topic',
    title,
    raw_excerpt: item.raw_excerpt?.slice(0, 1000) ?? null,
    raw_body: item.raw_body?.slice(0, 10000) ?? null,
    canonical_url: item.canonical_url ?? null,
    image_url: item.image_url ?? null,
    source_name: item.source_name ?? null,
    source_country: item.source_country ?? null,
    language: item.language || 'en',
    published_at: item.published_at ?? null,
    fetched_at: new Date().toISOString(),
    raw_payload: item.raw_payload ?? null,
    dedupe_key: generateDedupeKey(title, item.source_name),
    fetch_hash: generateFetchHash(item),
    source_trust_score: item.source_trust_score ?? null,
    freshness_score: computeFreshnessScore(item.published_at),
    status: 'new',
  };
}

export function normalizeItems(
  sourceId: string,
  items: ContentIngestItem[]
): NormalizedContentItem[] {
  return items
    .filter(i => i.title?.trim())
    .map(i => normalizeItem(sourceId, i));
}
