import { DIAGNOSE_CATEGORY_DISPLAY } from "@/engines/diagnoseEngine";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Printer, Home, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CategoryCode } from "@/types/booking";

const ICON_MAP: Record<string, React.ElementType> = {
  Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Printer, Home, ShoppingBag,
};

const PHASE1_CODES = ["AC", "CCTV", "MOBILE", "IT"];

interface Props {
  onSelect: (code: CategoryCode) => void;
  selected: CategoryCode | null;
}

const DiagnoseStepCategory = ({ onSelect, selected }: Props) => {
  const phase1 = DIAGNOSE_CATEGORY_DISPLAY.filter(c => PHASE1_CODES.includes(c.code));
  const phase2 = DIAGNOSE_CATEGORY_DISPLAY.filter(c => !PHASE1_CODES.includes(c.code));

  return (
    <div className="space-y-6">
      {/* Phase 1 - Active */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        {phase1.map((cat) => {
          const Icon = ICON_MAP[cat.icon] ?? Monitor;
          const isSelected = selected === cat.code;
          return (
            <button
              key={cat.code}
              onClick={() => onSelect(cat.code)}
              aria-label={`Select ${cat.label}`}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center min-h-[100px] justify-center ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <Icon className={`w-7 h-7 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Phase 2 - Coming Soon */}
      {phase2.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">More services — coming soon</p>
          <div className="grid grid-cols-3 gap-2">
            {phase2.map((cat) => {
              const Icon = ICON_MAP[cat.icon] ?? Monitor;
              return (
                <div
                  key={cat.code}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-muted/30 opacity-50 text-center"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{cat.label}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-warning/30 text-warning">Soon</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnoseStepCategory;