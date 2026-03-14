/**
 * Category Discovery Engine
 * 
 * Analyzes unmatched search queries to detect emerging demand for
 * service categories not yet offered on LankaFix.
 * Generates recommendations when search volume crosses thresholds.
 */

import { supabase } from "@/integrations/supabase/client";
import { matchSearchToServices, SERVICE_KNOWLEDGE_GRAPH } from "@/engines/serviceKnowledgeGraph";

export interface CategoryDiscoveryInsight {
  keyword: string;
  searchCount: number;
  matchedExisting: boolean;
  suggestedCategoryName: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

// Known unmapped service keywords that indicate new category potential
const EMERGING_CATEGORY_HINTS: Record<string, string> = {
  "washing machine": "Washing Machine Repair",
  "fridge": "Refrigerator Service",
  "refrigerator": "Refrigerator Service",
  "microwave": "Microwave Repair",
  "water purifier": "Water Purifier Service",
  "geyser": "Water Heater Service",
  "generator": "Generator Service",
  "ups": "UPS / Inverter Service",
  "intercom": "Intercom Systems",
  "elevator": "Elevator Maintenance",
  "garage door": "Garage Door Repair",
  "pest control": "Pest Control",
  "painting": "Home Painting",
  "carpentry": "Carpentry Service",
  "waterproofing": "Waterproofing Service",
  "tiling": "Tiling Service",
};

const DISCOVERY_THRESHOLD = 5; // minimum searches to suggest

/**
 * Analyze recent AI search logs for unmatched or low-confidence queries.
 * Returns category expansion recommendations.
 */
export async function analyzeUnmatchedDemand(
  dayRange = 30
): Promise<CategoryDiscoveryInsight[]> {
  const since = new Date();
  since.setDate(since.getDate() - dayRange);

  const { data: logs } = await supabase
    .from("ai_interaction_logs")
    .select("input_query, matched_category, confidence_score")
    .eq("interaction_type", "search")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!logs || logs.length === 0) return [];

  // Count unmatched/low-confidence queries
  const keywordCounts: Record<string, number> = {};

  for (const log of logs) {
    const query = (log.input_query || "").toLowerCase().trim();
    if (!query) continue;

    const confidence = log.confidence_score ?? 0;
    const matched = log.matched_category && log.matched_category !== "INSPECTION_REQUIRED";

    // Only analyze low-confidence or unmatched queries
    if (matched && confidence > 50) continue;

    // Check if query matches known graph
    const graphMatches = matchSearchToServices(query);
    if (graphMatches.length > 0 && graphMatches[0].score > 15) continue;

    // Normalize to keyword
    const keyword = extractKeyword(query);
    if (keyword) {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    }
  }

  // Generate insights for keywords crossing threshold
  const insights: CategoryDiscoveryInsight[] = [];

  for (const [keyword, count] of Object.entries(keywordCounts)) {
    if (count < DISCOVERY_THRESHOLD) continue;

    const suggestedName = EMERGING_CATEGORY_HINTS[keyword] || `${capitalize(keyword)} Service`;
    const existingMatch = SERVICE_KNOWLEDGE_GRAPH.some(
      n => n.keywords.some(k => k.includes(keyword))
    );

    insights.push({
      keyword,
      searchCount: count,
      matchedExisting: existingMatch,
      suggestedCategoryName: suggestedName,
      confidence: count >= 20 ? "high" : count >= 10 ? "medium" : "low",
      reason: existingMatch
        ? `${count} searches partially match existing services — consider better keyword mapping`
        : `${count} unmatched searches in ${Math.round(count / 30 * 7)}/week — strong new category signal`,
    });
  }

  return insights.sort((a, b) => b.searchCount - a.searchCount);
}

function extractKeyword(query: string): string | null {
  // Check against known hints first
  for (const hint of Object.keys(EMERGING_CATEGORY_HINTS)) {
    if (query.includes(hint)) return hint;
  }

  // Fall back to longest 2-word phrase
  const words = query.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) return `${words[0]} ${words[1]}`;
  if (words.length === 1 && words[0].length > 3) return words[0];
  return null;
}

function capitalize(s: string): string {
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
