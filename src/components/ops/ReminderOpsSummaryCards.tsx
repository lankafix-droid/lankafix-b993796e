/**
 * ReminderOpsSummaryCards — Quick metrics for reminder/callback ops.
 */

import { Bell, CheckCircle2, XCircle, Shield, Phone, AlertTriangle, Clock, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchReminderOpsSummary } from "@/services/reminderOpsReadModel";
import { fetchSLABreaches, fetchTodayReminderMetrics, fetchReminderEscalationSummary } from "@/services/slaBreachReadModel";
import { fetchOverdueCallbackTasks } from "@/services/reminderOpsReadModel";

function MetricCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border/60 p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent || "text-muted-foreground"}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold ${accent || "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default function ReminderOpsSummaryCards() {
  const { data: jobSummary } = useQuery({ queryKey: ["reminder-ops-summary"], queryFn: fetchReminderOpsSummary, refetchInterval: 15_000 });
  const { data: todayMetrics } = useQuery({ queryKey: ["reminder-today-metrics"], queryFn: fetchTodayReminderMetrics, refetchInterval: 15_000 });
  const { data: breaches = [] } = useQuery({ queryKey: ["sla-breaches-count"], queryFn: fetchSLABreaches, refetchInterval: 20_000 });
  const { data: overdue = [] } = useQuery({ queryKey: ["overdue-callback-count"], queryFn: fetchOverdueCallbackTasks, refetchInterval: 15_000 });
  const { data: escalations } = useQuery({ queryKey: ["reminder-escalation-summary"], queryFn: fetchReminderEscalationSummary, refetchInterval: 20_000 });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MetricCard icon={Clock} label="Pending Jobs" value={jobSummary?.pending || 0} />
      <MetricCard icon={CheckCircle2} label="Sent Today" value={todayMetrics?.sentToday || 0} accent="text-success" />
      <MetricCard icon={XCircle} label="Failed Today" value={todayMetrics?.failedToday || 0} accent="text-destructive" />
      <MetricCard icon={Shield} label="Suppressed Today" value={todayMetrics?.suppressedToday || 0} />
      <MetricCard icon={Phone} label="Open Callbacks" value={escalations?.open || 0} accent="text-primary" />
      <MetricCard icon={AlertTriangle} label="Overdue Tasks" value={overdue.length} accent="text-destructive" />
      <MetricCard icon={Zap} label="SLA Breaches" value={breaches.length} accent="text-amber-600" />
      <MetricCard icon={Bell} label="Escalations" value={escalations?.total || 0} />
    </div>
  );
}
