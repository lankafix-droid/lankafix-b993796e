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
 * 6. InterventionResult — typed action outcome contract
 * 7. resolveOpsQueue() — central queue filtering helper
 * 8. useOpsRole() — verified role resolution
 */

import type { ServiceArchetype } from "./archetypeTimeoutHelper";
import { supabase } from "@/integrations/supabase/client";

// ══════════════════════════════════════════════════════════════
// 1. TYPED INTERVENTION RESULT CONTRACT
// ══════════════════════════════════════════════════════════════
// Every ops action MUST return this shape. No loose strings.
//
// resolved           — issue is done, no further action needed
// pending_followup   — action taken, but needs monitoring
// escalated          — pushed to higher authority / team
// needs_review       — flagged for inspection, not yet acted on
// failed             — action could not complete (future-safe)
// blocked            — action blocked by permission or prerequisite

export type InterventionResult =
  | "resolved"
  | "pending_followup"
  | "escalated"
  | "needs_review"
  | "failed"
  | "blocked";

/** Maps action keys to their expected default outcome */
export function inferInterventionResult(actionKey: string): InterventionResult {
  switch (actionKey) {
    case "verify_payment":
    case "cancel":
      return "resolved";
    case "assign":
    case "resend":
    case "remind_customer":
    case "payment_followup":
    case "call_customer":
    case "call_partner":
      return "pending_followup";
    case "escalate":
      return "escalated";
    case "reassign":
      return "pending_followup";
    case "quality_recovery":
    case "note":
      return "needs_review";
    default:
      return "pending_followup";
  }
}

// ══════════════════════════════════════════════════════════════
// 2. CATEGORY → ARCHETYPE MAPPING
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// 3. CATEGORY-AWARE STUCK THRESHOLDS (minutes)
// ══════════════════════════════════════════════════════════════

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

const ARCHETYPE_MULTIPLIER: Record<ServiceArchetype, number> = {
  instant: 1.0,
  delivery: 1.0,
  inspection_first: 1.5,
  consultation: 2.0,
  project_based: 3.0,
  waitlist: 4.0,
};

const PAYMENT_PENDING_THRESHOLDS: Record<string, number> = {
  cash: 60,
  cash_on_delivery: 60,
  bank_transfer: 2880,
  online: 720,
  credit_account: 4320,
};

export function getStuckThreshold(
  status: string,
  categoryCode?: string,
  paymentMethod?: string | null
): number {
  if (status === "payment_pending" && paymentMethod) {
    const pmThreshold = PAYMENT_PENDING_THRESHOLDS[paymentMethod];
    if (pmThreshold) return pmThreshold;
  }
  const base = BASE_THRESHOLDS[status];
  if (!base) return 0;
  const archetype = categoryCode ? getCategoryArchetype(categoryCode) : "instant";
  const multiplier = ARCHETYPE_MULTIPLIER[archetype] ?? 1.0;
  return Math.round(base * multiplier);
}

// ══════════════════════════════════════════════════════════════
// 4. RECOMMENDED ACTION RESOLVER
// ══════════════════════════════════════════════════════════════

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
      // ASSIGN vs REASSIGN: assign if no partner, reassign if partner exists but stale
      return {
        action: hasPartner ? "reassign_partner" : "assign_partner",
        label: hasPartner ? "Reassign Partner" : "Assign Partner",
        explanation: `Booking unmatched for ${minutesStuck}min. ${hasPartner ? "Current partner not responding — reassign." : "Find and assign an available partner."}`,
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

// ══════════════════════════════════════════════════════════════
// 5. GUIDED RECOVERY PLAYBOOKS
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// 6. STATUS-AWARE CONTEXT ACTIONS
// ══════════════════════════════════════════════════════════════
// Controls which actions appear in the action dialog.
// Accepts real booking context — never hardcode.

export interface ContextAction {
  key: string;
  label: string;
  icon: string;
  variant: "default" | "destructive" | "warning" | "success";
  isPrimary?: boolean;
}

export interface BookingActionContext {
  hasPartner: boolean;
  hasQuote?: boolean;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  lowRating?: boolean;
  escalationExists?: boolean;
  underMediation?: boolean;
}

export function getContextActions(status: string, ctx: BookingActionContext): ContextAction[] {
  const actions: ContextAction[] = [];

  switch (status) {
    case "requested":
    case "matching":
      // ASSIGN (first-time) vs REASSIGN (replace existing)
      if (ctx.hasPartner) {
        actions.push({ key: "reassign", label: "Reassign Partner", icon: "UserPlus", variant: "default", isPrimary: true });
        actions.push({ key: "resend", label: "Retry Dispatch", icon: "Send", variant: "default" });
      } else {
        actions.push({ key: "assign", label: "Assign Partner", icon: "UserPlus", variant: "default", isPrimary: true });
        actions.push({ key: "resend", label: "Retry Dispatch", icon: "Send", variant: "default" });
      }
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
      actions.push({ key: "payment_followup", label: "Payment Follow-up", icon: "Send", variant: "default" });
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate to Finance", icon: "AlertTriangle", variant: "warning" });
      break;

    case "completed":
      if (ctx.lowRating) {
        actions.push({ key: "quality_recovery", label: "Quality Recovery", icon: "Star", variant: "warning", isPrimary: true });
      }
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      break;

    default:
      actions.push({ key: "note", label: "Add Note", icon: "MessageSquare", variant: "default" });
      actions.push({ key: "escalate", label: "Escalate", icon: "AlertTriangle", variant: "warning" });
      actions.push({ key: "cancel", label: "Cancel Booking", icon: "XCircle", variant: "destructive" });
  }

  return actions;
}

// ══════════════════════════════════════════════════════════════
// 7. OPS AUDIT LOGGER (Critical — enforced for destructive actions)
// ══════════════════════════════════════════════════════════════
// Action criticality:
//   critical   — cancel, verify_payment: MUST succeed or action is blocked
//   important  — reassign, escalate, assign: logged, warn on failure
//   informational — note, remind: logged, continue on failure

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

type AuditCriticality = "critical" | "important" | "informational";

const ACTION_CRITICALITY: Record<string, AuditCriticality> = {
  cancel_booking: "critical",
  verify_payment: "critical",
  reassign_partner: "important",
  assign_partner: "important",
  escalate_booking: "important",
  resend_assignment: "informational",
  add_note: "informational",
  remind_customer: "informational",
  open_low_rating_recovery: "important",
  payment_followup: "informational",
  call_customer: "informational",
  call_partner: "informational",
};

/**
 * Central audit logger. For CRITICAL actions, throws if logging fails
 * (preventing silent destructive ops). For others, logs warning and continues.
 */
export async function logOpsAction(entry: OpsAuditEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  const criticality = ACTION_CRITICALITY[entry.action_type] || "informational";

  // Write to job_timeline
  const { error: tlError } = await supabase.from("job_timeline").insert({
    booking_id: entry.booking_id,
    status: `ops_${entry.action_type}`,
    actor: entry.actor_id || "ops",
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

  // Write to automation_event_log
  const { error: aeError } = await supabase.from("automation_event_log").insert({
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

  const auditFailed = !!tlError || !!aeError;

  if (auditFailed && criticality === "critical") {
    // BLOCK destructive actions if audit logging fails
    console.error("[OpsAudit] CRITICAL: Audit logging failed for critical action", entry.action_type, tlError, aeError);
    throw new Error(`Audit logging failed for ${entry.action_type}. Action blocked for safety.`);
  }

  if (auditFailed) {
    console.warn("[OpsAudit] Audit logging partially failed:", { tlError, aeError, action: entry.action_type });
  }
}

// ══════════════════════════════════════════════════════════════
// 8. ANALYTICS EVENT LOGGER (non-blocking, fire-and-forget)
// ══════════════════════════════════════════════════════════════

export function logOpsEvent(eventType: string, bookingId: string, metadata?: Record<string, unknown>): void {
  supabase.from("automation_event_log").insert({
    event_type: eventType,
    booking_id: bookingId || null,
    trigger_reason: "ops_ui_interaction",
    action_taken: eventType,
    severity: "info",
    metadata: (metadata || {}) as any,
  }).then(() => {});
}

// ══════════════════════════════════════════════════════════════
// 9. CONTACT ATTEMPT LOGGER
// ══════════════════════════════════════════════════════════════

export async function logContactAttempt(params: {
  bookingId: string;
  actorId?: string;
  targetType: "customer" | "partner";
  targetId?: string;
  contactMethod: "call" | "whatsapp";
  result?: "attempted" | "reached" | "no_answer";
}): Promise<void> {
  try {
    await supabase.from("booking_contact_events").insert({
      booking_id: params.bookingId,
      event_type: `${params.contactMethod}_${params.targetType}`,
      user_role: "ops",
    });
    await supabase.from("automation_event_log").insert({
      event_type: "ops_contact_attempt",
      booking_id: params.bookingId,
      trigger_reason: `Ops ${params.contactMethod} to ${params.targetType}`,
      action_taken: `${params.contactMethod}_${params.targetType}`,
      severity: "info",
      metadata: {
        actor_id: params.actorId,
        target_type: params.targetType,
        target_id: params.targetId,
        contact_method: params.contactMethod,
        result: params.result || "attempted",
      },
    });
  } catch (e) {
    console.warn("[ContactLog] Failed:", e);
  }
}

// ══════════════════════════════════════════════════════════════
// 10. ROLE-AWARE PERMISSIONS
// ══════════════════════════════════════════════════════════════
// Uses the has_role() security definer function from user_roles table.
// Fallback: query user_roles directly if RPC unavailable.

export type OpsRole = "admin" | "operator" | "support";

const ACTION_PERMISSIONS: Record<string, OpsRole[]> = {
  assign: ["admin", "operator"],
  reassign: ["admin", "operator"],
  resend: ["admin", "operator"],
  escalate: ["admin", "operator", "support"],
  cancel: ["admin"],                     // Destructive — admin only
  verify_payment: ["admin"],             // Finance-sensitive — admin only
  note: ["admin", "operator", "support"],
  remind_customer: ["admin", "operator", "support"],
  quality_recovery: ["admin", "operator", "support"],
  call_customer: ["admin", "operator", "support"],
  call_partner: ["admin", "operator"],
  payment_followup: ["admin", "operator"],
};

export function isActionAllowed(actionKey: string, userRole: OpsRole): boolean {
  const allowed = ACTION_PERMISSIONS[actionKey];
  if (!allowed) return true;
  return allowed.includes(userRole);
}

/**
 * Resolves the current user's ops role by checking the user_roles table
 * via the has_role() RPC. Falls back to direct query if RPC fails.
 * Returns "operator" as safe default if role cannot be determined.
 */
export async function resolveCurrentOpsRole(userId: string): Promise<OpsRole> {
  // Try has_role RPC for admin first (most privileged)
  try {
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!error && isAdmin === true) return "admin";
  } catch {
    // RPC may not exist — fall through to direct query
  }

  // Try has_role for support
  try {
    const { data: isSupport, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "support",
    });
    if (!error && isSupport === true) return "support";
  } catch {
    // Fall through
  }

  // Fallback: query user_roles directly
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roles?.some(r => (r.role as string) === "admin")) return "admin";
    if (roles?.some(r => (r.role as string) === "support")) return "support";
  } catch {
    // Safe default
  }

  return "operator";
}

// ══════════════════════════════════════════════════════════════
// 11. QUEUE FILTER RESOLVER
// ══════════════════════════════════════════════════════════════
// Central filtering helper for ops queues.
// Takes the queue key + filters and returns the matching subset.
// Used by the panel to avoid scattering filter logic across components.

import type { StuckBooking, OpsFilters } from "@/hooks/usePilotOps";

export type OpsQueue =
  | "all"
  | "unassigned"
  | "pending_partner_response"
  | "quote_pending"
  | "in_progress"
  | "payment_pending"
  | "low_rated"
  | "escalated"
  | "stuck"
  | "completed_today"
  | "cancelled_today";

export const QUEUE_LABELS: Record<OpsQueue, string> = {
  all: "All Bookings",
  unassigned: "Unassigned",
  pending_partner_response: "Pending Response",
  quote_pending: "Quote Pending",
  in_progress: "In Progress",
  payment_pending: "Payment Pending",
  low_rated: "Low Rated",
  escalated: "Escalations",
  stuck: "Stuck Bookings",
  completed_today: "Completed",
  cancelled_today: "Cancelled",
};

/**
 * Filters stuck bookings by the active queue.
 * Composes cleanly with category/zone/severity filters already applied upstream.
 */
export function resolveOpsQueue(
  queue: OpsQueue,
  stuckBookings: StuckBooking[]
): StuckBooking[] {
  if (queue === "all" || queue === "stuck") return stuckBookings;

  return stuckBookings.filter(b => {
    switch (queue) {
      case "unassigned":
        return !b.partner_id && !["completed", "cancelled"].includes(b.status);
      case "pending_partner_response":
        return b.status === "awaiting_partner_confirmation";
      case "quote_pending":
        return b.status === "quote_submitted";
      case "payment_pending":
        return b.status === "payment_pending";
      case "in_progress":
        return ["in_progress", "repair_started", "tech_en_route"].includes(b.status);
      case "low_rated":
        return b.recommended.action === "open_quality_recovery";
      case "escalated":
        return b.status === "escalated";
      case "completed_today":
        return b.status === "completed";
      case "cancelled_today":
        return b.status === "cancelled";
      default:
        return true;
    }
  });
}
