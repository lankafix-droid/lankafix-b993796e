/**
 * ETA Intelligence Panel — War Room integration
 * Shows ETA accuracy metrics, partner reliability, and zone performance.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  useETAAccuracyMetrics,
  usePartnerETAReliability,
  useZoneETAAccuracy,
} from "@/services/etaAnalyticsService";
import { Clock, Target, TrendingUp, AlertTriangle, MapPin } from "lucide-react";
import { zoneLabel } from "@/lib/opsLabels";

const bandColor = (band: string) => {
  switch (band) {
    case "excellent": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "good": return "bg-primary/10 text-primary border-primary/30";
    case "unstable": return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    case "poor": return "bg-destructive/10 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function ETAIntelligencePanel() {
  const { data: metrics } = useETAAccuracyMetrics();
  const { data: partnerReliability } = usePartnerETAReliability();
  const { data: zoneAccuracy } = useZoneETAAccuracy();

  if (!metrics) return null;

  const hasData = metrics.completedPredictions > 0;

  return (
    <div className="space-y-3">
      {/* ETA Accuracy Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target size={16} className="text-primary" />
            ETA Intelligence
            <Badge variant="outline" className="text-[9px] ml-auto">
              {metrics.totalPredictions} predictions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasData ? (
            <p className="text-[11px] text-muted-foreground">No completed ETA accuracy data yet. Metrics appear after technicians complete arrivals.</p>
          ) : (
            <>
              {/* Key metrics row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border px-2.5 py-2 text-center">
                  <div className="text-lg font-bold text-primary">{metrics.withinRangePercent}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Within Range</div>
                </div>
                <div className="rounded-lg border px-2.5 py-2 text-center">
                  <div className="text-lg font-bold text-foreground">{metrics.avgErrorMinutes}m</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Avg Error</div>
                </div>
                <div className="rounded-lg border px-2.5 py-2 text-center">
                  <div className="text-lg font-bold text-destructive">{metrics.lateCount}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Late Arrivals</div>
                </div>
              </div>

              {/* Distribution bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Early {metrics.earlyPercent}%</span>
                  <span>On Time {metrics.onTimePercent}%</span>
                  <span>Late {metrics.latePercent}%</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500" style={{ width: `${metrics.earlyPercent}%` }} />
                  <div className="bg-emerald-500" style={{ width: `${metrics.onTimePercent}%` }} />
                  <div className="bg-destructive" style={{ width: `${metrics.latePercent}%` }} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Partner ETA Reliability */}
      {partnerReliability && partnerReliability.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Partner ETA Reliability
              <Badge variant="outline" className="text-[9px] ml-auto">
                {partnerReliability.length} partners
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Partner</TableHead>
                  <TableHead className="text-[10px]">Score</TableHead>
                  <TableHead className="text-[10px]">In Range</TableHead>
                  <TableHead className="text-[10px]">Late</TableHead>
                  <TableHead className="text-[10px]">Band</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerReliability.slice(0, 10).map((p) => (
                  <TableRow key={p.partnerId}>
                    <TableCell className="text-[11px] font-mono">{p.partnerId.slice(0, 8)}…</TableCell>
                    <TableCell className="text-[11px] font-bold">{p.reliabilityScore}</TableCell>
                    <TableCell className="text-[11px]">{p.withinRangePercent}%</TableCell>
                    <TableCell className="text-[11px]">{p.lateCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${bandColor(p.reliabilityBand)}`}>
                        {p.reliabilityBand}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Zone ETA Accuracy */}
      {zoneAccuracy && zoneAccuracy.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              Zone ETA Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zoneAccuracy.slice(0, 8).map((z) => (
                <div key={z.zone} className="flex items-center gap-2">
                  <span className="text-[11px] w-24 truncate">{zoneLabel(z.zone)}</span>
                  <Progress
                    value={z.withinRangePercent}
                    className="h-2 flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {z.withinRangePercent}%
                  </span>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">
                    ±{z.avgErrorMinutes}m
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
