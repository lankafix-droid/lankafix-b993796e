/**
 * LankaFix Reliability Scenario Simulator — Pure Engine
 * What-if simulation for reliability, governance, demand, and rollout scenarios.
 * Advisory-only. No side effects. Deterministic.
 */

export type SimRiskLevel = "low" | "moderate" | "high" | "critical";
export type GovernanceAttentionLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type LoadLevel = "normal" | "elevated" | "high" | "overloaded";
export type ComparisonStatus = "improved" | "unchanged" | "worsened";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function classifyRisk(pressure: number): SimRiskLevel {
  if (pressure >= 80) return "critical";
  if (pressure >= 55) return "high";
  if (pressure >= 30) return "moderate";
  return "low";
}

// ── 1: simulateDemandShock ──

export interface DemandShockInput {
  baseDemandPressure: number;
  demandIncreasePercent: number;
  availablePartners: number;
  avgCompletionMinutes: number;
}

export interface DemandShockResult {
  newDemandPressure: number;
  predictedDelayMinutes: number;
  riskLevel: SimRiskLevel;
}

export function simulateDemandShock(input: DemandShockInput): DemandShockResult {
  const scaleFactor = 1 + input.demandIncreasePercent / 100;
  const newPressure = clamp(input.baseDemandPressure * scaleFactor);
  const supplyCapacity = input.availablePartners * 3;
  const projectedDailyDemand = supplyCapacity > 0 ? (newPressure / 100) * supplyCapacity * scaleFactor : 0;
  const supplyRatio = supplyCapacity > 0 ? projectedDailyDemand / supplyCapacity : 99;
  const predictedDelay = supplyRatio > 1
    ? Math.round(input.avgCompletionMinutes * (supplyRatio - 1) * 0.5)
    : 0;

  return {
    newDemandPressure: newPressure,
    predictedDelayMinutes: predictedDelay,
    riskLevel: classifyRisk(newPressure),
  };
}

// ── 2: simulatePartnerLoss ──

export interface PartnerLossInput {
  currentAvailablePartners: number;
  partnerLossCount: number;
  bookingVolume7d: number;
  currentDemandPressure: number;
}

export interface PartnerLossResult {
  newAvailablePartners: number;
  newDemandPressure: number;
  serviceCapacityDropPercent: number;
  riskLevel: SimRiskLevel;
}

export function simulatePartnerLoss(input: PartnerLossInput): PartnerLossResult {
  const newPartners = Math.max(0, input.currentAvailablePartners - input.partnerLossCount);
  const capacityDrop = input.currentAvailablePartners > 0
    ? clamp((input.partnerLossCount / input.currentAvailablePartners) * 100)
    : 100;

  const oldCapacity = input.currentAvailablePartners * 3;
  const newCapacity = newPartners * 3;
  const dailyDemand = input.bookingVolume7d / 7;

  let newPressure = input.currentDemandPressure;
  if (newCapacity > 0) {
    const newRatio = dailyDemand / newCapacity;
    if (newRatio > 1.5) newPressure = 100;
    else if (newRatio > 1.0) newPressure = clamp(50 + (newRatio - 1.0) * 100);
    else if (newRatio > 0.7) newPressure = clamp(20 + (newRatio - 0.7) * 100);
    else newPressure = clamp(newRatio * 28);
  } else if (dailyDemand > 0) {
    newPressure = 100;
  }

  return {
    newAvailablePartners: newPartners,
    newDemandPressure: newPressure,
    serviceCapacityDropPercent: capacityDrop,
    riskLevel: classifyRisk(newPressure),
  };
}

// ── 3: simulateGovernanceStress ──

export interface GovernanceStressInput {
  overdueGovernanceActions: number;
  unownedCriticalActions: number;
  snapshotAgeHours: number;
  operatorWorkloadScore: number;
}

export interface GovernanceStressResult {
  governanceStressScore: number;
  attentionLevel: GovernanceAttentionLevel;
  blockers: string[];
}

export function simulateGovernanceStress(input: GovernanceStressInput): GovernanceStressResult {
  let score = 0;
  score += clamp(input.overdueGovernanceActions * 10) * 0.30;
  score += clamp(input.unownedCriticalActions * 15) * 0.25;
  score += (input.snapshotAgeHours > 24 ? 100 : input.snapshotAgeHours > 12 ? 60 : input.snapshotAgeHours > 6 ? 30 : 0) * 0.20;
  score += clamp(input.operatorWorkloadScore) * 0.25;
  score = clamp(score);

  const blockers: string[] = [];
  if (input.overdueGovernanceActions > 5) blockers.push(`${input.overdueGovernanceActions} overdue governance actions`);
  if (input.unownedCriticalActions > 0) blockers.push(`${input.unownedCriticalActions} unowned critical actions`);
  if (input.snapshotAgeHours > 24) blockers.push(`Snapshot stale (${Math.round(input.snapshotAgeHours)}h)`);
  if (input.operatorWorkloadScore > 80) blockers.push("Operator workload overloaded");

  const attentionLevel: GovernanceAttentionLevel =
    score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MODERATE" : "LOW";

  return { governanceStressScore: score, attentionLevel, blockers };
}

// ── 4: simulateRolloutExpansion ──

export interface RolloutExpansionInput {
  currentRolloutPercent: number;
  proposedRolloutPercent: number;
  currentGovernanceRisk: number;
  demandPressure: number;
  snapshotAgeHours: number;
  emergencyKillSwitch: boolean;
}

export interface RolloutExpansionResult {
  expansionAllowed: boolean;
  safeCeilingPercent: number;
  projectedGovernanceRisk: number;
  warnings: string[];
}

export function simulateRolloutExpansion(input: RolloutExpansionInput): RolloutExpansionResult {
  const warnings: string[] = [];
  let blocked = false;

  if (input.emergencyKillSwitch) {
    warnings.push("Emergency kill switch is active — no expansion allowed");
    blocked = true;
  }
  if (input.snapshotAgeHours > 24 && input.currentGovernanceRisk > 40) {
    warnings.push("Stale snapshot with elevated governance risk — expansion unsafe");
    blocked = true;
  }

  // Safe ceiling calculation
  let safeCeiling = input.currentRolloutPercent;
  if (input.currentGovernanceRisk < 25 && input.demandPressure < 50) {
    safeCeiling = Math.min(50, input.currentRolloutPercent + 10);
  } else if (input.currentGovernanceRisk < 50) {
    safeCeiling = input.currentRolloutPercent;
  } else {
    safeCeiling = Math.max(5, input.currentRolloutPercent - 5);
  }

  if (input.proposedRolloutPercent > safeCeiling) {
    warnings.push(`Proposed ${input.proposedRolloutPercent}% exceeds safe ceiling of ${safeCeiling}%`);
  }

  // Projected governance risk rises with expansion
  const expansionDelta = Math.max(0, input.proposedRolloutPercent - input.currentRolloutPercent);
  const projectedGovernanceRisk = clamp(input.currentGovernanceRisk + expansionDelta * 0.8);

  return {
    expansionAllowed: !blocked,
    safeCeilingPercent: safeCeiling,
    projectedGovernanceRisk,
    warnings,
  };
}

// ── 5: simulateOperatorLoadShift ──

export interface OperatorLoadShiftInput {
  currentWorkloadScore: number;
  addedActions: number;
  resolvedActions: number;
  overdueActions: number;
}

export interface OperatorLoadShiftResult {
  projectedWorkloadScore: number;
  loadLevel: LoadLevel;
}

export function simulateOperatorLoadShift(input: OperatorLoadShiftInput): OperatorLoadShiftResult {
  const netChange = (input.addedActions - input.resolvedActions) * 5 + input.overdueActions * 3;
  const projected = clamp(input.currentWorkloadScore + netChange);

  const loadLevel: LoadLevel =
    projected >= 85 ? "overloaded" : projected >= 65 ? "high" : projected >= 40 ? "elevated" : "normal";

  return { projectedWorkloadScore: projected, loadLevel };
}

// ── 6: computeScenarioSummary ──

export interface ScenarioSummaryInput {
  label: string;
  demandShock?: DemandShockResult;
  partnerLoss?: PartnerLossResult;
  governanceStress?: GovernanceStressResult;
  rolloutExpansion?: RolloutExpansionResult;
  operatorShift?: OperatorLoadShiftResult;
}

export interface ScenarioSummary {
  scenarioLabel: string;
  outcomeHeadline: string;
  outcomeLines: string[];
  netRiskDelta: number;
  recommendedAction: string;
}

export function computeScenarioSummary(input: ScenarioSummaryInput): ScenarioSummary {
  const lines: string[] = [];
  let riskDelta = 0;

  if (input.demandShock) {
    lines.push(`Demand pressure: ${input.demandShock.newDemandPressure}% (${input.demandShock.riskLevel})`);
    if (input.demandShock.predictedDelayMinutes > 0) lines.push(`Predicted delay: +${input.demandShock.predictedDelayMinutes}min`);
    riskDelta += input.demandShock.riskLevel === "critical" ? 30 : input.demandShock.riskLevel === "high" ? 15 : 5;
  }
  if (input.partnerLoss) {
    lines.push(`Partners: ${input.partnerLoss.newAvailablePartners} (−${input.partnerLoss.serviceCapacityDropPercent}% capacity)`);
    riskDelta += input.partnerLoss.serviceCapacityDropPercent > 30 ? 20 : 10;
  }
  if (input.governanceStress) {
    lines.push(`Governance stress: ${input.governanceStress.governanceStressScore}/100 (${input.governanceStress.attentionLevel})`);
    if (input.governanceStress.blockers.length > 0) lines.push(`Blockers: ${input.governanceStress.blockers.length}`);
    riskDelta += input.governanceStress.governanceStressScore > 50 ? 15 : 5;
  }
  if (input.rolloutExpansion) {
    lines.push(`Rollout: ${input.rolloutExpansion.expansionAllowed ? "allowed" : "blocked"} (ceiling ${input.rolloutExpansion.safeCeilingPercent}%)`);
    if (!input.rolloutExpansion.expansionAllowed) riskDelta += 10;
  }
  if (input.operatorShift) {
    lines.push(`Operator load: ${input.operatorShift.projectedWorkloadScore}/100 (${input.operatorShift.loadLevel})`);
    if (input.operatorShift.loadLevel === "overloaded") riskDelta += 10;
  }

  riskDelta = clamp(riskDelta);

  const headline = riskDelta >= 40
    ? "Scenario projects significant risk increase"
    : riskDelta >= 20
    ? "Scenario projects moderate risk increase"
    : riskDelta >= 10
    ? "Scenario projects minor risk increase"
    : "Scenario appears manageable";

  const recommendedAction = riskDelta >= 40
    ? "Do not proceed. Address blockers first."
    : riskDelta >= 20
    ? "Proceed with caution. Monitor closely."
    : riskDelta >= 10
    ? "Low risk. Standard monitoring sufficient."
    : "No action required.";

  return {
    scenarioLabel: input.label,
    outcomeHeadline: headline,
    outcomeLines: lines,
    netRiskDelta: riskDelta,
    recommendedAction,
  };
}

// ── 7: generateScenarioComparison ──

export interface ScenarioBaseline {
  demandPressure: number;
  governanceStress: number;
  workloadScore: number;
  rolloutPercent: number;
}

export interface ScenarioComparison {
  demandDelta: number;
  governanceDelta: number;
  workloadDelta: number;
  rolloutDelta: number;
  status: ComparisonStatus;
}

export function generateScenarioComparison(
  base: ScenarioBaseline,
  simulated: ScenarioBaseline,
): ScenarioComparison {
  const demandDelta = Math.round(simulated.demandPressure - base.demandPressure);
  const governanceDelta = Math.round(simulated.governanceStress - base.governanceStress);
  const workloadDelta = Math.round(simulated.workloadScore - base.workloadScore);
  const rolloutDelta = Math.round(simulated.rolloutPercent - base.rolloutPercent);

  const totalDelta = demandDelta + governanceDelta + workloadDelta;
  const status: ComparisonStatus =
    totalDelta > 5 ? "worsened" : totalDelta < -5 ? "improved" : "unchanged";

  return { demandDelta, governanceDelta, workloadDelta, rolloutDelta, status };
}
