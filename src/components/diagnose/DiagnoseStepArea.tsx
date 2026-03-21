import { MapPin, AlertTriangle } from "lucide-react";

const AREAS = [
  { name: "Colombo (1–15)", status: "inside" as const },
  { name: "Rajagiriya / Battaramulla", status: "inside" as const },
  { name: "Nugegoda / Maharagama", status: "inside" as const },
  { name: "Dehiwala / Mt. Lavinia", status: "inside" as const },
  { name: "Wattala / Ja-Ela", status: "inside" as const },
  { name: "Moratuwa / Piliyandala", status: "edge" as const },
  { name: "Negombo", status: "edge" as const },
  { name: "Other area", status: "outside" as const },
];

interface Props {
  onSelect: (area: string) => void;
  selected: string | null;
}

const DiagnoseStepArea = ({ onSelect, selected }: Props) => (
  <div className="space-y-2">
    {AREAS.map((area) => {
      const isSelected = selected === area.name;
      const isOutside = area.status === "outside";
      const isEdge = area.status === "edge";

      return (
        <button
          key={area.name}
          onClick={() => onSelect(area.name)}
          aria-label={`Select area: ${area.name}`}
          className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 ${
            isSelected
              ? "border-primary bg-primary/5 shadow-md"
              : isOutside
              ? "border-border/30 bg-muted/20 hover:border-border/50"
              : "border-border bg-card hover:border-primary/30"
          }`}
        >
          {isOutside ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          ) : (
            <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
          )}
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-medium block ${isSelected ? "text-primary" : isOutside ? "text-muted-foreground" : "text-foreground"}`}>
              {area.name}
            </span>
            {isEdge && (
              <span className="text-[10px] text-amber-600 font-medium">Travel surcharge may apply</span>
            )}
            {isOutside && (
              <span className="text-[10px] text-muted-foreground">Limited coverage — we'll check availability</span>
            )}
          </div>
          {area.status === "inside" && (
            <span className="text-[9px] font-bold text-green-700 bg-green-500/10 rounded-full px-2 py-0.5 shrink-0">Covered</span>
          )}
        </button>
      );
    })}
  </div>
);

export default DiagnoseStepArea;
