/**
 * AIOperatorFeedback — Lightweight operator feedback controls for AI advisory cards.
 * Logs feedback as analytics only. NEVER alters marketplace state.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { trackAIAnalytics } from "@/services/aiEventTracking";

interface AIOperatorFeedbackProps {
  module: string;
  bookingId?: string;
  className?: string;
}

type FeedbackType = "helpful" | "not_helpful" | "inaccurate";

const AIOperatorFeedback = ({
  module,
  bookingId,
  className = "",
}: AIOperatorFeedbackProps) => {
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null);

  const handleFeedback = (type: FeedbackType) => {
    setSubmitted(type);
    trackAIAnalytics("ai_operator_feedback", {
      module,
      feedback: type,
      bookingId,
    });
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground ${className}`}>
        <span>Feedback recorded: {submitted === "helpful" ? "👍 Helpful" : submitted === "not_helpful" ? "👎 Not helpful" : "🚩 Inaccurate"}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-[10px] text-muted-foreground mr-1">Was this helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => handleFeedback("helpful")}
        title="Helpful"
      >
        <ThumbsUp className="w-3 h-3 text-muted-foreground hover:text-green-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => handleFeedback("not_helpful")}
        title="Not helpful"
      >
        <ThumbsDown className="w-3 h-3 text-muted-foreground hover:text-amber-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => handleFeedback("inaccurate")}
        title="Inaccurate"
      >
        <Flag className="w-3 h-3 text-muted-foreground hover:text-red-600" />
      </Button>
    </div>
  );
};

export default AIOperatorFeedback;
