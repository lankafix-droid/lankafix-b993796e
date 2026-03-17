/**
 * AITransparencyPanel — Reusable "Why am I seeing this?" panel for advisory modules.
 * Shows high-level reasoning, confidence, fallback/cached state.
 * NEVER exposes internal chain-of-thought or model details.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, AlertTriangle, Clock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIConfidenceBadge from "./AIConfidenceBadge";

interface AITransparencyPanelProps {
  module: string;
  reasons?: string[];
  confidence?: number;
  fallbackUsed?: boolean;
  cached?: boolean;
  className?: string;
  /** If true, starts expanded */
  defaultOpen?: boolean;
}

const AITransparencyPanel = ({
  module,
  reasons = [],
  confidence,
  fallbackUsed = false,
  cached = false,
  className = "",
  defaultOpen = false,
}: AITransparencyPanelProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const hasContent = reasons.length > 0 || fallbackUsed || cached || (confidence !== undefined && confidence > 0);
  if (!hasContent) return null;

  const humanConfirmRecommended = fallbackUsed || (confidence !== undefined && confidence < 50);

  return (
    <div className={`rounded-xl border border-border/40 bg-muted/20 ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Why am I seeing this?</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3 space-y-2 border-t border-border/30 pt-2">
          {/* Confidence */}
          {confidence !== undefined && confidence > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Confidence level</span>
              <AIConfidenceBadge score={confidence} fallbackUsed={fallbackUsed} />
            </div>
          )}

          {/* Status indicators */}
          <div className="flex flex-wrap gap-1.5">
            {cached && (
              <Badge variant="secondary" className="text-[9px] gap-1">
                <Database className="w-2.5 h-2.5" /> Cached result
              </Badge>
            )}
            {fallbackUsed && (
              <Badge variant="secondary" className="text-[9px] gap-1 text-amber-700 bg-amber-500/10 border-amber-500/20">
                <AlertTriangle className="w-2.5 h-2.5" /> Estimated data
              </Badge>
            )}
          </div>

          {/* Reasons */}
          {reasons.length > 0 && (
            <div className="space-y-1">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Human confirmation */}
          {humanConfirmRecommended && (
            <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-500/5 rounded-md px-2 py-1.5 border border-amber-500/15">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Human confirmation recommended before acting on this suggestion.</span>
            </div>
          )}

          {/* Module attribution */}
          <p className="text-[9px] text-muted-foreground/60 italic">
            Advisory only — suggestions from {module.replace(/_/g, " ")}. Final decisions are made by humans.
          </p>
        </div>
      )}
    </div>
  );
};

export default AITransparencyPanel;
