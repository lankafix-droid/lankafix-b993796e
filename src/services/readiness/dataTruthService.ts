/**
 * Data Truth Service — Strict source classification for all readiness metrics.
 * Ensures seeded/simulated data never counts as launch proof.
 */

export type DataSource = "SEEDED_DATA" | "SIMULATED_DATA" | "LIVE_DATA" | "VERIFIED_LIVE_DATA";

export interface TruthBadgeConfig {
  label: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

const BADGE_MAP: Record<DataSource, TruthBadgeConfig> = {
  SEEDED_DATA: { label: "Seeded Data", colorClass: "text-muted-foreground", borderClass: "border-muted", bgClass: "bg-muted/30" },
  SIMULATED_DATA: { label: "Simulated", colorClass: "text-warning", borderClass: "border-warning/30", bgClass: "bg-warning/5" },
  LIVE_DATA: { label: "Live Data", colorClass: "text-primary", borderClass: "border-primary/30", bgClass: "bg-primary/5" },
  VERIFIED_LIVE_DATA: { label: "Verified Live", colorClass: "text-success", borderClass: "border-success/30", bgClass: "bg-success/5" },
};

export function getTruthBadgeConfig(source: DataSource): TruthBadgeConfig {
  return BADGE_MAP[source];
}

export function detectDataSource(
  rowCount: number,
  hasRealAuthUsers: boolean,
  hasCompletedBookings: boolean = false
): DataSource {
  if (rowCount === 0) return "SEEDED_DATA";
  if (!hasRealAuthUsers) return "SIMULATED_DATA";
  if (hasCompletedBookings) return "VERIFIED_LIVE_DATA";
  return "LIVE_DATA";
}

export function shouldCountForLaunchReadiness(source: DataSource): boolean {
  return source === "LIVE_DATA" || source === "VERIFIED_LIVE_DATA";
}

export function shouldCountForPilotOnly(source: DataSource): boolean {
  return source !== "SEEDED_DATA";
}

export function filterOutSeededAndSimulated<T extends { source?: DataSource }>(items: T[]): T[] {
  return items.filter(i => !i.source || shouldCountForLaunchReadiness(i.source));
}
