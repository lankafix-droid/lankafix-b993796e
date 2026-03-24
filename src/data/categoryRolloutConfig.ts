/**
 * Category Rollout Configuration
 * Controls which categories use the new guided flow (Interface 2/3/4)
 * vs the legacy request flow. Change tiers here to progressively enable categories.
 */

export type RolloutTier = "live" | "next" | "soft_launch" | "hidden";

export interface CategoryRolloutEntry {
  code: string;
  tier: RolloutTier;
  /** Use guided flow route (/category/:code) */
  useGuidedFlow: boolean;
  note?: string;
}

/**
 * Wave 1: AC, Mobile — fully live with guided flow
 * Wave 2: IT, Copier, Network — guided flow enabled, pending final QA
 * Soft-launch: CCTV, Solar, Consumer Electronics — guided flow off, legacy route
 * Hidden: Smart Home — coming soon / hidden
 */
export const CATEGORY_ROLLOUT: Record<string, CategoryRolloutEntry> = {
  AC:               { code: "AC",               tier: "live",        useGuidedFlow: true,  note: "Wave 1 — fully live" },
  MOBILE:           { code: "MOBILE",           tier: "live",        useGuidedFlow: true,  note: "Wave 1 — fully live" },
  IT:               { code: "IT",               tier: "next",        useGuidedFlow: true,  note: "Wave 2 — final QA pending" },
  COPIER:           { code: "COPIER",           tier: "next",        useGuidedFlow: true,  note: "Wave 2 — final QA pending" },
  NETWORK:          { code: "NETWORK",          tier: "next",        useGuidedFlow: true,  note: "Wave 2 — final QA pending" },
  CCTV:             { code: "CCTV",             tier: "soft_launch", useGuidedFlow: false, note: "Controlled — needs live QA" },
  SOLAR:            { code: "SOLAR",            tier: "soft_launch", useGuidedFlow: false, note: "Controlled — supply confirmation needed" },
  CONSUMER_ELEC:    { code: "CONSUMER_ELEC",    tier: "soft_launch", useGuidedFlow: false, note: "Controlled — lower priority" },
  SMART_HOME_OFFICE:{ code: "SMART_HOME_OFFICE",tier: "hidden",      useGuidedFlow: false, note: "Coming soon — minimal supply" },
};

/** Check if a category should use the guided flow route */
export function shouldUseGuidedFlow(categoryCode: string): boolean {
  return CATEGORY_ROLLOUT[categoryCode]?.useGuidedFlow ?? false;
}

/** Get rollout tier for a category */
export function getRolloutTier(categoryCode: string): RolloutTier {
  return CATEGORY_ROLLOUT[categoryCode]?.tier ?? "hidden";
}

/** Get all categories in a specific tier */
export function getCategoriesByTier(tier: RolloutTier): string[] {
  return Object.values(CATEGORY_ROLLOUT)
    .filter((entry) => entry.tier === tier)
    .map((entry) => entry.code);
}
