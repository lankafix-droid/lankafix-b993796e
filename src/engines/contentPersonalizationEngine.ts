/**
 * Content Personalization Engine — Builds user affinity profile from behavior.
 * No filter bubbles: always maintain discovery + trust + usefulness balance.
 */

import type { RankingContext } from './contentRankingEngine';

export interface UserBehaviorSignals {
  viewedCategories: string[];     // category codes the user has viewed
  bookedCategories: string[];     // categories with completed bookings
  clickedContentIds: string[];    // content items clicked
  clickedContentTypes: string[];  // content types clicked
  pendingBookingCategories: string[]; // categories with pending bookings
  savedContentIds: string[];
}

/**
 * Build category affinity from behavior signals.
 * Returns a map of category -> affinity (0-1).
 */
function buildCategoryAffinity(signals: UserBehaviorSignals): Record<string, number> {
  const affinity: Record<string, number> = {};

  // Booked categories get strongest signal
  signals.bookedCategories.forEach(c => {
    affinity[c] = Math.min(1, (affinity[c] ?? 0) + 0.6);
  });

  // Pending bookings get high signal
  signals.pendingBookingCategories.forEach(c => {
    affinity[c] = Math.min(1, (affinity[c] ?? 0) + 0.5);
  });

  // Viewed categories get moderate signal
  const viewCounts: Record<string, number> = {};
  signals.viewedCategories.forEach(c => {
    viewCounts[c] = (viewCounts[c] ?? 0) + 1;
  });
  Object.entries(viewCounts).forEach(([c, count]) => {
    affinity[c] = Math.min(1, (affinity[c] ?? 0) + Math.min(0.4, count * 0.1));
  });

  return affinity;
}

/**
 * Determine seasonal boosts based on current month.
 */
function getSeasonalBoosts(): string[] {
  const month = new Date().getMonth(); // 0-indexed
  const boosts: string[] = [];

  // Sri Lanka seasonal patterns
  if (month >= 2 && month <= 4) {
    // March-May: Hot season → AC demand
    boosts.push('AC', 'ELECTRICAL', 'POWER_BACKUP');
  }
  if (month >= 4 && month <= 6) {
    // May-July: Southwest monsoon
    boosts.push('PLUMBING', 'ELECTRICAL', 'HOME_SECURITY');
  }
  if (month >= 9 && month <= 11) {
    // Oct-Dec: Northeast monsoon + festivals
    boosts.push('ELECTRICAL', 'PLUMBING', 'CONSUMER_ELEC', 'SMART_HOME_OFFICE');
  }
  if (month === 0 || month === 11) {
    // Year end/start: New purchases
    boosts.push('APPLIANCE_INSTALL', 'IT', 'MOBILE');
  }

  return boosts;
}

/**
 * Build full ranking context from user behavior.
 * Ensures no filter bubble by maintaining minimum baseline for all categories.
 */
export function buildPersonalizedContext(
  signals: UserBehaviorSignals | null,
  viewedContentIds: string[] = []
): RankingContext {
  const context: RankingContext = {
    userCategoryAffinity: {},
    viewedItemIds: new Set(viewedContentIds),
    trendMomentum: {},
    seasonalBoosts: getSeasonalBoosts(),
  };

  if (signals) {
    context.userCategoryAffinity = buildCategoryAffinity(signals);
  }

  // Anti-filter-bubble: ensure all categories have at least a baseline
  const ALL_CATEGORIES = [
    'MOBILE', 'AC', 'IT', 'CCTV', 'SOLAR', 'CONSUMER_ELEC',
    'SMART_HOME_OFFICE', 'ELECTRICAL', 'PLUMBING', 'NETWORK',
    'POWER_BACKUP', 'APPLIANCE_INSTALL', 'COPIER', 'PRINT_SUPPLIES', 'HOME_SECURITY',
  ];
  ALL_CATEGORIES.forEach(c => {
    if ((context.userCategoryAffinity[c] ?? 0) < 0.15) {
      context.userCategoryAffinity[c] = 0.15;
    }
  });

  return context;
}
