/**
 * ZoneCategoryReliabilityMatrix — Grouped-by-zone category reliability display.
 * Advisory only. Does not affect live dispatch.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { CategoryReliabilitySummary } from "@/engines/categoryReliabilityEngine";

const VERDICT_COLORS: Record<string, string> = {
  STABLE: "text-success", GUARDED: "text-warning", RISK: "text-destructive", CRITICAL: "text-destructive",
};
const SHADOW_COLORS: Record<string, string> = {
  NORMAL: "text-success", CAUTION: "text-warning", THROTTLE: "text-destructive", PROTECT: "text-destructive",
};
const READINESS_COLORS: Record<string, string> = {
  NOT_READY: "text-destructive", LIMITED: "text-warning", CONTROLLED: "text-primary", READY: "text-success",
};
const SAMPLE_COLORS: Record<string, string> = {
  HIGH: "text-success", MEDIUM: "text-warning", LOW: "text-muted-foreground", PILOT_ESTIMATE: "text-muted-foreground",
};

interface Props {
  categories: CategoryReliabilitySummary[];
  zoneLabels: Record<string, string>;
}

export default function ZoneCategoryReliabilityMatrix({ categories: cats, zoneLabels }: Props) {
  // Group by zone
  const grouped: Record<string, CategoryReliabilitySummary[]> = {};
  cats.forEach(c => {
    if (!grouped[c.zoneId]) grouped[c.zoneId] = [];
    grouped[c.zoneId].push(c);
  });

  // Sort zones by worst category score
  const zoneOrder = Object.entries(grouped)
    .map(([zoneId, items]) => ({ zoneId, worstScore: Math.min(...items.map(i => i.reliabilityScore)) }))
    .sort((a, b) => a.worstScore - b.worstScore)
    .map(z => z.zoneId);

  return (
    <div className="space-y-3">
      {zoneOrder.map(zoneId => {
        const items = [...grouped[zoneId]].sort((a, b) => a.reliabilityScore - b.reliabilityScore);
        const worstItem = items[0];
        return (
          <Card key={zoneId} className={worstItem?.riskLevel === "CRITICAL" ? "border-destructive/30" : ""}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-foreground">{zoneLabels[zoneId] || zoneId}</p>
                {worstItem && (
                  <Badge variant="outline" className={`text-[8px] px-1 py-0 ${VERDICT_COLORS[worstItem.verdict] || ""}`}>
                    Worst: {worstItem.categoryCode} ({worstItem.reliabilityScore})
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5">
                {items.map(c => (
                  <div key={c.categoryCode} className="flex items-center justify-between text-[10px] py-0.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-1.5">
                      {c.riskLevel === "CRITICAL" && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
                      <span className="font-medium text-foreground">{c.categoryCode}</span>
                      <span className={`${VERDICT_COLORS[c.verdict] || ""}`}>{c.reliabilityScore}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`${SHADOW_COLORS[c.shadowPolicyMode] || ""}`}>{c.shadowPolicyMode}</span>
                      <Badge variant="outline" className={`text-[7px] px-1 py-0 ${READINESS_COLORS[c.rolloutReadiness] || ""}`}>
                        {c.rolloutReadiness.replace(/_/g, " ")}
                      </Badge>
                      <span className={`text-[8px] ${SAMPLE_COLORS[c.sampleQuality] || ""}`}>
                        {c.sampleQuality === "PILOT_ESTIMATE" ? "Pilot Est." : c.sampleQuality}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
