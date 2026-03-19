/**
 * Content Dedupe Engine — Aggressively deduplicates content.
 * Checks: canonical URL, normalized title, fetch hash, topic similarity.
 */
import type { NormalizedContentItem } from './contentNormalizer';

/** Normalize title for comparison: lowercase, remove punctuation, collapse whitespace */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Jaccard similarity of word sets */
function titleSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeTitle(a).split(' '));
  const setB = new Set(normalizeTitle(b).split(' '));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export interface DedupeResult {
  accepted: NormalizedContentItem[];
  rejected: Array<{ item: NormalizedContentItem; reason: string }>;
}

/**
 * Deduplicate items against existing DB keys + within the batch itself.
 */
export function deduplicateItems(
  items: NormalizedContentItem[],
  existingDedupeKeys: Set<string>,
  existingFetchHashes: Set<string>,
  existingCanonicalUrls: Set<string>
): DedupeResult {
  const accepted: NormalizedContentItem[] = [];
  const rejected: Array<{ item: NormalizedContentItem; reason: string }> = [];
  const seenTitles: string[] = [];
  const seenUrls = new Set<string>();

  for (const item of items) {
    // Check dedupe key
    if (existingDedupeKeys.has(item.dedupe_key)) {
      rejected.push({ item, reason: 'duplicate_dedupe_key' });
      continue;
    }

    // Check fetch hash
    if (existingFetchHashes.has(item.fetch_hash)) {
      rejected.push({ item, reason: 'duplicate_fetch_hash' });
      continue;
    }

    // Check canonical URL
    if (item.canonical_url) {
      const normalizedUrl = item.canonical_url.replace(/\/+$/, '').toLowerCase();
      if (existingCanonicalUrls.has(normalizedUrl) || seenUrls.has(normalizedUrl)) {
        rejected.push({ item, reason: 'duplicate_url' });
        continue;
      }
      seenUrls.add(normalizedUrl);
    }

    // Check title similarity against already-accepted items
    const isDuplicateTitle = seenTitles.some(
      existing => titleSimilarity(existing, item.title) > 0.75
    );
    if (isDuplicateTitle) {
      rejected.push({ item, reason: 'similar_title' });
      continue;
    }

    seenTitles.push(item.title);
    existingDedupeKeys.add(item.dedupe_key);
    existingFetchHashes.add(item.fetch_hash);
    accepted.push(item);
  }

  return { accepted, rejected };
}
