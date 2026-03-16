/**
 * AIOperatorCopilot — Summary block for operator/ops detail screens.
 * Aggregates estimate, fraud, partner quality, and low-confidence warnings.
 * Normalizes no-data states — explicitly shows when a module has no result.
 * Strictly advisory-only — never auto-executes marketplace actions.
 */
import { Brain, TrendingUp, Shield, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIConfidenceBadge from "./AIConfidenceBadge";
import AIFraudRiskBadge from "./AIFraudRiskBadge";
import AIAdvisoryFooter from "./AIAdvisoryFooter";
import AIOperatorFeedback from "./AIOperatorFeedback";
import type { PriceEstimate } from "@/services/aiPriceEstimation";
import type { FraudScanResult } from "@/services/aiFraudDetection";
import type { PartnerMatchScore } from "@/services/aiPartnerMatching";

interface AIOperatorCopilotProps {
  estimate?: PriceEstimate | null;
  fraudScan?: FraudScanResult | null;
  topPartnerMatch?: PartnerMatchScore | null;
  loading?: boolean;
  bookingId?: string;
  className?: string;
}

interface CopilotRow {
  icon: typeof Brain;
  label: string;
  value: string | null;
  confidence: number | null;
  fallbackUsed: boolean;
  warning?: string;
  noData: boolean;
  noDataMessage: string;
}

const AIOperatorCopilot = ({
  estimate,
  fraudScan,
  topPartnerMatch,
  loading = false,
  bookingId,
  className = "",
}: AIOperatorCopilotProps) => {
  if (loading) {
    return (
      <div className={`rounded-xl border border-border/40 bg-card p-4 space-y-3 animate-pulse ${className}`}>
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  const warnings: string[] = [];

  // Build rows — always show all 3 modules, even if no data
  const rows: CopilotRow[] = [
    {
      icon: TrendingUp,
      label: "Price Estimate",
      value: estimate
        ? `LKR ${estimate.estimated_min_price.toLocaleString()} – ${estimate.estimated_max_price.toLocaleString()}`
        : null,
      confidence: estimate?.confidence.confidence_score ?? null,
      fallbackUsed: estimate?.fallback_used ?? false,
      noData: !estimate,
      noDataMessage: "No estimate available — AI pricing module has not been run.",
    },
    {
      icon: Shield,
      label: "Trust Assessment",
      value: fraudScan
        ? fraudScan.riskLevel === "safe" ? "Clear"
          : fraudScan.riskLevel === "unknown" ? "Scan Unavailable"
          : `${fraudScan.riskLevel.charAt(0).toUpperCase() + fraudScan.riskLevel.slice(1)} Risk (${fraudScan.riskScore}/100)`
        : null,
      confidence: fraudScan?.confidence.confidence_score ?? null,
      fallbackUsed: fraudScan?.fallback_used ?? false,
      warning: fraudScan?.riskLevel === "unknown"
        ? "Fraud scan unavailable — manual review recommended"
        : undefined,
      noData: !fraudScan,
      noDataMessage: "No fraud signal available — trust scan has not been run.",
    },
    {
      icon: Users,
      label: "Top Partner Match",
      value: topPartnerMatch
        ? `${topPartnerMatch.partnerName} (Score: ${topPartnerMatch.overallScore}/100)`
        : null,
      confidence: topPartnerMatch?.confidence.confidence_score ?? null,
      fallbackUsed: topPartnerMatch?.fallback_used ?? false,
      noData: !topPartnerMatch,
      noDataMessage: "No partner recommendation available — ranking has not been run.",
    },
  ];

  // Collect warnings
  if (estimate && estimate.confidence.confidence_score < 50) {
    warnings.push("Low confidence on price estimate — recommend manual review");
  }
  if (fraudScan?.riskLevel === "high" || fraudScan?.riskLevel === "critical") {
    warnings.push(`Elevated fraud risk: ${fraudScan.alerts.length} alert(s) detected`);
  }
  if (fraudScan?.riskLevel === "unknown") {
    warnings.push("Fraud scan could not complete — manual review recommended");
  }
  if (topPartnerMatch && topPartnerMatch.confidence.confidence_score < 50) {
    warnings.push("Low confidence on partner suggestion — limited data");
  }

  // Compute aggregate confidence from available modules
  const availableConfidences = rows.filter(r => r.confidence !== null).map(r => r.confidence!);
  const avgConfidence = availableConfidences.length > 0
    ? Math.round(availableConfidences.reduce((s, c) => s + c, 0) / availableConfidences.length)
    : 0;

  return (
    <div className={`rounded-xl border border-border/40 bg-card p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Copilot Summary</p>
            <p className="text-[10px] text-muted-foreground">Advisory insights for this booking</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Advisory Only</Badge>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const Icon = row.icon;
          return (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${row.noData ? "text-muted-foreground/40" : "text-primary"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-medium ${row.noData ? "text-muted-foreground" : "text-foreground"}`}>
                    {row.label}
                  </p>
                  {row.confidence !== null && (
                    <AIConfidenceBadge
                      score={row.confidence}
                      fallbackUsed={row.fallbackUsed}
                      showScore={false}
                    />
                  )}
                </div>
                {row.noData ? (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{row.noDataMessage}</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.value}</p>
                    {row.warning && (
                      <p className="text-[10px] text-destructive mt-0.5">{row.warning}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1 pt-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-destructive">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fraud badge if available */}
      {fraudScan && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground">Fraud Status:</span>
          <AIFraudRiskBadge riskLevel={fraudScan.riskLevel} />
        </div>
      )}

      <AIOperatorFeedback module="ai_operator_copilot" bookingId={bookingId} />

      <AIAdvisoryFooter
        module="ai_operator_copilot"
        confidence={avgConfidence}
        fallbackUsed={rows.some(r => r.fallbackUsed)}
        degraded={availableConfidences.length === 0}
        disclaimer="All insights are advisory only — does not alter booking, dispatch, or payment state."
      />
    </div>
  );
};

export default AIOperatorCopilot;
