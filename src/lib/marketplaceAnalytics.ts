/**
 * Marketplace Analytics Events
 * Centralized event definitions for key marketplace flows.
 * All events flow through the lightweight `track()` wrapper.
 */
import { track } from "@/lib/analytics";

// ─── Category & Discovery ─────────────────────────────
export const trackCategoryClick = (code: string, source: string) =>
  track("category_click", { category: code, source });

export const trackSubcategorySelect = (category: string, subcategory: string) =>
  track("subcategory_select", { category, subcategory });

// ─── Booking Funnel ────────────────────────────────────
export const trackFunnelStep = (step: string, category?: string) =>
  track("booking_funnel_step", { step, category });

export const trackFunnelDrop = (step: string, category?: string, reason?: string) =>
  track("booking_funnel_drop", { step, category, reason });

export const trackBookingSubmitted = (bookingId: string, category: string, isEmergency: boolean) =>
  track("booking_submitted", { bookingId, category, isEmergency });

export const trackBookingCompleted = (bookingId: string, category: string, priceLkr: number) =>
  track("booking_completed", { bookingId, category, priceLkr });

export const trackBookingCancelled = (bookingId: string, reason?: string) =>
  track("booking_cancelled", { bookingId, reason });

// ─── Quote Lifecycle ───────────────────────────────────
export const trackQuoteViewed = (bookingId: string, amountLkr: number) =>
  track("quote_viewed", { bookingId, amountLkr });

export const trackQuoteApproved = (bookingId: string, amountLkr: number) =>
  track("quote_approved", { bookingId, amountLkr });

export const trackQuoteRejected = (bookingId: string, reason?: string) =>
  track("quote_rejected", { bookingId, reason });

// ─── Partner Onboarding ────────────────────────────────
export const trackOnboardingStep = (step: string, partnerType?: string) =>
  track("onboarding_step", { step, partnerType });

export const trackOnboardingCompleted = (partnerId?: string) =>
  track("onboarding_completed", { partnerId });

export const trackOnboardingDropoff = (step: string) =>
  track("onboarding_dropoff", { step });

// ─── Serviceability ────────────────────────────────────
export const trackServiceabilityCheck = (zone: string, status: "inside" | "edge" | "outside") =>
  track("serviceability_check", { zone, status });

// ─── Rating & Repeat ───────────────────────────────────
export const trackRatingSubmitted = (bookingId: string, rating: number) =>
  track("rating_submitted", { bookingId, rating });

export const trackRepeatBooking = (category: string, previousBookingId?: string) =>
  track("repeat_booking", { category, previousBookingId });

// ─── Lifecycle Tracking ────────────────────────────────
export const trackLifecycleStageView = (stage: string, bookingId?: string) =>
  track("lifecycle_stage_view", { stage, bookingId });

// ─── Ops Events ────────────────────────────────────────
export const trackOpsAction = (action: string, target?: string, meta?: Record<string, unknown>) =>
  track(`ops_${action}`, { target, ...meta });
