/**
 * Zone Normalization Engine — LankaFix Sri Lanka
 *
 * Maps free-text location strings to structured zone codes.
 * Phase-1: Greater Colombo zones only.
 * Architecture: extensible for islandwide expansion.
 *
 * IMPORTANT: Core routing uses zone_code, NOT free-text string matching.
 */

export interface ZoneMatch {
  /** Normalized zone code (e.g., "col_07", "nugegoda") */
  zone_code: string;
  /** Human-readable zone name */
  zone_name: string;
  /** Confidence: exact | partial | nearest | unknown */
  confidence: "exact" | "partial" | "nearest" | "unknown";
  /** Original input preserved for display */
  original_input: string;
}

/** Phase-1 Greater Colombo zone registry */
export const ZONE_REGISTRY: Record<string, { name: string; aliases: string[] }> = {
  col_01: { name: "Colombo 01 (Fort)", aliases: ["colombo 1", "fort", "colombo 01", "col 1", "col 01"] },
  col_02: { name: "Colombo 02 (Slave Island)", aliases: ["colombo 2", "slave island", "colombo 02", "col 2", "col 02"] },
  col_03: { name: "Colombo 03 (Kollupitiya)", aliases: ["colombo 3", "kollupitiya", "colpetty", "colombo 03", "col 3", "col 03"] },
  col_04: { name: "Colombo 04 (Bambalapitiya)", aliases: ["colombo 4", "bambalapitiya", "colombo 04", "col 4", "col 04"] },
  col_05: { name: "Colombo 05 (Havelock Town)", aliases: ["colombo 5", "havelock town", "havelock", "kirulapone", "colombo 05", "col 5", "col 05"] },
  col_06: { name: "Colombo 06 (Wellawatte)", aliases: ["colombo 6", "wellawatte", "wellawatta", "pamankada", "colombo 06", "col 6", "col 06"] },
  col_07: { name: "Colombo 07 (Cinnamon Gardens)", aliases: ["colombo 7", "cinnamon gardens", "colombo 07", "col 7", "col 07"] },
  col_08: { name: "Colombo 08 (Borella)", aliases: ["colombo 8", "borella", "maradana", "colombo 08", "col 8", "col 08"] },
  col_09: { name: "Colombo 09 (Dematagoda)", aliases: ["colombo 9", "dematagoda", "colombo 09", "col 9", "col 09"] },
  col_10: { name: "Colombo 10 (Maligawatte)", aliases: ["colombo 10", "maligawatte", "col 10", "col_10"] },
  col_11: { name: "Colombo 11 (Pettah)", aliases: ["colombo 11", "pettah", "col 11", "col_11"] },
  col_12: { name: "Colombo 12 (Hultsdorf)", aliases: ["colombo 12", "hultsdorf", "col 12", "col_12"] },
  col_13: { name: "Colombo 13 (Kotahena)", aliases: ["colombo 13", "kotahena", "col 13", "col_13"] },
  col_14: { name: "Colombo 14 (Grandpass)", aliases: ["colombo 14", "grandpass", "col 14", "col_14"] },
  col_15: { name: "Colombo 15 (Mattakkuliya)", aliases: ["colombo 15", "mattakkuliya", "col 15", "col_15"] },
  nugegoda: { name: "Nugegoda", aliases: ["nugegoda", "nawinna", "wijerama", "pagoda"] },
  maharagama: { name: "Maharagama", aliases: ["maharagama"] },
  dehiwala: { name: "Dehiwala", aliases: ["dehiwala", "dehiwela"] },
  mt_lavinia: { name: "Mount Lavinia", aliases: ["mount lavinia", "mt lavinia", "mt. lavinia", "mountlavinia"] },
  rajagiriya: { name: "Rajagiriya", aliases: ["rajagiriya"] },
  battaramulla: { name: "Battaramulla", aliases: ["battaramulla"] },
  nawala: { name: "Nawala", aliases: ["nawala", "narahenpita"] },
  wattala: { name: "Wattala", aliases: ["wattala", "hendala"] },
  moratuwa: { name: "Moratuwa", aliases: ["moratuwa", "rawathawatte"] },
  thalawathugoda: { name: "Thalawathugoda", aliases: ["thalawathugoda", "talawatugoda"] },
  kottawa: { name: "Kottawa", aliases: ["kottawa", "pannipitiya"] },
  piliyandala: { name: "Piliyandala", aliases: ["piliyandala"] },
  malabe: { name: "Malabe", aliases: ["malabe", "kaduwela"] },
  kelaniya: { name: "Kelaniya", aliases: ["kelaniya", "peliyagoda"] },
  kotte: { name: "Sri Jayawardenepura Kotte", aliases: ["kotte", "sri jayawardenepura", "ethul kotte", "pita kotte"] },
  boralesgamuwa: { name: "Boralesgamuwa", aliases: ["boralesgamuwa", "pepiliyana"] },
  negombo: { name: "Negombo", aliases: ["negombo"] },
};

/**
 * Resolve a free-text location string to a structured zone code.
 *
 * Strategy:
 * 1. Exact alias match → "exact"
 * 2. Partial substring match → "partial"
 * 3. No match → "unknown" (flags for manual operator routing)
 */
export function resolveZone(location: string | null | undefined): ZoneMatch {
  const input = (location || "").trim();

  if (!input) {
    return { zone_code: "", zone_name: "", confidence: "unknown", original_input: input };
  }

  const normalized = input.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  // 1. Exact alias match
  for (const [code, zone] of Object.entries(ZONE_REGISTRY)) {
    for (const alias of zone.aliases) {
      if (normalized === alias || normalized === code) {
        return { zone_code: code, zone_name: zone.name, confidence: "exact", original_input: input };
      }
    }
  }

  // 2. Safer partial match
  // SAFETY: require minimum 4 chars to avoid false positives from short fragments
  // like "col" matching "col_01". Also require the alias to be at least 4 chars
  // when checking if the alias is contained in the input.
  const MIN_TOKEN_LENGTH = 4;
  const partialMatches: { code: string; name: string; aliasLen: number }[] = [];
  for (const [code, zone] of Object.entries(ZONE_REGISTRY)) {
    for (const alias of zone.aliases) {
      // Input contains alias — alias must be long enough to be meaningful
      if (alias.length >= MIN_TOKEN_LENGTH && normalized.includes(alias)) {
        partialMatches.push({ code, name: zone.name, aliasLen: alias.length });
      }
      // Alias contains input — input must be long enough to avoid "col" → "col_01"
      else if (normalized.length >= MIN_TOKEN_LENGTH && alias.includes(normalized)) {
        partialMatches.push({ code, name: zone.name, aliasLen: alias.length });
      }
    }
  }

  if (partialMatches.length > 0) {
    // Prefer longest alias match (most specific)
    partialMatches.sort((a, b) => b.aliasLen - a.aliasLen);
    return {
      zone_code: partialMatches[0].code,
      zone_name: partialMatches[0].name,
      confidence: "partial",
      original_input: input,
    };
  }

  // 3. Unknown — needs manual operator routing
  return { zone_code: "", zone_name: "", confidence: "unknown", original_input: input };
}

/** Check if a partner's service zones include a given zone code */
export function partnerServesZone(
  partnerZones: string[] | null | undefined,
  targetZone: string
): boolean {
  if (!targetZone || !partnerZones?.length) return false;
  return partnerZones.includes(targetZone);
}

/** Get adjacent zones for fallback matching (Greater Colombo proximity) */
const ADJACENT_ZONES: Record<string, string[]> = {
  nugegoda: ["col_05", "col_06", "maharagama", "kottawa", "boralesgamuwa"],
  maharagama: ["nugegoda", "kottawa", "boralesgamuwa", "piliyandala"],
  dehiwala: ["col_06", "mt_lavinia", "nugegoda"],
  mt_lavinia: ["dehiwala", "moratuwa"],
  rajagiriya: ["battaramulla", "nawala", "col_07", "kotte"],
  battaramulla: ["rajagiriya", "malabe", "kotte", "thalawathugoda"],
  nawala: ["rajagiriya", "col_05", "col_07", "nugegoda"],
  kotte: ["rajagiriya", "battaramulla", "nawala", "nugegoda"],
  malabe: ["battaramulla", "thalawathugoda", "kottawa"],
  thalawathugoda: ["battaramulla", "malabe", "kottawa"],
  kottawa: ["maharagama", "piliyandala", "malabe", "thalawathugoda"],
  wattala: ["kelaniya", "col_15", "negombo"],
  kelaniya: ["wattala", "col_14", "col_15"],
  moratuwa: ["mt_lavinia", "piliyandala"],
  piliyandala: ["kottawa", "maharagama", "moratuwa", "boralesgamuwa"],
  boralesgamuwa: ["nugegoda", "maharagama", "piliyandala"],
  negombo: ["wattala"],
};

// Colombo zones are all adjacent to each other
for (let i = 1; i <= 15; i++) {
  const code = `col_${String(i).padStart(2, "0")}`;
  const adjacent: string[] = [];
  if (i > 1) adjacent.push(`col_${String(i - 1).padStart(2, "0")}`);
  if (i < 15) adjacent.push(`col_${String(i + 1).padStart(2, "0")}`);
  // Add nearby suburban zones for boundary Colombo zones
  if (i >= 5 && i <= 7) adjacent.push("nawala", "rajagiriya");
  if (i === 6) adjacent.push("dehiwala", "nugegoda");
  if (i >= 14) adjacent.push("wattala", "kelaniya");
  ADJACENT_ZONES[code] = adjacent;
}

/** Check if partner serves target zone or adjacent zones */
export function partnerServesZoneOrAdjacent(
  partnerZones: string[] | null | undefined,
  targetZone: string
): { serves: boolean; direct: boolean } {
  if (!targetZone || !partnerZones?.length) return { serves: false, direct: false };
  if (partnerZones.includes(targetZone)) return { serves: true, direct: true };

  const adjacent = ADJACENT_ZONES[targetZone] || [];
  const servesAdjacent = adjacent.some((z) => partnerZones.includes(z));
  return { serves: servesAdjacent, direct: false };
}

/** Get all valid zone codes for the current launch phase */
export function getActiveZoneCodes(): string[] {
  return Object.keys(ZONE_REGISTRY);
}

/** Get zone display name */
export function getZoneDisplayName(zoneCode: string): string {
  return ZONE_REGISTRY[zoneCode]?.name || zoneCode;
}
