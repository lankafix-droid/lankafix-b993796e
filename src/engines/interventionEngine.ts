/**
 * Smart Ops Intervention Engine — LankaFix
 *
 * Category-aware stuck thresholds, recommended action resolver,
 * guided recovery playbooks, and audit logging.
 *
 * Architecture:
 * 1. getStuckThreshold() — archetype-aware timeouts per status
 * 2. resolveRecommendedAction() — deterministic next-action for stuck bookings
 * 3. RECOVERY_PLAYBOOKS — step-by-step operator guidance
 * 4. logOpsAction() — audit trail for every manual intervention
 * 5. getContextActions() — status-aware action availability
 */

import type { ServiceArchetype } from "./archetypeTimeoutHelper";
import { supabase } from "@/integrations/supabase/client";

// ── Category → Archetype mapping ──
// Controls which timeout profile each category uses
const CATEGORY_ARCHETYPE: Record<string, ServiceArchetype> = {
  MOBILE: "instant",
  IT: "instant",
  ELECTRICAL: "instant",
  PLUMBING: "instant",
  NETWORK: "instant",
  AC: "inspection_first",
  CONSUMER_ELEC: "inspection_first",
  APPLIANCE_INSTALL: "inspection_first",
  COPIER: "inspection_first",
  CCTV: "consultation",
  SOLAR: "consultation",
  SMART_HOME_OFFICE: "consultation",
  HOME_SECURITY: "consultation",
  POWER_BACKUP: "project_based",
  PRINT_SUPPLIES: "delivery",
};

export function getCategoryArchetype(categoryCode: string): ServiceArchetype {
  return CATEGORY_ARCHETYPE[categoryCode] || "instant";
}

// ── Category-Aware Stuck Thresholds (minutes) ──
// Each status has a base threshold, then multiplied by archetype factor.
//
// Why different categories need different tolerances:
// - INSTANT (Mobile/IT): Customer is waiting. Every extra minute erodes trust.
// - INSPECTION_FIRST (AC/Electronics): Partner may need to plan a site visit. Slightly more time is reasonable.
// - CONSULTATION (Solar/CCTV): Scope review required. Quotes take longer. More patience justified.
// - PROJECT_BASED: Multi-day work. Longer windows before "stuck" makes sense.
// - DELIVERY: Time-sensitive like instant, but payment may differ.

const BASE_THRESHOLDS: Record<string, number> = {
  requested: 30,
  matching: 20,
  awaiting_partner_confirmation: 15,
  assigned: 60,
  quote_submitted: 120,
  in_progress: 480,
  payment_pending: 1440,
  tech_en_route: 90,
  repair_started: 360,
};

// Archetype multiplier: higher = more tolerant
const ARCHETYPE_MULTIPLIER: Record<ServiceArchetype, number> = {
  instant: 1.0,       // Baseline — no extra tolerance
  delivery: 1.0,      // Same urgency as instant
  inspection_first: 1.5, // 50% more time — site visit planning
  consultation: 2.0,  // 2x — scope review and multi-party coordination
  project_based: 3.0, // 3x — multi-day work, complex quotes
  waitlist: 4.0,      // 4x — no urgency, background processing
};

// Payment-mode aware overrides for payment_pending status
const PAYMENT_PENDING_THRESHOLDS: Record<string, number> = {
  cash: 60,           // Cash should be collected on-site — 1hr max
  cash_on_delivery: 60,
  bank_transfer: 2880, // Bank transfers can take 1-2 business days
  online: 720,        // Online gateway — 12hr timeout
  credit_account: 4320, // Business accounts — 3 days
};

export function getStuckThreshold(
  status: string,
  categoryCode?: string,
  paymentMethod?: string | null
): number {
  // Special handling for payment_pending with payment mode awareness
  if (status === "payment_pending" && paymentMethod) {
    const pmThreshold = PAYMENT_PENDING_THRESHOLDS[paymentMethod];
    if (pmThreshold) return pmThreshold;
  }

  const base = BASE_THRESHOLDS[status];
  if (!base) return 0; // Status not tracked for stuck detection

  const archetype = categoryCode ? getCategoryArchetype(categoryCode) : "instant";
  const multiplier = ARCHETYPE_MULTIPLIER[archetype] ?? 1.0;

  return Math.round(base * multiplier);
}

// ── Recommended Action Resolver ──
// Deterministic: given booking state, returns the single best next action.

export type RecommendedActionType =
  | "assign_partner"
  | "resend_assignment"
  | "reassign_partner"
  | "remind_customer_quote"
  | "contact_partner_progress"
  | "escalate_booking"
  | "verify_payment"
  | "payment_followup"
  | "open_quality_recovery"
  | "ops_followup"
  | "call_customer";

export interface RecommendedAction {
  action: RecommendedActionType;
  label: string;
  explanation: string;
  urgency: "low" | "medium" | "high" | "critical";
  playbookKey: string;
}

export function resolveRecommendedAction(
  status: string,
  minutesStuck: number,
  severity: "warning" | "critical",
  categoryCode: string,
  hasPartner: boolean,
  paymentMethod?: string | null,
  rating?: number | null
): RecommendedAction {
  // Low rating always triggers quality recovery
  if (rating != null && rating < 3) {
    return {
      action: "open_quality_recovery",
      label: "Open Quality Recovery",
      explanation: `Rating ${rating}/5 detected. Contact customer, open support case, flag partner quality.`,
      urgency: rating <= 1 ? "critical" : "high",
      playbookKey: "low_rating_recovery",
    };
  }

  switch (status) {
    case "requested":
    case "matching":
      return {
        action: hasPartner ? "resend_assignment" : "assign_partner",
        label: hasPartner ? "Resend Assignment" : "Assign Partner",
        explanation: `Booking unmatched for ${minutesStuck}min. ${hasPartner ? "Resend to current partner or reassign." : "Find and assign an available partner."}`,
        urgency: severity === "critical" ? "critical" : "high",
        playbookKey: "assign_or_reassign",
      };

    case "awaiting_partner_confirmation":
      return {
        action: minutesStuck > 30 ? "reassign_partner" : "resend_assignment",
        label: minutesStuck > 30 ? "Reassign Partner" : "Resend Notification",
        explanation: `Partner hasn't responded for ${minutesStuck}min. ${minutesStuck > 30 ? "Reassign to next available." : "Try resending first."}`,
        urgency: severity === "critical" ? "critical" : "high",
        playbookKey: "partner_no_response",
      };

    case "assigned":
      return {
        action: "contact_partner_progress",
        label: "Contact Partner",
        explanation: `Job assigned ${minutesStuck}min ago with no progress. Call partner to confirm status.`,
        urgency: minutesStuck > 120 ? "high" : "medium",
        playbookKey: "assigned_no_progress",
      };

    case "quote_submitted":
      return {
        action: "remind_customer_quote",
        label: "Remind Customer",
        explanation: `Quote pending customer approval for ${minutesStuck}min. Send reminder or follow up.`,
        urgency: minutesStuck > 240 ? "high" : "medium",
        playbookKey: "quote_delay",
      };

    case "in_progress":
    case "repair_started":
      return {
        action: "contact_partner_progress",
        label: "Check Job Progress",
        explanation: `Repair in progress for ${minutesStuck}min (${Math.round(minutesStuck / 60)}h). Verify partner is on-site and working.`,
        urgency: severity === "critical" ? "high" : "medium",
        playbookKey: "in_progress_stale",
      };

    case "tech_en_route":
      return {
        action: "contact_partner_progress",
        label: "Verify ETA",
        explanation: `Technician en route for ${minutesStuck}min. Confirm current location and ETA.`,
        urgency: minutesStuck > 60 ? "high" : "medium",
        playbookKey: "en_route_delay",
      };

    case "payment_pending":
      if (paymentMethod === "cash" || paymentMethod === "cash_on_delivery") {
        return {
          action: "verify_payment",
          label: "Verify Cash Collection",
          explanation: `Cash payment pending ${minutesStuck}min after completion. Confirm collection with partner.`,
          urgency: minutesStuck > 120 ? "high" : "medium",
          playbookKey: "payment_cash",
        };
      }
      return {
        action: "payment_followup",
        label: "Payment Follow-up",
        explanation: `Payment pending ${minutesStuck}min (method: ${paymentMethod || "unknown"}). Follow up with customer.`,
        urgency: severity === "critical" ? "high" : "medium",
        playbookKey: "payment_pending",
      };

    default:
      return {
        action: "ops_followup",
        label: "Ops Follow-up",
        explanation: `Booking in "${status}" for ${minutesStuck}min. Review and take appropriate action.`,
        urgency: "medium",
        playbookKey: "generic_followup",
      };
  }
}

// ── Guided Recovery Playbooks ──
// Step-by-step operator instructions for each intervention type

export interface PlaybookStep {
  step: number;
  action: string;
  detail: string;
}

export interface RecoveryPlaybook {
  title: string;
  steps: PlaybookStep[];
  escalationNote: string;
}

export const RECOVERY_PLAYBOOKS: Record<string, RecoveryPlaybook> = {
  assign_or_reassign: {
    title: "Assign / Reassign Partner",
    steps: [
      { step: 1, action: "Check partner availability", detail: "Open partner list, verify online/available partners in the zone." },
      { step: 2, action: "Resend if partner exists", detail: "If partner already assigned, try resend assignment first." },
      { step: 3, action: "Reassign if stale", detail: "If no response after resend, reassign to next available partner." },
      { step: 4, action: "Add ops note", detail: "Document the reassignment reason for audit trail." },
    ],
    escalationNote: "If no partners available in zone, escalate to management for manual coordination.",
  },
  partner_no_response: {
    title: "Partner Not Responding",
    steps: [
      { step: 1, action: "Check partner's last activity", detail: "Review partner's recent acceptance history and online status." },
      { step: 2, action: "Resend notification", detail: "Try resending the assignment notification once." },
      { step: 3, action: "Wait 5 min", detail: "Allow brief window after resend before reassigning." },
      { step: 4, action: "Reassign to next partner", detail: "If still no response, reassign immediately." },
      { step: 5, action: "Flag partner if repeat offender", detail: "If this partner regularly doesn't respond, mark for review." },
    ],
    escalationNote: "3+ consecutive no-responses from same partner → mark unavailable and flag for ops review.",
  },
  assigned_no_progress: {
    title: "Assigned But No Progress",
    steps: [
      { step: 1, action: "Call partner directly", detail: "Phone the assigned partner to confirm they are aware and en route." },
      { step: 2, action: "Confirm ETA with customer", detail: "Update customer on expected arrival if partner confirms." },
      { step: 3, action: "Reassign if unreachable", detail: "If partner doesn't answer after 2 attempts, reassign." },
    ],
    escalationNote: "If customer reports long wait, apologize and offer priority reassignment.",
  },
  quote_delay: {
    title: "Quote Pending Too Long",
    steps: [
      { step: 1, action: "Contact technician", detail: "Confirm the technician has completed inspection and submitted quote." },
      { step: 2, action: "Verify quote validity", detail: "Check if quote amount is reasonable for the category." },
      { step: 3, action: "Remind customer", detail: "If quote submitted, send customer a reminder to review and approve." },
      { step: 4, action: "Escalate if unresolved", detail: "If neither party responds, escalate for manual resolution." },
    ],
    escalationNote: "Quotes pending > 24h with no customer response should be escalated to support.",
  },
  in_progress_stale: {
    title: "Repair In Progress Too Long",
    steps: [
      { step: 1, action: "Call partner", detail: "Verify the partner is actively working on-site." },
      { step: 2, action: "Check for complications", detail: "Ask if parts are needed or if job is more complex than quoted." },
      { step: 3, action: "Update customer", detail: "If delay is justified, inform customer of revised timeline." },
      { step: 4, action: "Escalate if suspicious", detail: "If partner is unresponsive, escalate and consider reassignment." },
    ],
    escalationNote: "Jobs exceeding 2x estimated time should trigger a quality review.",
  },
  en_route_delay: {
    title: "Technician En Route Too Long",
    steps: [
      { step: 1, action: "Call technician", detail: "Confirm current location and expected arrival time." },
      { step: 2, action: "Update customer ETA", detail: "Provide revised ETA based on technician's feedback." },
      { step: 3, action: "Reassign if no-show", detail: "If technician can't arrive within 30 more minutes, reassign." },
    ],
    escalationNote: "Repeated en-route delays from same partner should trigger SLA review.",
  },
  payment_cash: {
    title: "Cash Payment Collection",
    steps: [
      { step: 1, action: "Confirm with partner", detail: "Call partner to verify if cash was collected on-site." },
      { step: 2, action: "Mark as collected", detail: "If confirmed, use 'Verify Payment' to mark as cash_collected." },
      { step: 3, action: "Follow up if not collected", detail: "If partner forgot, arrange collection or alternate payment." },
    ],
    escalationNote: "Uncollected cash payments > 24h should be escalated to finance.",
  },
  payment_pending: {
    title: "Payment Pending Follow-up",
    steps: [
      { step: 1, action: "Check payment method", detail: "Verify expected payment method (bank transfer, online, etc.)." },
      { step: 2, action: "Send customer reminder", detail: "Remind customer to complete payment via their preferred method." },
      { step: 3, action: "Verify if already paid", detail: "Check bank records or gateway dashboard for matching transaction." },
      { step: 4, action: "Escalate to finance", detail: "If payment overdue > 48h, escalate to finance team." },
    ],
    escalationNote: "Payments pending > 72h with no customer response → initiate formal follow-up.",
  },
  low_rating_recovery: {
    title: "Low Rating Recovery",
    steps: [
      { step: 1, action: "Contact customer", detail: "Call customer to understand the issue. Listen, don't argue." },
      { step: 2, action: "Open support case", detail: "Create a formal support case documenting the complaint." },
      { step: 3, action: "Flag partner for quality review", detail: "Add quality flag to partner's record for management review." },
      { step: 4, action: "Offer service recovery", detail: "If appropriate, offer re-service or partial credit." },
    ],
    escalationNote: "Ratings ≤ 1 star require immediate management attention and customer callback within 2 hours.",
  },
  generic_followup: {
    title: "General Follow-up",
    steps: [
      { step: 1, action: "Review booking details", detail: "Check full timeline and current state." },
      { step: 2, action: "Contact relevant party", detail: "Reach out to customer or partner as appropriate." },
      { step: 3, action: "Add ops note", detail: "Document findings and next steps." },
    ],
    escalationNote: "If unclear how to proceed, escalate to team lead.",
  },
};

// ── Status-Aware Context Actions ──
// Controls which actions are available in the action dialog based on booking state.
// Prevents operator confusion by hiding irrelevant actions.

export interface ContextAction {
  key: string;
  label: string;
  icon: string; // lucide icon name
  variant: "default" | "destructive" | "warning" | "success";
  isPrimary?: boolean; // highlighted as recommended
}

export function getContextActions(status: string, hasPartner: boolean): ContextAction[] {
  const actions: ContextAction[] = [];

  switch (status) {
    case "requested":
    case "matching":
      actions.push({ key: "assign", label: "Assign Partner", icon: "UserPlus", variant: "default", isPrimary: true });
      actions.push({ key: "resend", label: "Retry Dispatch", icon: "Send", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "cancel", label: "Cancel Booking", icon: "XCircle", variant: "destructive" });
      break;

    case "awaiting_partner_confirmation":
      actions.push({ key: "resend", label: "Resend Notification", icon: "Send", variant: "default", isPrimary: true });
      actions.push({ key: "reassign", label: "Reassign Partner", icon: "UserPlus", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "cancel", label: "Cancel Booking", icon: "XCircle", variant: "destructive" });
      break;

    case "assigned":
    case "tech_en_route":
      actions.push({ key: "reassign", label: "Reassign Partner", icon: "UserPlus", variant: "default" });
      actions.push({ key: "resend", label: "Resend Notification", icon: "Send", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      actions.push({ key: "cancel", label: "Cancel Booking", icon: "XCircle", variant: "destructive" });
      break;

    case "quote_submitted":
      actions.push({ key: "remind_customer", label: "Remind Customer", icon: "Send", variant: "default", isPrimary: true });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      break;

    case "in_progress":
    case "repair_started":
      actions.push({ key: "note", label: "Add Progress Note", icon: "MessageSquare", variant: "default", isPrimary: true });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "reassign", label: "Reassign Partner", icon: "UserPlus", variant: "default" });
      break;

    case "payment_pending":
      actions.push({ key: "verify_payment", label: "Verify Payment", icon: "DollarSign", variant: "success", isPrimary: true });
      actions.push({ key: "remind_customer", label: "Payment Reminder", icon: "Send", variant: "default" });
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate to Finance", icon: "AlertTriangle", variant: "warning" });
      break;

    case "completed":
      actions.push({ key: "quality_recovery", label: "Quality Recovery", icon: "Star", variant: "warning" });
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      break;

    default:
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "cancel", label: "Cancel Booking", icon: "XCircle", variant: "destructive" });
  }

  return actions;
}

// ── Ops Audit Logger ──
// Every manual intervention must be logged for accountability and dispute review.

export interface OpsAuditEntry {
  booking_id: string;
  action_type: string;
  actor_id?: string;
  previous_state?: string;
  new_state?: string;
  reason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export async function logOpsAction(entry: OpsAuditEntry): Promise<void> {
  const timestamp = new Date().toISOString();

  // Write to job_timeline for unified audit trail
  try {
    await supabase.from("job_timeline").insert({
      booking_id: entry.booking_id,
      status: `ops_${entry.action_type}`,
      actor: "ops",
      note: [
        entry.reason || entry.action_type,
        entry.notes ? `| Note: ${entry.notes}` : "",
        entry.previous_state ? `| From: ${entry.previous_state}` : "",
        entry.new_state ? `| To: ${entry.new_state}` : "",
      ].filter(Boolean).join(" "),
      metadata: {
        action_type: entry.action_type,
        actor_id: entry.actor_id,
        previous_state: entry.previous_state,
        new_state: entry.new_state,
        reason: entry.reason,
        logged_at: timestamp,
        ...entry.metadata,
      },
    });
  } catch (e) {
    console.warn("[OpsAudit] Failed to log action:", e);
  }

  // Also write to automation_event_log for analytics
  try {
    await supabase.from("automation_event_log").insert({
      event_type: `ops_${entry.action_type}`,
      booking_id: entry.booking_id,
      trigger_reason: entry.reason || "manual_ops_intervention",
      action_taken: entry.action_type,
      severity: "info",
      metadata: {
        actor_id: entry.actor_id,
        previous_state: entry.previous_state,
        new_state: entry.new_state,
        notes: entry.notes,
      },
    });
  } catch (e) {
    console.warn("[OpsAudit] Failed to log to automation_event_log:", e);
  }
}

// ── Intervention Event Types for Analytics ──
export const OPS_EVENT_TYPES = [
  "stuck_booking_detected",
  "recommended_action_generated",
  "ops_reassign_partner",
  "ops_escalate_booking",
  "ops_verify_payment",
  "ops_cancel_booking",
  "ops_open_low_rating_recovery",
  "ops_complete_recovery_action",
  "ops_add_note",
  "ops_resend_assignment",
  "ops_remind_customer",
] as const;
