/**
 * LankaFix Reliability Timeline — Hourly grouped healing activity
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Zap, Activity } from "lucide-react";
import type { HealingEventData } from "@/engines/selfHealingEngine";

interface Props {
  events: HealingEventData[];
}

interface HourBucket {
  hour: string;
  escalations: number;
  failures: number;
  successes: number;
  circuitBreaks: number;
}

export default function ReliabilityTimeline({ events }: Props) {
  const buckets = useMemo(() => {
    const now = new Date();
    const result: HourBucket[] = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);

      const hourEvents = events.filter(e => {
        const t = new Date(e.created_at).getTime();
        return t >= hourStart.getTime() && t < hourEnd.getTime();
      });

      result.push({
        hour: hourStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        escalations: hourEvents.filter(e => e.status === "escalated").length,
        failures: hourEvents.filter(e => e.status === "failed").length,
        successes: hourEvents.filter(e => e.status === "success").length,
        circuitBreaks: 0, // derived from escalation clusters
      });
    }

    return result;
  }, [events]);

  const activeHours = buckets.filter(b => b.escalations + b.failures + b.successes > 0);

  if (activeHours.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No healing activity in the last 24 hours
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-1">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4" /> Reliability Timeline (24h)
        </h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {activeHours.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground w-14 shrink-0 font-mono">{b.hour}</span>
              <div className="flex gap-1.5 flex-wrap">
                {b.successes > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 bg-green-500/10 text-green-700 border-green-200">
                    ✓ {b.successes}
                  </Badge>
                )}
                {b.failures > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 bg-yellow-500/10 text-yellow-700 border-yellow-200">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {b.failures}
                  </Badge>
                )}
                {b.escalations > 0 && (
                  <Badge variant="destructive" className="text-[10px] py-0">
                    <Zap className="h-2.5 w-2.5 mr-0.5" /> {b.escalations}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
