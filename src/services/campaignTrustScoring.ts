/**
 * LankaFix Campaign Trust Scoring Model
 * Computes a meaningful trust score based on badge composition, category sensitivity,
 * and supply confidence — not just badge count.
 */
import type { Campaign, TrustBadge, SupplyContext } from '@/types/campaign';

/**
 * Badge weight model — higher weight = stronger trust signal.
 * Weights reflect real-world user trust priorities in Sri Lanka.
 */
const BADGE_WEIGHTS: Record<TrustBadge, number> = {
  verified_partner: 5,       // Foundational trust — highest weight
  transparent_pricing: 4,    // Critical for price-sensitive SL market
  warranty_backed: 4,        // Strong conversion driver
  inspection_first: 3,       // Reduces user risk anxiety
  genuine_parts: 3,          // Important for electronics/mobile
  structured_tracking: 3,    // Service accountability
  diagnostic_protected: 3,   // Protects user from unnecessary repair
  sri_lanka_aligned: 2,      // Local relevance signal
  business_ready: 2,         // B2B trust
  data_safe: 2,              // Privacy-conscious segments
  ceb_compliant: 2,          // Regulatory trust for electrical/solar
};

/**
 * Categories where specific badges carry extra weight.
 * e.g., "genuine_parts" matters more for MOBILE than for CCTV installation.
 */
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
 * Computes a 0-100 trust score for a campaign.
 * Factors: badge weights, category-specific boosts, supply confidence adjustment.
 */
export function computeTrustScore(
  campaign: Campaign,
  supply?: SupplyContext,
): number {
  if (campaign.trust_badges.length === 0) return 0;

  // Base score from weighted badges
  let weightedSum = 0;
  for (const badge of campaign.trust_badges) {
    weightedSum += BADGE_WEIGHTS[badge] ?? 1;
  }

  // Category-specific boost: if campaign targets categories where its badges are especially relevant
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

  // Supply confidence adjustment — weaken trust score if supply can't back it up
  let supplyAdjustment = 0;
  if (supply?.supplyConfidence && campaign.category_ids.length > 0) {
    const avgConfidence = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.score ?? 50);
    }, 0) / campaign.category_ids.length;

    // Penalize if making trust claims with weak supply
    if (avgConfidence < 30) {
      supplyAdjustment = -10;
    } else if (avgConfidence > 70) {
      supplyAdjustment = 5;
    }
  }

  // Complaint risk: if supply has high SLA breaches, reduce trust score
  if (supply?.supplyConfidence && campaign.category_ids.length > 0) {
    const totalBreaches = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.recentSlaBreaches ?? 0);
    }, 0);
    if (totalBreaches > 3) {
      supplyAdjustment -= 8;
    }
  }

  // Normalize to 0-100 scale
  // Max possible: ~11 badges * 5 weight + category boost + supply = ~70 raw
  const raw = weightedSum + categoryBoost + supplyAdjustment;
  return Math.max(0, Math.min(100, Math.round(raw * 1.8)));
}
