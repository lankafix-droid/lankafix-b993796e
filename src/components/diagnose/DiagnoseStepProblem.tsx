import { useState } from "react";
import { CATEGORY_PROBLEMS } from "@/engines/diagnoseEngine";
import { getProblemGuidance } from "@/lib/intakeIntelligence";
import { AlertCircle, AlertTriangle, Search, Lightbulb, ShieldCheck } from "lucide-react";
import type { CategoryCode } from "@/types/booking";

interface Props {
  categoryCode: CategoryCode;
  onSelect: (problemKey: string) => void;
  selected: string | null;
}

const DiagnoseStepProblem = ({ categoryCode, onSelect, selected }: Props) => {
  const problems = CATEGORY_PROBLEMS[categoryCode] ?? [];
  const selectedGuidance = selected ? getProblemGuidance(categoryCode, selected) : null;

  return (
    <div className="space-y-3">
      {problems.map((p) => {
        const isSelected = selected === p.key;
        const isNotSure = p.key === "not_sure";
        const guidance = getProblemGuidance(categoryCode, p.key);

        return (
          <button
            key={p.key}
            onClick={() => onSelect(p.key)}
            aria-label={`Select problem: ${p.label}`}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              {guidance.safetyFlag ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              ) : isNotSure ? (
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : guidance.inspectionNeeded ? (
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : null}
              <span className={`text-sm font-medium flex-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
                {p.label}
              </span>
              {guidance.tagLabel && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  guidance.safetyFlag
                    ? "bg-amber-500/10 text-amber-700"
                    : guidance.inspectionNeeded
                    ? "bg-accent/10 text-accent"
                    : "bg-primary/10 text-primary"
                }`}>
                  {guidance.tagLabel}
                </span>
              )}
            </div>
          </button>
        );
      })}

      {/* Contextual guidance panel after selection */}
      {selectedGuidance && (
        <div className={`mt-3 rounded-2xl p-4 border ${
          selectedGuidance.safetyFlag
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            : "bg-muted/30 border-border/50"
        }`}>
          <div className="flex items-start gap-2.5">
            {selectedGuidance.safetyFlag ? (
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedGuidance.hint}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnoseStepProblem;
