/**
 * AILaunchReadinessCard — Internal readiness verdict for AI advisory layer.
 * Shows READY / READY WITH WARNINGS / NOT READY with blockers/warnings.
 * Advisory only — never modifies state.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";
import { useAIHealth } from "@/hooks/useAIHealth";

interface Props {
  className?: string;
}

const VERDICT_CONFIG = {
  READY: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10", label: "READY" },
  READY_WITH_WARNINGS: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10", label: "READY WITH WARNINGS" },
  NOT_READY: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "NOT READY" },
} as const;

const AILaunchReadinessCard = ({ className }: Props) => {
  const { readiness, lastRefreshed } = useAIHealth(60_000);
  const config = VERDICT_CONFIG[readiness.verdict];
  const Icon = config.icon;

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Launch Readiness</span>
          <Badge variant="outline" className="text-[8px] ml-auto">Advisory Only</Badge>
        </div>

        {/* Verdict */}
        <div className={`rounded-lg ${config.bg} p-4 flex items-center gap-3`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
          <div>
            <p className={`text-sm font-bold ${config.color}`}>{config.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {readiness.healthy}/{readiness.totalModules} healthy · {readiness.degraded} degraded · {readiness.disabled} disabled
            </p>
          </div>
        </div>

        {/* Blockers */}
        {readiness.blockers.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-destructive uppercase">Blockers</p>
            {readiness.blockers.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-destructive">
                <XCircle className="w-3 h-3 shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {readiness.warnings.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-yellow-600 uppercase">Warnings</p>
            {readiness.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-yellow-600">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-muted-foreground">Last check: {lastRefreshed.toLocaleTimeString()}</p>
      </CardContent>
    </Card>
  );
};

export default AILaunchReadinessCard;
