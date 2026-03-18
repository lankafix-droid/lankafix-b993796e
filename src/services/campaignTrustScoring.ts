/**
 * LankaFix Campaign Trust Scoring Model — V2.1 (Outcome-Enriched)
 *
 * Computes 0-100 trust score from:
 *   1. Badge composition (weighted)
 *   2. Category-specific badge boosts
 *   3. Supply confidence adjustment
 *   4. Operational trust outcome signals (complaint, dispute, cancellation rates)
 *
 * The outcome signals are optional — the system degrades gracefully if
 * they are unavailable, falling back to badge + supply scoring only.
 */
import type { Campaign, TrustBadge, SupplyContext } from '@/types/campaign';

// ─── Badge Weights ───────────────────────────────────────────────
const BADGE_WEIGHTS: Record<TrustBadge, number> = {
  verified_partner: 5,
  transparent_pricing: 4,
  warranty_backed: 4,
  inspection_first: 3,
  genuine_parts: 3,
  structured_tracking: 3,
  diagnostic_protected: 3,
  sri_lanka_aligned: 2,
  business_ready: 2,
  data_safe: 2,
  ceb_compliant: 2,
};

// ─── Category-Specific Badge Boosts ──────────────────────────────
const CATEGORY_BADGE_BOOST: Record<string, TrustBadge[]> = {
  MOBILE: ['genuine_parts', 'warranty_backed', 'diagnostic_protected'],
  CONSUMER_ELEC: ['genuine_parts', 'warranty_backed'],
  AC: ['verified_partner', 'transparent_pricing'],
  IT: ['business_ready', 'data_safe'],
  SOLAR: ['ceb_compliant', 'sri_lanka_aligned', 'structured_tracking'],
  CCTV: ['business_ready', 'verified_partner'],
  ELECTRICAL: ['ceb_compliant', 'verified_partner'],
  SMART_HOME_OFFICE: ['data_safe', 'business_ready'],
};

/**
 * Operational trust outcome signals for a category.
 * All rates are 0-100 percentages. Lower is better for risk rates.
 * These are optional — populated from backend analytics when available.
 */
export interface TrustOutcomeSignals {
  complaintRate?: number;       // % of bookings with complaints
  disputeRate?: number;         // % of bookings escalated to dispute
  cancellationRate?: number;    // % of bookings cancelled
  noProviderFoundRate?: number; // % of bookings that failed dispatch
  quoteRevisionFrequency?: number; // avg revisions per quote
  warrantyIssueRate?: number;   // % of warranty claims with issues
}

/**
 * Computes a 0-100 trust score for a campaign.
 * Factors: badge weights, category boosts, supply confidence, outcome signals.
 */
export function computeTrustScore(
  campaign: Campaign,
  supply?: SupplyContext,
  outcomeSignals?: Record<string, TrustOutcomeSignals>,
): number {
  if (campaign.trust_badges.length === 0) return 0;

  // ── Base: weighted badge score ──
  let weightedSum = 0;
  for (const badge of campaign.trust_badges) {
    weightedSum += BADGE_WEIGHTS[badge] ?? 1;
  }

  // ── Category-specific boost ──
  let categoryBoost = 0;
  for (const cat of campaign.category_ids) {
    const boostedBadges = CATEGORY_BADGE_BOOST[cat];
    if (!boostedBadges) continue;
    for (const badge of campaign.trust_badges) {
      if (boostedBadges.includes(badge)) {
        categoryBoost += 2;
      }
    }
  }

  // ── Supply confidence adjustment ──
  let supplyAdjustment = 0;
  if (supply?.supplyConfidence && campaign.category_ids.length > 0) {
    const avgConfidence = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.score ?? 50);
    }, 0) / campaign.category_ids.length;

    if (avgConfidence < 30) supplyAdjustment = -10;
    else if (avgConfidence > 70) supplyAdjustment = 5;

    // SLA breach penalty
    const totalBreaches = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.recentSlaBreaches ?? 0);
    }, 0);
    if (totalBreaches > 3) supplyAdjustment -= 8;
  }

  // ── Operational outcome adjustment (V2.1) ──
  // Only applied when outcome data is available for relevant categories
  let outcomeAdjustment = 0;
  if (outcomeSignals && campaign.category_ids.length > 0) {
    for (const cat of campaign.category_ids) {
      const signals = outcomeSignals[cat];
      if (!signals) continue;

      // High complaint/dispute rates reduce trust
      if (signals.complaintRate !== undefined && signals.complaintRate > 10) {
        outcomeAdjustment -= Math.min(10, Math.round(signals.complaintRate * 0.5));
      }
      if (signals.disputeRate !== undefined && signals.disputeRate > 5) {
        outcomeAdjustment -= Math.min(8, Math.round(signals.disputeRate * 0.8));
      }
      // High cancellation or no-provider rates reduce trust
      if (signals.cancellationRate !== undefined && signals.cancellationRate > 15) {
        outcomeAdjustment -= Math.min(6, Math.round(signals.cancellationRate * 0.3));
      }
      if (signals.noProviderFoundRate !== undefined && signals.noProviderFoundRate > 20) {
        outcomeAdjustment -= Math.min(10, Math.round(signals.noProviderFoundRate * 0.4));
      }
      // Frequent quote revisions reduce pricing trust
      if (signals.quoteRevisionFrequency !== undefined && signals.quoteRevisionFrequency > 2) {
        outcomeAdjustment -= 3;
      }
      // Warranty issues reduce warranty trust
      if (signals.warrantyIssueRate !== undefined && signals.warrantyIssueRate > 10) {
        outcomeAdjustment -= 4;
      }
    }
    // Normalize by category count to avoid over-penalizing multi-category campaigns
    outcomeAdjustment = Math.round(outcomeAdjustment / campaign.category_ids.length);
  }

  // ── Normalize to 0-100 ──
  const raw = weightedSum + categoryBoost + supplyAdjustment + outcomeAdjustment;
  return Math.max(0, Math.min(100, Math.round(raw * 1.8)));
}
