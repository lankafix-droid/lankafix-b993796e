/**
 * CallbackExecutionQueue — Full operator action center for callback tasks.
 * Manual controls: start, complete, snooze, escalate.
 */

import { useState } from "react";
import { Phone, MessageCircle, Clock, AlertTriangle, CheckCircle2, Play, Pause, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllOpenTasks } from "@/services/operatorTaskFactory";
import {
  startCallbackTask,
  completeCallbackTask,
  snoozeCallbackTask,
  escalateCallbackTask,
} from "@/services/operatorCallbackActionService";
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

const FILTER_TABS = ["all", "urgent", "overdue", "in_progress"] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function CallbackExecutionQueue() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["callback-execution-queue"],
    queryFn: () => fetchAllOpenTasks(50),
    refetchInterval: 8_000,
  });

  const now = new Date();
  const filtered = tasks.filter((t) => {
    if (filter === "urgent") return t.priority === "urgent" || t.priority === "high";
    if (filter === "overdue") return t.due_at && new Date(t.due_at) < now;
    if (filter === "in_progress") return t.status === "in_progress";
    return true;
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["callback-execution-queue"] });

  const handleStart = async (id: string) => { await startCallbackTask(id); invalidate(); };
  const handleComplete = async (id: string) => { await completeCallbackTask(id, "Completed by operator"); invalidate(); };
  const handleSnooze = async (id: string) => { await snoozeCallbackTask(id, 30, "Snoozed 30min by operator"); invalidate(); };
  const handleEscalate = async (id: string) => { await escalateCallbackTask(id, "Escalated by operator"); invalidate(); };

  const overdue = tasks.filter(t => t.due_at && new Date(t.due_at) < now);

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">Callback Execution Queue</span>
        <Badge variant="outline" className="text-[9px] ml-auto">{tasks.length} open</Badge>
      </div>

      {overdue.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive font-medium">
          <AlertTriangle className="w-3 h-3" /> {overdue.length} overdue
        </div>
      )}

      <div className="flex gap-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-medium transition-colors ${filter === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            {tab === "all" ? "All" : tab === "urgent" ? "Urgent" : tab === "overdue" ? "Overdue" : "Active"}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">No tasks match filter</p>
        )}
        {filtered.map((task) => {
          const Icon = TASK_ICONS[task.task_type] || Clock;
          const isOverdue = task.due_at && new Date(task.due_at) < now;
          const isActive = task.status === "in_progress";
          return (
            <div
              key={task.id}
              className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                isOverdue ? "bg-destructive/5 border-destructive/20" : isActive ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
                <span className="font-semibold text-foreground truncate flex-1">{task.title}</span>
                <Badge variant="outline" className={`text-[8px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
              </div>
              {task.reason && <p className="text-muted-foreground text-[10px]">{task.reason}</p>}
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span>{task.booking_id?.slice(0, 8).toUpperCase()}</span>
                {task.due_at && <span>• Due {new Date(task.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
              </div>
              <div className="flex gap-1 pt-0.5">
                {task.status === "open" && (
                  <Button variant="outline" size="sm" className="h-5 text-[9px] px-2" onClick={() => handleStart(task.id)}>
                    <Play className="w-2.5 h-2.5 mr-0.5" /> Start
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-5 text-[9px] px-2 text-success hover:text-success" onClick={() => handleComplete(task.id)}>
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Done
                </Button>
                <Button variant="outline" size="sm" className="h-5 text-[9px] px-2" onClick={() => handleSnooze(task.id)}>
                  <Pause className="w-2.5 h-2.5 mr-0.5" /> Snooze
                </Button>
                <Button variant="outline" size="sm" className="h-5 text-[9px] px-2 text-destructive hover:text-destructive" onClick={() => handleEscalate(task.id)}>
                  <ChevronUp className="w-2.5 h-2.5 mr-0.5" /> Escalate
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
