/**
 * LankaFix Incident Playbook Engine — Production Grade
 * Detects operational incidents, generates guided response playbooks,
 * with deduplication, affected scope, freshness, and recovery hints.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Shield, AlertTriangle, AlertOctagon, ArrowLeft, RefreshCw,
  CheckCircle2, Clock, CreditCard, Activity, Zap, Users,
  ChevronDown, ChevronUp, BookOpen, TrendingDown,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { track } from "@/lib/analytics";
import {
  MAX_PAYMENT_FAILURES_CHECKLIST, AUTOMATION_MONITOR_WINDOW_MINUTES,
  MAX_ESCALATIONS_CHECKLIST, MAX_STALE_BOOKINGS_CHECKLIST,
} from "@/config/launchReadinessConfig";

// ── Types ──
type IncidentSeverity = "info" | "warning" | "critical";
type IncidentStatus = "open" | "acknowledged" | "in_progress" | "resolved";

interface AffectedScope {
  label: string;
  value: string | number;
}

interface PlaybookDefinition {
  incident_type: string;
  title: string;
  severity: IncidentSeverity;
  description: string;
  trigger_metric: string;
  trigger_value: number;
  threshold: number;
  steps: string[];
  responsible_team: string;
  icon: React.ElementType;
  scope: AffectedScope[];
  recovered: boolean;
}

interface IncidentRecord {
  id: string;
  incident_type: string;
  severity: string;
  description: string;
  trigger_metric: string;
  recommended_steps: string[];
  responsible_team: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  last_detected_at: string | null;
  metadata: any;
}

// ── Styles ──
const SEVERITY_STYLES: Record<IncidentSeverity, { bg: string; border: string; text: string; badge: string }> = {
  critical: { bg: "bg-destructive/5", border: "border-destructive/20", text: "text-destructive", badge: "bg-destructive/10 text-destructive" },
  warning: { bg: "bg-warning/5", border: "border-warning/20", text: "text-warning", badge: "bg-warning/10 text-warning" },
  info: { bg: "bg-primary/5", border: "border-primary/20", text: "text-primary", badge: "bg-primary/10 text-primary" },
};

const STATUS_STYLES: Record<IncidentStatus, { text: string; label: string; icon: React.ElementType }> = {
  open: { text: "text-destructive", label: "Open", icon: AlertOctagon },
  acknowledged: { text: "text-warning", label: "Acknowledged", icon: Clock },
  in_progress: { text: "text-primary", label: "In Progress", icon: Activity },
  resolved: { text: "text-success", label: "Resolved", icon: CheckCircle2 },
};

const STATUS_TRANSITIONS: IncidentStatus[] = ["open", "acknowledged", "in_progress", "resolved"];

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

// ── Metrics hook (reuses same tables as Launch Command Center) ──
function useIncidentMetrics() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const autoWindow = new Date(Date.now() - AUTOMATION_MONITOR_WINDOW_MINUTES * 60_000).toISOString();
  const staleThreshold = new Date(Date.now() - 30 * 60_000).toISOString();

  return useQuery({
    queryKey: ["incident-playbook-metrics"],
    queryFn: async () => {
      const results = await Promise.allSettled([
        supabase.from("payments" as any).select("id").eq("payment_status", "failed").gte("created_at", todayISO),
        supabase.from("automation_event_log").select("id").in("severity", ["error", "critical"]).gte("created_at", autoWindow),
        supabase.from("dispatch_offers").select("id").eq("status", "accepted").gte("created_at", todayISO),
        supabase.from("dispatch_offers").select("id").gte("created_at", todayISO),
        supabase.from("dispatch_escalations").select("id").gte("created_at", todayISO).is("resolved_at", null),
        supabase.from("bookings").select("id, zone_code").in("status", ["assigned", "tech_en_route"]).lt("updated_at", staleThreshold).neq("booking_source", "pilot_simulation"),
      ]);

      const extract = (idx: number): any[] => {
        const r = results[idx];
        return r.status === "fulfilled" ? (r.value as any)?.data || [] : [];
      };

      const dispatchTotal = extract(3).length;
      const dispatchAccepted = extract(2).length;
      const staleBookings = extract(5);
      const staleZones = new Set(staleBookings.map((b: any) => b.zone_code).filter(Boolean));

      return {
        paymentFailureCount: extract(0).length,
        automationErrorCount: extract(1).length,
        dispatchAcceptRate: dispatchTotal > 0 ? Math.round((dispatchAccepted / dispatchTotal) * 100) : 100,
        dispatchTotalOffers: dispatchTotal,
        escalationCount: extract(4).length,
        staleBookingCount: staleBookings.length,
        staleZoneCount: staleZones.size,
        detectedAt: new Date().toISOString(),
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ── Persisted incidents hook ──
function usePersistedIncidents() {
  return useQuery({
    queryKey: ["incident-playbooks-db"],
    queryFn: async () => {
      const { data } = await supabase
        .from("incident_playbooks" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as unknown as IncidentRecord[];
    },
    refetchInterval: 30_000,
  });
}

// ── Incident detection engine (reuses Launch Command Center thresholds exclusively) ──
function detectIncidents(metrics: ReturnType<typeof useIncidentMetrics>["data"]): PlaybookDefinition[] {
  if (!metrics) return [];
  const incidents: PlaybookDefinition[] = [];

  // 1. Payment Gateway Instability
  const paymentThreshold = MAX_PAYMENT_FAILURES_CHECKLIST;
  incidents.push({
    incident_type: "payment_gateway_instability",
    title: "Payment Gateway Instability",
    severity: metrics.paymentFailureCount > paymentThreshold * 2 ? "critical" : metrics.paymentFailureCount > paymentThreshold ? "warning" : "info",
    description: `${metrics.paymentFailureCount} payment failures detected today — possible gateway instability.`,
    trigger_metric: "paymentFailureCount",
    trigger_value: metrics.paymentFailureCount,
    threshold: paymentThreshold,
    steps: [
      "Check payment gateway status dashboard",
      "Verify webhook delivery and processing",
      "Inspect payment retry queue",
      "Notify finance operations team if instability persists",
    ],
    responsible_team: "Finance Operations",
    icon: CreditCard,
    scope: [{ label: "Failed payments", value: metrics.paymentFailureCount }],
    recovered: metrics.paymentFailureCount <= paymentThreshold,
  });

  // 2. Automation System Failure
  const autoThreshold = 2;
  incidents.push({
    incident_type: "automation_system_failure",
    title: "Automation System Failure",
    severity: metrics.automationErrorCount >= 5 ? "critical" : metrics.automationErrorCount >= autoThreshold ? "warning" : "info",
    description: `${metrics.automationErrorCount} automation errors in the last ${AUTOMATION_MONITOR_WINDOW_MINUTES} minutes.`,
    trigger_metric: "automationErrorCount",
    trigger_value: metrics.automationErrorCount,
    threshold: autoThreshold,
    steps: [
      "Review automation event logs",
      "Inspect failed background workers",
      "Restart automation workers if necessary",
      "Escalate to platform engineering if unresolved",
    ],
    responsible_team: "Platform Engineering",
    icon: Activity,
    scope: [
      { label: "Errors", value: metrics.automationErrorCount },
      { label: "Window", value: `${AUTOMATION_MONITOR_WINDOW_MINUTES}m` },
    ],
    recovered: metrics.automationErrorCount < autoThreshold,
  });

  // 3. Dispatch Reliability Degradation
  const dispatchThreshold = 70;
  incidents.push({
    incident_type: "dispatch_reliability_degradation",
    title: "Dispatch Reliability Degradation",
    severity: metrics.dispatchAcceptRate < 50 ? "critical" : metrics.dispatchAcceptRate < dispatchThreshold ? "warning" : "info",
    description: `Partner acceptance rate at ${metrics.dispatchAcceptRate}% — partners may not be responding to offers.`,
    trigger_metric: "dispatchAcceptRate",
    trigger_value: metrics.dispatchAcceptRate,
    threshold: dispatchThreshold,
    steps: [
      "Verify partner availability status",
      "Check push notification delivery",
      "Inspect dispatch offer expiration rates",
      "Contact standby partners if necessary",
    ],
    responsible_team: "Operations Dispatch",
    icon: Zap,
    scope: [
      { label: "Accept rate", value: `${metrics.dispatchAcceptRate}%` },
      { label: "Total offers", value: metrics.dispatchTotalOffers },
    ],
    recovered: metrics.dispatchAcceptRate >= dispatchThreshold,
  });

  // 4. Escalation Surge
  incidents.push({
    incident_type: "escalation_surge",
    title: "Escalation Surge Detected",
    severity: metrics.escalationCount > MAX_ESCALATIONS_CHECKLIST * 2 ? "critical" : metrics.escalationCount > MAX_ESCALATIONS_CHECKLIST ? "warning" : "info",
    description: `${metrics.escalationCount} open escalations — possible partner shortage in zones.`,
    trigger_metric: "escalationCount",
    trigger_value: metrics.escalationCount,
    threshold: MAX_ESCALATIONS_CHECKLIST,
    steps: [
      "Inspect affected service zones",
      "Check partner coverage in zones",
      "Rebalance dispatch assignments",
      "Notify operations lead",
    ],
    responsible_team: "Marketplace Operations",
    icon: Users,
    scope: [{ label: "Open escalations", value: metrics.escalationCount }],
    recovered: metrics.escalationCount <= MAX_ESCALATIONS_CHECKLIST,
  });

  // 5. Service Delivery Delay
  incidents.push({
    incident_type: "service_delivery_delay",
    title: "Service Delivery Delay",
    severity: metrics.staleBookingCount > MAX_STALE_BOOKINGS_CHECKLIST * 3 ? "critical" : metrics.staleBookingCount > MAX_STALE_BOOKINGS_CHECKLIST ? "warning" : "info",
    description: `${metrics.staleBookingCount} bookings stalled in active workflow — service delivery delays possible.`,
    trigger_metric: "staleBookingCount",
    trigger_value: metrics.staleBookingCount,
    threshold: MAX_STALE_BOOKINGS_CHECKLIST,
    steps: [
      "Investigate stalled bookings",
      "Contact assigned partners",
      "Reassign jobs if necessary",
      "Notify affected customers if delay persists",
    ],
    responsible_team: "Service Operations",
    icon: Shield,
    scope: [
      { label: "Stale bookings", value: metrics.staleBookingCount },
      ...(metrics.staleZoneCount > 0 ? [{ label: "Zones affected", value: metrics.staleZoneCount }] : []),
    ],
    recovered: metrics.staleBookingCount <= MAX_STALE_BOOKINGS_CHECKLIST,
  });

  // Only return incidents that are actually triggered (above threshold)
  const active = incidents.filter(i => i.severity !== "info");

  // Sort: critical > warning
  const ORDER: Record<IncidentSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return active.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

// ── Check recovery hint for tracked incidents ──
function getRecoveryHint(incident: IncidentRecord, metrics: ReturnType<typeof useIncidentMetrics>["data"]): string | null {
  if (!metrics) return null;
  const type = incident.incident_type;
  if (type === "payment_gateway_instability" && metrics.paymentFailureCount <= MAX_PAYMENT_FAILURES_CHECKLIST)
    return "Payment failures returned below threshold — ready for operator review and possible resolution.";
  if (type === "automation_system_failure" && metrics.automationErrorCount < 2)
    return "Automation errors returned to zero — ready for operator review and possible resolution.";
  if (type === "dispatch_reliability_degradation" && metrics.dispatchAcceptRate >= 70)
    return "Dispatch acceptance rate recovered — ready for operator review and possible resolution.";
  if (type === "escalation_surge" && metrics.escalationCount <= MAX_ESCALATIONS_CHECKLIST)
    return "Escalation count returned below threshold — ready for operator review and possible resolution.";
  if (type === "service_delivery_delay" && metrics.staleBookingCount <= MAX_STALE_BOOKINGS_CHECKLIST)
    return "Stale bookings cleared — ready for operator review and possible resolution.";
  return null;
}

// ── Main Component ──
export default function IncidentPlaybooksPage() {
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics, dataUpdatedAt } = useIncidentMetrics();
  const { data: persisted, refetch: refetchPersisted } = usePersistedIncidents();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { track("incident_playbooks_viewed"); }, []);

  const detectedIncidents = metrics ? detectIncidents(metrics) : [];

  // Active/resolved from DB
  const activeIncidents = (persisted || []).filter(i => i.status !== "resolved");
  const resolvedIncidents = (persisted || []).filter(i => i.status === "resolved").slice(0, 10);

  // Deduplication: set of incident_types already tracked
  const openTypes = new Set(activeIncidents.map(i => i.incident_type));

  // Create incident with deduplication + scope + freshness
  const handleCreateIncident = useCallback(async (playbook: PlaybookDefinition) => {
    // Dedup check: if same type already open, just refresh last_detected_at
    if (openTypes.has(playbook.incident_type)) {
      const existing = activeIncidents.find(i => i.incident_type === playbook.incident_type);
      if (existing) {
        try {
          await supabase.from("incident_playbooks" as any)
            .update({
              last_detected_at: new Date().toISOString(),
              severity: playbook.severity,
              description: playbook.description,
              metadata: { scope: playbook.scope, trigger_value: playbook.trigger_value, threshold: playbook.threshold },
            })
            .eq("id", existing.id);
          refetchPersisted();
        } catch { /* silent */ }
      }
      return;
    }

    try {
      await supabase.from("incident_playbooks" as any).insert({
        incident_type: playbook.incident_type,
        severity: playbook.severity,
        description: playbook.description,
        trigger_metric: playbook.trigger_metric,
        recommended_steps: playbook.steps,
        responsible_team: playbook.responsible_team,
        status: "open",
        last_detected_at: new Date().toISOString(),
        metadata: { scope: playbook.scope, trigger_value: playbook.trigger_value, threshold: playbook.threshold },
      });
      refetchPersisted();
      track("incident_playbook_created", { type: playbook.incident_type });
    } catch { /* silent */ }
  }, [openTypes, activeIncidents, refetchPersisted]);

  // Update incident status
  const handleStatusUpdate = useCallback(async (id: string, newStatus: IncidentStatus) => {
    setUpdatingId(id);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();
      await supabase.from("incident_playbooks" as any).update(updates).eq("id", id);
      refetchPersisted();
      track("incident_status_updated", { id, status: newStatus });
    } catch { /* silent */ }
    setUpdatingId(null);
  }, [refetchPersisted]);

  const handleRefresh = useCallback(() => {
    refetchMetrics();
    refetchPersisted();
  }, [refetchMetrics, refetchPersisted]);

  const lastScanTime = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/ops/command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Command Center
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Scanned: {lastScanTime}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </div>

          {/* Hero */}
          <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Incident Playbooks</h1>
                  <p className="text-sm text-muted-foreground">Production-grade operational response system</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1 text-destructive">
                  <AlertOctagon className="w-3.5 h-3.5" /> {detectedIncidents.filter(i => i.severity === "critical").length} critical
                </span>
                <span className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="w-3.5 h-3.5" /> {detectedIncidents.filter(i => i.severity === "warning").length} warnings
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> {activeIncidents.length} tracked
                </span>
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {resolvedIncidents.length} resolved
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── DETECTED INCIDENTS ── */}
          {metricsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Scanning operational metrics…</p>
          ) : detectedIncidents.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-destructive" /> Detected Incidents
              </h2>
              <div className="space-y-2">
                {detectedIncidents.map(incident => {
                  const ss = SEVERITY_STYLES[incident.severity];
                  const Icon = incident.icon;
                  const alreadyTracked = openTypes.has(incident.incident_type);
                  return (
                    <Card key={incident.incident_type} className={`${ss.border} border ${ss.bg}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ss.text}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-sm font-semibold ${ss.text}`}>{incident.title}</span>
                              <Badge className={`text-[9px] ${ss.badge} border-none`}>{incident.severity.toUpperCase()}</Badge>
                              {incident.recovered && (
                                <Badge variant="outline" className="text-[9px] text-success border-success/30">Recovered</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>

                            {/* Affected Scope */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {incident.scope.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">
                                  <span className="text-muted-foreground">{s.label}:</span> <span className="font-medium">{s.value}</span>
                                </span>
                              ))}
                              <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                                Threshold: {incident.threshold}
                              </span>
                            </div>

                            {/* Recovery Hint */}
                            {incident.recovered && (
                              <div className="rounded-md bg-success/5 border border-success/15 p-2 mb-2">
                                <p className="text-[11px] text-success flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  Condition normalized — ready for operator review and possible resolution.
                                </p>
                              </div>
                            )}

                            <div className="bg-background/60 rounded-lg p-3 mb-2">
                              <p className="text-[10px] font-medium text-foreground mb-1.5">Response Playbook:</p>
                              <ol className="space-y-1">
                                {incident.steps.map((step, i) => (
                                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-foreground/50 font-mono text-[9px] mt-0.5">{i + 1}.</span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[10px] text-muted-foreground">Team: {incident.responsible_team}</span>
                              {alreadyTracked ? (
                                <Badge variant="outline" className="text-[9px] text-muted-foreground">Already tracked</Badge>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => handleCreateIncident(incident)}>
                                  <Shield className="w-3 h-3" /> Track Incident
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="mb-6 border-success/20 bg-success/5">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No Active Incidents</p>
                <p className="text-xs text-muted-foreground">All operational metrics are within safe thresholds.</p>
              </CardContent>
            </Card>
          )}

          {/* ── TRACKED INCIDENTS ── */}
          {activeIncidents.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Tracked Incidents ({activeIncidents.length})
              </h2>
              <div className="space-y-2">
                {activeIncidents.map(incident => {
                  const severity = (incident.severity as IncidentSeverity) || "warning";
                  const ss = SEVERITY_STYLES[severity];
                  const status = (incident.status as IncidentStatus) || "open";
                  const statusCfg = STATUS_STYLES[status];
                  const StatusIcon = statusCfg.icon;
                  const isExpanded = expandedId === incident.id;
                  const steps = Array.isArray(incident.recommended_steps) ? incident.recommended_steps : [];
                  const currentIdx = STATUS_TRANSITIONS.indexOf(status);
                  const nextStatus = currentIdx < STATUS_TRANSITIONS.length - 1 ? STATUS_TRANSITIONS[currentIdx + 1] : null;
                  const recoveryHint = getRecoveryHint(incident, metrics || null);
                  const scopeData: AffectedScope[] = incident.metadata?.scope || [];

                  return (
                    <Card key={incident.id} className={`${ss.border} border`}>
                      <CardContent className="p-3">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <StatusIcon className={`w-4 h-4 shrink-0 ${statusCfg.text}`} />
                            <span className="text-xs font-semibold text-foreground truncate">
                              {incident.incident_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                            <Badge className={`text-[9px] ${ss.badge} border-none`}>{severity.toUpperCase()}</Badge>
                            <Badge variant="outline" className={`text-[9px] ${statusCfg.text}`}>{statusCfg.label}</Badge>
                            {recoveryHint && <Badge variant="outline" className="text-[9px] text-success border-success/30">Recovered</Badge>}
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>

                            {/* Affected Scope */}
                            {scopeData.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {scopeData.map((s, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">
                                    <span className="text-muted-foreground">{s.label}:</span> <span className="font-medium">{String(s.value)}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Recovery Hint */}
                            {recoveryHint && (
                              <div className="rounded-md bg-success/5 border border-success/15 p-2 mb-2">
                                <p className="text-[11px] text-success flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  {recoveryHint}
                                </p>
                              </div>
                            )}

                            {steps.length > 0 && (
                              <div className="bg-background/60 rounded-lg p-3 mb-3">
                                <p className="text-[10px] font-medium text-foreground mb-1.5">Response Steps:</p>
                                <ol className="space-y-1">
                                  {steps.map((step, i) => (
                                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-foreground/50 font-mono text-[9px] mt-0.5">{i + 1}.</span>
                                      {String(step)}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="text-[10px] text-muted-foreground space-x-3">
                                <span>Team: {incident.responsible_team}</span>
                                <span>Created: {new Date(incident.created_at).toLocaleString("en-LK", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                                {incident.last_detected_at && (
                                  <span>Last detected: {timeAgo(incident.last_detected_at)}</span>
                                )}
                              </div>
                              {nextStatus && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1"
                                  disabled={updatingId === incident.id}
                                  onClick={(e) => { e.stopPropagation(); handleStatusUpdate(incident.id, nextStatus); }}
                                >
                                  {updatingId === incident.id ? "Updating…" : `→ ${STATUS_STYLES[nextStatus].label}`}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RESOLVED INCIDENTS ── */}
          {resolvedIncidents.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" /> Recently Resolved ({resolvedIncidents.length})
              </h2>
              <div className="space-y-1.5">
                {resolvedIncidents.map(incident => (
                  <div key={incident.id} className="flex items-center justify-between rounded-lg border border-success/10 bg-success/5 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="text-xs text-foreground truncate">{incident.incident_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {incident.resolved_at ? new Date(incident.resolved_at).toLocaleString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
