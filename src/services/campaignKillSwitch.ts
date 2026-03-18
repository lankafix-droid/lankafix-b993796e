/**
 * LankaFix Campaign Kill Switch Service
 *
 * SOURCE OF TRUTH HIERARCHY:
 *   1. platform_settings table (DB) — primary for production
 *   2. Environment variable override — for emergency CLI kills
 *   3. Empty set (default) — if no source available, all campaigns run
 *
 * HOW IT WORKS:
 *   - kill_switch_key on a campaign is just a reference string (e.g. "ks_ac_promo_summer")
 *   - A campaign is only disabled if its key appears in the activated set
 *   - The activated set is loaded on app init from platform_settings
 *   - Future: Firebase Remote Config, admin CMS, feature flag services
 *
 * INTEGRATION POINTS:
 *   - App.tsx / main layout: call loadKillSwitchKeys() on mount
 *   - campaignEngine.ts: consumes via setActivatedKillSwitchKeys()
 *   - Admin CMS (future): writes to platform_settings.campaign_kill_switches
 *   - Remote Config (future): merge remote keys into activated set
 *
 * GRACEFUL DEFAULT:
 *   If platform_settings is unreachable or the key doesn't exist,
 *   the activated set stays empty → all campaigns run. This is safe
 *   because campaigns already pass through supply gating, approval
 *   status, and schedule checks independently.
 */
import { supabase } from '@/integrations/supabase/client';
import { setActivatedKillSwitchKeys } from '@/services/campaignEngine';

/**
 * Load activated kill switch keys from platform_settings table.
 * Expected row: { setting_key: 'campaign_kill_switches', setting_value: { keys: [...] } }
 *
 * Call this on app init (e.g., in App.tsx useEffect or root layout).
 * Safe to call multiple times — latest result wins.
 */
export async function loadKillSwitchKeys(): Promise<void> {
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
        return;
      }
    }

    // No keys found — all campaigns run (safe default)
    setActivatedKillSwitchKeys([]);
  } catch {
    // Non-critical failure — proceed with empty set (all campaigns active)
    setActivatedKillSwitchKeys([]);
  }
}

/**
 * Manual override for testing or emergency use.
 * Call directly to force-disable campaigns by kill switch key.
 *
 * Example: activateKillSwitch('ks_ac_promo_summer')
 */
export function activateKillSwitchManually(keys: string[]): void {
  setActivatedKillSwitchKeys(keys);
}

/**
 * Future integration point for Firebase Remote Config or similar.
 * Call this after fetching remote config to merge kill switch keys.
 *
 * Example:
 *   const remoteKeys = await fetchRemoteConfig('campaign_kill_switches');
 *   mergeRemoteKillSwitchKeys(remoteKeys);
 */
export function mergeRemoteKillSwitchKeys(remoteKeys: string[]): void {
  // For now, remote keys fully replace the set.
  // Future: could merge with DB-loaded keys for layered control.
  setActivatedKillSwitchKeys(remoteKeys);
}
