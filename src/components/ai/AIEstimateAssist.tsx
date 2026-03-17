/**
 * AIEstimateAssist — Price estimation advisory panel.
 * Uses hardened aiPriceEstimation service.
 * NEVER writes or mutates booking price fields.
 */
import { useCallback } from "react";
import { useAIAdvisory } from "@/hooks/useAIAdvisory";
import { estimatePrice, formatPriceRange, type PriceEstimate } from "@/services/aiPriceEstimation";
import { TrendingUp, Info } from "lucide-react";
import AIAdvisoryFooter from "./AIAdvisoryFooter";
import AIConsentGate from "./AIConsentGate";
import AIConfidenceBadge from "./AIConfidenceBadge";
import AIEmptyState from "./AIEmptyState";
import { canRunEstimate } from "@/lib/aiExecutionGuards";

interface AIEstimateAssistProps {
  categoryCode: string;
  issueType?: string;
  className?: string;
}

const AIEstimateAssist = ({ categoryCode, issueType, className = "" }: AIEstimateAssistProps) => {
  const serviceFn = useCallback(
    () => estimatePrice(categoryCode || "_NONE_", issueType),
    [categoryCode, issueType]
  );

  const advisory = useAIAdvisory<PriceEstimate>({
    featureFlag: "ai_estimate_assist",
    moduleName: "ai_estimate_assist",
    serviceFn,
    getConfidence: (d) => d.confidence.confidence_score,
    getFallbackUsed: (d) => d.fallback_used,
    getCached: (d) => !!d.cached,
    autoExecute: canRunEstimate(categoryCode),
    deps: [categoryCode, issueType],
    analyticsEvent: "ai_estimate_viewed",
    analyticsPayload: { categoryCode, issueType },
  });

  // Safe execution guard — no category means no estimate
  if (!canRunEstimate(categoryCode)) return null;

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

  // Feature disabled
  if (!advisory.available && advisory.error === "Feature disabled") return null;

  // No result
  if (!advisory.data) {
    return <AIEmptyState mode="no_data" title="No price estimate available" className={className} />;
  }

  const estimate = advisory.data;
  const lowConfidence = estimate.confidence.confidence_score > 0 && estimate.confidence.confidence_score < 50;

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

      {/* Trust messaging */}
      <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>Estimated range only — final quote after technician inspection.</span>
      </div>

      {/* Fallback/degraded notice */}
      {advisory.fallback_used && (
        <div className="rounded-md bg-amber-500/5 border border-amber-500/20 px-2.5 py-1.5 text-[10px] text-amber-700">
          Using estimated guidance due to limited data.
        </div>
      )}

      {/* Low confidence warning */}
      {lowConfidence && !advisory.fallback_used && (
        <div className="rounded-md bg-amber-500/5 border border-amber-500/20 px-2.5 py-1.5 text-[10px] text-amber-700">
          Low confidence — final price may vary significantly.
        </div>
      )}

      <AIOperatorFeedback module="ai_estimate_assist" className="pt-1" />

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
