/**
 * AI Health Service
 * Lightweight module health tracking for operator observability.
 * Uses feature flags, usage metrics, and consent state to derive health.
 * Advisory only — never modifies marketplace state.
 */
import { getAIFlags, type AIFeatureFlags } from "@/lib/aiFeatureFlags";
import { getUsageSummary } from "@/services/aiUsageMeter";
import { checkModuleConsent } from "@/services/aiConsentService";

export type AIHealthStatus = "healthy" | "degraded" | "unavailable" | "disabled";

export interface AIModuleHealth {
  module: keyof AIFeatureFlags;
  status: AIHealthStatus;
  label: string;
  category: "Consumer" | "Internal" | "Growth" | "Infrastructure" | "Future";
  lastChecked: string;
  reason?: string;
  avgLatencyMs?: number;
  fallbackRatio?: number;
  callCount: number;
}

const MODULE_CATEGORIES: Record<keyof AIFeatureFlags, { label: string; category: AIModuleHealth["category"] }> = {
  ai_photo_triage: { label: "Photo Triage", category: "Consumer" },
  ai_issue_triage: { label: "Issue Triage", category: "Consumer" },
  ai_estimate_assist: { label: "Price Estimation", category: "Consumer" },
  ai_partner_ranking: { label: "Partner Matching", category: "Consumer" },
  ai_review_summary: { label: "Review Summary", category: "Consumer" },
  ai_retention_nudges: { label: "Retention Nudges", category: "Growth" },
  ai_fraud_watch: { label: "Fraud Watch", category: "Internal" },
  ai_operator_copilot: { label: "Operator Copilot", category: "Internal" },
  ai_demand_heatmap: { label: "Demand Heatmap", category: "Internal" },
  ai_quality_monitor: { label: "Quality Monitor", category: "Internal" },
  ai_experiments: { label: "Experiments", category: "Infrastructure" },
  ai_voice_booking: { label: "Voice Booking", category: "Future" },
  ai_whatsapp_assist: { label: "WhatsApp Assist", category: "Future" },
};

/** Derive health status for a single module */
function deriveModuleHealth(
  module: keyof AIFeatureFlags,
  flags: AIFeatureFlags,
  usageByModule: Record<string, number>,
  fallbackEntries: number,
  totalEntries: number
): AIModuleHealth {
  const meta = MODULE_CATEGORIES[module];
  const enabled = flags[module];
  const callCount = usageByModule[module] || 0;
  const now = new Date().toISOString();

  if (!enabled) {
    return { module, status: "disabled", label: meta.label, category: meta.category, lastChecked: now, reason: "Feature flag disabled", callCount: 0 };
  }

  const consent = checkModuleConsent(module);
  if (!consent.allowed) {
    return { module, status: "unavailable", label: meta.label, category: meta.category, lastChecked: now, reason: "Consent not granted", callCount };
  }

  // Derive fallback ratio for this module's session usage
  const moduleFallbackRatio = totalEntries > 0 ? fallbackEntries / totalEntries : 0;

  if (moduleFallbackRatio > 0.5 && callCount > 2) {
    return { module, status: "degraded", label: meta.label, category: meta.category, lastChecked: now, reason: "High fallback rate", callCount, fallbackRatio: moduleFallbackRatio };
  }

  return { module, status: "healthy", label: meta.label, category: meta.category, lastChecked: now, callCount, fallbackRatio: moduleFallbackRatio };
}

/** Get health status for all AI modules */
export function getAllModuleHealth(): AIModuleHealth[] {
  const flags = getAIFlags();
  const usage = getUsageSummary();
  const modules = Object.keys(MODULE_CATEGORIES) as (keyof AIFeatureFlags)[];

  return modules.map((mod) =>
    deriveModuleHealth(mod, flags, usage.byModule, 0, usage.totalCalls)
  );
}

/** Get a summary readiness assessment */
export function getAIReadinessSummary() {
  const modules = getAllModuleHealth();
  const critical = ["ai_issue_triage", "ai_estimate_assist", "ai_partner_ranking", "ai_fraud_watch", "ai_operator_copilot"];

  const criticalModules = modules.filter((m) => critical.includes(m.module));
  const criticalDisabled = criticalModules.filter((m) => m.status === "disabled");
  const criticalDegraded = criticalModules.filter((m) => m.status === "degraded");
  const criticalUnavailable = criticalModules.filter((m) => m.status === "unavailable");
  const totalHealthy = modules.filter((m) => m.status === "healthy").length;
  const totalDegraded = modules.filter((m) => m.status === "degraded").length;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (criticalDegraded.length > 0) blockers.push(`${criticalDegraded.length} critical module(s) degraded`);
  if (criticalUnavailable.length > 0) warnings.push(`${criticalUnavailable.length} critical module(s) need consent`);
  if (criticalDisabled.length > 0) warnings.push(`${criticalDisabled.length} critical module(s) disabled`);
  if (totalDegraded > 2) warnings.push(`${totalDegraded} modules showing degradation`);

  const usage = getUsageSummary();
  if (usage.fallbackRate > 0.3) warnings.push(`Session fallback rate at ${(usage.fallbackRate * 100).toFixed(0)}%`);

  let verdict: "READY" | "READY_WITH_WARNINGS" | "NOT_READY" = "READY";
  if (blockers.length > 0) verdict = "NOT_READY";
  else if (warnings.length > 0) verdict = "READY_WITH_WARNINGS";

  return { verdict, blockers, warnings, totalModules: modules.length, healthy: totalHealthy, degraded: totalDegraded, disabled: modules.filter((m) => m.status === "disabled").length };
}
