/**
 * OperatorReminderPanel — Shows reminder intelligence for ops screens.
 * Informational only — does not auto-change dispatch state.
 */

import { Bell, Clock, AlertTriangle, Phone, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { computeReminderStates, type ReminderContext } from "@/lib/bookingReminderState";

interface OperatorReminderPanelProps {
  stage: string;
  stageEnteredAt: string;
  lastSentTimes?: Record<string, string>;
  sendCounts?: Record<string, number>;
  activeConditions?: string[];
}

export default function OperatorReminderPanel({
  stage,
  stageEnteredAt,
  lastSentTimes,
  sendCounts,
  activeConditions,
}: OperatorReminderPanelProps) {
  const ctx: ReminderContext = {
    stage,
    stageEnteredAt,
    lastSentTimes,
    sendCounts,
    activeConditions,
  };

  const states = computeReminderStates(ctx);
  if (!states.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">Reminder Status</span>
        <Badge variant="outline" className="text-[9px] ml-auto">Advisory</Badge>
      </div>

      <div className="space-y-2">
        {states.map((s) => (
          <div
            key={s.ruleKey}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
              s.overdue
                ? "bg-amber-500/5 border-amber-500/20"
                : s.eligible
                ? "bg-primary/5 border-primary/15"
                : s.suppressed
                ? "bg-muted/50 border-border/40"
                : "bg-muted/30 border-border/30"
            }`}
          >
            <div className="mt-0.5">
              {s.overdue ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : s.eligible ? (
                <Bell className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{s.title}</span>
                <Badge
                  variant="outline"
                  className={`text-[8px] ${
                    s.overdue ? "text-amber-600 border-amber-500/30" :
                    s.eligible ? "text-primary border-primary/30" :
                    s.suppressed ? "text-muted-foreground" :
                    "text-muted-foreground"
                  }`}
                >
                  {s.overdue ? "Overdue" : s.eligible ? "Ready" : s.suppressed ? "Suppressed" : "Waiting"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{s.reason}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80">
                <span>Sent: {s.sendCount}×</span>
                <span>For: {s.audience}</span>
                {s.escalationRecommended && (
                  <span className="text-amber-600 font-medium">⚠ Escalation recommended</span>
                )}
              </div>
              {s.escalationRecommended && (
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] text-amber-600 font-medium">Consider calling customer</span>
                  <MessageCircle className="w-3 h-3 text-amber-600 ml-2" />
                  <span className="text-[10px] text-amber-600 font-medium">or WhatsApp</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
