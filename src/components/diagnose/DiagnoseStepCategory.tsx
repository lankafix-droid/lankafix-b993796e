import { DIAGNOSE_CATEGORY_DISPLAY } from "@/engines/diagnoseEngine";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Printer, Home, ShoppingBag } from "lucide-react";
import type { CategoryCode } from "@/types/booking";

const ICON_MAP: Record<string, React.ElementType> = {
  Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Printer, Home, ShoppingBag,
};

interface Props {
  onSelect: (code: CategoryCode) => void;
  selected: CategoryCode | null;
}

const DiagnoseStepCategory = ({ onSelect, selected }: Props) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {DIAGNOSE_CATEGORY_DISPLAY.map((cat) => {
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
);

export default DiagnoseStepCategory;