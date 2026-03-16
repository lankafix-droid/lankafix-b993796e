/**
 * CategoryReliabilityTable — Compact executive-grade table for zone×category reliability.
 * Advisory only. Does not affect live dispatch.
 */
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CategoryReliabilitySummary } from "@/engines/categoryReliabilityEngine";

const VERDICT_COLORS: Record<string, string> = {
  STABLE: "text-success", GUARDED: "text-warning", RISK: "text-destructive", CRITICAL: "text-destructive",
};
const RISK_COLORS: Record<string, string> = {
  LOW: "text-success", MODERATE: "text-warning", HIGH: "text-destructive", CRITICAL: "text-destructive",
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

export default function CategoryReliabilityTable({ categories: cats, zoneLabels }: Props) {
  const sorted = [...cats].sort((a, b) => a.reliabilityScore - b.reliabilityScore);

  return (
    <div className="overflow-auto max-h-80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[10px] h-7">Zone</TableHead>
            <TableHead className="text-[10px] h-7">Category</TableHead>
            <TableHead className="text-[10px] h-7 text-center">Score</TableHead>
            <TableHead className="text-[10px] h-7 text-center">Verdict</TableHead>
            <TableHead className="text-[10px] h-7 text-center">Risk</TableHead>
            <TableHead className="text-[10px] h-7 text-center">Dispatch</TableHead>
            <TableHead className="text-[10px] h-7 text-center">Rollout</TableHead>
            <TableHead className="text-[10px] h-7 text-center">Sample</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(c => (
            <TableRow key={`${c.zoneId}-${c.categoryCode}`} className={c.riskLevel === "CRITICAL" ? "bg-destructive/5" : c.sampleQuality === "PILOT_ESTIMATE" ? "bg-muted/30" : ""}>
              <TableCell className="text-[10px] py-1">{zoneLabels[c.zoneId] || c.zoneId}</TableCell>
              <TableCell className="text-[10px] py-1 font-medium">{c.categoryCode}</TableCell>
              <TableCell className="text-[10px] py-1 text-center font-semibold">{c.reliabilityScore}</TableCell>
              <TableCell className="text-[10px] py-1 text-center">
                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${VERDICT_COLORS[c.verdict] || ""}`}>{c.verdict}</Badge>
              </TableCell>
              <TableCell className={`text-[10px] py-1 text-center ${RISK_COLORS[c.riskLevel] || ""}`}>{c.riskLevel}</TableCell>
              <TableCell className={`text-[10px] py-1 text-center ${RISK_COLORS[c.dispatchRiskLevel] || ""}`}>{c.dispatchRiskLevel}</TableCell>
              <TableCell className="text-[10px] py-1 text-center">
                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${READINESS_COLORS[c.rolloutReadiness] || ""}`}>
                  {c.rolloutReadiness.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className={`text-[10px] py-1 text-center ${SAMPLE_COLORS[c.sampleQuality] || ""}`}>
                {c.sampleQuality.replace(/_/g, " ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
