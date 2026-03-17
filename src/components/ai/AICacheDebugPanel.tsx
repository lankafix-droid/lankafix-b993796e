/**
 * AICacheDebugPanel — Operator-only diagnostics card showing session AI metrics.
 * Uses aiUsageMeter and aiCacheService. Advisory only.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Zap, Clock, Activity } from "lucide-react";
import { getUsageSummary } from "@/services/aiUsageMeter";

interface Props {
  className?: string;
}

const AICacheDebugPanel = ({ className }: Props) => {
  const usage = getUsageSummary();

  // Count cache entries in sessionStorage
  let cacheEntries = 0;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("lf_ai_cache_")) cacheEntries++;
    }
  } catch {}

  const items = [
    { icon: Activity, label: "Session Calls", value: usage.totalCalls },
    { icon: Database, label: "Cache Entries", value: cacheEntries },
    { icon: Zap, label: "Fallback Rate", value: usage.fallbackRate > 0 ? `${(usage.fallbackRate * 100).toFixed(0)}%` : "0%" },
    { icon: Clock, label: "Avg Latency", value: `${usage.avgLatencyMs}ms` },
  ];

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Cache & Diagnostics</span>
          <Badge variant="outline" className="text-[8px] ml-auto">Internal</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-border/40 p-2.5 text-center">
              <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-base font-bold text-foreground">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {Object.keys(usage.byModule).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-border/30">
            {Object.entries(usage.byModule).map(([mod, count]) => (
              <Badge key={mod} variant="secondary" className="text-[8px]">
                {mod.replace("ai_", "")}: {count as number}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICacheDebugPanel;
