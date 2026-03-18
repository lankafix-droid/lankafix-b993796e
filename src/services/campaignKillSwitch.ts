/**
 * LankaFix Campaign Kill Switch Service — V3 Final
 *
 * SOURCE OF TRUTH HIERARCHY:
 *   1. platform_settings table (DB) — primary for production
 *   2. localStorage cache — instant startup with last-known keys
 *   3. Empty set (default) — if no source available, all campaigns run
 *
 * INITIALIZATION TIMING:
 *   This service MUST be called on app init BEFORE the first campaign render.
 *   The recommended pattern:
 *     1. App.tsx useEffect → loadKillSwitchKeys()
 *     2. loadKillSwitchKeys() reads localStorage cache immediately (sync)
 *     3. Then fetches from platform_settings (async)
 *     4. On success, updates both in-memory set and localStorage cache
 *     5. Calls markKillSwitchConfigReady() to signal readiness
 *
 *   This ensures no flash of killed campaigns: the localStorage cache
 *   provides last-known state instantly, then the DB refreshes it.
 *
 * GRACEFUL DEFAULT:
 *   If platform_settings is unreachable and no cache exists,
 *   the activated set stays empty → all campaigns run. This is safe
 *   because campaigns already pass through supply gating, approval
 *   status, and schedule checks independently.
 */
import { supabase } from '@/integrations/supabase/client';
import { setActivatedKillSwitchKeys, markKillSwitchConfigReady } from '@/services/campaignEngine';

const CACHE_KEY = 'lf_kill_switch_keys';

/**
 * Load cached kill switch keys from localStorage (synchronous, instant).
 * Called internally before async DB fetch to prevent flash of killed campaigns.
 */
function loadCachedKeys(): string[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore parse errors */ }
  return [];
}

/** Persist kill switch keys to localStorage for instant next-session startup */
function cacheKeys(keys: string[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(keys));
  } catch { /* SSR safe */ }
}

/**
 * Load activated kill switch keys from platform_settings table.
 * Expected row: { key: 'campaign_kill_switches', value: { keys: [...] } }
 *
 * Call this on app init (e.g., in App.tsx useEffect or root layout).
 * Safe to call multiple times — latest result wins.
 *
 * INITIALIZATION ORDER:
 *   1. Immediately applies cached keys from localStorage (no flash)
 *   2. Fetches fresh keys from DB
 *   3. Updates in-memory set + localStorage cache
 *   4. Marks config as ready
 */
export async function loadKillSwitchKeys(): Promise<void> {
  // Step 1: Apply cached keys immediately (sync, no network wait)
  const cached = loadCachedKeys();
  if (cached.length > 0) {
    setActivatedKillSwitchKeys(cached);
  }

  // Step 2: Fetch fresh keys from DB (async)
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'campaign_kill_switches')
      .maybeSingle();

    if (data?.value && typeof data.value === 'object') {
      const val = data.value as { keys?: string[] };
      if (Array.isArray(val.keys)) {
        setActivatedKillSwitchKeys(val.keys);
        cacheKeys(val.keys);
        markKillSwitchConfigReady();
        return;
      }
    }

    // No keys found — all campaigns run (safe default)
    setActivatedKillSwitchKeys([]);
    cacheKeys([]);
  } catch {
    // Non-critical failure — cached keys (if any) remain active
  }

  markKillSwitchConfigReady();
}

/**
 * Manual override for testing or emergency use.
 * Call directly to force-disable campaigns by kill switch key.
 */
export function activateKillSwitchManually(keys: string[]): void {
  setActivatedKillSwitchKeys(keys);
  cacheKeys(keys);
}

/**
 * Future integration point for Firebase Remote Config or similar.
 * Call this after fetching remote config to merge kill switch keys.
 */
export function mergeRemoteKillSwitchKeys(remoteKeys: string[]): void {
  setActivatedKillSwitchKeys(remoteKeys);
  cacheKeys(remoteKeys);
}
