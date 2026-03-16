import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, AlertTriangle } from "lucide-react";

interface AIWhyPanelProps {
  reasons: string[];
  module: string;
  className?: string;
  /** Indicates the AI result used a fallback */
  fallbackUsed?: boolean;
  /** Low confidence indicator */
  lowConfidence?: boolean;
}

const AIWhyPanel = ({
  reasons,
  module,
  className = "",
  fallbackUsed = false,
  lowConfidence = false,
}: AIWhyPanelProps) => {
  const [open, setOpen] = useState(false);

  // Graceful empty state — still render if fallback or low confidence
  if (reasons.length === 0 && !fallbackUsed && !lowConfidence) return null;

  return (
    <div className={`rounded-xl border border-border/50 bg-muted/30 ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Why this recommendation?</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1.5">
          {fallbackUsed && (
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>This result uses estimated data. Final assessment may differ.</span>
            </div>
          )}
          {lowConfidence && !fallbackUsed && (
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Low confidence — human review recommended before action.</span>
            </div>
          )}
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span>{r}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/60 pt-1 italic">
            AI module: {module} · Advisory only — final decisions are made by humans.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIWhyPanel;
