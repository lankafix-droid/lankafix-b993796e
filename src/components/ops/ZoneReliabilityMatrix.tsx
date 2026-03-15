/**
 * Zone Reliability Matrix — Color-coded zone reliability grid.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin } from "lucide-react";
import type { ReliabilityVerdict } from "@/engines/reliabilityGovernanceEngine";

interface ZoneReliabilityData {
  zoneId: string;
  label: string;
  reliabilityScore: number;
  verdict: ReliabilityVerdict;
  riskLevel: string;
}

const VERDICT_STYLES: Record<ReliabilityVerdict, { bg: string; text: string; border: string }> = {
  STABLE: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
  GUARDED: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
  RISK: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  CRITICAL: { bg: "bg-destructive/20", text: "text-destructive", border: "border-destructive/40" },
};

export default function ZoneReliabilityMatrix({ zones }: { zones: ZoneReliabilityData[] }) {
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
        Zone Reliability Matrix
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sorted.map(zone => {
          const style = VERDICT_STYLES[zone.verdict];
          return (
            <Card key={zone.zoneId} className={`border ${style.border}`}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground truncate">
                    {zone.label}
                  </span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${style.text} ${style.bg}`}>
                    {zone.verdict}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className={`w-3 h-3 ${style.text}`} />
                  <span className={`text-lg font-bold ${style.text}`}>{zone.reliabilityScore}</span>
                  <span className="text-[9px] text-muted-foreground">/100</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
