/**
 * CustomerNotificationHistoryCard — Shows communication history to customer.
 * Informational only. Premium, calm UI. Shows trust messaging when team is following up.
 */

import { Bell, CheckCircle2, Clock, Headphones, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getNotificationTemplate } from "@/lib/customerNotificationTemplates";

interface Props {
  bookingId: string;
}

interface LogEntry {
  id: string;
  reminder_key: string;
  outcome: string;
  channel: string;
  created_at: string;
}

export default function CustomerNotificationHistoryCard({ bookingId }: Props) {
  const { data: logs } = useQuery({
    queryKey: ["customer-notif-history", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reminder_send_logs" as any)
        .select("id, reminder_key, outcome, channel, created_at")
        .eq("booking_id", bookingId)
        .eq("outcome", "sent")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as unknown as LogEntry[]) || [];
    },
    staleTime: 30_000,
  });

  const { data: activeCallbacks } = useQuery({
    queryKey: ["customer-callback-status", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("operator_callback_tasks" as any)
        .select("id, status, task_type")
        .eq("booking_id", bookingId)
        .in("status", ["open", "in_progress"])
        .limit(5);
      return (data || []) as any[];
    },
    staleTime: 30_000,
  });

  const hasActiveCallback = (activeCallbacks?.length || 0) > 0;
  const callbackInProgress = activeCallbacks?.some((t: any) => t.status === "in_progress");

  if (!logs?.length && !hasActiveCallback) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-bold text-foreground">Updates Sent to You</span>
        {(logs?.length || 0) > 0 && <Badge variant="outline" className="text-[9px] ml-auto">{logs!.length}</Badge>}
      </div>

      {/* Trust messaging — team follow-up visibility */}
      {callbackInProgress && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">Our team is personally following up</p>
            <p className="text-[10px] text-muted-foreground">A LankaFix team member is actively working on your case</p>
          </div>
        </div>
      )}
      {hasActiveCallback && !callbackInProgress && (
        <div className="bg-muted/40 border border-border/40 rounded-xl px-3 py-2 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">Follow-up scheduled</p>
            <p className="text-[10px] text-muted-foreground">Our team will reach out to you shortly</p>
          </div>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="space-y-2">
          {logs.slice(0, 5).map((log) => {
            const template = getNotificationTemplate(log.reminder_key);
            return (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {template?.title || log.reminder_key.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        We keep you updated at every step. Need help? Our team is always available.
      </p>
    </div>
  );
}
