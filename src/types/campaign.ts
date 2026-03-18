/**
 * LankaFix Smart Campaign System — Type Definitions
 */

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

export type CampaignStatus = 'active' | 'draft' | 'paused' | 'expired';
export type AudienceType = 'all' | 'new_user' | 'returning' | 'business' | 'consumer' | 'has_pending' | 'has_abandoned';
export type CampaignLanguage = 'en' | 'si' | 'ta' | 'mixed';

export type TrustBadge =
  | 'verified_partner'
  | 'transparent_pricing'
  | 'warranty_backed'
  | 'inspection_first'
  | 'sri_lanka_aligned'
  | 'business_ready'
  | 'data_safe'
  | 'genuine_parts'
  | 'structured_tracking';

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
  active_hours?: unknown;
  required_supply_threshold: number;
  booking_state_rules: Record<string, unknown>;
  user_segment_rules: Record<string, unknown>;
  suppression_rules: Record<string, unknown>;
  experiment_id?: string;
  variant?: string;
  trust_badges: TrustBadge[];
  urgency_tag?: string;
  status: CampaignStatus;
  created_at: string;
}

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
}

export interface SupplyContext {
  /** category_code → count of real non-seeded verified partners */
  categorySupply: Record<string, number>;
  /** zone_code → count of real available partners */
  zoneSupply: Record<string, number>;
}

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
  | 'cancellation';
