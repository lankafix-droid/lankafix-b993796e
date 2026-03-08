import type { V2FlowOption } from "@/data/v2CategoryFlows";
import { CheckCircle2 } from "lucide-react";

interface Props {
  options: V2FlowOption[];
  selected: string;
  onSelect: (id: string) => void;
  title: string;
}

const V2ServiceSelection = ({ options, selected, onSelect, title }: Props) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{opt.label}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default V2ServiceSelection;
