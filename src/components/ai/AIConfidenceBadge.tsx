import { Badge } from "@/components/ui/badge";
import { getConfidenceBand } from "@/lib/aiConfidence";

interface AIConfidenceBadgeProps {
  score: number;
  showScore?: boolean;
  className?: string;
  /** Indicates fallback data was used */
  fallbackUsed?: boolean;
  /** Indicates a degraded/unknown state (e.g. fraud scan could not complete) */
  degraded?: boolean;
}

const BAND_STYLES = {
  high: "bg-green-500/10 text-green-700 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  low: "bg-red-500/10 text-red-700 border-red-500/20",
  degraded: "bg-muted text-muted-foreground border-border",
} as const;

const BAND_LABELS = {
  high: "High Confidence",
  medium: "Medium",
  low: "Low — Review Needed",
  degraded: "Unavailable",
} as const;

const AIConfidenceBadge = ({
  score,
  showScore = true,
  className = "",
  fallbackUsed = false,
  degraded = false,
}: AIConfidenceBadgeProps) => {
  if (degraded) {
    return (
      <Badge variant="outline" className={`text-[10px] font-medium ${BAND_STYLES.degraded} ${className}`}>
        {BAND_LABELS.degraded}
      </Badge>
    );
  }

  const band = fallbackUsed ? "low" : getConfidenceBand(score);
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium ${BAND_STYLES[band]} ${className}`}
    >
      {showScore && <span className="font-bold mr-1">{Math.round(score)}%</span>}
      {fallbackUsed ? "Estimated" : BAND_LABELS[band]}
    </Badge>
  );
};

export default AIConfidenceBadge;
