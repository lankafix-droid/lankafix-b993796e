/**
 * AIFraudReviewIndicator — Fraud risk indicator for operator/admin surfaces.
 * Uses AIFraudRiskBadge. Shows "manual review recommended" for unknown/degraded states.
 */
import { AlertTriangle, Eye } from "lucide-react";
import AIFraudRiskBadge from "./AIFraudRiskBadge";
import type { FraudScanResult } from "@/services/aiFraudDetection";

interface AIFraudReviewIndicatorProps {
  scanResult: FraudScanResult | null;
  loading?: boolean;
  className?: string;
}

const AIFraudReviewIndicator = ({
  scanResult,
  loading = false,
  className = "",
}: AIFraudReviewIndicatorProps) => {
  // Loading state
  if (loading) {
    return (
      <div className={`rounded-lg border border-border/40 bg-muted/20 p-3 animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  // No scan result
  if (!scanResult) {
    return (
      <div className={`rounded-lg border border-border/40 bg-muted/20 p-3 flex items-center gap-2 ${className}`}>
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Fraud scan not available</span>
      </div>
    );
  }

  const isUnknown = scanResult.riskLevel === "unknown";
  const needsReview = isUnknown || scanResult.riskLevel === "high" || scanResult.riskLevel === "critical";

  return (
    <div className={`rounded-lg border border-border/40 bg-card p-3 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-foreground" />
          <span className="text-xs font-semibold text-foreground">Trust & Fraud</span>
        </div>
        <AIFraudRiskBadge riskLevel={scanResult.riskLevel} />
      </div>

      {scanResult.alerts.length > 0 && (
        <div className="space-y-1">
          {scanResult.alerts.slice(0, 3).map(alert => (
            <div key={alert.id} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {needsReview && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-destructive bg-destructive/5 rounded-md px-2 py-1.5">
          <AlertTriangle className="w-3 h-3" />
          {isUnknown
            ? "Fraud scan unavailable — manual review recommended"
            : "Elevated risk detected — manual review recommended"
          }
        </div>
      )}

      {scanResult.fallback_used && (
        <p className="text-[10px] text-muted-foreground">Degraded scan — limited data available</p>
      )}

      {scanResult.cached && (
        <p className="text-[10px] text-muted-foreground">Cached result</p>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Advisory only — does not block bookings or payments.
      </p>
    </div>
  );
};

export default AIFraudReviewIndicator;
