import { TrendingUp, AlertTriangle } from "lucide-react";
import AIConfidenceBadge from "./AIConfidenceBadge";
import { formatPriceRange, type PriceEstimate } from "@/services/aiPriceEstimation";

interface AIPriceEstimateCardProps {
  estimate: PriceEstimate | null;
  className?: string;
  loading?: boolean;
}

const AIPriceEstimateCard = ({ estimate, className = "", loading = false }: AIPriceEstimateCardProps) => {
  // Loading state
  if (loading) {
    return (
      <div className={`rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2 animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-6 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
    );
  }

  // No result state
  if (!estimate) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Estimated Price Range</span>
        </div>
        <AIConfidenceBadge
          score={estimate.confidence.confidence_score}
          fallbackUsed={estimate.fallback_used}
        />
      </div>
      <p className="text-lg font-bold text-primary">{formatPriceRange(estimate)}</p>
      <p className="text-xs text-muted-foreground">{estimate.recommended_service_type}</p>

      {estimate.fallback_used && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <AlertTriangle className="w-3 h-3" />
          <span>Using estimated ranges — final inspection may change result</span>
        </div>
      )}

      {estimate.confidence.confidence_score < 50 && !estimate.fallback_used && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <AlertTriangle className="w-3 h-3" />
          <span>Advisory only — human review recommended</span>
        </div>
      )}

      {estimate.cached && (
        <p className="text-[10px] text-muted-foreground">Cached result</p>
      )}

      <div className="pt-1 border-t border-primary/10">
        <p className="text-[10px] text-muted-foreground italic">
          ⚠️ {estimate.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default AIPriceEstimateCard;
