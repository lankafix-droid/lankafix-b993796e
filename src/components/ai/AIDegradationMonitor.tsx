/**
 * AIDegradationMonitor — Shows modules needing attention.
 * Reusable card for AI Control Center and Module Health pages.
 * Advisory only.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { useAIHealth } from "@/hooks/useAIHealth";
import type { AIHealthStatus } from "@/services/aiHealthService";

interface Props {
  className?: string;
  showHealthyModules?: boolean;
}

const STATUS_CONFIG: Record<AIHealthStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  healthy: { icon: CheckCircle, color: "text-green-600", label: "Healthy" },
  degraded: { icon: AlertTriangle, color: "text-yellow-600", label: "Monitor Closely" },
  unavailable: { icon: XCircle, color: "text-destructive", label: "Unavailable" },
  disabled: { icon: MinusCircle, color: "text-muted-foreground", label: "Disabled" },
};

const AIDegradationMonitor = ({ className, showHealthyModules = false }: Props) => {
  const { modules, lastRefreshed } = useAIHealth(30_000);

  const flagged = modules.filter((m) => m.status !== "healthy" && m.status !== "disabled");
  const display = showHealthyModules ? modules : flagged;

  if (display.length === 0 && !showHealthyModules) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-foreground">All AI modules operating normally</span>
          <span className="text-[9px] text-muted-foreground ml-auto">{lastRefreshed.toLocaleTimeString()}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-semibold text-foreground">
            {showHealthyModules ? "Module Status" : "Modules Needing Attention"}
          </span>
          <Badge variant="outline" className="text-[8px] ml-auto">Advisory</Badge>
        </div>
        <div className="space-y-1.5">
          {display.map((mod) => {
            const cfg = STATUS_CONFIG[mod.status];
            const Icon = cfg.icon;
            return (
              <div key={mod.module} className="flex items-center gap-2 text-[11px]">
                <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                <span className="text-foreground font-medium">{mod.label}</span>
                <Badge variant="outline" className="text-[8px] ml-auto">{cfg.label}</Badge>
                {mod.reason && <span className="text-muted-foreground text-[9px]">{mod.reason}</span>}
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground">Updated: {lastRefreshed.toLocaleTimeString()}</p>
      </CardContent>
    </Card>
  );
};

export default AIDegradationMonitor;
