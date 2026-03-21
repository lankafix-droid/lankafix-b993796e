import { PRINTER_MAPPINGS, type PrinterMapping } from "@/data/printerMappings";

export type MatchConfidence = "exact" | "likely" | "needs_verification";

export interface ConsumableMatch {
  code: string;
  brand: string;
  printerModel: string;
  modelGroup: string;
  category: string;
  consumableType: string;
  consumableCodes: string;
  codes: string[];
  yieldStr: string;
  notes: string;
  confidence: MatchConfidence;
  matchedPrinters: string[];
}

export interface SearchResultGroup {
  supplyCode: string;
  brand: string;
  consumableType: string;
  category: string;
  yieldStr: string;
  confidence: MatchConfidence;
  matchedPrinters: string[];
  isColor: boolean;
  notes: string;
}

export interface FinderResult {
  query: string;
  groups: SearchResultGroup[];
  confidence: MatchConfidence;
  matchType: "exact_code" | "exact_model" | "alias_match" | "fuzzy" | "no_match";
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
}

/**
 * Determines if a supply code is likely a color cartridge
 */
function isColorCode(code: string): boolean {
  const lower = code.toLowerCase();
  return (
    lower.startsWith("cl-") || lower.startsWith("cl ") ||
    lower.includes("tri-color") || lower.includes("color") ||
    /^gt52/i.test(code) || /^bt5000/i.test(code) ||
    // CLI- codes are color for Canon
    lower.startsWith("cli-")
  );
}

/**
 * Main search function — searches the mapping data
 */
export function searchConsumables(query: string, brandFilter?: string): FinderResult {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { query: trimmed, groups: [], confidence: "needs_verification", matchType: "no_match" };
  }

  const norm = normalize(trimmed);
  const qLower = trimmed.toLowerCase();

  // Filter by brand if specified
  let pool = PRINTER_MAPPINGS;
  if (brandFilter && brandFilter !== "All") {
    pool = pool.filter((m) => m.brand === brandFilter);
  }

  // 1. Exact code match — user typed a supply code directly
  const codeMatches = pool.filter((m) =>
    m.codes.some((c) => normalize(c) === norm || c.toLowerCase() === qLower)
  );
  if (codeMatches.length > 0) {
    return buildResult(trimmed, codeMatches, "exact_code", "exact");
  }

  // 2. Exact alias match (includes model names, normalized variants)
  const aliasExact = pool.filter((m) =>
    m.aliases.some((a) => normalize(a) === norm || a === qLower)
  );
  if (aliasExact.length > 0) {
    return buildResult(trimmed, aliasExact, "exact_model", "exact");
  }

  // 3. Partial alias match (contains)
  const aliasPartial = pool.filter((m) =>
    m.aliases.some((a) => a.includes(qLower) || normalize(a).includes(norm) || qLower.includes(a) || norm.includes(normalize(a)))
  );
  if (aliasPartial.length > 0) {
    // Determine confidence based on how close the match is
    const confidence: MatchConfidence = aliasPartial.length <= 5 ? "likely" : "needs_verification";
    return buildResult(trimmed, aliasPartial, "alias_match", confidence);
  }

  // 4. Fuzzy: partial code contains
  const codePartial = pool.filter((m) =>
    m.codes.some((c) => normalize(c).includes(norm) || norm.includes(normalize(c)))
  );
  if (codePartial.length > 0) {
    return buildResult(trimmed, codePartial, "fuzzy", "needs_verification");
  }

  // 5. Title/model partial word match
  const wordMatch = pool.filter((m) =>
    normalize(m.printerModel).includes(norm) ||
    normalize(m.consumableCodes).includes(norm) ||
    norm.includes(normalize(m.printerModel))
  );
  if (wordMatch.length > 0) {
    return buildResult(trimmed, wordMatch, "fuzzy", "needs_verification");
  }

  return { query: trimmed, groups: [], confidence: "needs_verification", matchType: "no_match" };
}

function buildResult(
  query: string,
  matches: PrinterMapping[],
  matchType: FinderResult["matchType"],
  confidence: MatchConfidence
): FinderResult {
  // Group by unique supply code (deduplicate across multiple printers)
  const codeMap = new Map<string, SearchResultGroup>();

  for (const m of matches) {
    for (const code of m.codes) {
      const key = `${m.brand}|${code}`;
      if (!codeMap.has(key)) {
        codeMap.set(key, {
          supplyCode: code,
          brand: m.brand,
          consumableType: m.consumableType,
          category: m.category,
          yieldStr: m.yieldStr,
          confidence,
          matchedPrinters: [m.printerModel],
          isColor: isColorCode(code),
          notes: m.notes,
        });
      } else {
        const existing = codeMap.get(key)!;
        if (!existing.matchedPrinters.includes(m.printerModel)) {
          existing.matchedPrinters.push(m.printerModel);
        }
      }
    }
  }

  const groups = Array.from(codeMap.values());

  // Sort: black before color, then alphabetically
  groups.sort((a, b) => {
    if (a.isColor !== b.isColor) return a.isColor ? 1 : -1;
    return a.supplyCode.localeCompare(b.supplyCode);
  });

  return { query, groups, confidence, matchType };
}

/**
 * Get suggestions for autocomplete
 */
export function getSuggestions(query: string, limit = 8): Array<{ label: string; brand: string }> {
  if (!query || query.length < 2) return [];
  const norm = normalize(query);
  const qLower = query.toLowerCase();
  const results: Array<{ label: string; brand: string; score: number }> = [];
  const seen = new Set<string>();

  for (const m of PRINTER_MAPPINGS) {
    // Check printer model
    const modelNorm = normalize(m.printerModel);
    if (modelNorm.includes(norm) || qLower.includes(m.printerModel.toLowerCase().slice(0, 5))) {
      const key = `${m.brand} ${m.printerModel}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ label: key, brand: m.brand, score: modelNorm === norm ? 0 : 1 });
      }
    }

    // Check codes
    for (const code of m.codes) {
      if (normalize(code).includes(norm) || code.toLowerCase().includes(qLower)) {
        const key = `${m.brand} ${code}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ label: key, brand: m.brand, score: normalize(code) === norm ? 0 : 2 });
        }
      }
    }
  }

  results.sort((a, b) => a.score - b.score);
  return results.slice(0, limit);
}
