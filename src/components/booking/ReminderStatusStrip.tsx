/**
 * ReminderStatusStrip — Compact inline reminder indicator.
 * Shows what's pending and who's handling it.
 */

import { Bell, Clock, CheckCircle2 } from "lucide-react";

interface ReminderStatusStripProps {
  title: string;
  /** Whether LankaFix team is actively following up */
  teamActive?: boolean;
  /** Time remaining or status label */
  statusLabel?: string;
  variant?: "default" | "warning" | "success";
}

export default function ReminderStatusStrip({
  title,
  teamActive = false,
  statusLabel,
  variant = "default",
}: ReminderStatusStripProps) {
  const colors = {
    default: "bg-primary/5 border-primary/15 text-primary",
    warning: "bg-amber-500/5 border-amber-500/15 text-amber-600",
    success: "bg-success/5 border-success/15 text-success",
  };

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs ${colors[variant]}`}>
      <Bell className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium flex-1">{title}</span>
      {teamActive && (
        <span className="flex items-center gap-1 text-success text-[10px]">
          <CheckCircle2 className="w-3 h-3" /> Team active
        </span>
      )}
      {statusLabel && !teamActive && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" /> {statusLabel}
        </span>
      )}
    </div>
  );
}
