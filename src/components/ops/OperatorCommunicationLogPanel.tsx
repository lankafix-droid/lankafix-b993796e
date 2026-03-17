/**
 * OperatorCommunicationLogPanel — Shows reminder/communication history for operators.
 * Informational only. Does not trigger actions.
 */

import { Bell, CheckCircle2, XCircle, Clock, AlertTriangle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  bookingId: string;
}

interface JobRow {
  id: string;
  reminder_key: string;
  audience: string;
  channel: string;
  status: string;
  send_count: number;
  suppression_reason: string | null;
  created_at: string;
  sent_at: string | null;
}

export default function OperatorCommunicationLogPanel({ bookingId }: Props) {
  const { data: jobs } = useQuery({
    queryKey: ["ops-comm-log", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reminder_jobs" as any)
        .select("id, reminder_key, audience, channel, status, send_count, suppression_reason, created_at, sent_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as unknown as JobRow[]) || [];
    },
    staleTime: 15_000,
  });

  if (!jobs?.length) return null;

  const sent = jobs.filter(j => j.status === "sent").length;
  const failed = jobs.filter(j => j.status === "failed").length;
  const suppressed = jobs.filter(j => j.status === "suppressed").length;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "sent") return <CheckCircle2 className="w-3 h-3 text-success" />;
    if (status === "failed") return <XCircle className="w-3 h-3 text-destructive" />;
    if (status === "suppressed") return <Ban className="w-3 h-3 text-muted-foreground" />;
    return <Clock className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">Communication Log</span>
        <Badge variant="outline" className="text-[9px] ml-auto">Advisory</Badge>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3 text-[10px]">
        <span className="text-success font-medium">✓ {sent} sent</span>
        {failed > 0 && <span className="text-destructive font-medium">✗ {failed} failed</span>}
        {suppressed > 0 && <span className="text-muted-foreground">⊘ {suppressed} suppressed</span>}
      </div>

      {/* Recent entries */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {jobs.slice(0, 8).map((job) => (
          <div key={job.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-muted/30">
            <StatusIcon status={job.status} />
            <span className="font-medium text-foreground flex-1 truncate">
              {job.reminder_key.replace(/_/g, " ")}
            </span>
            <span className="text-[9px] text-muted-foreground">{job.audience}</span>
            <span className="text-[9px] text-muted-foreground">{job.channel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
