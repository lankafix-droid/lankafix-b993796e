/**
 * AI Feature Flag System
 * Centralized configuration for all AI modules.
 * Consumer-facing AI defaults OFF, internal advisory AI defaults ON.
 */

export interface AIFeatureFlags {
  ai_photo_triage: boolean;
  ai_issue_triage: boolean;
  ai_estimate_assist: boolean;
  ai_partner_ranking: boolean;
  ai_review_summary: boolean;
  ai_retention_nudges: boolean;
  ai_fraud_watch: boolean;
  ai_operator_copilot: boolean;
  ai_demand_heatmap: boolean;
  ai_quality_monitor: boolean;
  ai_experiments: boolean;
  ai_voice_booking: boolean;
  ai_whatsapp_assist: boolean;
}

const DEFAULT_FLAGS: AIFeatureFlags = {
  // Consumer-facing → OFF by default
  ai_photo_triage: false,
  ai_issue_triage: false,
  ai_estimate_assist: false,
  ai_partner_ranking: false,
  ai_review_summary: false,
  ai_retention_nudges: false,
  ai_voice_booking: false,
  ai_whatsapp_assist: false,
  // Internal advisory → ON by default
  ai_fraud_watch: true,
  ai_operator_copilot: true,
  ai_demand_heatmap: true,
  ai_quality_monitor: true,
  ai_experiments: true,
};

let _overrides: Partial<AIFeatureFlags> = {};

/** Get the current state of all AI feature flags */
export function getAIFlags(): AIFeatureFlags {
  return { ...DEFAULT_FLAGS, ..._overrides };
}

/** Check if a specific AI feature is enabled */
export function isAIEnabled(flag: keyof AIFeatureFlags): boolean {
  return _overrides[flag] ?? DEFAULT_FLAGS[flag];
}

/** Override flags at runtime (e.g. from platform_settings) */
export function setAIFlagOverrides(overrides: Partial<AIFeatureFlags>) {
  _overrides = { ...overrides };
}

/** Reset all overrides to defaults */
export function resetAIFlags() {
  _overrides = {};
}

/** Load flags from platform_settings table */
export async function loadAIFlagsFromSettings(supabase: any): Promise<AIFeatureFlags> {
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_feature_flags")
      .single();
    if (data?.value && typeof data.value === "object") {
      setAIFlagOverrides(data.value as Partial<AIFeatureFlags>);
    }
  } catch {
    // Use defaults silently
  }
  return getAIFlags();
}
