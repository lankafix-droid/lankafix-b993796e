/**
 * LankaFix Reliability Snapshot Writer
 * Generates append-only reliability snapshot rows using existing engines as the single source of truth.
 * No duplicate formulas. Fail-safe. Advisory pilot assumptions clearly labeled.
 * Includes dedupe protection: skips if a snapshot exists within the last 30 minutes.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchHealingStats, computeEnterpriseSummary, PILOT_ASSUMPTIONS } from "@/services/reliabilityReadModel";
import { computeRiskForecast } from "@/engines/predictiveReliabilityEngine";
import { computeSLATier, computeSLACompliance, computeBreachRisk } from "@/engines/reliabilitySLAEngine";
import { computeIncidentImpact } from "@/engines/incidentImpactModel";
import { computeCostOfFailure } from "@/engines/reliabilityCostEngine";
import { computeReliabilityScore, computeVerdict } from "@/engines/reliabilityGovernanceEngine";

const DEDUPE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export interface SnapshotResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Check if a snapshot was written within the dedupe window.
 */
async function hasRecentSnapshot(): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data } = await (supabase as any)
      .from("reliability_snapshots")
      .select("id")
      .gte("created_at", cutoff)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false; // fail open — allow write if check fails
  }
}

/**
 * Write a single append-only reliability snapshot using real engines.
 * Never updates historical rows. Skips if recent snapshot exists.
 */
export async function writeReliabilitySnapshot(): Promise<SnapshotResult> {
  try {
    // Dedupe protection
    const recent = await hasRecentSnapshot();
    if (recent) {
      return { success: true, skipped: true, reason: "Snapshot exists within last 30 minutes" };
    }

    const healingStats = await fetchHealingStats();
    const { confidence, circuitBreak24h, autoModeHalted, zoneGuardrails, budgetDays, dailyVolume, avgValueLKR } = PILOT_ASSUMPTIONS;

    // Governance engine
    const score = computeReliabilityScore(healingStats, circuitBreak24h, confidence, autoModeHalted);
    const verdict = computeVerdict(score);

    // Predictive engine (no trend windows in pilot — returns baseline)
    const forecast = computeRiskForecast([], healingStats, confidence);

    // SLA engine
    const slaTier = computeSLATier(score);
    const slaCompliance = computeSLACompliance(healingStats.successRate, healingStats.escalationRate);
    const breachRisk = computeBreachRisk(score, circuitBreak24h, confidence);

    // Impact engine
    const impact = computeIncidentImpact(healingStats.escalationRate, zoneGuardrails, breachRisk, budgetDays);

    // Cost engine
    const cost = computeCostOfFailure(dailyVolume, avgValueLKR, healingStats.escalationRate, forecast.projectedEscalationRate);

    // Zone summary (pilot baseline — uniform score)
    const zoneSummary = [
      { zone: "pilot_baseline", score, verdict, note: "Pilot-wide baseline — per-zone not individualized" },
    ];

    // Append-only insert
    const { error } = await (supabase as any)
      .from("reliability_snapshots")
      .insert({
        reliability_score: score,
        success_rate: healingStats.successRate,
        escalation_rate: healingStats.escalationRate,
        circuit_break_count: circuitBreak24h,
        confidence_score: confidence,
        executive_verdict: verdict,
        risk_probability: forecast.riskProbability,
        zone_summary_json: zoneSummary,
        metadata: {
          sla_tier: slaTier,
          sla_compliance_percent: slaCompliance,
          breach_risk_probability: breachRisk,
          impact_level: impact.impactLevel,
          composite_impact_score: impact.compositeImpactScore,
          operational_impact_score: impact.operationalImpactScore,
          reputational_risk_score: impact.reputationalRiskScore,
          estimated_daily_revenue_at_risk: cost.estimatedDailyRevenueAtRisk,
          projected_30day_exposure: cost.projected30DayExposure,
          cost_severity_level: cost.costSeverityLevel,
          source: "reliability_snapshot_writer",
          pilot_assumptions: true,
        },
      });

    if (error) {
      console.error("[ReliabilitySnapshotWriter] Insert failed:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, skipped: false, reason: "Snapshot written successfully" };
  } catch (err: any) {
    console.error("[ReliabilitySnapshotWriter] Unexpected error:", err?.message);
    return { success: false, error: err?.message || "Unknown error" };
  }
}
