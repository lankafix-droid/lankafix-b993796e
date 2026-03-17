/**
 * Launch Verdict Engine — Rule-based GO/NO-GO determination.
 * Never collapses multiple signals into a single fake green state.
 */

export type LaunchVerdict = "NOT_READY" | "PILOT_ONLY" | "LIMITED_SOFT_LAUNCH" | "READY_FOR_PUBLIC_LAUNCH";

export interface VerdictResult {
  verdict: LaunchVerdict;
  reasons: string[];
  hardBlockers: string[];
  warnings: string[];
  nextActions: string[];
}

export interface VerdictInput {
  verifiedLiveCompletedBookings: number;
  launchReadyCategories: number;
  whatsappStubOnly: boolean;
  pushStubOnly: boolean;
  paymentProductionValidated: boolean;
  operatorTrainingCompletion: number; // 0–100
  categoriesWithZeroSupply: number;
  unresolvedCriticalBlockers: number;
  verifiedPartnerCount: number;
  readyZones: number;
  livePayments: number;
  liveDisputes: number;
}

export function computeLaunchVerdict(input: VerdictInput): VerdictResult {
  const hardBlockers: string[] = [];
  const warnings: string[] = [];
  const reasons: string[] = [];
  const nextActions: string[] = [];

  // Hard blocker rules
  if (input.verifiedLiveCompletedBookings === 0) {
    hardBlockers.push("No verified live completed bookings — end-to-end flow unproven");
    nextActions.push("Complete at least 5 real bookings through full lifecycle");
  }
  if (input.launchReadyCategories < 3) {
    hardBlockers.push(`Only ${input.launchReadyCategories} categories launch-ready (minimum 3)`);
    nextActions.push("Onboard partners for at least 3 high-demand categories");
  }
  if (input.categoriesWithZeroSupply > 0) {
    hardBlockers.push(`${input.categoriesWithZeroSupply} public categories have zero supply`);
    nextActions.push("Disable or hide categories with no partners");
  }
  if (input.unresolvedCriticalBlockers > 0) {
    hardBlockers.push(`${input.unresolvedCriticalBlockers} unresolved critical blockers`);
    nextActions.push("Resolve all critical blockers before launch");
  }

  // Soft constraints
  if (input.whatsappStubOnly) {
    warnings.push("WhatsApp integration is stub-only — critical for Sri Lankan market");
    nextActions.push("Integrate WhatsApp Business API");
  }
  if (input.pushStubOnly) {
    warnings.push("Push notifications not production-ready");
  }
  if (!input.paymentProductionValidated) {
    warnings.push("Payment flow not validated in production environment");
    nextActions.push("Run end-to-end payment test with real gateway");
  }
  if (input.operatorTrainingCompletion < 80) {
    warnings.push(`Operator training at ${input.operatorTrainingCompletion}% (target: 80%)`);
    nextActions.push("Complete operator training sessions");
  }
  if (input.verifiedPartnerCount < 5) {
    warnings.push(`Only ${input.verifiedPartnerCount} verified partners (recommend 10+)`);
  }

  // Determine verdict
  let verdict: LaunchVerdict;
  if (hardBlockers.length > 0) {
    verdict = "NOT_READY";
    reasons.push("Critical blockers prevent safe launch");
  } else if (input.whatsappStubOnly || input.operatorTrainingCompletion < 80) {
    verdict = "PILOT_ONLY";
    reasons.push("Platform functional but missing key operational infrastructure");
  } else if (!input.paymentProductionValidated || input.verifiedLiveCompletedBookings < 10) {
    verdict = "LIMITED_SOFT_LAUNCH";
    reasons.push("Core flows validated but insufficient production proof");
  } else {
    verdict = "READY_FOR_PUBLIC_LAUNCH";
    reasons.push("All critical systems validated and operational");
  }

  return { verdict, reasons, hardBlockers, warnings, nextActions: nextActions.slice(0, 5) };
}

export const VERDICT_CONFIG: Record<LaunchVerdict, { label: string; color: string; bg: string; border: string }> = {
  NOT_READY: { label: "NOT READY", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  PILOT_ONLY: { label: "PILOT ONLY", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  LIMITED_SOFT_LAUNCH: { label: "LIMITED SOFT LAUNCH", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  READY_FOR_PUBLIC_LAUNCH: { label: "READY FOR PUBLIC LAUNCH", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
};
