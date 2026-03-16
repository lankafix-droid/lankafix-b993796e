/**
 * Operator Actions Service — CRUD for reliability_operator_actions.
 * Read-only + admin-write. Advisory-only. No marketplace mutation.
 */
import { supabase } from "@/integrations/supabase/client";

export type OperatorActionType =
  | "hotspot_acknowledged"
  | "hotspot_review_requested"
  | "rollout_candidate_review"
  | "blocked_item_escalation"
  | "snapshot_refresh_requested"
  | "reliability_note"
  | "rollout_decision_logged"
  | "followup_task_created"
  | "risk_acceptance_logged"
  | "deferment_logged";

export type OperatorActionStatus =
  | "open"
  | "acknowledged"
  | "in_review"
  | "waiting"
  | "resolved"
  | "dismissed";

export type OperatorActionPriority = "low" | "medium" | "high" | "critical";

export interface OperatorAction {
  id: string;
  created_at: string;
  updated_at: string;
  action_type: OperatorActionType;
  action_title: string;
  source_context: string;
  source_zone_id: string | null;
  source_category_code: string | null;
  source_severity: string | null;
  status: OperatorActionStatus;
  priority: OperatorActionPriority;
  owner_name: string | null;
  owner_role: string | null;
  note: string;
  decision_summary: string | null;
  due_at: string | null;
  resolved_at: string | null;
  metadata: any;
}

export interface CreateActionInput {
  action_type: OperatorActionType;
  action_title: string;
  source_context?: string;
  source_zone_id?: string | null;
  source_category_code?: string | null;
  source_severity?: string | null;
  priority?: OperatorActionPriority;
  owner_name?: string | null;
  owner_role?: string | null;
  note?: string;
  decision_summary?: string | null;
  metadata?: any;
}

export async function fetchOperatorActions(filters?: {
  status?: OperatorActionStatus[];
  priority?: OperatorActionPriority[];
  action_type?: OperatorActionType[];
  zone?: string;
  category?: string;
  owner?: string;
  sortBy?: "newest" | "oldest" | "priority" | "unresolved";
}): Promise<OperatorAction[]> {
  let query = (supabase as any)
    .from("reliability_operator_actions")
    .select("*")
    .limit(200);

  if (filters?.status?.length) {
    query = query.in("status", filters.status);
  }
  if (filters?.priority?.length) {
    query = query.in("priority", filters.priority);
  }
  if (filters?.action_type?.length) {
    query = query.in("action_type", filters.action_type);
  }
  if (filters?.zone) {
    query = query.eq("source_zone_id", filters.zone);
  }
  if (filters?.category) {
    query = query.eq("source_category_code", filters.category);
  }
  if (filters?.owner) {
    query = query.ilike("owner_name", `%${filters.owner}%`);
  }

  const sortBy = filters?.sortBy || "newest";
  if (sortBy === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sortBy === "priority") {
    // Sort by custom priority ordering via created_at desc as fallback
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  let result = (data || []) as OperatorAction[];

  // Client-side priority sort if requested
  if (sortBy === "priority") {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
  } else if (sortBy === "unresolved") {
    const statusOrder: Record<string, number> = { open: 0, acknowledged: 1, in_review: 2, waiting: 3, resolved: 4, dismissed: 5 };
    result.sort((a, b) => (statusOrder[a.status] ?? 6) - (statusOrder[b.status] ?? 6));
  }

  return result;
}

export async function createOperatorAction(input: CreateActionInput): Promise<OperatorAction> {
  const { data, error } = await (supabase as any)
    .from("reliability_operator_actions")
    .insert({
      action_type: input.action_type,
      action_title: input.action_title,
      source_context: input.source_context || "manual",
      source_zone_id: input.source_zone_id || null,
      source_category_code: input.source_category_code || null,
      source_severity: input.source_severity || null,
      priority: input.priority || "medium",
      owner_name: input.owner_name || null,
      owner_role: input.owner_role || null,
      note: input.note || "",
      decision_summary: input.decision_summary || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();
  if (error) throw error;
  return data as OperatorAction;
}

export async function updateOperatorAction(
  id: string,
  updates: Partial<Pick<OperatorAction, "status" | "priority" | "owner_name" | "owner_role" | "note" | "decision_summary" | "resolved_at" | "metadata">>
): Promise<OperatorAction> {
  const patch: any = { ...updates, updated_at: new Date().toISOString() };
  if (updates.status === "resolved" && !updates.resolved_at) {
    patch.resolved_at = new Date().toISOString();
  }
  const { data, error } = await (supabase as any)
    .from("reliability_operator_actions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OperatorAction;
}

export async function fetchDailySummary(): Promise<{
  open: number;
  critical: number;
  inReview: number;
  resolvedToday: number;
  decisionsToday: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await (supabase as any)
    .from("reliability_operator_actions")
    .select("status, priority, action_type, resolved_at, created_at")
    .limit(500);

  const actions = (data || []) as OperatorAction[];
  const todayISO = todayStart.toISOString();

  return {
    open: actions.filter(a => ["open", "acknowledged", "in_review", "waiting"].includes(a.status)).length,
    critical: actions.filter(a => a.priority === "critical" && !["resolved", "dismissed"].includes(a.status)).length,
    inReview: actions.filter(a => a.status === "in_review").length,
    resolvedToday: actions.filter(a => a.status === "resolved" && a.resolved_at && a.resolved_at >= todayISO).length,
    decisionsToday: actions.filter(a =>
      ["rollout_decision_logged", "risk_acceptance_logged", "deferment_logged"].includes(a.action_type) &&
      a.created_at >= todayISO
    ).length,
  };
}

/** Map severity to default priority */
export function severityToPriority(severity?: string | null): OperatorActionPriority {
  if (!severity) return "medium";
  const s = severity.toUpperCase();
  if (s === "CRITICAL") return "critical";
  if (s === "HIGH") return "high";
  if (s === "MODERATE" || s === "GUARDED") return "medium";
  return "low";
}
