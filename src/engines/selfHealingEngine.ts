/**
 * LankaFix Self-Healing Engine — Pure Logic Functions
 * Deterministic, order-independent, enterprise-grade reliability engine.
 * Zero React/Supabase dependencies. All time-sensitive functions accept optional `now`.
 */

// ── Engine Version (audit traceability) ──
export const SELF_HEALING_ENGINE_VERSION = "1.0.0-production-certified";

// ── Circuit Breaker Config ──
export const CIRCUIT_BREAKER_WINDOW_MS = 30 * 60 * 1000;
export const CIRCUIT_BREAKER_ESCALATION_LIMIT = 5;
export const CIRCUIT_BREAKER_PAYMENT_LIMIT = 3;
export const ESCALATION_RATE_HALT_THRESHOLD = 30; // %

// ── Confidence Override Thresholds ──
const CONFIDENCE_CAP_CIRCUIT_BROKEN = 40;
const CONFIDENCE_CAP_ESCALATION_MODE = 50;

// ── Types ──
export interface HealingEventData {
  id: string;
  entity_type: string;
  entity_id: string;
  recovery_type: string;
  attempt_number: number;
  status: string;
  cooldown_until: string | null;
  metadata: any;
  created_at: string;
}

export type HealingSystemStatus = "healthy" | "active_recovery" | "escalation_mode" | "circuit_broken";

export interface PredictiveWarning {
  level: "info" | "warning";
  title: string;
  description: string;
  metric: string;
}

export interface HealingStats {
  successCount: number;
  failedCount: number;
  escalatedCount: number;
  totalActions: number;
  successRate: number;
  escalationRate: number;
}

export interface RootCauseInsight {
  topRecoveryType: { type: string; count: number } | null;
  topReason: { reason: string; count: number } | null;
  topEntity: { entity: string; count: number } | null;
}

// ── 1: Compute 24h stats (deterministic time) ──
export function computeHealingStats(events: HealingEventData[], now: number = Date.now()): HealingStats {
  const last24h = events.filter(e => now - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000);
  const successCount = last24h.filter(e => e.status === "success").length;
  const failedCount = last24h.filter(e => e.status === "failed").length;
  const escalatedCount = last24h.filter(e => e.status === "escalated").length;
  const totalActions = last24h.filter(e => e.status !== "skipped_cooldown").length;
  const successRate = totalActions > 0 ? Math.round((successCount / totalActions) * 100) : 100;
  const escalationRate = totalActions > 0 ? Math.round((escalatedCount / totalActions) * 100) : 0;

  return { successCount, failedCount, escalatedCount, totalActions, successRate, escalationRate };
}

// ── 2: Healing Confidence Score (with integrity guards) ──
export function computeHealingConfidence(
  stats: HealingStats,
  systemStatus?: HealingSystemStatus,
): number {
  let confidence = Math.max(0, Math.min(100,
    Math.round(stats.successRate * 0.6 + (100 - stats.escalationRate) * 0.3 + (stats.failedCount === 0 ? 10 : 0))
  ));

  // Integrity guards: confidence must reflect instability
  if (systemStatus === "circuit_broken") {
    confidence = Math.min(confidence, CONFIDENCE_CAP_CIRCUIT_BROKEN);
  } else if (systemStatus === "escalation_mode") {
    confidence = Math.min(confidence, CONFIDENCE_CAP_ESCALATION_MODE);
  }

  return confidence;
}

// ── 3: System Status ──
export function computeSystemStatus(stats: HealingStats, circuitBroken: boolean): HealingSystemStatus {
  if (circuitBroken) return "circuit_broken";
  if (stats.escalationRate > ESCALATION_RATE_HALT_THRESHOLD) return "escalation_mode";
  if (stats.totalActions > 0) return "active_recovery";
  return "healthy";
}

// ── 4: Circuit Breaker Check (deterministic time) ──
export function checkCircuitBreaker(events: HealingEventData[], now: number = Date.now()): boolean {
  const windowStart = now - CIRCUIT_BREAKER_WINDOW_MS;
  const recentEvents = events.filter(e => new Date(e.created_at).getTime() > windowStart);
  const recentEscalations = recentEvents.filter(e => e.status === "escalated");
  const paymentEscalations = recentEscalations.filter(e => e.entity_type === "payment");

  return recentEscalations.length >= CIRCUIT_BREAKER_ESCALATION_LIMIT ||
    paymentEscalations.length >= CIRCUIT_BREAKER_PAYMENT_LIMIT;
}

// ── 5: Predictive Early Warnings (order-independent) ──
export function computePredictiveWarnings(events: HealingEventData[]): PredictiveWarning[] {
  const warnings: PredictiveWarning[] = [];
  if (events.length < 4) return warnings;

  // Enforce newest-first ordering internally — never rely on caller order
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const recent = sorted.slice(0, 20);
  const halfLen = Math.floor(recent.length / 2);
  const newerHalf = recent.slice(0, halfLen);
  const olderHalf = recent.slice(halfLen);

  const newerEscalations = newerHalf.filter(e => e.status === "escalated").length;
  const olderEscalations = olderHalf.filter(e => e.status === "escalated").length;
  if (newerEscalations > olderEscalations && newerEscalations >= 2) {
    warnings.push({
      level: "warning",
      title: "Escalation Trend Rising",
      description: `${newerEscalations} escalations in recent window vs ${olderEscalations} previously`,
      metric: "escalation_trend",
    });
  }

  const newerFails = newerHalf.filter(e => e.status === "failed").length;
  const olderFails = olderHalf.filter(e => e.status === "failed").length;
  if (newerFails > olderFails && newerFails >= 2) {
    warnings.push({
      level: "info",
      title: "Recovery Failure Rate Increasing",
      description: `${newerFails} failures in recent window — monitor for systemic issue`,
      metric: "failure_trend",
    });
  }

  // Payment health uses the sorted list too
  const paymentEvents = sorted.filter(e => e.entity_type === "payment").slice(0, 10);
  const paymentFails = paymentEvents.filter(e => e.status === "failed" || e.status === "escalated").length;
  if (paymentFails >= 2) {
    warnings.push({
      level: "warning",
      title: "Payment Recovery Instability",
      description: `${paymentFails} payment failures/escalations detected in recent window`,
      metric: "payment_health",
    });
  }

  return warnings;
}

// ── 6: Root Cause Insights (deterministic time) ──
export function computeRootCauseInsights(events: HealingEventData[], now: number = Date.now()): RootCauseInsight | null {
  const last24h = events.filter(e => now - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000);
  if (last24h.length === 0) return null;

  const typeCounts: Record<string, number> = {};
  last24h.forEach(e => { typeCounts[e.recovery_type] = (typeCounts[e.recovery_type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  const failReasons: Record<string, number> = {};
  last24h.filter(e => e.metadata?.reason).forEach(e => {
    failReasons[e.metadata.reason] = (failReasons[e.metadata.reason] || 0) + 1;
  });
  const topReason = Object.entries(failReasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  const entityCounts: Record<string, number> = {};
  last24h.forEach(e => { entityCounts[e.entity_type] = (entityCounts[e.entity_type] || 0) + 1; });
  const topEntity = Object.entries(entityCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  return {
    topRecoveryType: topType ? { type: topType[0], count: topType[1] } : null,
    topReason: topReason ? { reason: topReason[0], count: topReason[1] } : null,
    topEntity: topEntity ? { entity: topEntity[0], count: topEntity[1] } : null,
  };
}

// ── 7: Should auto-mode halt? ──
export function shouldAutoModeHalt(escalationRate: number, circuitBroken: boolean): boolean {
  return circuitBroken || escalationRate > ESCALATION_RATE_HALT_THRESHOLD;
}

// ── 8: Is retry allowed? ──
export function isRetryAllowed(attempts: number, maxRetries: number, cooldownUntil: string | null, lastStatus: string | null, now: number = Date.now()): boolean {
  if (lastStatus === "escalated") return false;
  if (cooldownUntil && new Date(cooldownUntil).getTime() > now) return false;
  if (attempts >= maxRetries) return false;
  return true;
}

// ── 9: Idempotency Fingerprint (deterministic, no side effects) ──
export function generateRecoveryFingerprint(entityId: string, recoveryType: string, attemptNumber: number): string {
  return `${entityId}::${recoveryType}::${attemptNumber}`;
}
