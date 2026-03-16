import AICopilotCard from "./AICopilotCard";

export interface AIRecommendation {
  id: string;
  title: string;
  recommendation: string;
  confidence: number;
  module: string;
  reasons?: string[];
}

interface AIRecommendationStackProps {
  recommendations: AIRecommendation[];
  maxVisible?: number;
  actions?: (rec: AIRecommendation) => React.ReactNode;
  className?: string;
}

const AIRecommendationStack = ({
  recommendations,
  maxVisible = 5,
  actions,
  className = "",
}: AIRecommendationStackProps) => {
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
