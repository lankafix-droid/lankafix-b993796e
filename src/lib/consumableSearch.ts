import { PRINTER_MAPPINGS, type PrinterMapping } from "@/data/printerMappings";

export type MatchConfidence = "exact" | "likely" | "needs_verification";

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
  refillEligible: boolean;
}

export interface FinderResult {
  query: string;
  groups: SearchResultGroup[];
  confidence: MatchConfidence;
  matchType: "exact_code" | "exact_model" | "alias_match" | "fuzzy" | "semantic" | "no_match";
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
}

/** Strip common filler words for semantic matching */
function semanticNormalize(s: string): string[] {
  const lower = s.toLowerCase();
  const fillers = ["printer", "toner", "cartridge", "ink", "for", "my", "the", "a", "an", "colour", "color", "black", "compatible", "original", "genuine", "refill", "bottle", "supply", "supplies"];
  const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 0 && !fillers.includes(w));
  return words;
}

function isColorCode(code: string): boolean {
  const lower = code.toLowerCase();
  return (
    lower.startsWith("cl-") || lower.startsWith("cl ") || lower.startsWith("cl4") ||
    lower.includes("tri-color") || lower.includes("color") ||
    /^gt52/i.test(code) || /^bt5000/i.test(code) ||
    lower.startsWith("cli-") ||
    // Color ink bottles
    /^gi-\d+\s*(c|m|y)/i.test(code) ||
    /cyan|magenta|yellow/i.test(code)
  );
}

/** Determine refill eligibility — ink cartridges yes, ink tanks/toner generally no */
function isRefillEligible(consumableType: string, category: string): boolean {
  const type = consumableType.toLowerCase();
  const cat = category.toLowerCase();
  // Ink cartridges are refillable; ink tanks already use bottles; toner generally not for end users
  return type.includes("ink") && cat.includes("inkjet") && !cat.includes("ink tank");
}

/**
 * Main search function
 */
export function searchConsumables(query: string, brandFilter?: string): FinderResult {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { query: trimmed, groups: [], confidence: "needs_verification", matchType: "no_match" };
  }

  const norm = normalize(trimmed);
  const qLower = trimmed.toLowerCase();

  let pool = PRINTER_MAPPINGS;
  if (brandFilter && brandFilter !== "All") {
    pool = pool.filter((m) => m.brand === brandFilter);
  }

  // 1. Exact code match
  const codeMatches = pool.filter((m) =>
    m.codes.some((c) => normalize(c) === norm || c.toLowerCase() === qLower)
  );
  if (codeMatches.length > 0) {
    return buildResult(trimmed, codeMatches, "exact_code", "exact");
  }

  // 2. Exact alias match
  const aliasExact = pool.filter((m) =>
    m.aliases.some((a) => normalize(a) === norm || a === qLower)
  );
  if (aliasExact.length > 0) {
    return buildResult(trimmed, aliasExact, "exact_model", "exact");
  }

  // 3. Partial alias match
  const aliasPartial = pool.filter((m) =>
    m.aliases.some((a) => {
      const an = normalize(a);
      return an.includes(norm) || norm.includes(an);
    })
  );
  if (aliasPartial.length > 0) {
    const confidence: MatchConfidence = aliasPartial.length <= 5 ? "likely" : "needs_verification";
    return buildResult(trimmed, aliasPartial, "alias_match", confidence);
  }

  // 4. Partial code contains
  const codePartial = pool.filter((m) =>
    m.codes.some((c) => normalize(c).includes(norm) || norm.includes(normalize(c)))
  );
  if (codePartial.length > 0) {
    return buildResult(trimmed, codePartial, "fuzzy", "likely");
  }

  // 5. Model name partial match
  const wordMatch = pool.filter((m) =>
    normalize(m.printerModel).includes(norm) ||
    normalize(m.consumableCodes).includes(norm) ||
    norm.includes(normalize(m.printerModel))
  );
  if (wordMatch.length > 0) {
    return buildResult(trimmed, wordMatch, "fuzzy", "needs_verification");
  }

  // 6. Semantic / fuzzy — extract meaningful tokens and try matching
  const tokens = semanticNormalize(trimmed);
  if (tokens.length > 0) {
    const semanticMatches = pool.filter((m) => {
      const modelNorm = normalize(m.printerModel);
      const codesNorm = m.codes.map(normalize);
      const allAliases = m.aliases.map(normalize);
      const brandNorm = normalize(m.brand);
      
      return tokens.some(token => {
        const tn = normalize(token);
        if (tn.length < 2) return false;
        // Check if token matches brand
        if (brandNorm.includes(tn)) return false; // brand alone is too broad
        // Check model
        if (modelNorm.includes(tn) && tn.length >= 3) return true;
        // Check codes
        if (codesNorm.some(c => c.includes(tn) || tn.includes(c))) return true;
        // Check aliases
        if (allAliases.some(a => a.includes(tn) && tn.length >= 3)) return true;
        return false;
      });
    });

    // If brand token present, further filter
    const brandToken = tokens.find(t => ["hp", "canon", "brother", "epson", "xerox", "pantum"].includes(t.toLowerCase()));
    let filtered = semanticMatches;
    if (brandToken) {
      const brandFiltered = semanticMatches.filter(m => m.brand.toLowerCase() === brandToken.toLowerCase());
      if (brandFiltered.length > 0) filtered = brandFiltered;
    }

    if (filtered.length > 0 && filtered.length <= 20) {
      const confidence: MatchConfidence = filtered.length <= 5 ? "likely" : "needs_verification";
      return buildResult(trimmed, filtered, "semantic", confidence);
    }
  }

  return { query: trimmed, groups: [], confidence: "needs_verification", matchType: "no_match" };
}

function buildResult(
  query: string,
  matches: PrinterMapping[],
  matchType: FinderResult["matchType"],
  confidence: MatchConfidence
): FinderResult {
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
          refillEligible: isRefillEligible(m.consumableType, m.category),
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
  const results: Array<{ label: string; brand: string; score: number }> = [];
  const seen = new Set<string>();

  for (const m of PRINTER_MAPPINGS) {
    const modelNorm = normalize(m.printerModel);
    if (modelNorm.includes(norm) || norm.includes(modelNorm.slice(0, Math.min(modelNorm.length, norm.length)))) {
      const key = `${m.brand} ${m.printerModel}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ label: key, brand: m.brand, score: modelNorm === norm ? 0 : 1 });
      }
    }

    for (const code of m.codes) {
      if (normalize(code).includes(norm) || code.toLowerCase().includes(query.toLowerCase())) {
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
