/**
 * Phase 6+7 — Compact reliability alerts panel for ops pages.
 * Shows consultation backlog, stuck jobs, settlement exceptions,
 * escalation backlog, bypass attempts, cron health, and system incidents.
 */
import { useOpsReliability } from "@/hooks/useOpsReliability";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle, Clock, DollarSign, Shield, Bell, HeartPulse, Zap,
} from "lucide-react";

interface Props {
  /** Show detail rows or just summary counts */
  detailed?: boolean;
}

export default function OpsReliabilityAlerts({ detailed = false }: Props) {
  const { data, isLoading } = useOpsReliability();

  if (isLoading || !data) return null;

  const alerts = [
    {
      label: "Consultation Backlog",
      count: data.consultationBacklog,
      icon: Bell,
      color: data.consultationBacklog > 0 ? "text-amber-600" : "text-muted-foreground",
      bgColor: data.consultationBacklog > 0 ? "bg-amber-500/10" : "bg-muted/30",
      isAlert: data.alerts.consultationBacklogAlert,
    },
    {
      label: "Stuck Jobs (>30m)",
      count: data.stuckJobs,
      icon: Clock,
      color: data.stuckJobs > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: data.stuckJobs > 0 ? "bg-destructive/10" : "bg-muted/30",
      isAlert: data.alerts.stuckJobAlert,
    },
    {
      label: "Missing Settlements",
      count: data.settlementExceptions,
      icon: DollarSign,
      color: data.settlementExceptions > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: data.settlementExceptions > 0 ? "bg-destructive/10" : "bg-muted/30",
      isAlert: data.alerts.settlementAlert,
    },
    {
      label: "Open Escalations",
      count: data.unresolvedEscalations,
      icon: AlertTriangle,
      color: data.unresolvedEscalations > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: data.unresolvedEscalations > 0 ? "bg-destructive/10" : "bg-muted/30",
      isAlert: data.alerts.escalationAlert,
    },
    {
      label: "Bypass Attempts",
      count: data.bypassAttemptsToday,
      icon: Shield,
      color: data.bypassAttemptsToday > 0 ? "text-warning" : "text-muted-foreground",
      bgColor: data.bypassAttemptsToday > 0 ? "bg-warning/10" : "bg-muted/30",
      isAlert: false,
    },
    {
      label: "System Incidents (24h)",
      count: data.recentIncidentsCount,
      icon: Zap,
      color: data.recentIncidentsCount > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: data.recentIncidentsCount > 0 ? "bg-destructive/10" : "bg-muted/30",
      isAlert: data.recentIncidentsCount > 0,
    },
  ];

  const hasAnyAlert = alerts.some((a) => a.count > 0) || !data.retentionCronHealthy || !data.watchdogCronHealthy;

  if (!hasAnyAlert && !detailed) return null;

  const timeSince = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
  };

  return (
    <Card className={hasAnyAlert ? "border-destructive/30 bg-destructive/5" : ""}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <HeartPulse className="w-4 h-4 text-destructive" />
          <span className="text-xs font-semibold text-foreground">Launch Reliability</span>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-1.5">
          {alerts.map((a) => (
            <div key={a.label} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${a.bgColor} ${a.color} ${a.isAlert ? "ring-1 ring-destructive/30" : ""}`}>
              <a.icon className="w-3 h-3" />
              <span>{a.label}: {a.count}</span>
            </div>
          ))}
          {!data.retentionCronHealthy && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-warning/10 text-warning ring-1 ring-warning/30">
              <Clock className="w-3 h-3" />
              <span>Retention cron: no reminders today</span>
            </div>
          )}
          {!data.watchdogCronHealthy && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-destructive/10 text-destructive ring-1 ring-destructive/30">
              <AlertTriangle className="w-3 h-3" />
              <span>Watchdog cron: no recovery activity</span>
            </div>
          )}
        </div>

        {/* Detail rows */}
        {detailed && data.consultationBacklog > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-semibold text-foreground mb-1">
              Consultation Queue
              {data.alerts.consultationBacklogAlert && (
                <Badge variant="destructive" className="text-[8px] h-3 ml-1">ALERT: &gt;5</Badge>
              )}
            </p>
            {data.consultationBookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-[10px] py-0.5">
                <span className="font-mono text-muted-foreground">{b.id.slice(0, 8)}</span>
                <span>{b.category_code}</span>
                <Badge variant="outline" className="text-[9px] h-4">{timeSince(b.created_at)} ago</Badge>
              </div>
            ))}
          </div>
        )}

        {detailed && data.stuckJobs > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-semibold text-foreground mb-1">Stuck Jobs</p>
            {data.stuckBookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-[10px] py-0.5">
                <span className="font-mono text-muted-foreground">{b.id.slice(0, 8)}</span>
                <span>{b.category_code} • {b.status.replace(/_/g, " ")}</span>
                <Badge variant="destructive" className="text-[9px] h-4">{b.minutes_age}m</Badge>
              </div>
            ))}
          </div>
        )}

        {detailed && data.settlementExceptions > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-semibold text-foreground mb-1">Missing Settlements</p>
            {data.missingSettlements.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-[10px] py-0.5">
                <span className="font-mono text-muted-foreground">{b.id.slice(0, 8)}</span>
                <span>{b.category_code}</span>
                <span className="text-destructive">No settlement</span>
              </div>
            ))}
          </div>
        )}

        {/* Phase 7: System incidents detail */}
        {detailed && data.recentIncidentsCount > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-semibold text-foreground mb-1">Recent Incidents</p>
            {data.recentIncidents.slice(0, 5).map((inc) => (
              <div key={inc.id} className="flex items-center justify-between text-[10px] py-0.5 gap-1">
                <Badge
                  variant={inc.severity === "critical" ? "destructive" : "outline"}
                  className="text-[8px] h-3 shrink-0"
                >
                  {inc.severity}
                </Badge>
                <span className="truncate flex-1">{inc.incident_type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground shrink-0">{timeSince(inc.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
