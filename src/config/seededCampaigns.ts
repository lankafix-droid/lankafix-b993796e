import type { Campaign, CampaignType, TrustBadge } from '@/types/campaign';

/**
 * Fallback / seeded campaigns — operationally safe, trust-led.
 *
 * V2 SAFETY REVIEW:
 *   - Category-specific fallbacks only show for categories likely to have supply
 *   - Weak-supply categories (POWER_BACKUP, SOLAR) use consultation CTAs, not booking CTAs
 *   - Generic trust and education cards serve as safe defaults when supply is uncertain
 *   - SAFE_FALLBACK_CAMPAIGNS = category-agnostic, always safe to show
 */

const c = (
  overrides: Partial<Campaign> & Pick<Campaign, 'id' | 'campaign_name' | 'campaign_type' | 'title'>
): Campaign => ({
  subtitle: undefined,
  body: undefined,
  cta_label: 'Learn More',
  cta_deep_link: '/',
  image_url: undefined,
  mobile_image_url: undefined,
  language: 'en',
  category_ids: [],
  zones: [],
  audience_type: 'all',
  priority: 50,
  active_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  required_supply_threshold: 1,
  minimum_supply_confidence: 0,
  slot_strategy: 'top_hero_slot',
  booking_state_rules: {},
  user_segment_rules: {},
  suppression_rules: {},
  fatigue_rules: {},
  approval_status: 'approved',
  trust_badges: [],
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * SAFE_FALLBACK_CAMPAIGNS: Category-agnostic, always safe to display.
 * Used as final fallback when no category-specific campaigns pass supply gating.
 */
export const SAFE_FALLBACK_CAMPAIGNS: Campaign[] = [
  c({
    id: 'safe-trust-general',
    campaign_name: 'Trust General',
    campaign_type: 'trust_reassurance',
    title: 'Every LankaFix partner is verified',
    subtitle: 'Background checked • Skill verified • Tracked service',
    priority: 70,
    slot_strategy: 'trust_slot',
    trust_badges: ['verified_partner', 'structured_tracking', 'data_safe'],
  }),
  c({
    id: 'safe-inspection-first',
    campaign_name: 'Inspection First',
    campaign_type: 'trust_reassurance',
    title: "Not sure what's wrong?",
    subtitle: 'Get an inspection-first diagnosis — no obligation to repair',
    cta_label: 'Book Inspection',
    cta_deep_link: '/diagnose',
    priority: 65,
    slot_strategy: 'top_hero_slot',
    trust_badges: ['inspection_first', 'transparent_pricing', 'diagnostic_protected'],
  }),
  c({
    id: 'safe-education-tips',
    campaign_name: 'Service Tips',
    campaign_type: 'education_info',
    title: 'Know before you book',
    subtitle: 'Quick tips to get the best service experience on LankaFix',
    cta_label: 'Read Tips',
    cta_deep_link: '/tips',
    priority: 25,
    slot_strategy: 'education_slot',
  }),
];

export const FALLBACK_CAMPAIGNS: Campaign[] = [
  // ── HIGH CONFIDENCE: AC and Mobile have strongest pilot supply ──
  c({
    id: 'fallback-ac-demand',
    campaign_name: 'AC Seasonal Demand',
    campaign_type: 'seasonal_demand',
    title: 'AC service demand rising this week',
    subtitle: 'Book verified AC technicians before slots fill up',
    cta_label: 'Book AC Service',
    cta_deep_link: '/book/ac',
    category_ids: ['AC'],
    priority: 80,
    slot_strategy: 'top_hero_slot',
    trust_badges: ['verified_partner', 'transparent_pricing'],
    urgency_tag: 'High Demand',
    // Supply-safe: AC is a launch category with real partners
    suppression_rules: { yieldToLifecycleCards: true },
  }),
  c({
    id: 'fallback-mobile-repair',
    campaign_name: 'Mobile Screen Repair',
    campaign_type: 'hero_promotion',
    title: 'Need mobile screen repair?',
    subtitle: 'Verified partner available nearby — transparent pricing',
    cta_label: 'Fix My Screen',
    cta_deep_link: '/book/mobile',
    category_ids: ['MOBILE'],
    priority: 75,
    slot_strategy: 'top_hero_slot',
    trust_badges: ['verified_partner', 'genuine_parts', 'warranty_backed'],
    suppression_rules: { yieldToLifecycleCards: true },
  }),

  // ── MEDIUM CONFIDENCE: IT, Electronics, CCTV ──
  c({
    id: 'fallback-sme-it',
    campaign_name: 'SME IT Support',
    campaign_type: 'sme_business',
    title: 'SME IT support slots open tomorrow',
    subtitle: 'Verified technicians for your business IT needs',
    cta_label: 'Book IT Support',
    cta_deep_link: '/book/it',
    category_ids: ['IT'],
    audience_type: 'business',
    priority: 60,
    slot_strategy: 'business_slot',
    trust_badges: ['business_ready', 'verified_partner'],
    // Only show to business users
    user_segment_rules: { isBusinessUser: true },
  }),
  c({
    id: 'fallback-warranty',
    campaign_name: 'Warranty Repairs',
    campaign_type: 'warranty_assurance',
    title: 'Warranty-backed electronics repairs',
    subtitle: 'Genuine parts • Transparent process • Service guarantee',
    cta_label: 'Book Repair',
    cta_deep_link: '/book/consumer-electronics',
    category_ids: ['CONSUMER_ELEC'],
    priority: 50,
    slot_strategy: 'trust_slot',
    trust_badges: ['warranty_backed', 'genuine_parts', 'transparent_pricing'],
  }),
  c({
    id: 'fallback-cctv',
    campaign_name: 'CCTV for Business',
    campaign_type: 'sme_business',
    title: 'Book verified CCTV support for your office',
    subtitle: 'Installation, repair & maintenance by verified partners',
    cta_label: 'Get CCTV Help',
    cta_deep_link: '/book/cctv',
    category_ids: ['CCTV'],
    priority: 45,
    slot_strategy: 'business_slot',
    trust_badges: ['verified_partner', 'business_ready'],
    user_segment_rules: { isBusinessUser: true },
  }),

  // ── LOWER CONFIDENCE: Consultation/education CTAs only ──
  // Phase-1 safety: Solar & Power Backup lack guaranteed supply.
  // Use trust_reassurance or education_info type, never hero_promotion.
  c({
    id: 'fallback-solar',
    campaign_name: 'Solar Site Visits',
    campaign_type: 'trust_reassurance',  // V2.1: downgraded from hero_promotion
    title: 'Solar consultation available',
    subtitle: 'Free site assessment — no obligation, verified partners only',
    cta_label: 'Request Consultation',
    cta_deep_link: '/book/solar',
    category_ids: ['SOLAR'],
    priority: 35,                        // V2.1: lowered from 40
    slot_strategy: 'trust_slot',         // V2.1: moved from trending → trust
    trust_badges: ['sri_lanka_aligned', 'structured_tracking', 'inspection_first'],
    required_supply_threshold: 1,
    // V2.1: suppress if no confirmed solar partner in zone
    suppression_rules: { minSupplyConfidence: 30 },
  }),
  c({
    id: 'fallback-power-backup',
    campaign_name: 'Power Backup Solutions',
    campaign_type: 'education_info',
    title: 'Understanding power backup options',
    subtitle: 'Learn about UPS, inverter & solar solutions for Sri Lanka',
    cta_label: 'Learn More',             // V2.1: softest possible CTA
    cta_deep_link: '/tips/power-backup',  // V2.1: education link, not booking
    category_ids: ['POWER_BACKUP'],
    priority: 25,                         // V2.1: lowered from 35
    slot_strategy: 'education_slot',
    trust_badges: ['sri_lanka_aligned', 'ceb_compliant'],
    suppression_rules: { minSupplyConfidence: 30 },
  }),

  // ── ALWAYS SAFE: Category-agnostic trust cards ──
  ...SAFE_FALLBACK_CAMPAIGNS,
];

/** User-context recovery campaign templates */
export const CONTEXT_CAMPAIGNS = {
  pendingBooking: c({
    id: 'ctx-pending-booking',
    campaign_name: 'Continue Booking',
    campaign_type: 'user_recovery',
    title: 'Continue your booking',
    subtitle: 'Your service request is waiting — pick up where you left off',
    cta_label: 'Continue',
    cta_deep_link: '/bookings',
    priority: 95,
    slot_strategy: 'recovery_slot',
    booking_state_rules: { requirePendingBooking: true },
  }),
  pendingQuote: c({
    id: 'ctx-pending-quote',
    campaign_name: 'Quote Waiting',
    campaign_type: 'pending_quote',
    title: 'Your quote is waiting',
    subtitle: 'A technician has submitted a quote — review and approve',
    cta_label: 'View Quote',
    cta_deep_link: '/bookings',
    priority: 98,
    slot_strategy: 'recovery_slot',
    booking_state_rules: { requirePendingQuote: true },
  }),
  abandonedBooking: c({
    id: 'ctx-abandoned',
    campaign_name: 'Abandoned Recovery',
    campaign_type: 'user_recovery',
    title: 'Need help deciding?',
    subtitle: 'Inspection-first available — no commitment, just clarity',
    cta_label: 'Get Inspection',
    cta_deep_link: '/diagnose',
    priority: 90,
    slot_strategy: 'recovery_slot',
    trust_badges: ['inspection_first'],
    booking_state_rules: { requireAbandonedBooking: true },
  }),
} as const;

export const TRUST_BADGE_LABELS: Record<TrustBadge, string> = {
  verified_partner: 'Verified Partner',
  transparent_pricing: 'Transparent Pricing',
  warranty_backed: 'Warranty Backed',
  inspection_first: 'Inspection First',
  sri_lanka_aligned: 'Sri Lanka Aligned',
  business_ready: 'Business Ready',
  data_safe: 'Data Safe',
  genuine_parts: 'Genuine Parts',
  structured_tracking: 'Tracked Service',
  ceb_compliant: 'CEB Compliant',
  diagnostic_protected: 'Diagnostic Protected',
};

export const CAMPAIGN_TYPE_ICONS: Record<CampaignType, string> = {
  hero_promotion: '🔥',
  trust_reassurance: '🛡️',
  seasonal_demand: '📈',
  user_recovery: '🔄',
  pending_quote: '📋',
  education_info: '💡',
  nearby_technicians: '📍',
  sme_business: '🏢',
  warranty_assurance: '✅',
  subscription_amc: '📅',
  partner_spotlight: '⭐',
  emergency_alert: '🚨',
};
