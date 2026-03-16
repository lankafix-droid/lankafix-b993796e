/**
 * Operator Action Aging & Follow-Up Utilities
 * Pure client-side — advisory display only.
 */

export type AgingLevel = "fresh" | "warning" | "overdue" | "critical";

export interface AgingInfo {
  ageMinutes: number;
  ageLabel: string;
  level: AgingLevel;
}

export interface FollowUpInfo {
  date: string;
  label: string;
  level: "upcoming" | "today" | "overdue";
}

const STATUS_WARNING_THRESHOLDS: Record<string, number> = {
  open: 120,         // 2h
  acknowledged: 240, // 4h
  in_review: 480,    // 8h
  waiting: 1440,     // 24h
};

const CRITICAL_THRESHOLD = 2880; // 48h for any active status

/** Compute aging classification for an active operator action */
export function computeAging(status: string, createdAt: string): AgingInfo {
  const ms = Date.now() - new Date(createdAt).getTime();
  const ageMinutes = Math.max(0, Math.floor(ms / 60_000));

  let ageLabel: string;
  if (ageMinutes < 60) ageLabel = `${ageMinutes}m old`;
  else if (ageMinutes < 1440) ageLabel = `${Math.floor(ageMinutes / 60)}h old`;
  else ageLabel = `${Math.floor(ageMinutes / 1440)}d old`;

  let level: AgingLevel = "fresh";
  if (ageMinutes >= CRITICAL_THRESHOLD) {
    level = "critical";
  } else {
    const threshold = STATUS_WARNING_THRESHOLDS[status];
    if (threshold && ageMinutes >= threshold) {
      level = "overdue";
    }
  }

  return { ageMinutes, ageLabel, level };
}

/** Aging badge color classes */
export const AGING_COLORS: Record<AgingLevel, string> = {
  fresh: "text-muted-foreground",
  warning: "text-warning bg-warning/10",
  overdue: "text-destructive bg-destructive/10",
  critical: "text-destructive bg-destructive/15 font-semibold",
};

/** Aging badge label */
export function agingBadgeLabel(info: AgingInfo): string {
  if (info.level === "critical") return "Critical Delay";
  if (info.level === "overdue") return "Overdue";
  return info.ageLabel;
}

/** Compute follow-up date status from metadata */
export function computeFollowUp(metadata: any): FollowUpInfo | null {
  if (!metadata?.followup_date) return null;
  const dateStr = metadata.followup_date as string;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateStr < todayStr) {
    return { date: dateStr, label: "Overdue Follow-up", level: "overdue" };
  }
  if (dateStr === todayStr) {
    return { date: dateStr, label: "Due Today", level: "today" };
  }
  if (dateStr === tomorrowStr) {
    return { date: dateStr, label: "Follow-up Tomorrow", level: "upcoming" };
  }
  return { date: dateStr, label: `Follow-up ${dateStr}`, level: "upcoming" };
}

export const FOLLOWUP_COLORS: Record<string, string> = {
  upcoming: "bg-accent/20 text-accent-foreground",
  today: "bg-warning/15 text-warning",
  overdue: "bg-destructive/10 text-destructive",
};

/** Escalation priority bump */
export function bumpPriority(current: string): string {
  const order = ["low", "medium", "high", "critical"];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return "critical";
  return order[idx + 1];
}
