/**
 * AI Rollout Readiness Engine
 * Computes per-module and global readiness for AI launch.
 * Advisory only — never modifies marketplace state.
 */
import { getAIFlags, type AIFeatureFlags } from "@/lib/aiFeatureFlags";
import { getAllModuleHealth, type AIModuleHealth } from "@/services/aiHealthService";
import { getUsageSummary } from "@/services/aiUsageMeter";
import { checkModuleConsent } from "@/services/aiConsentService";

export type RolloutVerdict = "READY" | "LIMITED" | "NOT_READY";
export type GlobalVerdict = "READY" | "READY_WITH_WARNINGS" | "NOT_READY";

export interface ModuleRolloutReadiness {
  module: keyof AIFeatureFlags;
  label: string;
  category: "Consumer" | "Internal" | "Growth" | "Infrastructure" | "Future";
  readinessScore: number;
  verdict: RolloutVerdict;
  blockers: string[];
  warnings: string[];
  strengths: string[];
  rolloutRecommendation: string;
}

export interface GlobalRolloutReadiness {
  overallScore: number;
  verdict: GlobalVerdict;
  consumerFacingReady: boolean;
  operatorFacingReady: boolean;
  blockers: string[];
  warnings: string[];
  strongestModules: string[];
  weakestModules: string[];
  recommendationHeadline: string;
  recommendationBody: string;
  moduleReadiness: ModuleRolloutReadiness[];
}

const MODULE_META: Record<string, { label: string; category: ModuleRolloutReadiness["category"] }> = {
  ai_issue_triage: { label: "Issue Triage", category: "Consumer" },
  ai_estimate_assist: { label: "Price Estimation", category: "Consumer" },
  ai_partner_ranking: { label: "Partner Matching", category: "Consumer" },
  ai_review_summary: { label: "Review Summary", category: "Consumer" },
  ai_photo_triage: { label: "Photo Triage", category: "Consumer" },
  ai_fraud_watch: { label: "Fraud Watch", category: "Internal" },
  ai_operator_copilot: { label: "Operator Copilot", category: "Internal" },
  ai_demand_heatmap: { label: "Demand Heatmap", category: "Internal" },
  ai_quality_monitor: { label: "Quality Monitor", category: "Internal" },
  ai_retention_nudges: { label: "Retention Nudges", category: "Growth" },
  ai_experiments: { label: "Experiments", category: "Infrastructure" },
  ai_voice_booking: { label: "Voice Booking", category: "Future" },
  ai_whatsapp_assist: { label: "WhatsApp Assist", category: "Future" },
};

const CONSUMER_CRITICAL = ["ai_issue_triage", "ai_estimate_assist", "ai_partner_ranking", "ai_review_summary"];
const OPERATOR_CRITICAL = ["ai_fraud_watch", "ai_operator_copilot"];

function computeModuleReadiness(
  moduleKey: keyof AIFeatureFlags,
  health: AIModuleHealth,
  flags: AIFeatureFlags,
  usageByModule: Record<string, number>,
  fallbackRate: number
): ModuleRolloutReadiness {
  const meta = MODULE_META[moduleKey] || { label: moduleKey, category: "Infrastructure" as const };
  const blockers: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];
  let score = 100;

  // Flag check
  if (!flags[moduleKey]) {
    blockers.push("Feature flag disabled");
    score -= 40;
  } else {
    strengths.push("Feature flag enabled");
  }

  // Health check
  if (health.status === "unavailable") {
    blockers.push("Module unavailable");
    score -= 30;
  } else if (health.status === "degraded") {
    warnings.push("Module degraded");
    score -= 20;
  } else if (health.status === "disabled") {
    score -= 35;
  } else {
    strengths.push("Module healthy");
  }

  // Consent check for consumer modules
  if (meta.category === "Consumer") {
    const consent = checkModuleConsent(moduleKey);
    if (!consent.allowed) {
      warnings.push("Consent not yet granted by user");
      score -= 10;
    }
  }

  // Usage check
  const calls = usageByModule[moduleKey] || 0;
  if (calls === 0) {
    warnings.push("Zero session usage — untested in current session");
  } else {
    strengths.push(`${calls} calls recorded`);
  }

  // Fallback rate
  if (fallbackRate > 0.5) {
    warnings.push("High fallback rate across session");
    score -= 15;
  } else if (fallbackRate > 0.3) {
    warnings.push("Elevated fallback rate");
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: RolloutVerdict = "READY";
  if (score < 40 || blockers.length > 0) verdict = "NOT_READY";
  else if (score < 70 || warnings.length > 0) verdict = "LIMITED";

  let rolloutRecommendation = "Ready for launch";
  if (verdict === "NOT_READY") rolloutRecommendation = "Resolve blockers before enabling";
  else if (verdict === "LIMITED") rolloutRecommendation = "Proceed with monitoring";

  return {
    module: moduleKey,
    label: meta.label,
    category: meta.category,
    readinessScore: score,
    verdict,
    blockers,
    warnings,
    strengths,
    rolloutRecommendation,
  };
}

/** Compute per-module rollout readiness */
export function getModuleRolloutReadiness(): ModuleRolloutReadiness[] {
  const flags = getAIFlags();
  const healthModules = getAllModuleHealth();
  const usage = getUsageSummary();

  const healthMap = new Map(healthModules.map((h) => [h.module, h]));
  const moduleKeys = Object.keys(MODULE_META) as (keyof AIFeatureFlags)[];

  return moduleKeys.map((key) => {
    const health = healthMap.get(key) || {
      module: key, status: "unavailable" as const, label: key, category: "Infrastructure" as const,
      lastChecked: new Date().toISOString(), callCount: 0,
    };
    return computeModuleReadiness(key, health, flags, usage.byModule, usage.fallbackRate);
  });
}

/** Global AI launch readiness summary */
export function getGlobalRolloutReadiness(): GlobalRolloutReadiness {
  const modules = getModuleRolloutReadiness();
  const blockers: string[] = [];
  const warnings: string[] = [];

  const consumerModules = modules.filter((m) => CONSUMER_CRITICAL.includes(m.module));
  const operatorModules = modules.filter((m) => OPERATOR_CRITICAL.includes(m.module));

  const consumerBlocked = consumerModules.filter((m) => m.verdict === "NOT_READY");
  const operatorBlocked = operatorModules.filter((m) => m.verdict === "NOT_READY");

  if (consumerBlocked.length > 0) blockers.push(`${consumerBlocked.length} consumer-critical module(s) not ready`);
  if (operatorBlocked.length > 0) blockers.push(`${operatorBlocked.length} operator-critical module(s) not ready`);

  const limitedModules = modules.filter((m) => m.verdict === "LIMITED");
  if (limitedModules.length > 3) warnings.push(`${limitedModules.length} modules have limited readiness`);

  // Aggregate module-level blockers/warnings
  modules.forEach((m) => {
    m.blockers.forEach((b) => {
      const msg = `${m.label}: ${b}`;
      if (!blockers.includes(msg)) blockers.push(msg);
    });
  });

  const scores = modules.map((m) => m.readinessScore);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const consumerFacingReady = consumerBlocked.length === 0;
  const operatorFacingReady = operatorBlocked.length === 0;

  const sorted = [...modules].sort((a, b) => b.readinessScore - a.readinessScore);
  const strongestModules = sorted.slice(0, 3).map((m) => m.label);
  const weakestModules = sorted.slice(-3).reverse().map((m) => m.label);

  let verdict: GlobalVerdict = "READY";
  if (blockers.length > 0) verdict = "NOT_READY";
  else if (warnings.length > 0 || limitedModules.length > 0) verdict = "READY_WITH_WARNINGS";

  let recommendationHeadline = "AI modules are launch-ready";
  let recommendationBody = "All critical advisory modules are enabled and healthy. Proceed with controlled rollout.";

  if (verdict === "NOT_READY") {
    recommendationHeadline = "AI modules need attention before launch";
    recommendationBody = "Critical blockers must be resolved. Enable required feature flags and ensure module health before rollout.";
  } else if (verdict === "READY_WITH_WARNINGS") {
    recommendationHeadline = "AI modules ready with monitoring needed";
    recommendationBody = "Most modules are operational but some show warnings. Proceed with close monitoring during pilot.";
  }

  return {
    overallScore,
    verdict,
    consumerFacingReady,
    operatorFacingReady,
    blockers,
    warnings,
    strongestModules,
    weakestModules,
    recommendationHeadline,
    recommendationBody,
    moduleReadiness: modules,
  };
}
