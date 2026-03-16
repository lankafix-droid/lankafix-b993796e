/**
 * LankaFix Reliability Snapshot Writer
 * Generates append-only reliability snapshot rows using existing engines as the single source of truth.
 * No duplicate formulas. Fail-safe. Advisory pilot assumptions clearly labeled.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeReliabilityScore, computeVerdict } from "@/engines/reliabilityGovernanceEngine";
import { computeRiskForecast } from "@/engines/predictiveReliabilityEngine";
import { computeSLATier, computeSLACompliance, computeBreachRisk } from "@/engines/reliabilitySLAEngine";
import { computeIncidentImpact } from "@/engines/incidentImpactModel";
import { computeCostOfFailure } from "@/engines/reliabilityCostEngine";
import type { HealingStats } from "@/engines/selfHealingEngine";

// Advisory pilot assumptions — clearly labeled
const PILOT_DAILY_VOLUME = 15;
const PILOT_AVG_VALUE = 5000; // LKR
const PILOT_CONFIDENCE = 80;
const PILOT_CIRCUIT_BREAK_24H = 0;
const PILOT_ZONE_GUARDRAILS = 0;
const PILOT_BUDGET_DAYS = 30;

interface SnapshotResult {
  success: boolean;
  error?: string;
}

/**
 * Fetch recent self-healing events and compute a HealingStats summary.
 */
async function fetchHealingStats(): Promise<HealingStats> {
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
    totalEvents: total,
    lastEventAt: evts.length > 0 ? evts[evts.length - 1].created_at : new Date().toISOString(),
    successCount: success,
    failedCount: failed,
    escalatedCount: escalated,
    totalActions: total,
  };
}

/**
 * Write a single append-only reliability snapshot using real engines.
 * Never updates historical rows.
 */
export async function writeReliabilitySnapshot(): Promise<SnapshotResult> {
  try {
    const healingStats = await fetchHealingStats();
    const autoModeHalted = false;

    // Governance engine
    const score = computeReliabilityScore(healingStats, PILOT_CIRCUIT_BREAK_24H, PILOT_CONFIDENCE, autoModeHalted);
    const verdict = computeVerdict(score);

    // Predictive engine (no trend windows in pilot — returns baseline)
    const forecast = computeRiskForecast([], healingStats, PILOT_CONFIDENCE);

    // SLA engine
    const slaTier = computeSLATier(score);
    const slaCompliance = computeSLACompliance(healingStats.successRate, healingStats.escalationRate);
    const breachRisk = computeBreachRisk(score, PILOT_CIRCUIT_BREAK_24H, PILOT_CONFIDENCE);

    // Impact engine
    const impact = computeIncidentImpact(
      healingStats.escalationRate,
      PILOT_ZONE_GUARDRAILS,
      breachRisk,
      PILOT_BUDGET_DAYS,
    );

    // Cost engine
    const cost = computeCostOfFailure(
      PILOT_DAILY_VOLUME,
      PILOT_AVG_VALUE,
      healingStats.escalationRate,
      forecast.projectedEscalationRate,
    );

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
        circuit_break_count: PILOT_CIRCUIT_BREAK_24H,
        confidence_score: PILOT_CONFIDENCE,
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

    return { success: true };
  } catch (err: any) {
    console.error("[ReliabilitySnapshotWriter] Unexpected error:", err?.message);
    return { success: false, error: err?.message || "Unknown error" };
  }
}
