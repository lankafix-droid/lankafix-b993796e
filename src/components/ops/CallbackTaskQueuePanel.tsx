/**
 * CallbackTaskQueuePanel — Shows open operator callback tasks.
 * For DispatchWarRoomPage right sidebar.
 */

import { Phone, MessageCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllOpenTasks, completeTask } from "@/services/operatorTaskFactory";
import type { OperatorCallbackTask } from "@/types/reminderJobs";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  normal: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

const TASK_ICONS: Record<string, React.ElementType> = {
  call_customer: Phone,
  whatsapp_customer: MessageCircle,
  follow_up_technician: Clock,
  verify_quote_delay: AlertTriangle,
  confirm_completion_issue: AlertTriangle,
  senior_review_required: AlertTriangle,
  dispute_follow_up: AlertTriangle,
};

export default function CallbackTaskQueuePanel() {
  const queryClient = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: ["callback-task-queue"],
    queryFn: () => fetchAllOpenTasks(20),
    refetchInterval: 10_000,
  });

  const handleComplete = async (taskId: string) => {
    await completeTask(taskId, "Completed by operator");
    queryClient.invalidateQueries({ queryKey: ["callback-task-queue"] });
  };

  if (!tasks?.length) return null;

  const overdue = tasks.filter(t => t.due_at && new Date(t.due_at) < new Date());
  const urgent = tasks.filter(t => t.priority === "urgent" || t.priority === "high");

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">Callback Tasks</span>
        <Badge variant="outline" className="text-[9px] ml-auto">
          {tasks.length} open
        </Badge>
      </div>

      {overdue.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive font-medium">
          <AlertTriangle className="w-3 h-3" />
          {overdue.length} overdue task{overdue.length > 1 ? "s" : ""}
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tasks.map((task) => {
          const Icon = TASK_ICONS[task.task_type] || Clock;
          const isOverdue = task.due_at && new Date(task.due_at) < new Date();
          return (
            <div
              key={task.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
                isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border/40"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground truncate">{task.title}</span>
                  <Badge variant="outline" className={`text-[8px] ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </Badge>
                </div>
                {task.reason && (
                  <p className="text-muted-foreground text-[10px] leading-relaxed">{task.reason}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">
                    {task.booking_id.slice(0, 8).toUpperCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[9px] px-2 text-success hover:text-success"
                    onClick={() => handleComplete(task.id)}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
