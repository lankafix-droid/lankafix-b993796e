/**
 * AIFeedbackAnalytics — Operator-facing analytics summary card.
 * Derives stats from session usage and ai_events. Advisory only.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { getUsageSummary } from "@/services/aiUsageMeter";

interface Props {
  className?: string;
}

const AIFeedbackAnalytics = ({ className }: Props) => {
  const usage = getUsageSummary();

  const metrics = [
    { label: "Total Calls", value: usage.totalCalls, icon: BarChart3 },
    { label: "Fallback Used", value: usage.fallbackRate > 0 ? `${(usage.fallbackRate * 100).toFixed(0)}%` : "0%", icon: AlertTriangle },
    { label: "Avg Latency", value: `${usage.avgLatencyMs}ms`, icon: ThumbsUp },
    { label: "Active Modules", value: Object.keys(usage.byModule).length, icon: ThumbsDown },
  ];

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Session Analytics</span>
          <Badge variant="outline" className="text-[8px] ml-auto">Advisory Only</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
              <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {Object.keys(usage.byModule).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
            {Object.entries(usage.byModule)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([mod, count]) => (
                <Badge key={mod} variant="secondary" className="text-[9px]">
                  {mod.replace("ai_", "")}: {count as number}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIFeedbackAnalytics;
