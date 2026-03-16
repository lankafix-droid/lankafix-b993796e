/**
 * AI Cache Service
 * Lightweight client-side cache for AI responses to reduce redundant calls.
 * Uses sessionStorage with TTL-based expiry.
 */

const CACHE_PREFIX = "lf_ai_cache_";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
  module: string;
}

/** Generate a deterministic cache key from module + input */
export function cacheKey(module: string, input: Record<string, unknown>): string {
  const sorted = JSON.stringify(input, Object.keys(input).sort());
  // Simple hash for key brevity
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) - hash + sorted.charCodeAt(i)) | 0;
  }
  return `${CACHE_PREFIX}${module}_${Math.abs(hash).toString(36)}`;
}

/** Get a cached AI response if still valid */
export function getCachedAI<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry<T>;
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** Store an AI response in cache */
export function setCachedAI<T>(
  key: string,
  data: T,
  module: string,
  ttlMs = DEFAULT_TTL_MS
): void {
  try {
    const entry: CachedEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
      module,
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — silent
  }
}

/** Clear all AI cache entries */
export function clearAICache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Silent
  }
}

/** Wrap an AI call with caching */
export async function withCache<T>(
  module: string,
  input: Record<string, unknown>,
  aiCall: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<{ data: T; cached: boolean }> {
  const key = cacheKey(module, input);
  const cached = getCachedAI<T>(key);
  if (cached !== null) {
    return { data: cached, cached: true };
  }
  const data = await aiCall();
  setCachedAI(key, data, module, ttlMs);
  return { data, cached: false };
}
