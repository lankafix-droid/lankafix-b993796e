/**
 * LankaFix Reliability Read Model — Shared Display Composition Layer
 * Centralizes enterprise reliability display data using existing engines only.
 * Read-only. No side effects. No formula duplication. No database writes.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeReliabilityScore, computeVerdict } from "@/engines/reliabilityGovernanceEngine";
import { computeRiskForecast } from "@/engines/predictiveReliabilityEngine";
import { computeSLATier, computeSLACompliance, computeBreachRisk, computeRecommendedAction } from "@/engines/reliabilitySLAEngine";
import { computeIncidentImpact } from "@/engines/incidentImpactModel";
import { computeCostOfFailure } from "@/engines/reliabilityCostEngine";
import { computeDispatchReliabilitySignal, type DispatchReliabilitySignal, type DispatchRiskInput } from "@/engines/reliabilityDispatchRiskEngine";
import { simulateDispatchPolicy, type DispatchPolicySimulationResult, type DispatchPolicySimulationInput } from "@/engines/reliabilityDispatchPolicySimulator";
import type { HealingStats } from "@/engines/selfHealingEngine";
import type { ReliabilityVerdict } from "@/engines/reliabilityGovernanceEngine";

// ── Advisory pilot assumptions (clearly labeled) ──
export const PILOT_ASSUMPTIONS = {
  dailyVolume: 15,
  avgValueLKR: 5000,
  confidence: 80,
  circuitBreak24h: 0,
  zoneGuardrails: 0,
  budgetDays: 30,
  autoModeHalted: false,
} as const;

// ── Shared types ──
export interface EnterpriseReliabilitySummary {
  score: number;
  verdict: string;
  riskProbability: number;
  riskLevel: string;
  slaTier: string;
  slaCompliance: number;
  breachRisk: number;
  slaAction: string;
  impactLevel: string;
  operationalImpact: number;
  reputationalRisk: number;
  compositeImpact: number;
  dailyRevenueAtRisk: number;
  projected30Day: number;
  costSeverity: string;
  successRate: number;
  escalationRate: number;
}

export interface SnapshotRow {
  id: string;
  created_at: string;
  reliability_score: number;
  success_rate: number;
  escalation_rate: number;
  circuit_break_count: number;
  confidence_score: number;
  executive_verdict: string;
  risk_probability: number;
  zone_summary_json: any;
  metadata: any;
}

export type SnapshotFreshness = "healthy" | "watch" | "stale" | "none";

// ── Verdict / SLA color maps (shared across pages) ──
export const VERDICT_COLORS: Record<string, string> = {
  STABLE: "text-success", GUARDED: "text-warning", RISK: "text-destructive", CRITICAL: "text-destructive",
};

export function slaColor(tier: string): string {
  return ({ PLATINUM: "text-primary", GOLD: "text-warning", STANDARD: "text-muted-foreground", "AT_RISK": "text-destructive", "AT RISK": "text-destructive" }[tier] || "text-foreground");
}

export function impactLevelColor(level: string): string {
  return ({ LOW: "text-success", MODERATE: "text-warning", HIGH: "text-destructive", CRITICAL: "text-destructive" }[level] || "text-foreground");
}

export function costSeverityColor(severity: string): string {
  return ({ MINIMAL: "text-success", MATERIAL: "text-warning", SEVERE: "text-destructive" }[severity] || "text-foreground");
}

export function verdictColor(verdict: string): string {
  return VERDICT_COLORS[verdict] || "text-muted-foreground";
}

// ── Core: Fetch healing stats from self_healing_events ──
export async function fetchHealingStats(): Promise<HealingStats> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await (supabase as any)
    .from("self_healing_events")
    .select("status, created_at")
    .gte("created_at", cutoff)
    .limit(200);

  const evts = events || [];
  const total = evts.length;
  const success = evts.filter((e: any) => e.status === "success").length;
  const escalated = evts.filter((e: any) => e.status === "escalated").length;
  const failed = total - success - escalated;

  return {
    successRate: total > 0 ? Math.round((success / total) * 100) : 100,
    escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
    successCount: success,
    failedCount: failed,
    escalatedCount: escalated,
    totalActions: total,
  };
}

// ── Core: Compute full enterprise summary from healing stats ──
export function computeEnterpriseSummary(healingStats: HealingStats): EnterpriseReliabilitySummary {
  const { confidence, circuitBreak24h, autoModeHalted, zoneGuardrails, budgetDays, dailyVolume, avgValueLKR } = PILOT_ASSUMPTIONS;

  const score = computeReliabilityScore(healingStats, circuitBreak24h, confidence, autoModeHalted);
  const verdict = computeVerdict(score);
  const forecast = computeRiskForecast([], healingStats, confidence);

  const slaTier = computeSLATier(score);
  const slaCompliance = computeSLACompliance(healingStats.successRate, healingStats.escalationRate);
  const breachRisk = computeBreachRisk(score, circuitBreak24h, confidence);
  const slaAction = computeRecommendedAction(slaTier, breachRisk);

  const impact = computeIncidentImpact(healingStats.escalationRate, zoneGuardrails, breachRisk, budgetDays);
  const cost = computeCostOfFailure(dailyVolume, avgValueLKR, healingStats.escalationRate, forecast.projectedEscalationRate);

  const riskLevel = score >= 85 ? "LOW" : score >= 65 ? "MODERATE" : score >= 40 ? "HIGH" : "CRITICAL";

  return {
    score,
    verdict,
    riskProbability: forecast.riskProbability,
    riskLevel,
    slaTier: slaTier.toUpperCase(),
    slaCompliance,
    breachRisk,
    slaAction,
    impactLevel: impact.impactLevel.toUpperCase(),
    operationalImpact: impact.operationalImpactScore,
    reputationalRisk: impact.reputationalRiskScore,
    compositeImpact: impact.compositeImpactScore,
    dailyRevenueAtRisk: cost.estimatedDailyRevenueAtRisk,
    projected30Day: cost.projected30DayExposure,
    costSeverity: cost.costSeverityLevel.toUpperCase(),
    successRate: healingStats.successRate,
    escalationRate: healingStats.escalationRate,
  };
}

// ── Fetch + compute live enterprise summary (single call for UI hooks) ──
export async function fetchLiveEnterpriseSummary(): Promise<EnterpriseReliabilitySummary> {
  const stats = await fetchHealingStats();
  return computeEnterpriseSummary(stats);
}

// ── Dispatch risk signal from live data ──
export interface DispatchRiskSummary extends DispatchReliabilitySignal {
  reliabilityScore: number;
  verdict: string;
}

export async function fetchDispatchReliabilitySignal(): Promise<DispatchRiskSummary> {
  const summary = await fetchLiveEnterpriseSummary();
  const input: DispatchRiskInput = {
    reliabilityScore: summary.score,
    riskProbability: summary.riskProbability,
    breachRisk: summary.breachRisk,
    compositeImpact: summary.compositeImpact,
    escalationRate: summary.escalationRate,
    circuitBreakCount: PILOT_ASSUMPTIONS.circuitBreak24h,
    zoneGuardrailCount: PILOT_ASSUMPTIONS.zoneGuardrails,
  };
  const signal = computeDispatchReliabilitySignal(input);
  return { ...signal, reliabilityScore: summary.score, verdict: summary.verdict };
}

export function dispatchRiskColor(level: string): string {
  return ({ LOW: "text-success", MODERATE: "text-warning", HIGH: "text-destructive", CRITICAL: "text-destructive" }[level] || "text-foreground");
}

// ── Fetch 30-day snapshots ──
export async function fetch30DaySnapshots(): Promise<SnapshotRow[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await (supabase as any)
    .from("reliability_snapshots")
    .select("*")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(30);
  return (data as SnapshotRow[]) || [];
}

// ── Snapshot freshness computation ──
export function computeSnapshotFreshness(latestCreatedAt: string | null): { freshness: SnapshotFreshness; label: string; ageHours: number } {
  if (!latestCreatedAt) return { freshness: "none", label: "No snapshots recorded", ageHours: 0 };
  const ageMs = Date.now() - new Date(latestCreatedAt).getTime();
  const ageHours = Math.round(ageMs / (1000 * 60 * 60));
  if (ageHours < 24) return { freshness: "healthy", label: `${ageHours}h ago`, ageHours };
  if (ageHours < 48) return { freshness: "watch", label: `${ageHours}h ago`, ageHours };
  return { freshness: "stale", label: `${Math.round(ageHours / 24)}d ago`, ageHours };
}

export const FRESHNESS_COLORS: Record<SnapshotFreshness, string> = {
  healthy: "text-success",
  watch: "text-warning",
  stale: "text-destructive",
  none: "text-muted-foreground",
};
