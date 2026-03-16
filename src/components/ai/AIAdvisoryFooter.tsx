/**
 * AIAdvisoryFooter — Shared reusable meta bar for all AI advisory cards.
 * Renders: confidence badge, fallback/degraded state, cached state,
 * advisory-only note, human confirmation note when confidence is low.
 */
import AIConfidenceBadge from "./AIConfidenceBadge";
import { AlertTriangle, Clock, Sparkles, UserCheck } from "lucide-react";

interface AIAdvisoryFooterProps {
  /** Module identifier for labeling */
  module: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Whether fallback/estimated data was used */
  fallbackUsed?: boolean;
  /** Whether result is degraded/unavailable */
  degraded?: boolean;
  /** Whether this was served from cache */
  cached?: boolean;
  /** Custom advisory disclaimer (overrides default) */
  disclaimer?: string;
  className?: string;
}

const AIAdvisoryFooter = ({
  module,
  confidence,
  fallbackUsed = false,
  degraded = false,
  cached = false,
  disclaimer,
  className = "",
}: AIAdvisoryFooterProps) => {
  return (
    <div className={`space-y-1.5 pt-2 border-t border-border/20 ${className}`}>
      {/* Status indicators row */}
      <div className="flex items-center flex-wrap gap-2">
        <AIConfidenceBadge
          score={confidence}
          fallbackUsed={fallbackUsed}
          degraded={degraded}
        />

        {cached && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            Cached
          </span>
        )}

        {fallbackUsed && !degraded && (
          <span className="flex items-center gap-1 text-[10px] text-destructive">
            <AlertTriangle className="w-2.5 h-2.5" />
            Estimated data
          </span>
        )}

        {degraded && (
          <span className="flex items-center gap-1 text-[10px] text-destructive">
            <AlertTriangle className="w-2.5 h-2.5" />
            Service unavailable
          </span>
        )}
      </div>

      {/* Low confidence warning */}
      {confidence > 0 && confidence < 50 && !degraded && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <UserCheck className="w-3 h-3 shrink-0" />
          <span>Low confidence — human confirmation recommended before action.</span>
        </div>
      )}

      {/* Advisory-only disclaimer */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
        <Sparkles className="w-2.5 h-2.5 shrink-0" />
        <span>
          {disclaimer || "Advisory only — final decisions are made by humans."}
          {" · "}AI module: {module}
        </span>
      </div>
    </div>
  );
};

export default AIAdvisoryFooter;
