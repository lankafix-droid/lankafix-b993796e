import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import AIConfidenceBadge from "./AIConfidenceBadge";
import { formatPriceRange, type PriceEstimate } from "@/services/aiPriceEstimation";

interface AIPriceEstimateCardProps {
  estimate: PriceEstimate;
  className?: string;
}

const AIPriceEstimateCard = ({ estimate, className = "" }: AIPriceEstimateCardProps) => (
  <div className={`rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Estimated Price Range</span>
      </div>
      <AIConfidenceBadge score={estimate.confidence.confidence_score} />
    </div>
    <p className="text-lg font-bold text-primary">{formatPriceRange(estimate)}</p>
    <p className="text-xs text-muted-foreground">{estimate.recommended_service_type}</p>
    <div className="pt-1 border-t border-primary/10">
      <p className="text-[10px] text-muted-foreground italic">
        ⚠️ {estimate.disclaimer}
      </p>
    </div>
  </div>
);

export default AIPriceEstimateCard;
