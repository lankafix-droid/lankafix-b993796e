/**
 * AIFraudReviewIndicator — Fraud risk indicator for operator/admin surfaces.
 * Uses AIFraudRiskBadge. Shows explicit "manual review recommended" for unknown/degraded states.
 * Never implies safe/clear when scan failed. Advisory only.
 */
import { AlertTriangle, Eye, ShieldQuestion } from "lucide-react";
import AIFraudRiskBadge from "./AIFraudRiskBadge";
import AIAdvisoryFooter from "./AIAdvisoryFooter";
import AIOperatorFeedback from "./AIOperatorFeedback";
import AIEmptyState from "./AIEmptyState";
import type { FraudScanResult } from "@/services/aiFraudDetection";

interface AIFraudReviewIndicatorProps {
  scanResult: FraudScanResult | null;
  loading?: boolean;
  bookingId?: string;
  className?: string;
}

const AIFraudReviewIndicator = ({
  scanResult,
  loading = false,
  bookingId,
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

  // No scan result — explicit no-data state
  if (!scanResult) {
    return (
      <AIEmptyState
        mode="unavailable"
        title="No fraud signal available"
        description="AI trust scan has not been run for this booking. Manual review recommended."
        className={className}
      />
    );
  }

  const isUnknown = scanResult.riskLevel === "unknown";
  const isDegraded = isUnknown || scanResult.fallback_used;
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

      {/* Unknown state — explicit messaging */}
      {isUnknown && (
        <div className="rounded-md bg-muted/40 border border-border/30 p-2 space-y-1">
          <p className="text-[11px] font-medium text-foreground">AI trust scan unavailable</p>
          <p className="text-[10px] text-muted-foreground">
            The automated fraud scan could not complete. This does not indicate safety — manual review is recommended.
          </p>
        </div>
      )}

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

      {needsReview && !isUnknown && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-destructive bg-destructive/5 rounded-md px-2 py-1.5">
          <AlertTriangle className="w-3 h-3" />
          Manual review recommended — does not automatically block the booking
        </div>
      )}

      <AIOperatorFeedback module="ai_fraud_watch" bookingId={bookingId} />

      <AIAdvisoryFooter
        module="ai_fraud_watch"
        confidence={scanResult.confidence.confidence_score}
        fallbackUsed={scanResult.fallback_used}
        degraded={isUnknown}
        cached={!!scanResult.cached}
        disclaimer="Trust scan advisory — does not block bookings or payments."
      />
    </div>
  );
};

export default AIFraudReviewIndicator;
