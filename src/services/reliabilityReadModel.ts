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
import { computeRolloutPolicy, type RolloutPolicyResult, type RolloutPolicyInput } from "@/engines/reliabilityRolloutPolicyEngine";
import { computeAllZoneReliability, type ZoneReliabilityInput, type ZoneReliabilitySummary } from "@/engines/zoneReliabilityEngine";
export type { ZoneReliabilitySummary } from "@/engines/zoneReliabilityEngine";
import { computeAllCategoryReliability, type CategoryReliabilityInput, type CategoryReliabilitySummary } from "@/engines/categoryReliabilityEngine";
export type { CategoryReliabilitySummary } from "@/engines/categoryReliabilityEngine";
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

export function shadowPolicyColor(mode: string): string {
  return ({ NORMAL: "text-success", CAUTION: "text-warning", THROTTLE: "text-destructive", PROTECT: "text-destructive" }[mode] || "text-foreground");
}

// ── Dispatch policy simulation from live data ──
export interface DispatchPolicyAdvisory extends DispatchPolicySimulationResult {
  reliabilityScore: number;
  verdict: string;
  dispatchRiskLevel: string;
  routingRecommendation: string;
  technicianLoadRecommendation: string;
  dispatchConfidence: number;
}

export async function fetchDispatchPolicySimulation(): Promise<DispatchPolicyAdvisory> {
  const signal = await fetchDispatchReliabilitySignal();
  const simInput: DispatchPolicySimulationInput = {
    dispatchRiskLevel: signal.dispatchRiskLevel,
    routingRecommendation: signal.routingRecommendation,
    technicianLoadRecommendation: signal.technicianLoadRecommendation,
    dispatchConfidence: signal.dispatchConfidence,
    reliabilityScore: signal.reliabilityScore,
    breachRisk: PILOT_ASSUMPTIONS.circuitBreak24h,
    escalationRate: 0,
    zoneGuardrailCount: PILOT_ASSUMPTIONS.zoneGuardrails,
  };
  const policy = simulateDispatchPolicy(simInput);
  return {
    ...policy,
    reliabilityScore: signal.reliabilityScore,
    verdict: signal.verdict,
    dispatchRiskLevel: signal.dispatchRiskLevel,
    routingRecommendation: signal.routingRecommendation,
    technicianLoadRecommendation: signal.technicianLoadRecommendation,
    dispatchConfidence: signal.dispatchConfidence,
  };
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

// ── Guardrail feature flags (read-only, fail-safe to OFF) ──
export interface GuardrailFlags {
  guardrailsEnabled: boolean;
  enforcementMode: "OBSERVE_ONLY" | "SHADOW_ONLY" | "PILOT_ENFORCEMENT" | "BROAD_ENFORCEMENT";
  emergencyKillSwitch: boolean;
  rolloutPercent: number;
  scope: {
    zones: string[];
    categories: string[];
  };
}

const DEFAULT_GUARDRAIL_FLAGS: GuardrailFlags = {
  guardrailsEnabled: false,
  enforcementMode: "OBSERVE_ONLY",
  emergencyKillSwitch: false,
  rolloutPercent: 0,
  scope: { zones: [], categories: [] },
};

export async function fetchReliabilityGuardrailFlags(): Promise<GuardrailFlags> {
  try {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "reliability_guardrail_flags")
      .maybeSingle();
    if (!data?.value) return DEFAULT_GUARDRAIL_FLAGS;
    const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return {
      guardrailsEnabled: val.guardrailsEnabled === true,
      enforcementMode: val.enforcementMode || "OBSERVE_ONLY",
      emergencyKillSwitch: val.emergencyKillSwitch === true,
      rolloutPercent: typeof val.rolloutPercent === "number" ? val.rolloutPercent : 0,
      scope: {
        zones: Array.isArray(val.scope?.zones) ? val.scope.zones : [],
        categories: Array.isArray(val.scope?.categories) ? val.scope.categories : [],
      },
    };
  } catch {
    return DEFAULT_GUARDRAIL_FLAGS;
  }
}

// ── Rollout readiness color maps ──
export function rolloutReadinessColor(readiness: string): string {
  return ({ NOT_READY: "text-destructive", LIMITED: "text-warning", CONTROLLED: "text-primary", READY: "text-success" }[readiness] || "text-muted-foreground");
}

export function recommendedModeColor(mode: string): string {
  return ({ OBSERVE_ONLY: "text-muted-foreground", SHADOW_ONLY: "text-warning", PILOT_ENFORCEMENT: "text-primary", BROAD_ENFORCEMENT: "text-success" }[mode] || "text-muted-foreground");
}

// ── Unified rollout summary (combines all layers) ──
export interface ReliabilityRolloutSummary extends RolloutPolicyResult {
  reliabilityScore: number;
  verdict: string;
  dispatchRiskLevel: string;
  shadowPolicyMode: string;
  dispatchConfidence: number;
  flags: GuardrailFlags;
}

export async function fetchReliabilityRolloutSummary(): Promise<ReliabilityRolloutSummary> {
  const [policyAdvisory, flags] = await Promise.all([
    fetchDispatchPolicySimulation(),
    fetchReliabilityGuardrailFlags(),
  ]);

  const rolloutInput: RolloutPolicyInput = {
    reliabilityScore: policyAdvisory.reliabilityScore,
    dispatchRiskLevel: policyAdvisory.dispatchRiskLevel as any,
    shadowPolicyMode: policyAdvisory.shadowPolicyMode,
    breachRisk: PILOT_ASSUMPTIONS.circuitBreak24h,
    escalationRate: policyAdvisory.reliabilityScore >= 85 ? 0 : 10,
    dispatchConfidence: policyAdvisory.dispatchConfidence,
    zoneCountReady: 0,
    activePartnerCount: 0,
  };

  const rollout = computeRolloutPolicy(rolloutInput);

  return {
    ...rollout,
    reliabilityScore: policyAdvisory.reliabilityScore,
    verdict: policyAdvisory.verdict,
    dispatchRiskLevel: policyAdvisory.dispatchRiskLevel,
    shadowPolicyMode: policyAdvisory.shadowPolicyMode,
    dispatchConfidence: policyAdvisory.dispatchConfidence,
    flags,
  };
}

// ── Per-zone reliability intelligence ──

const PILOT_ZONE_IDS_RM = [
  "col_01","col_02","col_03","col_04","col_05","col_06","col_07",
  "col_08","col_09","col_10","col_11","col_12","col_13","col_14","col_15",
  "rajagiriya","battaramulla","nawala","nugegoda","dehiwala","mt_lavinia",
  "thalawathugoda","negombo","wattala","moratuwa",
];

/**
 * Fetch per-zone reliability summaries using existing operational data.
 * Derives zone-level metrics from bookings, escalations, and automation events.
 * Read-only. No formula duplication — delegates to zoneReliabilityEngine.
 */
export async function fetchPerZoneReliabilitySummary(): Promise<ZoneReliabilitySummary[]> {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Batch queries for zone-level data
  const [bookingsRes, escalationsRes, healingRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, zone_code, status")
      .gte("created_at", cutoff24h)
      .neq("booking_source", "pilot_simulation")
      .limit(1000),
    supabase
      .from("dispatch_escalations")
      .select("id, booking_id")
      .gte("created_at", cutoff24h)
      .limit(500),
    (supabase as any)
      .from("self_healing_events")
      .select("status, created_at, metadata")
      .gte("created_at", cutoff24h)
      .limit(500),
  ]);

  const bookings = bookingsRes.data || [];
  const escalations = escalationsRes.data || [];
  const healingEvents = healingRes.data || [];

  // Get booking IDs that had escalations
  const escalatedBookingIds = new Set(escalations.map((e: any) => e.booking_id));

  // Get enterprise summary for baseline confidence/breach
  const enterpriseSummary = await fetchLiveEnterpriseSummary();

  // Build per-zone inputs
  const zoneInputs: ZoneReliabilityInput[] = PILOT_ZONE_IDS_RM.map(zoneId => {
    const zoneBookings = bookings.filter((b: any) => b.zone_code === zoneId);
    const bookingCount24h = zoneBookings.length;
    const successCount24h = zoneBookings.filter((b: any) =>
      b.status === "completed"
    ).length;
    const escalationCount24h = zoneBookings.filter((b: any) =>
      escalatedBookingIds.has(b.id)
    ).length;

    // Derive healing failures from zone context (sparse — use proportional estimate)
    const failedHealingCount24h = bookingCount24h > 0
      ? Math.round((healingEvents.filter((e: any) => e.status === "failed").length / Math.max(1, bookings.length)) * bookingCount24h)
      : 0;

    const circuitBreakCount24h = 0; // Circuit breaks are system-wide, not zone-level yet

    // Zone-level confidence: scale enterprise confidence by zone sample quality
    const sampleFactor = bookingCount24h >= 10 ? 1.0 : bookingCount24h >= 5 ? 0.9 : bookingCount24h >= 1 ? 0.75 : 0.5;
    const confidenceScore = Math.round(enterpriseSummary.score * sampleFactor);

    // Breach risk: use enterprise baseline, slightly adjusted per-zone
    const escalationRate = bookingCount24h > 0 ? (escalationCount24h / bookingCount24h) * 100 : 0;
    const breachRisk = Math.min(100, enterpriseSummary.breachRisk + Math.round(escalationRate * 0.5));

    // Impact score: proportional to zone escalation density
    const impactScore = Math.min(100, Math.round(escalationRate * 2 + (bookingCount24h === 0 ? 10 : 0)));

    return {
      zoneId,
      bookingCount24h,
      successCount24h,
      escalationCount24h,
      failedHealingCount24h,
      circuitBreakCount24h,
      confidenceScore,
      breachRisk,
      impactScore,
    };
  });

  return computeAllZoneReliability(zoneInputs);
}

/**
 * Compact context for Scope Planner page.
 * Combines rollout summary with per-zone intelligence.
 */
export interface ScopePlannerContext {
  rolloutSummary: ReliabilityRolloutSummary;
  zoneReliability: ZoneReliabilitySummary[];
}

export async function fetchReliabilityScopePlannerContext(): Promise<ScopePlannerContext> {
  const [rolloutSummary, zoneReliability] = await Promise.all([
    fetchReliabilityRolloutSummary(),
    fetchPerZoneReliabilitySummary(),
  ]);
  return { rolloutSummary, zoneReliability };
}

// ── Per-zone × per-category reliability intelligence ──

const PHASE1_CATEGORY_CODES = ["AC", "MOBILE", "CONSUMER_ELEC", "IT", "COPIER", "ELECTRICAL", "PLUMBING", "CCTV", "SOLAR", "NETWORK", "SMART_HOME_OFFICE", "HOME_SECURITY", "POWER_BACKUP", "APPLIANCE_INSTALL", "PRINT_SUPPLIES"];

/**
 * Fetch per-zone × per-category reliability summaries.
 * Groups bookings by zone_code + category_code, derives inputs, delegates to categoryReliabilityEngine.
 * Read-only. No formula duplication.
 */
export async function fetchPerZoneCategoryReliabilitySummary(): Promise<Record<string, CategoryReliabilitySummary[]>> {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [bookingsRes, escalationsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, zone_code, category_code, status")
      .gte("created_at", cutoff24h)
      .neq("booking_source", "pilot_simulation")
      .limit(1000),
    supabase
      .from("dispatch_escalations")
      .select("id, booking_id")
      .gte("created_at", cutoff24h)
      .limit(500),
  ]);

  const bookings = bookingsRes.data || [];
  const escalations = escalationsRes.data || [];
  const escalatedBookingIds = new Set(escalations.map((e: any) => e.booking_id));

  const enterpriseSummary = await fetchLiveEnterpriseSummary();

  // Build zone×category pair inputs
  const inputs: CategoryReliabilityInput[] = [];

  for (const zoneId of PILOT_ZONE_IDS_RM) {
    const zoneBookings = bookings.filter((b: any) => b.zone_code === zoneId);

    for (const categoryCode of PHASE1_CATEGORY_CODES) {
      const catBookings = zoneBookings.filter((b: any) => b.category_code === categoryCode);
      const bookingCount24h = catBookings.length;
      const successCount24h = catBookings.filter((b: any) => b.status === "completed").length;
      const escalationCount24h = catBookings.filter((b: any) => escalatedBookingIds.has(b.id)).length;

      const sampleFactor = bookingCount24h >= 10 ? 1.0 : bookingCount24h >= 5 ? 0.85 : bookingCount24h >= 1 ? 0.65 : 0.4;
      const confidenceScore = Math.round(enterpriseSummary.score * sampleFactor);

      const escalationRate = bookingCount24h > 0 ? (escalationCount24h / bookingCount24h) * 100 : 0;
      const breachRisk = Math.min(100, enterpriseSummary.breachRisk + Math.round(escalationRate * 0.6));
      const impactScore = Math.min(100, Math.round(escalationRate * 2.5 + (bookingCount24h === 0 ? 15 : 0)));

      inputs.push({
        zoneId,
        categoryCode,
        bookingCount24h,
        successCount24h,
        escalationCount24h,
        failedHealingCount24h: 0,
        circuitBreakCount24h: 0,
        confidenceScore,
        breachRisk,
        impactScore,
      });
    }
  }

  const summaries = computeAllCategoryReliability(inputs);

  // Group by zoneId
  const result: Record<string, CategoryReliabilitySummary[]> = {};
  summaries.forEach(s => {
    if (!result[s.zoneId]) result[s.zoneId] = [];
    result[s.zoneId].push(s);
  });

  return result;
}

/**
 * Fetch worst categories across all pilot zones, sorted ascending by reliability score.
 */
export async function fetchWorstCategoriesByZone(limitPerZone = 3): Promise<CategoryReliabilitySummary[]> {
  const grouped = await fetchPerZoneCategoryReliabilitySummary();
  const worst: CategoryReliabilitySummary[] = [];

  for (const zoneId of Object.keys(grouped)) {
    const sorted = [...grouped[zoneId]].sort((a, b) => a.reliabilityScore - b.reliabilityScore);
    worst.push(...sorted.slice(0, limitPerZone));
  }

  return worst.sort((a, b) => a.reliabilityScore - b.reliabilityScore);
}
