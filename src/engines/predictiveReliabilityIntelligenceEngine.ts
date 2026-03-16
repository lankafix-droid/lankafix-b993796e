/**
 * LankaFix Predictive Reliability Intelligence Engine — V1
 * Pure deterministic analytics engine for forecasting zone/category/partner reliability.
 * No React, no Supabase, no side effects. Advisory-only.
 */

export type PredictiveTrend = "stable" | "declining" | "improving";
export type PredictiveRiskLevel = "low" | "moderate" | "high" | "critical";
export type GovernanceRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

// ── Input types ──

export interface ReliabilitySnapshot {
  date: string; // ISO
  zoneId: string;
  categoryCode: string;
  reliabilityScore: number;
  successRate: number;
  escalationRate: number;
}

export interface PartnerReliabilityRecord {
  partnerId: string;
  partnerName: string;
  categoryCode: string;
  zoneId: string;
  reliabilityScores: { date: string; score: number }[];
  completedJobs14d: number;
  escalationCount14d: number;
}

export interface DemandPressureInput {
  zoneId: string;
  categoryCode: string;
  bookingVolume7d: number;
  bookingVolume14d: number;
  availablePartners: number;
  avgCompletionMinutes: number;
}

export interface GovernanceRiskInput {
  zoneId: string;
  categoryCode: string;
  reliabilityTrendSlope: number;
  overdueGovernanceActions: number;
  partnerChurnRisk: number; // 0–100
  demandPressure: number; // 0–100
  operatorWorkloadScore: number; // 0–100
}

// ── Output types ──

export interface ZoneCategoryReliabilityPrediction {
  zoneId: string;
  categoryCode: string;
  currentReliability: number;
  predictedReliability3Days: number;
  predictedReliability7Days: number;
  trend: PredictiveTrend;
  riskLevel: PredictiveRiskLevel;
  shortTermSlope: number;
  mediumTermSlope: number;
}

export interface PartnerDecaySignal {
  partnerId: string;
  partnerName: string;
  categoryCode: string;
  zoneId: string;
  reliabilityDrop: number;
  currentScore: number;
  previousScore: number;
  riskLevel: PredictiveRiskLevel;
  reason: string;
}

export interface DemandPressureSignal {
  zoneId: string;
  categoryCode: string;
  demandPressure: number; // 0–100
  predictedServiceDelayMinutes: number;
  riskLevel: PredictiveRiskLevel;
  supplyRatio: number;
}

export interface GovernanceRiskScore {
  zoneId: string;
  categoryCode: string;
  governanceRiskScore: number; // 0–100
  level: GovernanceRiskLevel;
  factors: string[];
}

export interface PredictiveGovernanceSignals {
  reliabilityPredictions: ZoneCategoryReliabilityPrediction[];
  partnerDecaySignals: PartnerDecaySignal[];
  demandPressureSignals: DemandPressureSignal[];
  governanceRiskScores: GovernanceRiskScore[];
}

// ── Helpers ──

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function classifyRisk(score: number): PredictiveRiskLevel {
  if (score < 60) return "critical";
  if (score < 75) return "high";
  if (score < 85) return "moderate";
  return "low";
}

function classifyGovRisk(score: number): GovernanceRiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

// ── 1: Predict Zone × Category Reliability ──

export function predictZoneCategoryReliability(
  snapshots: ReliabilitySnapshot[],
  zoneId: string,
  categoryCode: string,
): ZoneCategoryReliabilityPrediction {
  const relevant = snapshots
    .filter(s => s.zoneId === zoneId && s.categoryCode === categoryCode)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const scores = relevant.map(s => s.reliabilityScore);
  const current = scores.length > 0 ? scores[scores.length - 1] : 85;

  // Short-term: last 7 entries
  const shortTermScores = scores.slice(-7);
  const shortTermSlope = linearSlope(shortTermScores);

  // Medium-term: all (up to 30)
  const mediumTermSlope = linearSlope(scores);

  const predicted3 = clamp(current + shortTermSlope * 3);
  const predicted7 = clamp(current + mediumTermSlope * 7);

  let trend: PredictiveTrend = "stable";
  if (shortTermSlope < -0.5) trend = "declining";
  else if (shortTermSlope > 0.5) trend = "improving";

  const worstPredicted = Math.min(predicted3, predicted7);
  const riskLevel = classifyRisk(worstPredicted);

  return {
    zoneId,
    categoryCode,
    currentReliability: clamp(current),
    predictedReliability3Days: predicted3,
    predictedReliability7Days: predicted7,
    trend,
    riskLevel,
    shortTermSlope: Math.round(shortTermSlope * 100) / 100,
    mediumTermSlope: Math.round(mediumTermSlope * 100) / 100,
  };
}

// ── 2: Detect Partner Reliability Decay ──

export function detectPartnerReliabilityDecay(
  records: PartnerReliabilityRecord[],
): PartnerDecaySignal[] {
  const signals: PartnerDecaySignal[] = [];

  for (const r of records) {
    const scores = r.reliabilityScores
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => s.score);

    if (scores.length < 2) continue;

    const recent = scores.slice(-7);
    const earlier = scores.slice(0, Math.max(1, scores.length - 7));

    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;
    const drop = Math.round(earlierAvg - recentAvg);

    if (drop < 3) continue; // Only signal meaningful drops

    const escalationRate = r.completedJobs14d > 0
      ? (r.escalationCount14d / r.completedJobs14d) * 100
      : 0;

    let riskLevel: PredictiveRiskLevel = "low";
    if (drop >= 15 || escalationRate > 20) riskLevel = "critical";
    else if (drop >= 10 || escalationRate > 15) riskLevel = "high";
    else if (drop >= 5) riskLevel = "moderate";

    const reasons: string[] = [];
    reasons.push(`Reliability dropped ${drop}% over 14 days`);
    if (escalationRate > 10) reasons.push(`Escalation rate ${Math.round(escalationRate)}%`);

    signals.push({
      partnerId: r.partnerId,
      partnerName: r.partnerName,
      categoryCode: r.categoryCode,
      zoneId: r.zoneId,
      reliabilityDrop: drop,
      currentScore: clamp(recentAvg),
      previousScore: clamp(earlierAvg),
      riskLevel,
      reason: reasons.join(". "),
    });
  }

  return signals.sort((a, b) => b.reliabilityDrop - a.reliabilityDrop);
}

// ── 3: Detect Demand Pressure Risk ──

export function detectDemandPressureRisk(
  inputs: DemandPressureInput[],
): DemandPressureSignal[] {
  return inputs.map(input => {
    const weeklyRate = input.bookingVolume7d;
    const dailyRate = weeklyRate / 7;
    const supplyCapacity = input.availablePartners * 3; // assume 3 jobs/day/partner
    const supplyRatio = supplyCapacity > 0 ? Math.round((dailyRate / supplyCapacity) * 100) / 100 : 99;

    let demandPressure = 0;
    if (supplyRatio > 1.5) demandPressure = 100;
    else if (supplyRatio > 1.0) demandPressure = clamp(50 + (supplyRatio - 1.0) * 100);
    else if (supplyRatio > 0.7) demandPressure = clamp(20 + (supplyRatio - 0.7) * 100);
    else demandPressure = clamp(supplyRatio * 28);

    // Volume growth pressure
    const growthRate = input.bookingVolume14d > 0
      ? (input.bookingVolume7d / (input.bookingVolume14d - input.bookingVolume7d || 1))
      : 1;
    if (growthRate > 1.5) demandPressure = clamp(demandPressure + 15);

    const predictedDelay = supplyRatio > 1
      ? Math.round(input.avgCompletionMinutes * (supplyRatio - 1) * 0.5)
      : 0;

    let riskLevel: PredictiveRiskLevel = "low";
    if (demandPressure >= 80) riskLevel = "critical";
    else if (demandPressure >= 55) riskLevel = "high";
    else if (demandPressure >= 30) riskLevel = "moderate";

    return {
      zoneId: input.zoneId,
      categoryCode: input.categoryCode,
      demandPressure,
      predictedServiceDelayMinutes: predictedDelay,
      riskLevel,
      supplyRatio,
    };
  }).sort((a, b) => b.demandPressure - a.demandPressure);
}

// ── 4: Compute Governance Risk Score ──

export function computeGovernanceRiskScore(
  input: GovernanceRiskInput,
): GovernanceRiskScore {
  // Weights: reliability 30%, overdue 25%, churn 20%, demand 15%, workload 10%
  const reliabilityFactor = input.reliabilityTrendSlope < 0
    ? clamp(Math.abs(input.reliabilityTrendSlope) * 20)
    : 0;
  const overdueFactor = clamp(input.overdueGovernanceActions * 12);
  const churnFactor = clamp(input.partnerChurnRisk);
  const demandFactor = clamp(input.demandPressure);
  const workloadFactor = clamp(input.operatorWorkloadScore);

  const score = clamp(
    reliabilityFactor * 0.30 +
    overdueFactor * 0.25 +
    churnFactor * 0.20 +
    demandFactor * 0.15 +
    workloadFactor * 0.10
  );

  const factors: string[] = [];
  if (reliabilityFactor > 20) factors.push("Reliability trend declining");
  if (overdueFactor > 30) factors.push(`${input.overdueGovernanceActions} overdue governance actions`);
  if (churnFactor > 40) factors.push("High partner churn risk");
  if (demandFactor > 50) factors.push("Demand exceeding supply");
  if (workloadFactor > 60) factors.push("Operator workload elevated");

  return {
    zoneId: input.zoneId,
    categoryCode: input.categoryCode,
    governanceRiskScore: score,
    level: classifyGovRisk(score),
    factors,
  };
}

// ── 5: Generate All Predictive Governance Signals ──

export function generatePredictiveGovernanceSignals(params: {
  snapshots: ReliabilitySnapshot[];
  zones: string[];
  categories: string[];
  partnerRecords: PartnerReliabilityRecord[];
  demandInputs: DemandPressureInput[];
  governanceInputs: GovernanceRiskInput[];
}): PredictiveGovernanceSignals {
  const reliabilityPredictions: ZoneCategoryReliabilityPrediction[] = [];
  for (const z of params.zones) {
    for (const c of params.categories) {
      reliabilityPredictions.push(predictZoneCategoryReliability(params.snapshots, z, c));
    }
  }

  return {
    reliabilityPredictions,
    partnerDecaySignals: detectPartnerReliabilityDecay(params.partnerRecords),
    demandPressureSignals: detectDemandPressureRisk(params.demandInputs),
    governanceRiskScores: params.governanceInputs.map(computeGovernanceRiskScore)
      .sort((a, b) => b.governanceRiskScore - a.governanceRiskScore),
  };
}
