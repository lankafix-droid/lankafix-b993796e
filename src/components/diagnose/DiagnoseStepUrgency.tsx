import { getUrgencyOptions } from "@/engines/diagnoseEngine";
import { getRecommendedUrgency } from "@/lib/intakeIntelligence";
import { Zap, Clock, CalendarDays, Timer, Sparkles } from "lucide-react";
import type { CategoryCode } from "@/types/booking";

const URGENCY_ICONS: Record<string, React.ElementType> = {
  emergency: Zap,
  same_day: Clock,
  within_24h: CalendarDays,
  next_day: CalendarDays,
  flexible: Timer,
};

interface Props {
  categoryCode: CategoryCode;
  problemKey?: string | null;
  onSelect: (urgency: string) => void;
  selected: string | null;
}

const DiagnoseStepUrgency = ({ categoryCode, problemKey, onSelect, selected }: Props) => {
  const options = getUrgencyOptions(categoryCode);
  const recommended = problemKey ? getRecommendedUrgency(categoryCode, problemKey) : null;

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const Icon = URGENCY_ICONS[opt.key] ?? Clock;
        const isSelected = selected === opt.key;
        const isRecommended = recommended === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            aria-label={`Select urgency: ${opt.label}`}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : isRecommended
                ? "border-primary/30 bg-primary/[0.02]"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                {isRecommended && !isSelected && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> Suggested
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DiagnoseStepUrgency;
