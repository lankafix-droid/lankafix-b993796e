/**
 * LankaFix Timeline Engine
 * Standard timeline event titles and descriptions.
 * API Contract: POST /api/timeline/log { jobId, event }
 */
import type { TimelineEvent, TimelineActor, TimelineEventMeta } from "@/types/booking";

export function createTimelineEvent(
  title: string,
  actor: TimelineActor,
  description?: string,
  meta?: TimelineEventMeta
): TimelineEvent {
  return {
    timestamp: new Date().toISOString(),
    title,
    description,
    actor,
    meta,
  };
}

/** Standard event titles for consistency across the system */
export const TIMELINE_TITLES = {
  BOOKING_CREATED: "Booking Created",
  MATCHING_STARTED: "Matching Started",
  TECHNICIAN_MATCHED: "Technician Matched",
  TECHNICIAN_DISPATCHED: "Technician Dispatched",
  TECHNICIAN_ARRIVED: "Technician Arrived",
  OTP_START_VERIFIED: "Job Start Verified (OTP)",
  INSPECTION_STARTED: "Inspection Started",
  QUOTE_SUBMITTED: "Quote Submitted",
  QUOTE_APPROVED: "Quote Approved",
  QUOTE_REJECTED: "Quote Rejected",
  WORK_STARTED: "Work Started",
  AFTER_PHOTOS_UPLOADED: "After Photos Uploaded",
  OTP_COMPLETION_VERIFIED: "Completion Verified (OTP)",
  PAYMENT_RECEIVED: "Payment Received",
  PAYMENT_UPDATED: "Payment Updated",
  WARRANTY_ACTIVATED: "Warranty Activated",
  BOOKING_CANCELLED: "Booking Cancelled",
  REFUND_INITIATED: "Refund Initiated",
  REFUND_COMPLETED: "Refund Completed",
  SOS_TRIGGERED: "SOS Triggered",
  SOS_RESOLVED: "SOS Resolved",
  RATING_SUBMITTED: "Rating Submitted",
  STATUS_UPDATED: "Status Updated",
} as const;

/** Sort timeline events chronologically */
export function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
