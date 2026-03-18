/**
 * LankaFix Campaign Rule Engine
 * Evaluates user_segment_rules, booking_state_rules, and suppression_rules
 * against live user context. Pure functions, no side effects.
 */
import type {
  Campaign, UserCampaignContext, SupplyContext,
  UserSegmentRules, BookingStateRules, SuppressionRules,
} from '@/types/campaign';

// ─── User Segment Rule Evaluator ─────────────────────────────────
/**
 * Evaluates user_segment_rules against the current user context.
 * Returns false if any rule condition fails (AND logic).
 *
 * Supported rules:
 *   isBusinessUser: true/false
 *   isReturningUser: true/false
 *   bookingCount: { lt, gt, eq }
 *   language: 'en' | ['en','si']
 *   zone: 'col_01' | ['col_01','col_02']
 */
export function evaluateUserSegmentRules(
  rules: UserSegmentRules | undefined,
  ctx: UserCampaignContext,
): boolean {
  if (!rules || Object.keys(rules).length === 0) return true;

  // Business user check
  if (rules.isBusinessUser !== undefined && ctx.isBusinessUser !== rules.isBusinessUser) {
    return false;
  }

  // Returning user check
  if (rules.isReturningUser !== undefined && ctx.isReturningUser !== rules.isReturningUser) {
    return false;
  }

  // Booking count conditions
  if (rules.bookingCount) {
    const count = ctx.bookingCount;
    if (rules.bookingCount.lt !== undefined && count >= rules.bookingCount.lt) return false;
    if (rules.bookingCount.gt !== undefined && count <= rules.bookingCount.gt) return false;
    if (rules.bookingCount.eq !== undefined && count !== rules.bookingCount.eq) return false;
  }

  // Language match
  if (rules.language) {
    const allowed = Array.isArray(rules.language) ? rules.language : [rules.language];
    if (!allowed.includes(ctx.language)) return false;
  }

  // Zone match
  if (rules.zone) {
    const allowed = Array.isArray(rules.zone) ? rules.zone : [rules.zone];
    if (!ctx.zone || !allowed.includes(ctx.zone)) return false;
  }

  return true;
}

// ─── Booking State Rule Evaluator ────────────────────────────────
/**
 * Evaluates booking_state_rules against the current user context.
 * Returns false if any required condition fails.
 *
 * Supported rules:
 *   requirePendingBooking: boolean
 *   requirePendingQuote: boolean
 *   requireAbandonedBooking: boolean
 *   requireNoActiveBooking: boolean
 *   suppressIfActiveInCategories: string[]
 *   suppressIfCompletedInCategories: string[]
 *   suppressIfCompletedWithinDays: number
 */
export function evaluateBookingStateRules(
  rules: BookingStateRules | undefined,
  ctx: UserCampaignContext,
): boolean {
  if (!rules || Object.keys(rules).length === 0) return true;

  if (rules.requirePendingBooking && !ctx.hasPendingBooking) return false;
  if (rules.requirePendingQuote && !ctx.hasPendingQuote) return false;
  if (rules.requireAbandonedBooking && !ctx.hasAbandonedBooking) return false;

  // Suppress if user has active booking → campaign is irrelevant
  if (rules.requireNoActiveBooking && ctx.hasPendingBooking) return false;

  // Suppress if user has active booking in the campaign's target categories
  if (rules.suppressIfActiveInCategories && ctx.activeBookingCategories) {
    const overlap = rules.suppressIfActiveInCategories.some(
      cat => ctx.activeBookingCategories?.includes(cat)
    );
    if (overlap) return false;
  }

  // Suppress if user recently completed booking in the campaign's target categories
  if (rules.suppressIfCompletedInCategories && ctx.daysSinceCompletionByCategory) {
    const maxDays = rules.suppressIfCompletedWithinDays ?? 7;
    const recentCompletion = rules.suppressIfCompletedInCategories.some(cat => {
      const days = ctx.daysSinceCompletionByCategory?.[cat];
      return days !== undefined && days <= maxDays;
    });
    if (recentCompletion) return false;
  }

  return true;
}

// ─── Suppression Rule Evaluator ──────────────────────────────────
/**
 * Evaluates suppression_rules for fatigue, cooldown, and operational safety.
 * Returns a suppression penalty score (0 = no suppression, 100+ = hard suppress).
 *
 * Supported rules:
 *   dismissCooldownHours: number
 *   clickCooldownHours: number
 *   maxImpressionsPerDay: number
 *   yieldToLifecycleCards: boolean
 *   minSupplyConfidence: number
 */
export function evaluateSuppressionRules(
  campaign: Campaign,
  ctx: UserCampaignContext,
  supply: SupplyContext,
  hasLifecycleCards: boolean,
): { suppressed: boolean; penalty: number } {
  const rules: SuppressionRules = campaign.suppression_rules ?? {};
  let penalty = 0;

  // Dismiss cooldown (backend-synced check)
  const dismissedAt = ctx.dismissedCampaigns?.[campaign.id];
  if (dismissedAt) {
    const cooldownHours = rules.dismissCooldownHours
      ?? campaign.fatigue_rules?.cooldownHoursAfterDismiss
      ?? 24;
    const elapsed = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60);
    if (elapsed < cooldownHours) return { suppressed: true, penalty: 100 };
  }

  // Snooze cooldown (backend-synced check)
  const snoozedAt = ctx.snoozedCampaigns?.[campaign.id];
  if (snoozedAt) {
    const elapsed = (Date.now() - new Date(snoozedAt).getTime()) / (1000 * 60 * 60);
    if (elapsed < 12) return { suppressed: true, penalty: 100 }; // 12hr snooze default
  }

  // Click cooldown
  if (rules.clickCooldownHours && ctx.lastClickTimestamps?.[campaign.id]) {
    const elapsed = (Date.now() - new Date(ctx.lastClickTimestamps[campaign.id]).getTime()) / (1000 * 60 * 60);
    if (elapsed < rules.clickCooldownHours) {
      penalty += 40;
    }
  }

  // Impression cap (client-side, best-effort)
  const impressions = ctx.impressionsToday?.[campaign.id] ?? 0;
  const maxImpressions = rules.maxImpressionsPerDay
    ?? campaign.fatigue_rules?.maxImpressionsPerDay;
  if (maxImpressions && impressions >= maxImpressions) {
    return { suppressed: true, penalty: 100 };
  }
  if (impressions > 3) {
    penalty += impressions * 2; // Gradual decay
  }

  // Click fatigue
  const clicks = ctx.clickCounts?.[campaign.id] ?? 0;
  const maxClicks = campaign.fatigue_rules?.maxClicksBeforeCooldown;
  if (maxClicks && clicks >= maxClicks) {
    penalty += 50;
  }

  // Yield to lifecycle cards — generic promos defer to recovery/quote cards
  if (rules.yieldToLifecycleCards && hasLifecycleCards) {
    if (!['user_recovery', 'pending_quote'].includes(campaign.campaign_type)) {
      penalty += 15;
    }
  }

  // Supply confidence floor
  if (rules.minSupplyConfidence && supply.supplyConfidence && campaign.category_ids.length > 0) {
    const avgConf = campaign.category_ids.reduce((sum, cat) => {
      return sum + (supply.supplyConfidence?.[cat]?.score ?? 0);
    }, 0) / campaign.category_ids.length;
    if (avgConf < rules.minSupplyConfidence) {
      penalty += 30; // Soft suppress, don't hard-kill
    }
  }

  return { suppressed: false, penalty };
}
