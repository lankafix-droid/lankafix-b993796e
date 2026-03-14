/**
 * A/B Experimentation Framework
 * 
 * Lightweight experiment system using platform_settings table.
 * Assigns users to experiment variants deterministically based on user ID hash.
 * 
 * Usage:
 *   const variant = getVariant("diagnosis_flow_v2", userId);
 *   if (variant === "treatment") { ... }
 */

import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

export interface Experiment {
  key: string;
  variants: string[];       // e.g., ["control", "treatment"]
  weights: number[];        // e.g., [50, 50] — must sum to 100
  active: boolean;
}

// In-memory cache to avoid repeated DB reads
let experimentCache: Record<string, Experiment> = {};
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Simple deterministic hash for user assignment.
 * Returns 0–99 based on experiment key + user ID.
 */
function hashAssign(experimentKey: string, userId: string): number {
  const str = `${experimentKey}:${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Load experiments from platform_settings.
 * Expects a setting with key "experiments" containing JSON array of Experiment objects.
 */
async function loadExperiments(): Promise<void> {
  if (Date.now() - cacheLoadedAt < CACHE_TTL_MS && Object.keys(experimentCache).length > 0) return;

  try {
    const { data } = await supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "experiments")
      .maybeSingle();

    if (data?.value) {
      const experiments: Experiment[] = typeof data.value === "string" ? JSON.parse(data.value) : (data.value as any);
      experimentCache = {};
      for (const exp of experiments) {
        if (exp.active) experimentCache[exp.key] = exp;
      }
    }
    cacheLoadedAt = Date.now();
  } catch {
    // Silent fail — experiments are non-critical
  }
}

/**
 * Get the variant for a user in a given experiment.
 * Returns "control" if experiment not found or inactive.
 */
export async function getVariant(experimentKey: string, userId?: string): Promise<string> {
  await loadExperiments();

  const exp = experimentCache[experimentKey];
  if (!exp || !exp.active) return "control";

  // Anonymous users always get control
  if (!userId) return exp.variants[0] || "control";

  const bucket = hashAssign(experimentKey, userId);
  let cumulative = 0;
  for (let i = 0; i < exp.variants.length; i++) {
    cumulative += exp.weights[i] || 0;
    if (bucket < cumulative) return exp.variants[i];
  }

  return exp.variants[0] || "control";
}

/**
 * Track an experiment exposure event.
 */
export function trackExposure(experimentKey: string, variant: string) {
  track("experiment_exposure", { experiment: experimentKey, variant });
}

/**
 * Track an experiment conversion event.
 */
export function trackConversion(experimentKey: string, variant: string, metric: string) {
  track("experiment_conversion", { experiment: experimentKey, variant, metric });
}

/**
 * React hook helper — get variant synchronously from cache after initial load.
 */
export function getVariantSync(experimentKey: string, userId?: string): string {
  const exp = experimentCache[experimentKey];
  if (!exp || !exp.active || !userId) return "control";

  const bucket = hashAssign(experimentKey, userId);
  let cumulative = 0;
  for (let i = 0; i < exp.variants.length; i++) {
    cumulative += exp.weights[i] || 0;
    if (bucket < cumulative) return exp.variants[i];
  }
  return exp.variants[0] || "control";
}

/**
 * Preload experiments — call once on app init.
 */
export async function preloadExperiments(): Promise<void> {
  await loadExperiments();
}
