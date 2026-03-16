import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface AIWhyPanelProps {
  reasons: string[];
  module: string;
  className?: string;
}

const AIWhyPanel = ({ reasons, module, className = "" }: AIWhyPanelProps) => {
  const [open, setOpen] = useState(false);

  if (reasons.length === 0) return null;

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
