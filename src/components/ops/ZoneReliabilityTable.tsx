/**
 * Zone Reliability Table — Per-zone reliability with sample quality indicators.
 * Display-only. Does not influence dispatch or booking behavior.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Shield, MapPin, AlertTriangle } from "lucide-react";
import type { ZoneReliabilitySummary } from "@/engines/zoneReliabilityEngine";

const VERDICT_COLORS: Record<string, string> = {
  STABLE: "text-success", GUARDED: "text-warning", RISK: "text-destructive", CRITICAL: "text-destructive",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "text-success", MODERATE: "text-warning", HIGH: "text-destructive", CRITICAL: "text-destructive",
};

const SAMPLE_STYLES: Record<string, { text: string; label: string }> = {
  HIGH: { text: "text-success", label: "High" },
  MEDIUM: { text: "text-warning", label: "Medium" },
  LOW: { text: "text-muted-foreground", label: "Low" },
  PILOT_ESTIMATE: { text: "text-muted-foreground", label: "Pilot Est." },
};

interface Props {
  zones: ZoneReliabilitySummary[];
  zoneLabels: Record<string, string>;
}

export default function ZoneReliabilityTable({ zones, zoneLabels }: Props) {
  if (zones.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-xs">
          No per-zone reliability data available.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...zones].sort((a, b) => a.reliabilityScore - b.reliabilityScore);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" /> Per-Zone Reliability
      </h3>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] h-7">Zone</TableHead>
              <TableHead className="text-[10px] h-7 text-center">Score</TableHead>
              <TableHead className="text-[10px] h-7 text-center">Verdict</TableHead>
              <TableHead className="text-[10px] h-7 text-center">Risk</TableHead>
              <TableHead className="text-[10px] h-7 text-center">Dispatch</TableHead>
              <TableHead className="text-[10px] h-7 text-center">Rollout</TableHead>
              <TableHead className="text-[10px] h-7 text-center">Sample</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(z => {
              const sample = SAMPLE_STYLES[z.sampleQuality] || SAMPLE_STYLES.PILOT_ESTIMATE;
              return (
                <TableRow key={z.zoneId}>
                  <TableCell className="text-[10px] py-1.5 font-medium">{zoneLabels[z.zoneId] || z.zoneId}</TableCell>
                  <TableCell className="text-[10px] py-1.5 text-center">
                    <span className={`font-bold ${VERDICT_COLORS[z.verdict] || "text-foreground"}`}>{z.reliabilityScore}</span>
                  </TableCell>
                  <TableCell className="text-[10px] py-1.5 text-center">
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${VERDICT_COLORS[z.verdict] || ""}`}>
                      {z.verdict}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] py-1.5 text-center">
                    <span className={RISK_COLORS[z.riskLevel] || "text-foreground"}>{z.riskLevel}</span>
                  </TableCell>
                  <TableCell className="text-[10px] py-1.5 text-center">
                    <span className={RISK_COLORS[z.dispatchRiskLevel] || "text-foreground"}>{z.shadowPolicyMode}</span>
                  </TableCell>
                  <TableCell className="text-[10px] py-1.5 text-center">
                    <span className={z.rolloutReadiness === "READY" ? "text-success" : z.rolloutReadiness === "CONTROLLED" ? "text-warning" : "text-muted-foreground"}>
                      {z.rolloutReadiness.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-1.5 text-center">
                    <span className={sample.text}>{sample.label}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {zones.some(z => z.warnings.length > 0) && (
        <div className="space-y-0.5 mt-1">
          {zones.filter(z => z.warnings.length > 0).slice(0, 3).map(z => (
            <div key={z.zoneId} className="flex items-start gap-1 text-[9px] text-warning">
              <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
              <span>{zoneLabels[z.zoneId] || z.zoneId}: {z.warnings[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
