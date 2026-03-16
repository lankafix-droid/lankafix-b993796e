import { isAIEnabled, type AIFeatureFlags } from "@/config/aiFlags";
import AICopilotCard from "./AICopilotCard";

export interface AIRecommendation {
  id: string;
  title: string;
  recommendation: string;
  confidence: number;
  module: string;
  reasons?: string[];
  fallbackUsed?: boolean;
  cached?: boolean;
}

interface AIRecommendationStackProps {
  recommendations: AIRecommendation[];
  maxVisible?: number;
  actions?: (rec: AIRecommendation) => React.ReactNode;
  className?: string;
  /** Feature flag key to check before rendering */
  featureFlag?: keyof AIFeatureFlags;
  /** Show loading state */
  loading?: boolean;
  /** Shown when feature flag is disabled */
  disabledMessage?: string;
}

const AIRecommendationStack = ({
  recommendations,
  maxVisible = 5,
  actions,
  className = "",
  featureFlag,
  loading = false,
  disabledMessage,
}: AIRecommendationStackProps) => {
  // Feature flag guard
  if (featureFlag && !isAIEnabled(featureFlag)) {
    if (disabledMessage) {
      return (
        <div className={`text-center py-6 text-muted-foreground text-xs ${className}`}>
          {disabledMessage}
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2].map((i) => (
          <AICopilotCard
            key={i}
            title=""
            recommendation=""
            confidence={0}
            module=""
            loading
          />
        ))}
      </div>
    );
  }

  const visible = recommendations.slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground text-sm ${className}`}>
        No AI recommendations at this time.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {visible.map((rec) => (
        <AICopilotCard
          key={rec.id}
          title={rec.title}
          recommendation={rec.recommendation}
          confidence={rec.confidence}
          module={rec.module}
          reasons={rec.reasons}
          actions={actions?.(rec)}
          fallbackUsed={rec.fallbackUsed}
          cached={rec.cached}
        />
      ))}
      {recommendations.length > maxVisible && (
        <p className="text-center text-xs text-muted-foreground">
          +{recommendations.length - maxVisible} more recommendations
        </p>
      )}
    </div>
  );
};

export default AIRecommendationStack;
