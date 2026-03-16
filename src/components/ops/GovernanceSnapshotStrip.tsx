/**
 * Compact Governance Snapshot Strip — reusable across ops pages.
 * Advisory-only. Read-only display + link to Governance Hub.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowUpRight } from "lucide-react";
import { fetchGovernanceAutomationSummary } from "@/services/reliabilityGovernanceReadModel";
import type { AttentionLevel } from "@/engines/reliabilityGovernanceAutomationEngine";

const ATTN_COLOR: Record<AttentionLevel, string> = {
  LOW: "text-success",
  MODERATE: "text-warning",
  HIGH: "text-destructive",
  CRITICAL: "text-destructive",
};

export default function GovernanceSnapshotStrip() {
  const { data: gov } = useQuery({
    queryKey: ["governance-snapshot-strip"],
    queryFn: fetchGovernanceAutomationSummary,
    staleTime: 30_000,
  });

  if (!gov) return null;

  const attn = gov.digest.recommendedAttentionLevel;

  return (
    <Card className="border-primary/10">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Governance
          </h2>
          <Link to="/ops/reliability-governance-hub">
            <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2 gap-1">
              <ArrowUpRight className="w-2.5 h-2.5" /> Hub
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-1 text-center">
          <div>
            <p className={`text-xs font-bold ${ATTN_COLOR[attn]}`}>{attn}</p>
            <p className="text-[7px] text-muted-foreground">Attention</p>
          </div>
          <div>
            <p className={`text-xs font-bold ${gov.shiftReadiness.ready ? "text-success" : "text-destructive"}`}>
              {gov.shiftReadiness.ready ? "READY" : "NOT READY"}
            </p>
            <p className="text-[7px] text-muted-foreground">Shift</p>
          </div>
          <div>
            <p className={`text-xs font-bold ${gov.digest.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
              {gov.digest.overdueCount}
            </p>
            <p className="text-[7px] text-muted-foreground">Overdue</p>
          </div>
          <div>
            <p className={`text-xs font-bold ${gov.digest.dueTodayCount > 0 ? "text-warning" : "text-foreground"}`}>
              {gov.digest.dueTodayCount}
            </p>
            <p className="text-[7px] text-muted-foreground">Follow-ups</p>
          </div>
          <div>
            <p className={`text-xs font-bold ${gov.digest.unownedCriticalCount > 0 ? "text-destructive" : "text-foreground"}`}>
              {gov.digest.unownedCriticalCount}
            </p>
            <p className="text-[7px] text-muted-foreground">Unowned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
