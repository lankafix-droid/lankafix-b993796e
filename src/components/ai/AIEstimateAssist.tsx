/**
 * AIEstimateAssist — Price estimation advisory panel.
 * Uses hardened aiPriceEstimation service.
 * NEVER writes or mutates booking price fields.
 */
import { useCallback } from "react";
import { useAIAdvisory } from "@/hooks/useAIAdvisory";
import { estimatePrice, formatPriceRange, type PriceEstimate } from "@/services/aiPriceEstimation";
import AIPriceEstimateCard from "./AIPriceEstimateCard";
import AIConsentGate from "./AIConsentGate";

interface AIEstimateAssistProps {
  categoryCode: string;
  issueType?: string;
  className?: string;
}

const AIEstimateAssist = ({ categoryCode, issueType, className = "" }: AIEstimateAssistProps) => {
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

  return (
    <AIPriceEstimateCard
      estimate={advisory.data}
      loading={advisory.loading}
      className={className}
    />
  );
};

export default AIEstimateAssist;
