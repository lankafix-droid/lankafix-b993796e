import { TrendingUp, AlertTriangle } from "lucide-react";
import AIConfidenceBadge from "./AIConfidenceBadge";
import { formatPriceRange, type PriceEstimate } from "@/services/aiPriceEstimation";
import { isAIEnabled } from "@/config/aiFlags";

interface AIPriceEstimateCardProps {
  estimate: PriceEstimate;
  className?: string;
}

const AIPriceEstimateCard = ({ estimate, className = "" }: AIPriceEstimateCardProps) => {
  // Don't render if feature is disabled and no estimate data
  if (!isAIEnabled("ai_estimate_assist") && !estimate.fallback_used) {
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
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          <span>Using estimated ranges — final inspection may change result</span>
        </div>
      )}

      {estimate.confidence.confidence_score < 50 && !estimate.fallback_used && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          <span>Advisory only — human review recommended</span>
        </div>
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
