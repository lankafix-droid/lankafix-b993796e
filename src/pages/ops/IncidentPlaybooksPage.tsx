/**
 * LankaFix Incident Playbook Engine
 * Detects operational incidents from existing metrics and generates guided response procedures.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Shield, AlertTriangle, AlertOctagon, ArrowLeft, RefreshCw,
  CheckCircle2, Clock, Info, CreditCard, Activity, Zap, Users,
  ChevronDown, ChevronUp, BookOpen,
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

interface PlaybookDefinition {
  incident_type: string;
  title: string;
  severity: IncidentSeverity;
  description: string;
  trigger_metric: string;
  steps: string[];
  responsible_team: string;
  icon: React.ElementType;
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

// ── Metrics hook (lightweight, reuses same tables as Launch Command Center) ──
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
        supabase.from("bookings").select("id").in("status", ["assigned", "tech_en_route"]).lt("updated_at", staleThreshold).neq("booking_source", "pilot_simulation"),
      ]);

      const extract = (idx: number): any[] => {
        const r = results[idx];
        return r.status === "fulfilled" ? (r.value as any)?.data || [] : [];
      };

      const dispatchTotal = extract(3).length;
      const dispatchAccepted = extract(2).length;

      return {
        paymentFailureCount: extract(0).length,
        automationErrorCount: extract(1).length,
        dispatchAcceptRate: dispatchTotal > 0 ? Math.round((dispatchAccepted / dispatchTotal) * 100) : 100,
        escalationCount: extract(4).length,
        staleBookingCount: extract(5).length,
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

// ── Incident detection engine ──
function detectIncidents(metrics: {
  paymentFailureCount: number;
  automationErrorCount: number;
  dispatchAcceptRate: number;
  escalationCount: number;
  staleBookingCount: number;
}): PlaybookDefinition[] {
  const incidents: PlaybookDefinition[] = [];

  if (metrics.paymentFailureCount > MAX_PAYMENT_FAILURES_CHECKLIST) {
    incidents.push({
      incident_type: "payment_gateway_instability",
      title: "Payment Gateway Instability",
      severity: metrics.paymentFailureCount > MAX_PAYMENT_FAILURES_CHECKLIST * 2 ? "critical" : "warning",
      description: `${metrics.paymentFailureCount} payment failures detected today — possible gateway instability.`,
      trigger_metric: "paymentFailureCount",
      steps: [
        "Check payment gateway status dashboard",
        "Verify webhook delivery and processing",
        "Inspect payment retry queue",
        "Notify finance operations team if instability persists",
      ],
      responsible_team: "Finance Operations",
      icon: CreditCard,
    });
  }

  if (metrics.automationErrorCount >= 2) {
    incidents.push({
      incident_type: "automation_system_failure",
      title: "Automation System Failure",
      severity: metrics.automationErrorCount >= 5 ? "critical" : "warning",
      description: `${metrics.automationErrorCount} automation errors in the last ${AUTOMATION_MONITOR_WINDOW_MINUTES} minutes.`,
      trigger_metric: "automationErrorCount",
      steps: [
        "Review automation event logs",
        "Inspect failed background workers",
        "Restart automation workers if necessary",
        "Escalate to platform engineering if unresolved",
      ],
      responsible_team: "Platform Engineering",
      icon: Activity,
    });
  }

  if (metrics.dispatchAcceptRate < 70) {
    incidents.push({
      incident_type: "dispatch_reliability_degradation",
      title: "Dispatch Reliability Degradation",
      severity: metrics.dispatchAcceptRate < 50 ? "critical" : "warning",
      description: `Partner acceptance rate at ${metrics.dispatchAcceptRate}% — partners may not be responding to offers.`,
      trigger_metric: "dispatchAcceptRate",
      steps: [
        "Verify partner availability status",
        "Check push notification delivery",
        "Inspect dispatch offer expiration rates",
        "Contact standby partners if necessary",
      ],
      responsible_team: "Operations Dispatch",
      icon: Zap,
    });
  }

  if (metrics.escalationCount > MAX_ESCALATIONS_CHECKLIST) {
    incidents.push({
      incident_type: "escalation_surge",
      title: "Escalation Surge Detected",
      severity: metrics.escalationCount > MAX_ESCALATIONS_CHECKLIST * 2 ? "critical" : "warning",
      description: `${metrics.escalationCount} open escalations — possible partner shortage in zones.`,
      trigger_metric: "escalationCount",
      steps: [
        "Inspect affected service zones",
        "Check partner coverage in zones",
        "Rebalance dispatch assignments",
        "Notify operations lead",
      ],
      responsible_team: "Marketplace Operations",
      icon: Users,
    });
  }

  if (metrics.staleBookingCount > MAX_STALE_BOOKINGS_CHECKLIST) {
    incidents.push({
      incident_type: "service_delivery_delay",
      title: "Service Delivery Delay",
      severity: metrics.staleBookingCount > MAX_STALE_BOOKINGS_CHECKLIST * 3 ? "critical" : "warning",
      description: `${metrics.staleBookingCount} bookings stalled in active workflow — service delivery delays possible.`,
      trigger_metric: "staleBookingCount",
      steps: [
        "Investigate stalled bookings",
        "Contact assigned partners",
        "Reassign jobs if necessary",
        "Notify affected customers if delay persists",
      ],
      responsible_team: "Service Operations",
      icon: Shield,
    });
  }

  // Sort: critical > warning > info
  const ORDER: Record<IncidentSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return incidents.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

// ── Main Component ──
export default function IncidentPlaybooksPage() {
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useIncidentMetrics();
  const { data: persisted, refetch: refetchPersisted } = usePersistedIncidents();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { track("incident_playbooks_viewed"); }, []);

  const detectedIncidents = metrics ? detectIncidents(metrics) : [];

  // Create a new incident record from a detected playbook
  const handleCreateIncident = useCallback(async (playbook: PlaybookDefinition) => {
    try {
      await supabase.from("incident_playbooks" as any).insert({
        incident_type: playbook.incident_type,
        severity: playbook.severity,
        description: playbook.description,
        trigger_metric: playbook.trigger_metric,
        recommended_steps: playbook.steps,
        responsible_team: playbook.responsible_team,
        status: "open",
      });
      refetchPersisted();
      track("incident_playbook_created", { type: playbook.incident_type });
    } catch { /* silent */ }
  }, [refetchPersisted]);

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

  // Separate active vs resolved persisted incidents
  const activeIncidents = (persisted || []).filter(i => i.status !== "resolved");
  const resolvedIncidents = (persisted || []).filter(i => i.status === "resolved").slice(0, 10);

  // Check which detected incidents already have an open record
  const openTypes = new Set(activeIncidents.map(i => i.incident_type));

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
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
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
                  <p className="text-sm text-muted-foreground">Automated operational response procedures</p>
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
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-semibold ${ss.text}`}>{incident.title}</span>
                              <Badge className={`text-[9px] ${ss.badge} border-none`}>{incident.severity.toUpperCase()}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>
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
                            <div className="flex items-center justify-between">
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

                  return (
                    <Card key={incident.id} className={`${ss.border} border`}>
                      <CardContent className="p-3">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusIcon className={`w-4 h-4 shrink-0 ${statusCfg.text}`} />
                            <span className="text-xs font-semibold text-foreground truncate">{incident.incident_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                            <Badge className={`text-[9px] ${ss.badge} border-none`}>{severity.toUpperCase()}</Badge>
                            <Badge variant="outline" className={`text-[9px] ${statusCfg.text}`}>{statusCfg.label}</Badge>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>
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
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] text-muted-foreground">
                                <span>Team: {incident.responsible_team}</span>
                                <span className="ml-3">Created: {new Date(incident.created_at).toLocaleString("en-LK", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
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
