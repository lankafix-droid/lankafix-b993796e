/**
 * LankaFix Self-Healing Monitor — Production Grade
 * Includes: Healing Confidence, Predictive Warnings, Guarded Auto Mode,
 * Circuit Breaker, Root Cause Insights, Observability Hardening.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, RefreshCw, Shield, CheckCircle2, AlertTriangle, XCircle,
  Activity, Clock, Zap, CreditCard, Cpu, Heart, TrendingUp,
  AlertOctagon, Eye, ShieldOff, BarChart3, Info,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import {
  COOLDOWN_MINUTES, MAX_RETRIES, RECOVERY_TYPE_LABELS, STALE_BOOKING_MINUTES,
  type HealingEntityType, type HealingRecoveryType, type HealingStatus,
} from "@/config/selfHealingConfig";
import {
  computeHealingStats, computeHealingConfidence, computeSystemStatus,
  checkCircuitBreaker as checkCircuitBreakerFn, computePredictiveWarnings,
  computeRootCauseInsights, shouldAutoModeHalt,
  CIRCUIT_BREAKER_ESCALATION_LIMIT, CIRCUIT_BREAKER_PAYMENT_LIMIT,
  ESCALATION_RATE_HALT_THRESHOLD,
  type HealingEventData, type HealingSystemStatus, type PredictiveWarning,
} from "@/engines/selfHealingEngine";

// ── Auto Mode Config ──
const AUTO_MODE_INTERVAL_MS = 10 * 60 * 1000; // 10 min

// ── Types (reuse from engine) ──
type HealingEvent = HealingEventData;

// ── Styles ──
const STATUS_CFG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  success: { color: "text-success", icon: CheckCircle2, label: "Success" },
  failed: { color: "text-destructive", icon: XCircle, label: "Failed" },
  escalated: { color: "text-warning", icon: AlertTriangle, label: "Escalated" },
  skipped_cooldown: { color: "text-muted-foreground", icon: Clock, label: "Cooldown" },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  booking: Activity,
  dispatch: Zap,
  payment: CreditCard,
  automation: Cpu,
};

const SYSTEM_STATUS_CFG: Record<HealingSystemStatus, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  healthy: { color: "text-success", bg: "bg-success/5", border: "border-success/20", label: "Healthy", icon: CheckCircle2 },
  active_recovery: { color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", label: "Active Recovery", icon: RefreshCw },
  escalation_mode: { color: "text-warning", bg: "bg-warning/5", border: "border-warning/20", label: "Escalation Mode", icon: AlertTriangle },
  circuit_broken: { color: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/20", label: "Circuit Broken", icon: ShieldOff },
};

export default function SelfHealingMonitorPage() {
  const queryClient = useQueryClient();
  const [healing, setHealing] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [circuitBroken, setCircuitBroken] = useState(false);
  const autoModeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch recent healing events ──
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["self-healing-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("self_healing_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as HealingEvent[];
    },
    refetchInterval: 20_000,
  });

  // ── Use engine functions for all computed values ──
  const stats = computeHealingStats(events);
  const { successCount, failedCount, escalatedCount, totalActions, successRate, escalationRate } = stats;
  const healingConfidence = computeHealingConfidence(stats);
  const systemStatus = computeSystemStatus(stats, circuitBroken);

  // ── Circuit Breaker Check (uses engine) ──
  const checkCircuitBreaker = useCallback((): boolean => {
    return checkCircuitBreakerFn(events);
  }, [events]);

  // ── 2: Predictive Early Warnings ──
  const predictiveWarnings: PredictiveWarning[] = (() => {
    const warnings: PredictiveWarning[] = [];
    if (events.length < 4) return warnings;

    // Compare first half vs second half of recent events to detect trends
    const recent = events.slice(0, 20);
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

    // Payment-specific trend
    const paymentEvents = events.filter(e => e.entity_type === "payment").slice(0, 10);
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
  })();

  // ── 5: Root Cause Insights ──
  const rootCauseInsights = (() => {
    if (last24h.length === 0) return null;

    // Top recurring recovery type
    const typeCounts: Record<string, number> = {};
    last24h.forEach(e => { typeCounts[e.recovery_type] = (typeCounts[e.recovery_type] || 0) + 1; });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Most common failure reason
    const failReasons: Record<string, number> = {};
    last24h.filter(e => e.metadata?.reason).forEach(e => {
      failReasons[e.metadata.reason] = (failReasons[e.metadata.reason] || 0) + 1;
    });
    const topReason = Object.entries(failReasons).sort((a, b) => b[1] - a[1])[0];

    // Most affected entity type
    const entityCounts: Record<string, number> = {};
    last24h.forEach(e => { entityCounts[e.entity_type] = (entityCounts[e.entity_type] || 0) + 1; });
    const topEntity = Object.entries(entityCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      topRecoveryType: topType ? { type: RECOVERY_TYPE_LABELS[topType[0] as HealingRecoveryType] || topType[0], count: topType[1] } : null,
      topReason: topReason ? { reason: topReason[0], count: topReason[1] } : null,
      topEntity: topEntity ? { entity: topEntity[0], count: topEntity[1] } : null,
    };
  })();

  // ── Manual healing cycle trigger ──
  const runHealingCycle = useCallback(async (triggeredBy: "manual" | "auto" = "manual") => {
    if (circuitBroken) {
      console.warn("[SelfHealing] Circuit broken — healing blocked");
      return;
    }

    // Check circuit breaker before running
    if (checkCircuitBreaker()) {
      setCircuitBroken(true);
      setAutoMode(false);
      // Create critical incident
      await escalateToIncident(
        "self_healing_circuit_break",
        "Self-healing circuit breaker triggered — too many escalations in 30min window",
        "escalation_count"
      );
      return;
    }

    // Check escalation rate halt
    if (escalationRate > ESCALATION_RATE_HALT_THRESHOLD && triggeredBy === "auto") {
      console.warn("[SelfHealing] Escalation rate too high, auto-mode halted");
      setAutoMode(false);
      return;
    }

    setHealing(true);
    try {
      await runStaleBookingHealing(triggeredBy);
      await runExpiredDispatchHealing(triggeredBy);
      await runPaymentRetryHealing(triggeredBy);
      queryClient.invalidateQueries({ queryKey: ["self-healing-events"] });
    } catch (e) {
      console.warn("[SelfHealing] Cycle error:", e);
    } finally {
      setHealing(false);
    }
  }, [queryClient, circuitBroken, checkCircuitBreaker, escalationRate]);

  // ── 3: Guarded Auto Mode ──
  useEffect(() => {
    if (autoMode && !circuitBroken) {
      autoModeRef.current = setInterval(() => {
        runHealingCycle("auto");
      }, AUTO_MODE_INTERVAL_MS);
    }
    return () => {
      if (autoModeRef.current) {
        clearInterval(autoModeRef.current);
        autoModeRef.current = null;
      }
    };
  }, [autoMode, circuitBroken, runHealingCycle]);

  const handleAutoModeToggle = (checked: boolean) => {
    if (circuitBroken) return;
    setAutoMode(checked);
  };

  const handleCircuitReset = () => {
    setCircuitBroken(false);
    setAutoMode(false);
  };

  const ssCfg = SYSTEM_STATUS_CFG[systemStatus];
  const SSIcon = ssCfg.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top">
      <Header />
      <main className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-4">
            <Link to="/ops/command-center">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Self-Healing Monitor
              </h1>
              <p className="text-xs text-muted-foreground">Autonomous recovery with circuit protection</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => runHealingCycle("manual")} disabled={healing || circuitBroken}>
              <RefreshCw className={`w-3.5 h-3.5 ${healing ? "animate-spin" : ""}`} />
              {healing ? "Healing…" : "Run Cycle"}
            </Button>
          </div>

          {/* ── System Status Hero ── */}
          <Card className={`mb-4 ${ssCfg.border} border ${ssCfg.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SSIcon className={`w-6 h-6 ${ssCfg.color}`} />
                  <div>
                    <p className={`text-sm font-bold ${ssCfg.color}`}>{ssCfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Confidence: {healingConfidence}% · Escalation Rate: {escalationRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {circuitBroken ? (
                    <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={handleCircuitReset}>
                      <ShieldOff className="w-3 h-3" /> Reset Breaker
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Auto</span>
                      <Switch checked={autoMode} onCheckedChange={handleAutoModeToggle} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Circuit Breaker Warning ── */}
          {circuitBroken && (
            <Card className="mb-4 border-destructive/30 border bg-destructive/5">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-destructive">Circuit Breaker Activated</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Too many escalations within 30 minutes. Auto-healing disabled.
                      Manual reset required after investigating root cause.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 2: Predictive Warnings ── */}
          {predictiveWarnings.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-primary" /> Predictive Early Warnings
              </h2>
              <div className="space-y-1.5">
                {predictiveWarnings.map((w, i) => (
                  <Card key={i} className={`border ${w.level === "warning" ? "border-warning/20 bg-warning/5" : "border-primary/20 bg-primary/5"}`}>
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2">
                        <Info className={`w-3.5 h-3.5 shrink-0 ${w.level === "warning" ? "text-warning" : "text-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold ${w.level === "warning" ? "text-warning" : "text-primary"}`}>{w.title}</p>
                          <p className="text-[10px] text-muted-foreground">{w.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] shrink-0">{w.level.toUpperCase()}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Success Rate" value={`${successRate}%`} icon={TrendingUp} color="text-success" />
            <StatCard label="Recovered" value={successCount} icon={CheckCircle2} color="text-success" />
            <StatCard label="Escalated" value={escalatedCount} icon={AlertTriangle} color="text-warning" />
            <StatCard label="Confidence" value={`${healingConfidence}%`} icon={Heart} color={healingConfidence >= 70 ? "text-success" : healingConfidence >= 40 ? "text-warning" : "text-destructive"} />
          </div>

          {/* ── 5: Root Cause Insights ── */}
          {rootCauseInsights && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" /> Root Cause Insights (24h)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {rootCauseInsights.topRecoveryType && (
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Top Recovery Type</p>
                      <p className="font-semibold text-foreground text-[11px]">{rootCauseInsights.topRecoveryType.type}</p>
                      <p className="text-[9px] text-muted-foreground">{rootCauseInsights.topRecoveryType.count} occurrences</p>
                    </div>
                  )}
                  {rootCauseInsights.topEntity && (
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Most Affected Domain</p>
                      <p className="font-semibold text-foreground text-[11px] capitalize">{rootCauseInsights.topEntity.entity}</p>
                      <p className="text-[9px] text-muted-foreground">{rootCauseInsights.topEntity.count} events</p>
                    </div>
                  )}
                  {rootCauseInsights.topReason && (
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Top Failure Reason</p>
                      <p className="font-semibold text-foreground text-[11px] truncate">{rootCauseInsights.topReason.reason}</p>
                      <p className="text-[9px] text-muted-foreground">{rootCauseInsights.topReason.count} occurrences</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Config Reference ── */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" /> Recovery Limits & Safety
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Booking retries:</span>{" "}
                  <span className="font-semibold">{MAX_RETRIES.booking}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Dispatch retries:</span>{" "}
                  <span className="font-semibold">{MAX_RETRIES.dispatch}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Payment retries:</span>{" "}
                  <span className="font-semibold">{MAX_RETRIES.payment}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Cooldown:</span>{" "}
                  <span className="font-semibold">{COOLDOWN_MINUTES} min</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Circuit break:</span>{" "}
                  <span className="font-semibold">{CIRCUIT_BREAKER_ESCALATION_LIMIT} esc/30m</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Auto interval:</span>{" "}
                  <span className="font-semibold">10 min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Recent Events ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Healing Events</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="w-8 h-8 text-success mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">System Healthy</p>
                <p className="text-xs text-muted-foreground mt-1">No recovery actions needed</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 30).map(ev => (
                <HealingEventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ── Event Card with enhanced observability ──
function HealingEventCard({ event }: { event: HealingEvent }) {
  const statusCfg = STATUS_CFG[event.status] || STATUS_CFG.failed;
  const StatusIcon = statusCfg.icon;
  const EntityIcon = ENTITY_ICONS[event.entity_type] || Activity;
  const recoveryLabel = RECOVERY_TYPE_LABELS[event.recovery_type as HealingRecoveryType] || event.recovery_type;
  const ago = getRelativeTime(event.created_at);
  const triggeredBy = event.metadata?.triggered_by || "manual";

  return (
    <Card className="border">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <EntityIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground truncate">{recoveryLabel}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusCfg.color}`}>
                <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                {statusCfg.label}
              </Badge>
              {triggeredBy === "auto" && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 text-primary">AUTO</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              <span>Attempt #{event.attempt_number}</span>
              <span>•</span>
              <span>{event.entity_type}/{event.entity_id.slice(0, 8)}</span>
              <span>•</span>
              <span>{ago}</span>
            </div>
            {event.metadata?.reason && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">{event.metadata.reason}</p>
            )}
            {event.metadata?.previous_state_snapshot && (
              <p className="text-[9px] text-muted-foreground mt-0.5">
                State: {event.metadata.previous_state_snapshot} → {event.metadata.next_state_snapshot || "recovered"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Relative time helper ──
function getRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ══════════════════════════════════════════════════
// HEALING RECOVERY FUNCTIONS (with observability)
// ══════════════════════════════════════════════════

async function checkCooldown(entityType: string, entityId: string, recoveryType: string): Promise<{ allowed: boolean; attempts: number }> {
  const { data } = await supabase
    .from("self_healing_events")
    .select("attempt_number, cooldown_until, status")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("recovery_type", recoveryType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return { allowed: true, attempts: 0 };

  const last = data[0];
  if (last.cooldown_until && new Date(last.cooldown_until) > new Date()) {
    return { allowed: false, attempts: last.attempt_number };
  }
  if (last.status === "escalated") return { allowed: false, attempts: last.attempt_number };

  return { allowed: true, attempts: last.attempt_number };
}

async function logHealingEvent(
  entityType: HealingEntityType,
  entityId: string,
  recoveryType: HealingRecoveryType,
  attemptNumber: number,
  status: HealingStatus,
  metadata?: Record<string, any>,
) {
  const cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
  await supabase.from("self_healing_events").insert({
    entity_type: entityType,
    entity_id: entityId,
    recovery_type: recoveryType,
    attempt_number: attemptNumber,
    status,
    cooldown_until: cooldownUntil,
    metadata: metadata || {},
  });
}

async function escalateToIncident(incidentType: string, description: string, triggerMetric: string) {
  const { data: existing } = await supabase
    .from("incident_playbooks")
    .select("id")
    .eq("incident_type", incidentType)
    .in("status", ["open", "acknowledged", "in_progress"])
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase.from("incident_playbooks")
      .update({ last_detected_at: new Date().toISOString() })
      .eq("id", existing[0].id);
    return;
  }

  await supabase.from("incident_playbooks").insert({
    incident_type: incidentType,
    severity: "critical",
    description,
    trigger_metric: triggerMetric,
    recommended_steps: JSON.stringify([
      "Review self-healing event log",
      "Investigate root cause",
      "Manual intervention may be required",
    ]),
    responsible_team: "Operations",
    status: "open",
  });
}

// ── 1: Stale Booking Reassignment ──
async function runStaleBookingHealing(triggeredBy: "manual" | "auto" = "manual") {
  const cutoff = new Date(Date.now() - STALE_BOOKING_MINUTES * 60 * 1000).toISOString();
  const { data: staleBookings } = await supabase
    .from("bookings")
    .select("id, partner_id, status, dispatch_round")
    .in("status", ["assigned", "tech_en_route"])
    .lt("updated_at", cutoff)
    .limit(10);

  if (!staleBookings || staleBookings.length === 0) return;

  for (const booking of staleBookings) {
    const { allowed, attempts } = await checkCooldown("booking", booking.id, "stale_booking_reassignment");
    if (!allowed) {
      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", attempts, "skipped_cooldown", {
        reason: "Cooldown active or already escalated",
        triggered_by: triggeredBy,
      });
      continue;
    }

    const nextAttempt = attempts + 1;
    if (nextAttempt > MAX_RETRIES.booking) {
      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", nextAttempt, "escalated", {
        reason: "Max retries exceeded",
        triggered_by: triggeredBy,
        previous_state_snapshot: booking.status,
      });
      await escalateToIncident("service_delivery_delay", `Booking ${booking.id.slice(0, 8)} stuck after ${MAX_RETRIES.booking} healing retries`, "staleBookingCount");
      continue;
    }

    try {
      await supabase.from("bookings").update({
        partner_id: null,
        status: "requested" as any,
        dispatch_status: "pending",
        dispatch_round: (booking.dispatch_round || 0) + 1,
      }).eq("id", booking.id);

      await supabase.from("job_timeline").insert({
        booking_id: booking.id,
        status: "dispatch_retry",
        actor: "system",
        note: `Self-healing: reassignment attempt #${nextAttempt} (${triggeredBy})`,
        metadata: { healing: true, attempt: nextAttempt, triggered_by: triggeredBy },
      });

      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", nextAttempt, "success", {
        previous_partner: booking.partner_id,
        previous_state_snapshot: booking.status,
        next_state_snapshot: "requested",
        triggered_by: triggeredBy,
      });
    } catch (e: any) {
      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", nextAttempt, "failed", {
        error: e.message,
        triggered_by: triggeredBy,
        previous_state_snapshot: booking.status,
      });
    }
  }
}

// ── 2: Dispatch Offer Expiry Recovery ──
async function runExpiredDispatchHealing(triggeredBy: "manual" | "auto" = "manual") {
  const { data: expiredOffers } = await supabase
    .from("dispatch_offers")
    .select("booking_id")
    .eq("status", "expired")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!expiredOffers || expiredOffers.length === 0) return;

  const bookingIds = [...new Set(expiredOffers.map(o => o.booking_id))];

  for (const bookingId of bookingIds.slice(0, 5)) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, partner_id, dispatch_round, dispatch_status")
      .eq("id", bookingId)
      .single();

    if (!booking || booking.partner_id || booking.status === "completed" || booking.status === "cancelled") continue;

    const { allowed, attempts } = await checkCooldown("dispatch", bookingId, "dispatch_offer_expiry");
    if (!allowed) continue;

    const nextAttempt = attempts + 1;
    if (nextAttempt > MAX_RETRIES.dispatch) {
      await logHealingEvent("dispatch", bookingId, "dispatch_offer_expiry", nextAttempt, "escalated", {
        reason: "Max dispatch retries exceeded",
        triggered_by: triggeredBy,
        previous_state_snapshot: booking.status,
      });
      await escalateToIncident("dispatch_reliability_degradation", `Dispatch for booking ${bookingId.slice(0, 8)} failed after ${MAX_RETRIES.dispatch} healing retries`, "dispatchAcceptRate");
      continue;
    }

    try {
      await supabase.from("bookings").update({
        dispatch_status: "pending",
        dispatch_round: (booking.dispatch_round || 0) + 1,
      }).eq("id", bookingId);

      await logHealingEvent("dispatch", bookingId, "dispatch_offer_expiry", nextAttempt, "success", {
        round: (booking.dispatch_round || 0) + 1,
        triggered_by: triggeredBy,
        previous_state_snapshot: booking.dispatch_status || "expired",
        next_state_snapshot: "pending",
      });
    } catch (e: any) {
      await logHealingEvent("dispatch", bookingId, "dispatch_offer_expiry", nextAttempt, "failed", {
        error: e.message,
        triggered_by: triggeredBy,
      });
    }
  }
}

// ── 3: Payment Retry Recovery ──
async function runPaymentRetryHealing(triggeredBy: "manual" | "auto" = "manual") {
  const { data: failedPayments } = await supabase
    .from("payments")
    .select("id, booking_id, payment_status")
    .eq("payment_status", "failed")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!failedPayments || failedPayments.length === 0) return;

  for (const payment of failedPayments) {
    const { allowed, attempts } = await checkCooldown("payment", payment.id, "payment_retry");
    if (!allowed) continue;

    const nextAttempt = attempts + 1;
    if (nextAttempt > MAX_RETRIES.payment) {
      await logHealingEvent("payment", payment.id, "payment_retry", nextAttempt, "escalated", {
        reason: "Max payment retries exceeded",
        triggered_by: triggeredBy,
        previous_state_snapshot: "failed",
      });
      await escalateToIncident("payment_gateway_instability", `Payment ${payment.id.slice(0, 8)} failed after ${MAX_RETRIES.payment} retries`, "paymentFailureCount");
      continue;
    }

    try {
      await supabase.from("payments").update({
        payment_status: "pending" as any,
      }).eq("id", payment.id);

      await logHealingEvent("payment", payment.id, "payment_retry", nextAttempt, "success", {
        booking_id: payment.booking_id,
        triggered_by: triggeredBy,
        previous_state_snapshot: "failed",
        next_state_snapshot: "pending",
      });
    } catch (e: any) {
      await logHealingEvent("payment", payment.id, "payment_retry", nextAttempt, "failed", {
        error: e.message,
        triggered_by: triggeredBy,
      });
    }
  }
}
