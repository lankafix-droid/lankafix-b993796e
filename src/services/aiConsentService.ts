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
  /** Timestamp of last consent update */
  updated_at: string;
}

const DEFAULT_CONSENT: AIConsentState = {
  advisory_acknowledged: false,
  photo_analysis_consent: false,
  personalization_consent: false,
  updated_at: new Date().toISOString(),
};

/** Get current AI consent state */
export function getAIConsent(): AIConsentState {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) return JSON.parse(stored) as AIConsentState;
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
export function hasAIConsent(
  capability: "advisory_acknowledged" | "photo_analysis_consent" | "personalization_consent"
): boolean {
  return getAIConsent()[capability];
}

/** Revoke all AI consent */
export function revokeAllAIConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(DEFAULT_CONSENT));
  } catch {
    // Silent
  }
}
