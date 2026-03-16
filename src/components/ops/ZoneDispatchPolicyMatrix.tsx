/**
 * Zone Dispatch Policy Matrix — Per-zone shadow dispatch policy visualization.
 * Display-only. Does not influence live dispatch or booking behavior.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import type { ZoneReliabilitySummary } from "@/engines/zoneReliabilityEngine";

const POLICY_COLORS: Record<string, string> = {
  NORMAL: "bg-success/10 border-success/20 text-success",
  CAUTION: "bg-warning/10 border-warning/20 text-warning",
  THROTTLE: "bg-destructive/10 border-destructive/20 text-destructive",
  PROTECT: "bg-destructive/20 border-destructive/30 text-destructive",
};

const SAMPLE_BADGE: Record<string, string> = {
  HIGH: "text-success", MEDIUM: "text-warning", LOW: "text-muted-foreground", PILOT_ESTIMATE: "text-muted-foreground",
};

interface Props {
  zones: ZoneReliabilitySummary[];
  zoneLabels: Record<string, string>;
}

export default function ZoneDispatchPolicyMatrix({ zones, zoneLabels }: Props) {
  if (zones.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-xs">
          No per-zone dispatch policy data available.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...zones].sort((a, b) => a.reliabilityScore - b.reliabilityScore);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" /> Per-Zone Shadow Dispatch Policy
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sorted.map(z => {
          const colors = POLICY_COLORS[z.shadowPolicyMode] || POLICY_COLORS.NORMAL;
          const sampleColor = SAMPLE_BADGE[z.sampleQuality] || "text-muted-foreground";
          return (
            <Card key={z.zoneId} className={`border ${colors.split(" ").find(c => c.startsWith("border-")) || ""}`}>
              <CardContent className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-foreground truncate">
                    {zoneLabels[z.zoneId] || z.zoneId}
                  </span>
                  <Badge variant="outline" className={`text-[8px] px-1 py-0 ${colors.split(" ").find(c => c.startsWith("text-")) || ""}`}>
                    {z.shadowPolicyMode}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg font-bold ${colors.split(" ").find(c => c.startsWith("text-")) || "text-foreground"}`}>
                    {z.reliabilityScore}
                  </span>
                  <span className="text-[9px] text-muted-foreground">/100</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-muted-foreground">{z.routingRecommendation.replace(/_/g, " ")}</span>
                  <span className={sampleColor}>{z.sampleQuality === "PILOT_ESTIMATE" ? "Est." : z.sampleQuality}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground text-center">
        Advisory simulation only — does not alter live dispatch behavior
      </p>
    </div>
  );
}
