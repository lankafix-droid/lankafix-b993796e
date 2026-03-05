import { CATEGORY_PROBLEMS } from "@/engines/diagnoseEngine";
import { AlertCircle } from "lucide-react";
import type { CategoryCode } from "@/types/booking";

interface Props {
  categoryCode: CategoryCode;
  onSelect: (problemKey: string) => void;
  selected: string | null;
}

const DiagnoseStepProblem = ({ categoryCode, onSelect, selected }: Props) => {
  const problems = CATEGORY_PROBLEMS[categoryCode] ?? [];

  return (
    <div className="space-y-2">
      {problems.map((p) => {
        const isSelected = selected === p.key;
        const isNotSure = p.key === "not_sure";
        return (
          <button
            key={p.key}
            onClick={() => onSelect(p.key)}
            aria-label={`Select problem: ${p.label}`}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            {isNotSure && <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DiagnoseStepProblem;
