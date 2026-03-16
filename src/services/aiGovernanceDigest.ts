/**
 * AI Governance Digest
 * Generates daily AI summary for operators.
 */

export interface GovernanceDigest {
  date: string;
  topRisks: string[];
  priorityActions: string[];
  operationalBottlenecks: string[];
  aiModuleHealth: { module: string; status: string }[];
  keyMetrics: { label: string; value: string; trend: "up" | "down" | "stable" }[];
}

/** Generate a governance digest from current data */
export function generateGovernanceDigest(data: {
  overdueActions: number;
  criticalAlerts: number;
  partnerFlags: number;
  staleSnapshots: number;
  totalBookings24h: number;
  completionRate24h: number;
  avgResponseMinutes: number;
  activeModules: string[];
}): GovernanceDigest {
  const topRisks: string[] = [];
  const priorityActions: string[] = [];
  const bottlenecks: string[] = [];

  if (data.criticalAlerts > 0) topRisks.push(`${data.criticalAlerts} critical alerts need attention`);
  if (data.overdueActions > 5) topRisks.push(`${data.overdueActions} governance actions overdue`);
  if (data.partnerFlags > 3) topRisks.push(`${data.partnerFlags} partners flagged for quality review`);

  if (data.overdueActions > 0) priorityActions.push("Clear overdue governance actions");
  if (data.staleSnapshots > 0) priorityActions.push("Refresh stale data snapshots");
  if (data.partnerFlags > 0) priorityActions.push("Review flagged partner quality issues");
  if (data.criticalAlerts > 0) priorityActions.push("Resolve critical operational alerts");

  if (data.completionRate24h < 0.85) bottlenecks.push("Completion rate below target");
  if (data.avgResponseMinutes > 20) bottlenecks.push("Partner response times elevated");
  if (data.totalBookings24h === 0) bottlenecks.push("No bookings in 24h — check platform health");

  return {
    date: new Date().toISOString().split("T")[0],
    topRisks,
    priorityActions,
    operationalBottlenecks: bottlenecks,
    aiModuleHealth: data.activeModules.map((m) => ({ module: m, status: "healthy" })),
    keyMetrics: [
      { label: "Bookings (24h)", value: String(data.totalBookings24h), trend: "stable" },
      { label: "Completion Rate", value: `${Math.round(data.completionRate24h * 100)}%`, trend: data.completionRate24h >= 0.9 ? "up" : "down" },
      { label: "Avg Response", value: `${data.avgResponseMinutes}min`, trend: data.avgResponseMinutes <= 15 ? "up" : "down" },
    ],
  };
}
