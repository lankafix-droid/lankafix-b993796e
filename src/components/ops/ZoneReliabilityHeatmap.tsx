/**
 * Zone Reliability Heatmap — Color-scaled grid visualization.
 * Display-only. Does not influence booking or dispatch.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import type { ReliabilityVerdict } from "@/engines/reliabilityGovernanceEngine";

interface ZoneHeatmapEntry {
  zoneId: string;
  label: string;
  reliabilityScore: number;
  verdict: ReliabilityVerdict;
}

function scoreColor(score: number): string {
  if (score >= 85) return "bg-success/20 border-success/30 text-success";
  if (score >= 65) return "bg-warning/20 border-warning/30 text-warning";
  if (score >= 40) return "bg-orange-500/20 border-orange-500/30 text-orange-600";
  return "bg-destructive/20 border-destructive/30 text-destructive";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Healthy";
  if (score >= 65) return "Watch";
  if (score >= 40) return "Risk";
  return "Critical";
}

export default function ZoneReliabilityHeatmap({ zones }: { zones: ZoneHeatmapEntry[] }) {
  if (zones.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-xs">
          No zone reliability data available.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...zones].sort((a, b) => a.reliabilityScore - b.reliabilityScore);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Zone Reliability Heatmap
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
        {sorted.map(zone => {
          const colors = scoreColor(zone.reliabilityScore);
          return (
            <div
              key={zone.zoneId}
              className={`rounded-md border p-2 text-center ${colors}`}
              title={`${zone.label}: ${zone.reliabilityScore}/100 — ${zone.verdict}`}
            >
              <div className="text-[10px] font-medium truncate">{zone.label}</div>
              <div className="text-lg font-bold">{zone.reliabilityScore}</div>
              <Badge variant="outline" className="text-[8px] px-1 py-0">
                {scoreLabel(zone.reliabilityScore)}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
