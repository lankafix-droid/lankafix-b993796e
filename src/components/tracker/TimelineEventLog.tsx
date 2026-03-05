import { Monitor, Wrench, User, Building2, Settings } from "lucide-react";
import { TRUST_ICONS } from "@/brand/trustSystem";
import type { TimelineEvent, TimelineActor } from "@/types/booking";

const actorConfig: Record<TimelineActor, { icon: React.ReactNode; color: string }> = {
  system: { icon: <Monitor className="w-3 h-3" />, color: "bg-primary/10 text-primary" },
  technician: { icon: <Wrench className="w-3 h-3" />, color: "bg-warning/10 text-warning" },
  customer: { icon: <User className="w-3 h-3" />, color: "bg-success/10 text-success" },
  partner: { icon: <Building2 className="w-3 h-3" />, color: "bg-primary/10 text-primary" },
  ops: { icon: <Settings className="w-3 h-3" />, color: "bg-destructive/10 text-destructive" },
};

interface TimelineEventLogProps {
  events: TimelineEvent[];
}

const TimelineEventLog = ({ events }: TimelineEventLogProps) => {
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="bg-card rounded-xl border p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TRUST_ICONS.Clock className="w-4 h-4 text-primary" />
        Event Log
      </h3>
      <div className="space-y-3">
        {sorted.map((event, i) => {
          const cfg = actorConfig[event.actor];
          return (
            <div key={i} className="flex gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineEventLog;
