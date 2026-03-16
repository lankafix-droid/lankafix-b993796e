/**
 * AI Consent Service
 * Manages user consent for AI-powered features.
 * Ensures compliance with data privacy and transparency requirements.
 */

const CONSENT_KEY = "lankafix_ai_consent";

export interface AIConsentState {
  /** User has acknowledged AI advisory features */
  advisory_acknowledged: boolean;
  /** User consents to photo analysis for diagnostics */
  photo_analysis_consent: boolean;
  /** User consents to personalized recommendations */
  personalization_consent: boolean;
  /** User consents to voice-based booking (future) */
  voice_booking_consent: boolean;
  /** User consents to camera-based diagnostics (future) */
  camera_diagnostics_consent: boolean;
  /** Timestamp of last consent update */
  updated_at: string;
}

/** All consent capability keys */
export type AIConsentCapability = keyof Omit<AIConsentState, "updated_at">;

const DEFAULT_CONSENT: AIConsentState = {
  advisory_acknowledged: false,
  photo_analysis_consent: false,
  personalization_consent: false,
  voice_booking_consent: false,
  camera_diagnostics_consent: false,
  updated_at: new Date().toISOString(),
};

/** Map AI modules to their required consent capability */
const MODULE_CONSENT_MAP: Record<string, AIConsentCapability | null> = {
  ai_photo_triage: "photo_analysis_consent",
  ai_issue_triage: null, // text-only, no special consent
  ai_estimate_assist: null, // advisory, no special consent
  ai_partner_ranking: null,
  ai_review_summary: null,
  ai_retention_nudges: "personalization_consent",
  ai_fraud_watch: null, // internal, operator-only
  ai_operator_copilot: null,
  ai_demand_heatmap: null,
  ai_quality_monitor: null,
  ai_experiments: null,
  ai_voice_booking: "voice_booking_consent",
  ai_whatsapp_assist: "personalization_consent",
};

/** Get current AI consent state */
export function getAIConsent(): AIConsentState {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AIConsentState>;
      return { ...DEFAULT_CONSENT, ...parsed };
    }
  } catch {
    // Fallback to defaults
  }
  return { ...DEFAULT_CONSENT };
}

/** Update AI consent preferences */
export function setAIConsent(updates: Partial<AIConsentState>): AIConsentState {
  const current = getAIConsent();
  const updated: AIConsentState = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(updated));
  } catch {
    // Silent
  }
  return updated;
}

/** Check if a specific AI capability is consented */
export function hasAIConsent(capability: AIConsentCapability): boolean {
  return getAIConsent()[capability];
}

/**
 * Check if an AI module has the required consent to run.
 * Modules with no consent requirement always pass.
 */
export function checkModuleConsent(moduleName: string): {
  allowed: boolean;
  requiredConsent: AIConsentCapability | null;
} {
  const required = MODULE_CONSENT_MAP[moduleName] ?? null;
  if (!required) return { allowed: true, requiredConsent: null };
  return {
    allowed: hasAIConsent(required),
    requiredConsent: required,
  };
}

/** Revoke all AI consent */
export function revokeAllAIConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(DEFAULT_CONSENT));
  } catch {
    // Silent
  }
}
