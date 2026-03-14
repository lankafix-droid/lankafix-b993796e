import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEvent {
  id: string;
  status: string;
  note: string | null;
  actor: string | null;
  created_at: string;
}

const statusIcon = (s: string) => {
  const map: Record<string, string> = {
    dispatch_started: "🚀",
    job_offer_sent: "📤",
    job_offer_accepted: "✅",
    job_offer_declined: "❌",
    job_offer_expired: "⏰",
    dispatch_retry: "🔄",
    dispatch_decision: "🧠",
    dispatch_no_match: "🚫",
    dispatch_failed: "💥",
    dispatch_escalated: "🚨",
    team_assigned: "👥",
    team_forming: "🔗",
    lead_reselected: "👑",
    partners_released: "🔓",
    late_accept: "⚠️",
    assigned: "✅",
  };
  return map[s] || "•";
};

interface DispatchTimelineViewerProps {
  bookingId: string | null;
}

export default function DispatchTimelineViewer({ bookingId }: DispatchTimelineViewerProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!bookingId) { setEvents([]); return; }

    const load = async () => {
      const { data } = await supabase
        .from("job_timeline")
        .select("id, status, note, actor, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      setEvents((data || []) as TimelineEvent[]);
    };

    load();

    const chan = supabase
      .channel(`timeline-${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_timeline", filter: `booking_id=eq.${bookingId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [bookingId]);

  if (!bookingId) return null;

  const startTime = events[0] ? new Date(events[0].created_at).getTime() : 0;

  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <History size={14} /> Dispatch Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="px-4 py-2 space-y-0">
            {events.map((e, i) => {
              const offsetSec = startTime ? Math.round((new Date(e.created_at).getTime() - startTime) / 1000) : 0;
              const mm = String(Math.floor(offsetSec / 60)).padStart(2, "0");
              const ss = String(offsetSec % 60).padStart(2, "0");

              return (
                <div key={e.id} className="flex gap-3 text-xs group">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{mm}:{ss}</span>
                    {i < events.length - 1 && (
                      <div className="w-px h-full bg-border min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-1.5">
                      <span>{statusIcon(e.status)}</span>
                      <span className="font-medium">{e.status.replace(/_/g, " ")}</span>
                      <span className="text-[9px] text-muted-foreground">({e.actor})</span>
                    </div>
                    {e.note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{e.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-muted-foreground text-xs py-6 text-center">No timeline events</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
