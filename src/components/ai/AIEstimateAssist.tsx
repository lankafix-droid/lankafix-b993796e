/**
 * AIEstimateAssist — Price estimation advisory panel.
 * Uses hardened aiPriceEstimation service.
 * NEVER writes or mutates booking price fields.
 */
import { useCallback } from "react";
import { useAIAdvisory } from "@/hooks/useAIAdvisory";
import { estimatePrice, formatPriceRange, type PriceEstimate } from "@/services/aiPriceEstimation";
import { TrendingUp } from "lucide-react";
import AIAdvisoryFooter from "./AIAdvisoryFooter";
import AIConsentGate from "./AIConsentGate";
import AIConfidenceBadge from "./AIConfidenceBadge";

interface AIEstimateAssistProps {
  categoryCode: string;
  issueType?: string;
  className?: string;
}

const AIEstimateAssist = ({ categoryCode, issueType, className = "" }: AIEstimateAssistProps) => {
  // Safe execution guard
  if (!categoryCode) return null;

  const serviceFn = useCallback(
    () => estimatePrice(categoryCode, issueType),
    [categoryCode, issueType]
  );

  const advisory = useAIAdvisory<PriceEstimate>({
    featureFlag: "ai_estimate_assist",
    moduleName: "ai_estimate_assist",
    serviceFn,
    getConfidence: (d) => d.confidence.confidence_score,
    getFallbackUsed: (d) => d.fallback_used,
    getCached: (d) => !!d.cached,
    deps: [categoryCode, issueType],
    analyticsEvent: "ai_estimate_viewed",
    analyticsPayload: { categoryCode, issueType },
  });

  // Consent gate
  if (advisory.blockedByConsent && advisory.requiredConsent) {
    return (
      <AIConsentGate
        requiredConsent={advisory.requiredConsent}
        moduleName="ai_estimate_assist"
        onConsented={advisory.execute}
        className={className}
      />
    );
  }

  // Loading
  if (advisory.loading) {
    return (
      <div className={`rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2 animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-6 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
    );
  }

  // No result / feature disabled
  if (!advisory.data) return null;

  const estimate = advisory.data;

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

      <AIAdvisoryFooter
        module="ai_estimate_assist"
        confidence={estimate.confidence.confidence_score}
        fallbackUsed={estimate.fallback_used}
        cached={advisory.cached}
        disclaimer={estimate.disclaimer}
      />
    </div>
  );
};

export default AIEstimateAssist;
