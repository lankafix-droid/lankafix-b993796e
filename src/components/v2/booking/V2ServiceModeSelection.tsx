import type { V2ServiceMode } from "@/data/v2CategoryFlows";
import { CheckCircle2, MapPin, Truck, Zap, Search, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  modes: V2ServiceMode[];
  selected: string;
  onSelect: (id: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  MapPin: <MapPin className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Search: <Search className="w-5 h-5" />,
  Monitor: <Monitor className="w-5 h-5" />,
};

const V2ServiceModeSelection = ({ modes, selected, onSelect }: Props) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Service Mode</h2>
        <p className="text-sm text-muted-foreground mt-1">How would you like the service delivered?</p>
      </div>

      <div className="space-y-3">
        {modes.map((mode) => {
          const isSelected = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {ICON_MAP[mode.icon] || <MapPin className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{mode.label}</h3>
                    {mode.extraFee && mode.extraFee > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                        +LKR {mode.extraFee.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{mode.description}</p>
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

export default V2ServiceModeSelection;
