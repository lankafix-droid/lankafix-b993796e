/**
 * ServiceabilityBadge — Shows Phase-1 coverage status for an address.
 */
import { MapPin, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface Props {
  status: "inside" | "edge" | "outside" | null;
  compact?: boolean;
}

export default function ServiceabilityBadge({ status, compact }: Props) {
  if (!status) return null;

  const config = {
    inside: {
      label: "Phase-1 Covered",
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    edge: {
      label: "Extended Zone",
      icon: Clock,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    outside: {
      label: "Outside Launch Zone",
      icon: AlertTriangle,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  }[status];

  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium ${config.className}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{config.label}</span>
    </div>
  );
}
