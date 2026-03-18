/**
 * LankaFix Smart Campaign System — Production-Grade V2 Type Definitions
 * Supports: rule engine, suppression, fatigue, supply-gating, attribution,
 * slots, deduplication, trust scoring, publishing safety, multilingual
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

// ─── Rule Engine Types ───────────────────────────────────────────
/**
 * User segment rules — evaluated against UserCampaignContext.
 * Each key is a field, value is a condition object.
 * Example: { "isBusinessUser": true, "bookingCount": { "lt": 3 } }
 */
export interface UserSegmentRules {
  isBusinessUser?: boolean;
  isReturningUser?: boolean;
  bookingCount?: { lt?: number; gt?: number; eq?: number };
  language?: CampaignLanguage | CampaignLanguage[];
  zone?: string | string[];
}

/**
 * Booking state rules — evaluated against UserCampaignContext booking flags.
 * Example: { "requirePendingQuote": true, "pendingQuoteMinHours": 4 }
 */
export interface BookingStateRules {
  requirePendingBooking?: boolean;
  requirePendingQuote?: boolean;
  requireAbandonedBooking?: boolean;
  requireNoActiveBooking?: boolean;
  pendingQuoteMinHours?: number;
  /** Suppress if user has active booking in any of these categories */
  suppressIfActiveInCategories?: string[];
  /** Suppress if user completed booking in these categories within N days */
  suppressIfCompletedInCategories?: string[];
  suppressIfCompletedWithinDays?: number;
}

/**
 * Suppression rules — granular suppression conditions.
 * Example: { "dismissCooldownHours": 48, "maxImpressionsPerDay": 5 }
 */
export interface SuppressionRules {
  /** Suppress for N hours after dismiss */
  dismissCooldownHours?: number;
  /** Suppress for N hours after click */
  clickCooldownHours?: number;
  /** Hard suppress after N impressions per day */
  maxImpressionsPerDay?: number;
  /** Suppress if a stronger lifecycle card exists (auto-detected) */
  yieldToLifecycleCards?: boolean;
  /** Suppress if supply confidence < this for campaign categories */
  minSupplyConfidence?: number;
}

// ─── Fatigue Rules ────────────────────────────────────────────────
export interface FatigueRules {
  maxImpressionsPerDay?: number;
  maxClicksBeforeCooldown?: number;
  cooldownHoursAfterDismiss?: number;
  cooldownHoursAfterClick?: number;
  heroMaxPerDay?: number;
  compactMaxPerDay?: number;
}

// ─── Supply Confidence ────────────────────────────────────────────
export interface SupplyConfidence {
  score: number;
  verifiedActiveCount: number;
  availableNowCount: number;
  avgAcceptanceRate: number;
  avgEtaMinutes: number;
  recentSlaBreaches: number;
  backlogCount: number;
}

// ─── Nearby Context ──────────────────────────────────────────────
export interface NearbyContext {
  userZone?: string;
  adjacentZones?: string[];
  serviceRadiusKm?: number;
  /** zone → { category → partner count } */
  zonePartnerMatrix?: Record<string, Record<string, number>>;
  /** zone → avg ETA minutes */
  zoneEtaEstimates?: Record<string, number>;
}

// ─── Publishing Safety ──────────────────────────────────────────
export interface PublishingSafety {
  is_test_campaign?: boolean;
  rollout_percentage?: number;
  kill_switch_key?: string;
  reviewed_by?: string;
  approved_at?: string;
  qa_notes?: string;
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
  booking_state_rules: BookingStateRules;
  user_segment_rules: UserSegmentRules;
  suppression_rules: SuppressionRules;
  fatigue_rules: FatigueRules;
  publishing_safety?: PublishingSafety;
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
  /** Categories where user has an active (non-completed) booking */
  activeBookingCategories?: string[];
  /** Categories where user completed a booking recently */
  recentCompletedCategories?: string[];
  /** Days since last completed booking (per category) */
  daysSinceCompletionByCategory?: Record<string, number>;
  /** Campaign IDs the user has dismissed, with timestamps */
  dismissedCampaigns?: Record<string, string>;
  /** Campaign ID → impression count today */
  impressionsToday?: Record<string, number>;
  /** Campaign ID → click count */
  clickCounts?: Record<string, number>;
  /** Campaign ID → last click timestamp */
  lastClickTimestamps?: Record<string, string>;
  /** Campaign IDs the user has snoozed, with timestamps */
  snoozedCampaigns?: Record<string, string>;
}

// ─── Supply Context ───────────────────────────────────────────────
export interface SupplyContext {
  categorySupply: Record<string, number>;
  zoneSupply: Record<string, number>;
  supplyConfidence?: Record<string, SupplyConfidence>;
  nearby?: NearbyContext;
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
    nearbyRelevance: number;
    /** AI behavior-based personalization boost (-10 to +25) */
    personalizationBoost: number;
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
  | 'snooze'
  | 'dispute_escalated';

// ─── Attribution ──────────────────────────────────────────────────
export interface CampaignAttribution {
  bookingId: string;
  firstTouchCampaignId?: string;
  lastTouchCampaignId?: string;
  assistedCampaignIds: string[];
  attributedRevenueLkr: number;
  attributionType: 'first_touch' | 'last_touch' | 'assisted' | 'linear';
  /** The lifecycle event that triggered attribution */
  attributionEvent: CampaignEventType;
}

// ─── Seasonal Trigger ─────────────────────────────────────────────
export interface SeasonalTrigger {
  id: string;
  name: string;
  activeMonths: number[];
  boostedCategories: string[];
  priorityBoost: number;
  condition?: string;
}

// ─── Fatigue Persistence Strategy ────────────────────────────────
/**
 * FATIGUE PERSISTENCE ARCHITECTURE:
 *
 * Client-side (session memory, resets on app restart):
 *   - impressionsToday: incremented in-memory per session
 *   - clickCounts: incremented in-memory per session
 *   - Best-effort: fast, no latency, acceptable data loss
 *
 * Backend-synced (campaign_dismissals table):
 *   - dismissedCampaigns: written to DB on dismiss, loaded on session start
 *   - snoozedCampaigns: written to DB on snooze, loaded on session start
 *   - Strict enforcement: persists across devices and sessions
 *
 * Daily reset strategy:
 *   - impressionsToday resets naturally on new session (client-side)
 *   - Backend dismissals use timestamp comparison (cooldownHours)
 *   - No cron needed — all time-based via comparison at read time
 *
 * Multi-device behavior:
 *   - Dismissals sync across devices (DB-backed)
 *   - Impression counts are per-device (acceptable for fatigue)
 *   - Click counts are per-device (acceptable for cooldown)
 */
export type FatiguePersistenceLayer = 'client_session' | 'backend_synced';
