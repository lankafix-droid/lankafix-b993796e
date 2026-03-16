/**
 * AI Execution Guards — Shared precondition checks for advisory modules.
 * Prevents noisy or premature AI rendering.
 */

/** Check if a description is meaningful enough for triage */
export function hasMeaningfulDescription(text: string | undefined | null, minLength = 10): boolean {
  return !!text && text.trim().length >= minLength;
}

/** Check if a category code is present and valid */
export function hasCategory(categoryCode: string | undefined | null): boolean {
  return !!categoryCode && categoryCode.trim().length > 0 && categoryCode !== "_NONE_";
}

/** Check if a partner list is non-empty */
export function hasPartners(partners: unknown[] | undefined | null): boolean {
  return Array.isArray(partners) && partners.length > 0;
}

/** Can run issue triage? Needs meaningful description */
export function canRunIssueTriage(description: string | undefined | null, _categoryCode?: string): boolean {
  return hasMeaningfulDescription(description, 10);
}

/** Can run estimate? Needs a valid category */
export function canRunEstimate(categoryCode: string | undefined | null): boolean {
  return hasCategory(categoryCode);
}

/** Can run partner ranking? Needs category + partners */
export function canRunPartnerRanking(
  partners: unknown[] | undefined | null,
  categoryCode: string | undefined | null
): boolean {
  return hasCategory(categoryCode) && hasPartners(partners);
}
