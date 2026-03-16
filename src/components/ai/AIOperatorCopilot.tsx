/**
 * AIOperatorCopilot — Summary block for operator/ops detail screens.
 * Aggregates estimate, fraud, partner quality, and low-confidence warnings.
 * Strictly advisory-only — never auto-executes marketplace actions.
 */
import { Brain, TrendingUp, Shield, Users, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIConfidenceBadge from "./AIConfidenceBadge";
import AIFraudRiskBadge from "./AIFraudRiskBadge";
import type { PriceEstimate } from "@/services/aiPriceEstimation";
import type { FraudScanResult, FraudRiskLevel } from "@/services/aiFraudDetection";
import type { PartnerMatchScore } from "@/services/aiPartnerMatching";

interface AIOperatorCopilotProps {
  /** Price estimate advisory */
  estimate?: PriceEstimate | null;
  /** Fraud scan result */
  fraudScan?: FraudScanResult | null;
  /** Top partner match */
  topPartnerMatch?: PartnerMatchScore | null;
  /** Overall loading state */
  loading?: boolean;
  className?: string;
}

interface CopilotInsight {
  icon: typeof Brain;
  label: string;
  value: string;
  confidence: number;
  fallbackUsed: boolean;
  warning?: string;
}

const AIOperatorCopilot = ({
  estimate,
  fraudScan,
  topPartnerMatch,
  loading = false,
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

  const insights: CopilotInsight[] = [];
  const warnings: string[] = [];

  // Estimate insight
  if (estimate) {
    insights.push({
      icon: TrendingUp,
      label: "Price Estimate",
      value: `LKR ${estimate.estimated_min_price.toLocaleString()} – ${estimate.estimated_max_price.toLocaleString()}`,
      confidence: estimate.confidence.confidence_score,
      fallbackUsed: estimate.fallback_used,
    });
    if (estimate.confidence.confidence_score < 50) {
      warnings.push("Low confidence on price estimate — recommend manual review");
    }
  }

  // Fraud insight
  if (fraudScan) {
    const riskLabel = fraudScan.riskLevel === "safe" ? "Clear" :
      fraudScan.riskLevel === "unknown" ? "Scan Unavailable" :
      `${fraudScan.riskLevel.charAt(0).toUpperCase() + fraudScan.riskLevel.slice(1)} Risk`;
    insights.push({
      icon: Shield,
      label: "Trust Assessment",
      value: `${riskLabel} (Score: ${fraudScan.riskScore}/100)`,
      confidence: fraudScan.confidence.confidence_score,
      fallbackUsed: fraudScan.fallback_used,
      warning: fraudScan.riskLevel === "unknown" ? "Fraud scan unavailable — manual review" : undefined,
    });
    if (fraudScan.riskLevel === "high" || fraudScan.riskLevel === "critical") {
      warnings.push(`Elevated fraud risk: ${fraudScan.alerts.length} alert(s) detected`);
    }
    if (fraudScan.riskLevel === "unknown") {
      warnings.push("Fraud scan could not complete — recommend manual review");
    }
  }

  // Partner match insight
  if (topPartnerMatch) {
    insights.push({
      icon: Users,
      label: "Top Partner Match",
      value: `${topPartnerMatch.partnerName} (Score: ${topPartnerMatch.overallScore}/100)`,
      confidence: topPartnerMatch.confidence.confidence_score,
      fallbackUsed: topPartnerMatch.fallback_used,
    });
    if (topPartnerMatch.confidence.confidence_score < 50) {
      warnings.push("Low confidence on partner suggestion — limited data");
    }
  }

  if (insights.length === 0) {
    return (
      <div className={`rounded-xl border border-border/40 bg-muted/20 p-4 text-center ${className}`}>
        <Brain className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No AI insights available for this booking.</p>
      </div>
    );
  }

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
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
              <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{insight.label}</p>
                  <AIConfidenceBadge
                    score={insight.confidence}
                    fallbackUsed={insight.fallbackUsed}
                    showScore={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.value}</p>
                {insight.warning && (
                  <p className="text-[10px] text-destructive mt-0.5">{insight.warning}</p>
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

      <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/20">
        ⚠️ All insights are advisory only — does not alter booking, dispatch, or payment state.
      </p>
    </div>
  );
};

export default AIOperatorCopilot;
