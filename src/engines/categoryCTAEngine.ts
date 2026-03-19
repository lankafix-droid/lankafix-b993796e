/**
 * Category CTA Engine — Archetype + Supply-Aware Call-to-Action System
 * Determines primary CTA label, fallback label, and action type
 * based on category archetype and real-time supply state.
 */
import type { ServiceArchetype, AvailabilityLevel } from '@/hooks/useSupplyIntelligence';

export type CTAAction = 'book' | 'inspect' | 'consult' | 'submit' | 'order' | 'waitlist' | 'callback' | 'chat';

export interface CategoryCTA {
  /** Primary button label */
  label: string;
  /** Action type for analytics + routing */
  action: CTAAction;
  /** Whether this is a fallback (no supply) CTA */
  isFallback: boolean;
  /** Route to navigate to */
  route: string;
  /** Optional secondary action label (e.g., WhatsApp) */
  secondaryLabel?: string;
  secondaryAction?: CTAAction;
}

/** CTA labels by archetype + effective availability level */
const CTA_MATRIX: Record<ServiceArchetype, Record<AvailabilityLevel, { label: string; action: CTAAction }>> = {
  instant: {
    high:   { label: 'Get Technician', action: 'book' },
    medium: { label: 'Book Soon', action: 'book' },
    low:    { label: 'Next Slot', action: 'book' },
    none:   { label: 'Request Callback', action: 'callback' },
  },
  inspection_first: {
    high:   { label: 'Book Inspection', action: 'inspect' },
    medium: { label: 'Book Inspection', action: 'inspect' },
    low:    { label: 'Request Inspection', action: 'inspect' },
    none:   { label: 'Request Inspection', action: 'callback' },
  },
  consultation: {
    high:   { label: 'Schedule Visit', action: 'consult' },
    medium: { label: 'Book Assessment', action: 'consult' },
    low:    { label: 'Request Quote', action: 'submit' },
    none:   { label: 'Submit Requirement', action: 'callback' },
  },
  project_based: {
    high:   { label: 'Get Quote', action: 'submit' },
    medium: { label: 'Request Quote', action: 'submit' },
    low:    { label: 'Submit Requirement', action: 'submit' },
    none:   { label: 'Submit Requirement', action: 'callback' },
  },
  delivery: {
    high:   { label: 'Order Now', action: 'order' },
    medium: { label: 'Order Now', action: 'order' },
    low:    { label: 'Pre-Order', action: 'order' },
    none:   { label: 'Notify Me', action: 'callback' },
  },
  waitlist: {
    high:   { label: 'Join Waitlist', action: 'waitlist' },
    medium: { label: 'Join Waitlist', action: 'waitlist' },
    low:    { label: 'Join Waitlist', action: 'waitlist' },
    none:   { label: 'Join Waitlist', action: 'waitlist' },
  },
};

/** Secondary fallback labels for no-supply state */
const FALLBACK_SECONDARY: Record<ServiceArchetype, { label: string; action: CTAAction } | null> = {
  instant:          { label: 'Chat on WhatsApp', action: 'chat' },
  inspection_first: { label: 'Chat on WhatsApp', action: 'chat' },
  consultation:     { label: 'Talk to LankaFix', action: 'chat' },
  project_based:    { label: 'Talk to LankaFix', action: 'chat' },
  delivery:         null,
  waitlist:         null,
};

/**
 * Compute the CTA for a category based on archetype and supply state.
 */
export function getCategoryCTA(
  categoryCode: string,
  archetype: ServiceArchetype,
  effectiveLevel: AvailabilityLevel,
  isComingSoon: boolean,
): CategoryCTA {
  if (isComingSoon) {
    return {
      label: 'Join Waitlist',
      action: 'waitlist',
      isFallback: false,
      route: '/waitlist',
    };
  }

  const cta = CTA_MATRIX[archetype][effectiveLevel];
  const isFallback = effectiveLevel === 'none';
  const route = isFallback ? `/request/${categoryCode}` : `/book/${categoryCode}`;

  const result: CategoryCTA = {
    label: cta.label,
    action: cta.action,
    isFallback,
    route,
  };

  // Add secondary WhatsApp action for no-supply fallback
  if (isFallback) {
    const secondary = FALLBACK_SECONDARY[archetype];
    if (secondary) {
      result.secondaryLabel = secondary.label;
      result.secondaryAction = secondary.action;
    }
  }

  return result;
}
