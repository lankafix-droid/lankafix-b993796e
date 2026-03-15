/**
 * LankaFix Self-Healing Engine — Centralized Configuration
 * All retry limits, cooldowns, and thresholds in one place.
 * Reuses Launch Command Center thresholds where applicable.
 */

// ── Retry Limits ──
export const MAX_BOOKING_RETRIES = 3;
export const MAX_DISPATCH_RETRIES = 3;
export const MAX_PAYMENT_RETRIES = 2;
export const MAX_AUTOMATION_RETRIES = 1;

// ── Cooldowns ──
export const COOLDOWN_MINUTES = 10;

// ── Stale Thresholds ──
export const STALE_BOOKING_MINUTES = 30; // aligned with launchReadinessConfig
export const STALE_STATUSES = ["assigned", "tech_en_route"] as const;

// ── Entity Types ──
export type HealingEntityType = "booking" | "dispatch" | "payment" | "automation";

export type HealingRecoveryType =
  | "stale_booking_reassignment"
  | "dispatch_offer_expiry"
  | "payment_retry"
  | "automation_worker_retry";

export type HealingStatus = "success" | "failed" | "escalated" | "skipped_cooldown";

export const RECOVERY_TYPE_LABELS: Record<HealingRecoveryType, string> = {
  stale_booking_reassignment: "Stale Booking Reassignment",
  dispatch_offer_expiry: "Dispatch Offer Expiry Recovery",
  payment_retry: "Payment Verification Retry",
  automation_worker_retry: "Automation Worker Recovery",
};

export const MAX_RETRIES: Record<HealingEntityType, number> = {
  booking: MAX_BOOKING_RETRIES,
  dispatch: MAX_DISPATCH_RETRIES,
  payment: MAX_PAYMENT_RETRIES,
  automation: MAX_AUTOMATION_RETRIES,
};
