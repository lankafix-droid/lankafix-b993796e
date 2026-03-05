import { getUrgencyOptions } from "@/engines/diagnoseEngine";
import { Zap, Clock, CalendarDays, Timer } from "lucide-react";
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
  onSelect: (urgency: string) => void;
  selected: string | null;
}

const DiagnoseStepUrgency = ({ categoryCode, onSelect, selected }: Props) => {
  const options = getUrgencyOptions(categoryCode);

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const Icon = URGENCY_ICONS[opt.key] ?? Clock;
        const isSelected = selected === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            aria-label={`Select urgency: ${opt.label}`}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DiagnoseStepUrgency;
