/**
 * UrgencyStep — Step 4: Select urgency and service mode.
 */
import { Clock } from "lucide-react";

interface UrgencyStepProps {
  urgencyOptions: { id: string; label: string; hint?: string }[];
  serviceModes: { id: string; label: string; available: boolean }[];
  selectedUrgency: string;
  selectedMode: string;
  onSelectUrgency: (v: string) => void;
  onSelectMode: (v: string) => void;
}

export default function UrgencyStep({
  urgencyOptions, serviceModes, selectedUrgency, selectedMode, onSelectUrgency, onSelectMode,
}: UrgencyStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">When do you need this?</h2>
        <p className="text-sm text-muted-foreground mt-1">This helps us match the right technician</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {urgencyOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelectUrgency(opt.id)}
            className={`p-4 rounded-xl border text-left transition-all active:scale-[0.97] ${
              selectedUrgency === opt.id ? "border-primary bg-primary/5" : "border-border/40 bg-card hover:border-primary/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${selectedUrgency === opt.id ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
            </div>
            {opt.hint && <p className="text-[10px] text-muted-foreground">{opt.hint}</p>}
          </button>
        ))}
      </div>
      {serviceModes.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Service Mode</h3>
          <div className="flex gap-2.5 flex-wrap">
            {serviceModes.filter((m) => m.available).map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedMode === mode.id ? "border-primary bg-primary/5 text-primary" : "border-border/40 bg-card text-foreground hover:border-primary/20"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
