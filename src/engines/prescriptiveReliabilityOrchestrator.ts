/**
 * LankaFix Prescriptive Reliability Orchestrator — Pure Engine
 * Generates ranked, explainable, non-destructive recommendations.
 * Advisory-only. No side effects. Deterministic with identical inputs.
 */

export type InterventionUrgency = "low" | "moderate" | "high" | "critical";
export type ImpactLevel = "low" | "medium" | "high";
export type EffortLevel = "low" | "medium" | "high";

export type InterventionActionType =
  | "assign_owner"
  | "review_hotspot"
  | "defer_rollout"
  | "protect_zone"
  | "refresh_snapshot"
  | "rebalance_operator_load"
  | "review_partner_decay"
  | "review_demand_pressure"
  | "clear_overdue_queue"
  | "pilot_candidate";

export interface PrescriptiveIntervention {
  id: string;
  title: string;
  scopeType: "zone" | "category" | "zone_category" | "partner" | "governance" | "operator";
  zoneId?: string;
  categoryCode?: string;
  partnerId?: string;
  priorityScore: number;
  urgency: InterventionUrgency;
  actionType: InterventionActionType;
  recommendation: string;
  reason: string[];
  confidence: number;
  estimatedImpact: ImpactLevel;
  estimatedEffort: EffortLevel;
}

export interface PriorityInterventionsResult {
  topInterventions: PrescriptiveIntervention[];
  avoidNow: PrescriptiveIntervention[];
  quickWins: PrescriptiveIntervention[];
}

export interface InterventionSequence {
  immediate: PrescriptiveIntervention[];
  thisShift: PrescriptiveIntervention[];
  thisWeek: PrescriptiveIntervention[];
}

export interface RolloutGuardAdvice {
  rolloutAllowed: boolean;
  recommendedCeilingPercent: number;
  advice: string;
  blockers: string[];
}

export interface PrescriptiveSummary {
  headline: string;
  summaryLines: string[];
  strongestSignal: string;
  biggestBlocker: string | null;
  safestNextMove: string | null;
}

// ── Input types ──

export interface InterventionScoreInput {
  governanceRisk: number; // 0-100
  predictiveDecline: number; // 0-100 (higher = worse)
  demandPressure: number; // 0-100
  partnerDecay: number; // 0-100
  overdueGovernance: number; // count
  unownedCritical: number; // count
  snapshotAgeHours: number;
  operatorWorkload: number; // 0-100
  rolloutReadiness: number; // 0-100
}

export interface PriorityInterventionsInput {
  governanceRiskZones: { zoneId: string; categoryCode: string; score: number; level: string; factors: string[] }[];
  predictedDeclines: { zoneId: string; categoryCode: string; currentReliability: number; predicted3d: number; predicted7d: number; trend: string; riskLevel: string }[];
  demandPressureSignals: { zoneId: string; categoryCode: string; demandPressure: number; riskLevel: string; supplyRatio: number }[];
  partnerDecaySignals: { partnerId: string; partnerName: string; categoryCode: string; zoneId: string; reliabilityDrop: number; riskLevel: string }[];
  overdueActions: { id: string; title: string; zone_code?: string; category_code?: string; owner_name?: string }[];
  unownedCriticalActions: { id: string; title: string; zone_code?: string; category_code?: string }[];
  snapshotAgeHours: number;
  operatorLoads: { ownerName: string; workloadScore: number; overdue: number }[];
  rolloutAllowed: boolean;
  rolloutCeilingPercent: number;
  emergencyKillSwitch: boolean;
}

export interface RolloutGuardInput {
  governanceBlockers: string[];
  snapshotAgeHours: number;
  highGovernanceRiskCount: number;
  criticalDemandPressureCount: number;
  emergencyKillSwitch: boolean;
  currentRolloutCeiling: number;
}

// ── Helpers ──

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function makeId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${parts.join("_")}`;
}

function classifyUrgency(score: number): InterventionUrgency {
  if (score >= 80) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

// ── 1: computeInterventionScore ──

export function computeInterventionScore(input: InterventionScoreInput): number {
  const snapshotPenalty = input.snapshotAgeHours > 24 ? 100 : input.snapshotAgeHours > 12 ? 60 : input.snapshotAgeHours > 6 ? 30 : 0;

  const score =
    input.governanceRisk * 0.25 +
    input.predictiveDecline * 0.20 +
    input.demandPressure * 0.15 +
    input.partnerDecay * 0.15 +
    clamp(input.overdueGovernance * 10) * 0.10 +
    clamp(input.unownedCritical * 15) * 0.10 +
    snapshotPenalty * 0.05;

  return clamp(score);
}

// ── 2: computePriorityInterventions ──

export function computePriorityInterventions(input: PriorityInterventionsInput): PriorityInterventionsResult {
  const interventions: PrescriptiveIntervention[] = [];

  // Governance risk zones
  for (const g of input.governanceRiskZones.filter(z => z.score >= 25)) {
    const score = clamp(g.score);
    interventions.push({
      id: makeId("gov", g.zoneId, g.categoryCode),
      title: `Review governance risk: ${g.zoneId} × ${g.categoryCode}`,
      scopeType: "zone_category",
      zoneId: g.zoneId,
      categoryCode: g.categoryCode,
      priorityScore: score,
      urgency: classifyUrgency(score),
      actionType: "review_hotspot",
      recommendation: `Governance risk score ${g.score}/100. Review contributing factors and assign owner.`,
      reason: g.factors.length > 0 ? g.factors : ["Elevated governance risk score"],
      confidence: Math.min(90, 60 + g.score * 0.3),
      estimatedImpact: score >= 60 ? "high" : "medium",
      estimatedEffort: "medium",
    });
  }

  // Predicted reliability declines
  for (const p of input.predictedDeclines.filter(d => d.riskLevel !== "low")) {
    const dropMagnitude = Math.max(0, p.currentReliability - p.predicted3d);
    const score = clamp(dropMagnitude * 3 + (p.riskLevel === "critical" ? 30 : p.riskLevel === "high" ? 15 : 5));
    interventions.push({
      id: makeId("pred", p.zoneId, p.categoryCode),
      title: `Reliability decline forecast: ${p.zoneId} × ${p.categoryCode}`,
      scopeType: "zone_category",
      zoneId: p.zoneId,
      categoryCode: p.categoryCode,
      priorityScore: score,
      urgency: classifyUrgency(score),
      actionType: p.riskLevel === "critical" ? "protect_zone" : "review_hotspot",
      recommendation: `Predicted ${p.currentReliability}% → ${p.predicted3d}% in 3 days. ${p.trend === "declining" ? "Trend is declining." : ""}`,
      reason: [`${dropMagnitude}% predicted drop`, `Current trend: ${p.trend}`],
      confidence: clamp(50 + dropMagnitude * 2),
      estimatedImpact: dropMagnitude >= 10 ? "high" : "medium",
      estimatedEffort: "medium",
    });
  }

  // Partner decay signals
  for (const pd of input.partnerDecaySignals) {
    const score = clamp(pd.reliabilityDrop * 4 + (pd.riskLevel === "critical" ? 20 : pd.riskLevel === "high" ? 10 : 0));
    interventions.push({
      id: makeId("decay", pd.partnerId),
      title: `Partner reliability decay: ${pd.partnerName}`,
      scopeType: "partner",
      partnerId: pd.partnerId,
      zoneId: pd.zoneId,
      categoryCode: pd.categoryCode,
      priorityScore: score,
      urgency: classifyUrgency(score),
      actionType: "review_partner_decay",
      recommendation: `${pd.partnerName} dropped ${pd.reliabilityDrop}% in 14 days. Review performance.`,
      reason: [`${pd.reliabilityDrop}% drop`, `Risk: ${pd.riskLevel}`],
      confidence: clamp(55 + pd.reliabilityDrop),
      estimatedImpact: pd.reliabilityDrop >= 10 ? "high" : "medium",
      estimatedEffort: "low",
    });
  }

  // Demand pressure
  for (const dp of input.demandPressureSignals.filter(d => d.riskLevel !== "low")) {
    const score = clamp(dp.demandPressure);
    interventions.push({
      id: makeId("demand", dp.zoneId, dp.categoryCode),
      title: `Demand pressure: ${dp.zoneId} × ${dp.categoryCode}`,
      scopeType: "zone_category",
      zoneId: dp.zoneId,
      categoryCode: dp.categoryCode,
      priorityScore: score,
      urgency: classifyUrgency(score),
      actionType: "review_demand_pressure",
      recommendation: `Demand pressure ${dp.demandPressure}%. Supply ratio: ${dp.supplyRatio}x. Consider partner recruitment.`,
      reason: [`Demand pressure: ${dp.demandPressure}%`, `Supply ratio: ${dp.supplyRatio}x`],
      confidence: clamp(50 + dp.demandPressure * 0.4),
      estimatedImpact: dp.demandPressure >= 70 ? "high" : "medium",
      estimatedEffort: "high",
    });
  }

  // Overdue governance actions
  if (input.overdueActions.length > 0) {
    const score = clamp(input.overdueActions.length * 12);
    interventions.push({
      id: "overdue_queue",
      title: `Clear ${input.overdueActions.length} overdue governance actions`,
      scopeType: "governance",
      priorityScore: score,
      urgency: classifyUrgency(score),
      actionType: "clear_overdue_queue",
      recommendation: `${input.overdueActions.length} actions are overdue. Clear the queue to restore governance posture.`,
      reason: [`${input.overdueActions.length} overdue items`],
      confidence: 95,
      estimatedImpact: "high",
      estimatedEffort: "medium",
    });
  }

  // Unowned critical
  if (input.unownedCriticalActions.length > 0) {
    const score = clamp(input.unownedCriticalActions.length * 18);
    interventions.push({
      id: "unowned_critical",
      title: `Assign ${input.unownedCriticalActions.length} unowned critical actions`,
      scopeType: "governance",
      priorityScore: score,
      urgency: "critical",
      actionType: "assign_owner",
      recommendation: `${input.unownedCriticalActions.length} critical actions have no owner. Assign immediately.`,
      reason: [`${input.unownedCriticalActions.length} unowned critical items`],
      confidence: 98,
      estimatedImpact: "high",
      estimatedEffort: "low",
    });
  }

  // Snapshot freshness
  if (input.snapshotAgeHours > 12) {
    const score = clamp(input.snapshotAgeHours > 24 ? 70 : 40);
    interventions.push({
      id: "snapshot_stale",
      title: "Refresh reliability snapshot",
      scopeType: "governance",
      priorityScore: score,
      urgency: input.snapshotAgeHours > 24 ? "high" : "moderate",
      actionType: "refresh_snapshot",
      recommendation: `Snapshot is ${Math.round(input.snapshotAgeHours)}h old. Refresh for accurate governance signals.`,
      reason: [`Snapshot age: ${Math.round(input.snapshotAgeHours)}h`],
      confidence: 90,
      estimatedImpact: "medium",
      estimatedEffort: "low",
    });
  }

  // Operator workload rebalance
  const overloadedOps = input.operatorLoads.filter(o => o.workloadScore > 70);
  if (overloadedOps.length > 0) {
    const score = clamp(overloadedOps.length * 15 + 20);
    interventions.push({
      id: "operator_rebalance",
      title: `Rebalance ${overloadedOps.length} overloaded operator(s)`,
      scopeType: "operator",
      priorityScore: score,
      urgency: overloadedOps.some(o => o.workloadScore > 85) ? "high" : "moderate",
      actionType: "rebalance_operator_load",
      recommendation: `${overloadedOps.map(o => o.ownerName).join(", ")} have elevated workload. Redistribute tasks.`,
      reason: overloadedOps.map(o => `${o.ownerName}: workload ${o.workloadScore}`),
      confidence: 80,
      estimatedImpact: "medium",
      estimatedEffort: "medium",
    });
  }

  // Sort all by priority descending
  interventions.sort((a, b) => b.priorityScore - a.priorityScore);

  // Separate
  const topInterventions = interventions.filter(i => i.priorityScore >= 30).slice(0, 15);
  const quickWins = interventions.filter(i => i.estimatedEffort === "low" && (i.estimatedImpact === "medium" || i.estimatedImpact === "high") && i.priorityScore < 80).slice(0, 8);

  // Avoid now: rollout/expansion in risky contexts
  const avoidNow: PrescriptiveIntervention[] = [];
  if (input.emergencyKillSwitch) {
    avoidNow.push({
      id: "avoid_killswitch",
      title: "Rollout halted: emergency kill switch active",
      scopeType: "governance",
      priorityScore: 100,
      urgency: "critical",
      actionType: "defer_rollout",
      recommendation: "Do not proceed with any rollout while kill switch is active.",
      reason: ["Emergency kill switch is ON"],
      confidence: 100,
      estimatedImpact: "high",
      estimatedEffort: "low",
    });
  }
  if (!input.rolloutAllowed) {
    avoidNow.push({
      id: "avoid_rollout_blocked",
      title: "Rollout not recommended: governance blockers present",
      scopeType: "governance",
      priorityScore: 90,
      urgency: "high",
      actionType: "defer_rollout",
      recommendation: "Resolve governance blockers before expanding rollout.",
      reason: ["Rollout not cleared by governance checks"],
      confidence: 95,
      estimatedImpact: "high",
      estimatedEffort: "low",
    });
  }
  for (const g of input.governanceRiskZones.filter(z => z.level === "CRITICAL" || z.level === "HIGH")) {
    avoidNow.push({
      id: makeId("avoid_zone", g.zoneId, g.categoryCode),
      title: `Avoid rollout: ${g.zoneId} × ${g.categoryCode}`,
      scopeType: "zone_category",
      zoneId: g.zoneId,
      categoryCode: g.categoryCode,
      priorityScore: clamp(g.score),
      urgency: g.level === "CRITICAL" ? "critical" : "high",
      actionType: "defer_rollout",
      recommendation: `Governance risk ${g.level}. Do not expand enforcement in this zone/category.`,
      reason: g.factors,
      confidence: 85,
      estimatedImpact: "high",
      estimatedEffort: "low",
    });
  }

  return { topInterventions, avoidNow, quickWins };
}

// ── 3: computeRecommendedSequence ──

export function computeRecommendedSequence(interventions: PrescriptiveIntervention[]): InterventionSequence {
  const sorted = [...interventions].sort((a, b) => b.priorityScore - a.priorityScore);

  const immediate = sorted.filter(i =>
    (i.urgency === "critical" || i.urgency === "high") &&
    (i.estimatedEffort === "low" || i.estimatedEffort === "medium")
  ).slice(0, 5);

  const immediateIds = new Set(immediate.map(i => i.id));

  const thisShift = sorted.filter(i =>
    !immediateIds.has(i.id) &&
    (i.urgency === "moderate" || i.urgency === "high") &&
    i.priorityScore >= 25
  ).slice(0, 8);

  const shiftIds = new Set([...immediateIds, ...thisShift.map(i => i.id)]);

  const thisWeek = sorted.filter(i =>
    !shiftIds.has(i.id) && i.priorityScore >= 10
  ).slice(0, 10);

  return { immediate, thisShift, thisWeek };
}

// ── 4: computeRolloutGuardAdvice ──

export function computeRolloutGuardAdvice(input: RolloutGuardInput): RolloutGuardAdvice {
  const blockers: string[] = [];

  if (input.emergencyKillSwitch) {
    blockers.push("Emergency kill switch is active");
  }
  for (const b of input.governanceBlockers) {
    blockers.push(b);
  }
  if (input.snapshotAgeHours > 24 && input.highGovernanceRiskCount > 0) {
    blockers.push(`Snapshot stale (${Math.round(input.snapshotAgeHours)}h) with ${input.highGovernanceRiskCount} high-risk zones`);
  }
  if (input.criticalDemandPressureCount >= 3) {
    blockers.push(`${input.criticalDemandPressureCount} zones with critical demand pressure`);
  }

  const rolloutAllowed = blockers.length === 0;

  let recommendedCeiling = input.currentRolloutCeiling;
  if (input.criticalDemandPressureCount > 0) {
    recommendedCeiling = Math.min(recommendedCeiling, Math.max(5, recommendedCeiling - input.criticalDemandPressureCount * 5));
  }
  if (input.highGovernanceRiskCount > 3) {
    recommendedCeiling = Math.min(recommendedCeiling, 10);
  }
  // Never exceed advisory cap
  recommendedCeiling = Math.min(recommendedCeiling, input.currentRolloutCeiling);

  const advice = rolloutAllowed
    ? `Rollout may proceed at up to ${recommendedCeiling}% ceiling. Monitor governance risk zones closely.`
    : `Rollout is NOT recommended. ${blockers.length} blocker(s) must be resolved first.`;

  return { rolloutAllowed, recommendedCeilingPercent: recommendedCeiling, advice, blockers };
}

// ── 5: computePrescriptiveSummary ──

export function computePrescriptiveSummary(input: {
  interventions: PriorityInterventionsResult;
  sequence: InterventionSequence;
  rolloutGuard: RolloutGuardAdvice;
  snapshotAgeHours: number;
}): PrescriptiveSummary {
  const { interventions, sequence, rolloutGuard } = input;
  const topCount = interventions.topInterventions.length;
  const avoidCount = interventions.avoidNow.length;
  const immediateCount = sequence.immediate.length;

  // Headline
  let headline: string;
  if (avoidCount > 0 && immediateCount > 0) {
    headline = `${immediateCount} immediate actions required. ${avoidCount} item(s) should be deferred.`;
  } else if (immediateCount > 0) {
    headline = `${immediateCount} immediate actions need attention.`;
  } else if (topCount > 0) {
    headline = `${topCount} interventions identified. No immediate urgency.`;
  } else {
    headline = "System is stable. No prescriptive interventions required.";
  }

  // Summary lines
  const summaryLines: string[] = [];
  if (topCount > 0) summaryLines.push(`${topCount} priority interventions ranked`);
  if (interventions.quickWins.length > 0) summaryLines.push(`${interventions.quickWins.length} quick win(s) available`);
  if (avoidCount > 0) summaryLines.push(`${avoidCount} rollout/expansion item(s) should be deferred`);
  if (!rolloutGuard.rolloutAllowed) summaryLines.push("Rollout is blocked");
  if (input.snapshotAgeHours > 12) summaryLines.push(`Snapshot is ${Math.round(input.snapshotAgeHours)}h old — consider refresh`);

  // Strongest signal
  const strongestSignal = interventions.topInterventions.length > 0
    ? interventions.topInterventions[0].title
    : "No significant signals detected";

  // Biggest blocker
  const biggestBlocker = rolloutGuard.blockers.length > 0
    ? rolloutGuard.blockers[0]
    : (interventions.avoidNow.length > 0 ? interventions.avoidNow[0].title : null);

  // Safest next move
  const safestNextMove = interventions.quickWins.length > 0
    ? interventions.quickWins[0].title
    : (sequence.immediate.length > 0 ? sequence.immediate[0].title : null);

  return { headline, summaryLines, strongestSignal, biggestBlocker, safestNextMove };
}
