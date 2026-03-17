/**
 * ReminderDeliveryHistoryPanel — Per-booking delivery history for operators.
 */

import { Clock, CheckCircle2, XCircle, Shield, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { fetchBookingDeliveryHistory } from "@/services/slaBreachReadModel";
import { fetchBookingCallbackTasks } from "@/services/reminderOpsReadModel";

const OUTCOME_STYLES: Record<string, { icon: React.ElementType; color: string }> = {
  sent: { icon: CheckCircle2, color: "text-success" },
  failed: { icon: XCircle, color: "text-destructive" },
  suppressed: { icon: Shield, color: "text-muted-foreground" },
  pending: { icon: Clock, color: "text-primary" },
};

interface Props {
  bookingId: string;
}

export default function ReminderDeliveryHistoryPanel({ bookingId }: Props) {
  const { data: logs = [] } = useQuery({
    queryKey: ["delivery-history", bookingId],
    queryFn: () => fetchBookingDeliveryHistory(bookingId),
    enabled: !!bookingId,
  });

  const { data: callbackTasks = [] } = useQuery({
    queryKey: ["callback-tasks-booking", bookingId],
    queryFn: () => fetchBookingCallbackTasks(bookingId),
    enabled: !!bookingId,
  });

  if (!logs.length && !callbackTasks.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">Delivery History</span>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {logs.map((log: any) => {
          const style = OUTCOME_STYLES[log.outcome] || OUTCOME_STYLES.pending;
          const Icon = style.icon;
          return (
            <div key={log.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-border/30 last:border-0">
              <Icon className={`w-3 h-3 shrink-0 ${style.color}`} />
              <span className="font-medium text-foreground">{log.reminder_key}</span>
              <Badge variant="outline" className="text-[8px]">{log.channel}</Badge>
              <span className="text-muted-foreground ml-auto">{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          );
        })}
        {callbackTasks.map((task: any) => (
          <div key={task.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-border/30 last:border-0">
            <Clock className="w-3 h-3 shrink-0 text-primary" />
            <span className="font-medium text-foreground">Callback: {task.task_type}</span>
            <Badge variant="outline" className={`text-[8px] ${task.status === "completed" ? "text-success" : "text-primary"}`}>{task.status}</Badge>
            <span className="text-muted-foreground ml-auto">{new Date(task.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
