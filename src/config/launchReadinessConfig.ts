/**
 * LankaFix Launch Command Center — Centralized Thresholds & Configuration
 * Adjust these values to tune pilot readiness criteria without touching page logic.
 */

// ── Pillar weights (must sum to 100) ──
export const PILLAR_WEIGHTS = {
  supply: 25,
  dispatch: 20,
  payment: 15,
  automation: 15,
  ops: 15,
  offers: 10,
} as const;

// ── Supply ──
export const MIN_ACTIVE_PARTNERS_TARGET = 10; // denominator for supply score
export const MIN_ACTIVE_PARTNERS_CHECKLIST = 5; // minimum for checklist pass

// ── Dispatch ──
// dispatch score = acceptance rate (0-100), no extra config needed

// ── Payment ──
export const PAYMENT_FAILURE_SCORE_PENALTY = 15; // per failure
export const UNPAID_COMPLETED_SCORE_PENALTY = 5; // per unpaid completed booking
export const MAX_PAYMENT_FAILURES_CHECKLIST = 2;

// ── Automation ──
export const AUTOMATION_ERROR_SCORE_PENALTY = 20; // per error
export const AUTOMATION_MONITOR_WINDOW_MINUTES = 30;

// ── Ops / Escalation ──
export const ESCALATION_SCORE_PENALTY = 10;
export const STALE_BOOKING_SCORE_PENALTY = 8;
export const STALE_BOOKING_THRESHOLD_MINUTES = 30;
export const MAX_ESCALATIONS_CHECKLIST = 3;
export const MAX_STALE_BOOKINGS_CHECKLIST = 1;

// ── Offer Health ──
export const EXPIRED_OFFER_THRESHOLDS = {
  critical: 10, // score = 40
  watch: 5,     // score = 65
  minor: 0,     // score = 85 if > 0
} as const;

// ── Zone Readiness ──
export const ZONE_MIN_PARTNERS_READY = 3;
export const MIN_READY_ZONES_CHECKLIST = 3;

// ── Checklist ──
export const MAX_URGENT_OFFERS_CHECKLIST = 1;
export const MAX_SUPPORT_OPEN_CHECKLIST = 2;

// ── Verdict ──
export const WATCH_PILLAR_THRESHOLD_FOR_HOLD = 2; // ≥ this many "watch" pillars → HOLD

// ── Pillar status thresholds ──
export const PILLAR_HEALTHY_MIN = 75;
export const PILLAR_WATCH_MIN = 50;

// ── Unpaid revenue ──
export const UNPAID_REVENUE_THRESHOLD = 10_000;
