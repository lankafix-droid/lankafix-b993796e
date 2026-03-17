/**
 * AIReadinessHero — Executive readiness overview card.
 * Advisory only — never modifies marketplace state.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { GlobalRolloutReadiness } from "@/services/aiRolloutReadiness";

interface Props {
  readiness: GlobalRolloutReadiness;
}

const VERDICT_CONFIG = {
  READY: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/20", label: "Launch Ready" },
  READY_WITH_WARNINGS: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Ready with Warnings" },
  NOT_READY: { icon: XCircle, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20", label: "Not Ready" },
};

const AIReadinessHero = ({ readiness }: Props) => {
  const config = VERDICT_CONFIG[readiness.verdict];
  const Icon = config.icon;

  return (
    <Card className={`${config.border} border`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{config.label}</h2>
                <Badge variant="outline" className="text-[9px]">Advisory Only</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{readiness.recommendationHeadline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${config.color}`}>{readiness.overallScore}</p>
            <p className="text-[10px] text-muted-foreground">/ 100</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{readiness.recommendationBody}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 text-center ${readiness.consumerFacingReady ? "bg-green-500/5 border border-green-500/15" : "bg-red-500/5 border border-red-500/15"}`}>
            <p className={`text-sm font-bold ${readiness.consumerFacingReady ? "text-green-600" : "text-red-600"}`}>
              {readiness.consumerFacingReady ? "Ready" : "Not Ready"}
            </p>
            <p className="text-[10px] text-muted-foreground">Consumer-facing AI</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${readiness.operatorFacingReady ? "bg-green-500/5 border border-green-500/15" : "bg-red-500/5 border border-red-500/15"}`}>
            <p className={`text-sm font-bold ${readiness.operatorFacingReady ? "text-green-600" : "text-red-600"}`}>
              {readiness.operatorFacingReady ? "Ready" : "Not Ready"}
            </p>
            <p className="text-[10px] text-muted-foreground">Operator-facing AI</p>
          </div>
        </div>

        {readiness.strongestModules.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground mr-1">Strongest:</span>
            {readiness.strongestModules.map((m) => (
              <Badge key={m} variant="secondary" className="text-[9px]">{m}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIReadinessHero;
