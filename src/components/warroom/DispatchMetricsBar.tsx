import { Card, CardContent } from "@/components/ui/card";
import {
  Activity, Clock, Users, Zap, AlertTriangle, CheckCircle2,
  Radio, UserCheck, UserX, Wifi
} from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

const MetricCard = ({ label, value, icon, variant = "default" }: MetricCardProps) => {
  const borderMap = {
    default: "border-border",
    success: "border-emerald-500/30",
    warning: "border-amber-500/30",
    danger: "border-destructive/30",
  };
  const textMap = {
    default: "text-foreground",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-destructive",
  };

  return (
    <Card className={`${borderMap[variant]} border`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`${textMap[variant]} shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-xl font-bold font-heading ${textMap[variant]}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface DispatchMetricsBarProps {
  activeDispatch: number;
  awaitingAcceptance: number;
  parallelRaces: number;
  multiTechJobs: number;
  escalated: number;
  avgDispatchTimeSec: number;
  successRate: number;
  activeTechnicians: number;
  availableTechnicians: number;
  busyTechnicians: number;
  offlineTechnicians: number;
}

export default function DispatchMetricsBar(props: DispatchMetricsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2">
      <MetricCard label="Active Dispatch" value={props.activeDispatch} icon={<Activity size={18} />} />
      <MetricCard label="Awaiting Accept" value={props.awaitingAcceptance} icon={<Clock size={18} />} variant={props.awaitingAcceptance > 5 ? "warning" : "default"} />
      <MetricCard label="Parallel Races" value={props.parallelRaces} icon={<Zap size={18} />} />
      <MetricCard label="Multi-Tech" value={props.multiTechJobs} icon={<Users size={18} />} />
      <MetricCard label="Escalated" value={props.escalated} icon={<AlertTriangle size={18} />} variant={props.escalated > 0 ? "danger" : "default"} />
      <MetricCard label="Avg Dispatch" value={`${props.avgDispatchTimeSec}s`} icon={<Clock size={18} />} variant={props.avgDispatchTimeSec > 60 ? "warning" : "default"} />
      <MetricCard label="Success Rate" value={`${props.successRate}%`} icon={<CheckCircle2 size={18} />} variant={props.successRate < 80 ? "danger" : props.successRate < 90 ? "warning" : "success"} />
      <MetricCard label="Active Techs" value={props.activeTechnicians} icon={<Radio size={18} />} />
      <MetricCard label="Available" value={props.availableTechnicians} icon={<UserCheck size={18} />} variant="success" />
      <MetricCard label="Busy" value={props.busyTechnicians} icon={<Wifi size={18} />} variant="warning" />
      <MetricCard label="Offline" value={props.offlineTechnicians} icon={<UserX size={18} />} variant={props.offlineTechnicians > props.availableTechnicians ? "danger" : "default"} />
    </div>
  );
}
