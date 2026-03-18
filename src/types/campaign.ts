/**
 * LankaFix Smart Campaign System — Production-Grade Type Definitions
 * Supports: ranking, suppression, fatigue, supply-gating, attribution, slots, multilingual
 */

// ─── Campaign Types ───────────────────────────────────────────────
export type CampaignType =
  | 'hero_promotion'
  | 'trust_reassurance'
  | 'seasonal_demand'
  | 'user_recovery'
  | 'pending_quote'
  | 'education_info'
  | 'nearby_technicians'
  | 'sme_business'
  | 'warranty_assurance'
  | 'subscription_amc'
  | 'partner_spotlight'
  | 'emergency_alert';

export type CampaignStatus = 'active' | 'draft' | 'paused' | 'expired' | 'archived';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'active' | 'paused' | 'expired' | 'archived' | 'rejected';
export type AudienceType = 'all' | 'new_user' | 'returning' | 'business' | 'consumer' | 'has_pending' | 'has_abandoned';
export type CampaignLanguage = 'en' | 'si' | 'ta' | 'mixed';

/** Slot strategy determines where a campaign competes for visibility */
export type SlotStrategy =
  | 'top_hero_slot'
  | 'urgent_alert_slot'
  | 'recovery_slot'
  | 'trust_slot'
  | 'trending_slot'
  | 'business_slot'
  | 'nearby_slot'
  | 'education_slot';

export type TrustBadge =
  | 'verified_partner'
  | 'transparent_pricing'
  | 'warranty_backed'
  | 'inspection_first'
  | 'sri_lanka_aligned'
  | 'business_ready'
  | 'data_safe'
  | 'genuine_parts'
  | 'structured_tracking'
  | 'ceb_compliant'
  | 'diagnostic_protected';

// ─── Fatigue Rules ────────────────────────────────────────────────
export interface FatigueRules {
  /** Max impressions per user per day for this campaign */
  maxImpressionsPerDay?: number;
  /** Max clicks before cooldown */
  maxClicksBeforeCooldown?: number;
  /** Cooldown hours after dismiss */
  cooldownHoursAfterDismiss?: number;
  /** Cooldown hours after CTA click */
  cooldownHoursAfterClick?: number;
  /** Separate hero/compact caps */
  heroMaxPerDay?: number;
  compactMaxPerDay?: number;
}

// ─── Supply Confidence ────────────────────────────────────────────
export interface SupplyConfidence {
  /** 0-100 score representing supply health for a category/zone */
  score: number;
  verifiedActiveCount: number;
  availableNowCount: number;
  avgAcceptanceRate: number;
  avgEtaMinutes: number;
  recentSlaBreaches: number;
  backlogCount: number;
}

// ─── Campaign Entity ──────────────────────────────────────────────
export interface Campaign {
  id: string;
  campaign_name: string;
  campaign_type: CampaignType;
  title: string;
  subtitle?: string;
  body?: string;
  cta_label?: string;
  cta_deep_link?: string;
  image_url?: string;
  mobile_image_url?: string;
  language: CampaignLanguage;
  category_ids: string[];
  zones: string[];
  audience_type: AudienceType;
  priority: number;
  active_from?: string;
  active_to?: string;
  active_days: string[];
  active_hours?: { start: number; end: number } | unknown;
  required_supply_threshold: number;
  minimum_supply_confidence: number;
  slot_strategy: SlotStrategy;
  booking_state_rules: Record<string, unknown>;
  user_segment_rules: Record<string, unknown>;
  suppression_rules: Record<string, unknown>;
  fatigue_rules: FatigueRules;
  experiment_id?: string;
  variant?: string;
  trust_badges: TrustBadge[];
  urgency_tag?: string;
  approval_status: ApprovalStatus;
  status: CampaignStatus;
  created_at: string;
}

// ─── User Context ─────────────────────────────────────────────────
export interface UserCampaignContext {
  userId?: string;
  zone?: string;
  language: CampaignLanguage;
  lastViewedCategory?: string;
  lastCompletedCategory?: string;
  hasPendingBooking: boolean;
  hasPendingQuote: boolean;
  hasAbandonedBooking: boolean;
  isReturningUser: boolean;
  isBusinessUser: boolean;
  bookingCount: number;
  /** Campaign IDs the user has dismissed, with timestamps */
  dismissedCampaigns?: Record<string, string>;
  /** Campaign ID → impression count today */
  impressionsToday?: Record<string, number>;
  /** Campaign ID → click count */
  clickCounts?: Record<string, number>;
}

// ─── Supply Context ───────────────────────────────────────────────
export interface SupplyContext {
  /** category_code → count of real non-seeded verified partners */
  categorySupply: Record<string, number>;
  /** zone_code → count of real available partners */
  zoneSupply: Record<string, number>;
  /** category_code → supply confidence model */
  supplyConfidence?: Record<string, SupplyConfidence>;
}

// ─── Scoring Output ───────────────────────────────────────────────
export interface CampaignScore {
  campaign: Campaign;
  totalScore: number;
  breakdown: {
    basePriority: number;
    contextRelevance: number;
    zoneRelevance: number;
    categoryAffinity: number;
    trustScore: number;
    supplyConfidence: number;
    seasonalRelevance: number;
    bookingStateRelevance: number;
    fatiguePenalty: number;
    suppressionPenalty: number;
  };
}

// ─── Ranked Output ────────────────────────────────────────────────
export interface RankedCampaigns {
  hero: Campaign[];
  recovery: Campaign[];
  trust: Campaign[];
  trending: Campaign[];
  business: Campaign[];
  nearby: Campaign[];
  education: Campaign[];
  contextRows: Campaign[];
}

// ─── Analytics ────────────────────────────────────────────────────
export type CampaignEventType =
  | 'impression'
  | 'viewable_impression'
  | 'card_swipe'
  | 'card_click'
  | 'cta_click'
  | 'deep_link_opened'
  | 'booking_started'
  | 'quote_started'
  | 'quote_approved'
  | 'booking_completed'
  | 'repeat_visit'
  | 'no_provider_found'
  | 'cancellation'
  | 'dismiss'
  | 'snooze';

// ─── Attribution ──────────────────────────────────────────────────
export interface CampaignAttribution {
  bookingId: string;
  firstTouchCampaignId?: string;
  lastTouchCampaignId?: string;
  assistedCampaignIds: string[];
  attributedRevenueLkr: number;
}

// ─── Seasonal Trigger ─────────────────────────────────────────────
export interface SeasonalTrigger {
  id: string;
  name: string;
  /** Months active (1-12) */
  activeMonths: number[];
  /** Categories to boost */
  boostedCategories: string[];
  /** Priority boost amount */
  priorityBoost: number;
  /** Optional condition description */
  condition?: string;
}
