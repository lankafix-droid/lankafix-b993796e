/**
 * MatchReasoningPanel — Expandable match explainability panel
 * Shows confidence tier, factor breakdown bars, and human-readable reasoning.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatchIntelligence, MatchFactor } from "@/engines/matchIntelligenceEngine";
import {
  MapPin, Wrench, Star, Zap, Activity, CheckCircle2, AlertTriangle,
  ChevronDown, Brain, Info, ShieldCheck,
} from "lucide-react";

const ICON_MAP: Record<string, typeof MapPin> = {
  MapPin, Wrench, Star, Zap, Activity, CheckCircle2, AlertTriangle,
};

const SENTIMENT_COLORS = {
  positive: "bg-success",
  neutral: "bg-primary",
  caution: "bg-warning",
} as const;

const TIER_STYLES: Record<string, string> = {
  excellent: "bg-success/10 text-success border-success/20",
  strong: "bg-primary/10 text-primary border-primary/20",
  good: "bg-primary/10 text-primary border-primary/20",
  fair: "bg-warning/10 text-warning border-warning/20",
  limited: "bg-warning/10 text-warning border-warning/20",
};

interface Props {
  intelligence: MatchIntelligence;
  compact?: boolean;
  className?: string;
}

function FactorBar({ factor }: { factor: MatchFactor }) {
  const Icon = ICON_MAP[factor.icon] || Info;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3 h-3", factor.sentiment === "positive" ? "text-success" : factor.sentiment === "caution" ? "text-warning" : "text-primary")} />
          <span className="text-[11px] font-medium text-foreground">{factor.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{factor.weighted}/{Math.round(factor.weight * 100)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className={cn("h-full rounded-full", SENTIMENT_COLORS[factor.sentiment])}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{factor.reason}</p>
    </div>
  );
}

export default function MatchReasoningPanel({ intelligence, compact = false, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { confidenceScore, confidenceTier, tierLabel, factors, topReasons, cautionReasons, matchSummary, reliabilityNote } = intelligence;

  // Compact mode — just the confidence badge + summary
  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full text-left bg-muted/30 rounded-xl p-3 transition-all hover:bg-muted/50",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Match Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] font-semibold", TIER_STYLES[confidenceTier])}>
              {confidenceScore}% · {tierLabel}
            </Badge>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2.5">
                {factors.filter(f => f.id !== "emergency" || f.sentiment !== "neutral").map(f => (
                  <FactorBar key={f.id} factor={f} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    );
  }

  // Full panel
  return (
    <div className={cn("bg-card rounded-2xl border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Match Intelligence</h4>
            <p className="text-[10px] text-muted-foreground">Why this technician was matched</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs font-bold px-2.5 py-1", TIER_STYLES[confidenceTier])}>
          {confidenceScore}%
        </Badge>
      </div>

      {/* Confidence tier bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn("text-xs font-semibold", `text-${intelligence.tierColor}`)}>
            {tierLabel}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidenceScore}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-gradient-brand"
          />
        </div>
      </div>

      {/* Top reasons chips */}
      {topReasons.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {topReasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-1 bg-success/8 text-success text-[10px] font-medium px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                <span className="line-clamp-1">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factor breakdown */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-t border-border/30 hover:bg-muted/30 transition-colors"
      >
        <span className="text-[11px] font-medium text-muted-foreground">Detailed factor breakdown</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {factors.map(f => (
                <FactorBar key={f.id} factor={f} />
              ))}
            </div>

            {/* Caution reasons */}
            {cautionReasons.length > 0 && (
              <div className="px-4 pb-3">
                <div className="bg-warning/5 border border-warning/15 rounded-lg p-2.5 space-y-1">
                  {cautionReasons.map((r, i) => (
                    <p key={i} className="text-[10px] text-warning flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      {r}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Reliability note */}
            <div className="px-4 pb-4">
              <div className="bg-muted/30 rounded-lg p-2.5 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">{reliabilityNote}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary footer */}
      <div className="px-4 py-2.5 bg-muted/20 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground">{matchSummary}</p>
      </div>
    </div>
  );
}
