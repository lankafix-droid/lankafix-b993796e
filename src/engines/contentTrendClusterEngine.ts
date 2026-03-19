/**
 * Content Trend Cluster Engine — Groups similar items into clusters.
 * Detects momentum, calculates relevance scores.
 */

export interface ClusterCandidate {
  id: string;
  title: string;
  content_type: string;
  category_codes: string[];
  published_at: string | null;
  source_country: string | null;
}

export interface TrendCluster {
  cluster_key: string;
  cluster_label: string;
  category_code: string | null;
  momentum_score: number;
  content_count: number;
  sri_lanka_relevance_score: number;
  commercial_relevance_score: number;
  item_ids: string[];
}

/** Extract meaningful keywords from a title */
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
    'that', 'this', 'these', 'those', 'it', 'its', 'how', 'why', 'what',
    'new', 'says', 'said', 'more', 'most', 'than', 'also', 'about',
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/** Generate cluster key from shared keywords */
function generateClusterKey(keywords: string[]): string {
  return keywords.sort().slice(0, 4).join('_');
}

/** Check overlap between two keyword sets */
function keywordOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  const matches = a.filter(w => setB.has(w)).length;
  return matches / Math.max(a.length, 1);
}

const SRI_LANKA_INDICATORS = [
  'sri lanka', 'colombo', 'kandy', 'galle', 'ceb', 'slt', 'dialog',
  'mobitel', 'rupee', 'lkr', 'sinhala', 'tamil', 'monsoon',
];

const COMMERCIAL_INDICATORS = [
  'repair', 'service', 'installation', 'maintenance', 'fix', 'replace',
  'technician', 'warranty', 'cost', 'price', 'save', 'savings',
  'buy', 'hire', 'book', 'schedule',
];

/**
 * Cluster items into trend groups.
 */
export function clusterItems(candidates: ClusterCandidate[]): TrendCluster[] {
  if (candidates.length < 2) return [];

  const itemKeywords = candidates.map(c => ({
    ...c,
    keywords: extractKeywords(c.title),
  }));

  const clusters: Map<string, {
    label: string;
    categories: string[];
    items: ClusterCandidate[];
    keywords: string[];
  }> = new Map();

  // Group by keyword overlap
  const assigned = new Set<string>();

  for (let i = 0; i < itemKeywords.length; i++) {
    if (assigned.has(itemKeywords[i].id)) continue;
    const group = [itemKeywords[i]];
    assigned.add(itemKeywords[i].id);

    for (let j = i + 1; j < itemKeywords.length; j++) {
      if (assigned.has(itemKeywords[j].id)) continue;
      if (keywordOverlap(itemKeywords[i].keywords, itemKeywords[j].keywords) >= 0.3) {
        group.push(itemKeywords[j]);
        assigned.add(itemKeywords[j].id);
      }
    }

    if (group.length >= 2) {
      const sharedKw = group[0].keywords.filter(kw =>
        group.every(g => g.keywords.includes(kw))
      );
      const key = generateClusterKey(sharedKw.length > 0 ? sharedKw : group[0].keywords);
      const label = sharedKw.length > 0 ? sharedKw.join(' ') : group[0].keywords.slice(0, 3).join(' ');
      const allCategories = group.flatMap(g => g.category_codes);

      clusters.set(key, {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        categories: allCategories,
        items: group,
        keywords: sharedKw.length > 0 ? sharedKw : group[0].keywords,
      });
    }
  }

  return Array.from(clusters.entries()).map(([key, cluster]) => {
    const titleText = cluster.items.map(i => i.title.toLowerCase()).join(' ');

    const sriLankaScore = SRI_LANKA_INDICATORS.filter(
      ind => titleText.includes(ind)
    ).length / SRI_LANKA_INDICATORS.length;

    const commercialScore = COMMERCIAL_INDICATORS.filter(
      ind => titleText.includes(ind)
    ).length / COMMERCIAL_INDICATORS.length;

    // Momentum: more items + more recent = higher momentum
    const recency = cluster.items.filter(i => {
      if (!i.published_at) return false;
      return Date.now() - new Date(i.published_at).getTime() < 24 * 3600000;
    }).length;

    const momentum = Math.min(100, cluster.items.length * 20 + recency * 15);

    // Most common category
    const catCounts: Record<string, number> = {};
    cluster.categories.forEach(c => { catCounts[c] = (catCounts[c] ?? 0) + 1; });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      cluster_key: key,
      cluster_label: cluster.label,
      category_code: topCat,
      momentum_score: momentum,
      content_count: cluster.items.length,
      sri_lanka_relevance_score: Math.round(sriLankaScore * 100),
      commercial_relevance_score: Math.round(commercialScore * 100),
      item_ids: cluster.items.map(i => i.id),
    };
  });
}
