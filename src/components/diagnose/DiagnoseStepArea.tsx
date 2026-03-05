import { MapPin } from "lucide-react";

const AREAS = [
  "Greater Colombo",
  "Dehiwala",
  "Nugegoda",
  "Maharagama",
  "Rajagiriya",
  "Battaramulla",
  "Wattala",
];

interface Props {
  onSelect: (area: string) => void;
  selected: string | null;
}

const DiagnoseStepArea = ({ onSelect, selected }: Props) => (
  <div className="space-y-2">
    {AREAS.map((area) => {
      const isSelected = selected === area;
      return (
        <button
          key={area}
          onClick={() => onSelect(area)}
          aria-label={`Select area: ${area}`}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
            isSelected
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
            {area}
          </span>
        </button>
      );
    })}
  </div>
);

export default DiagnoseStepArea;
