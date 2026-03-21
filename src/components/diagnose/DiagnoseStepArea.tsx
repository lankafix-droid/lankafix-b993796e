/**
 * DiagnoseStepArea — Area selection with inline serviceability awareness.
 * Shows coverage status, travel surcharge warnings, and outside-area messaging.
 */
import { MapPin, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";
import { trackServiceabilityCheck } from "@/lib/marketplaceAnalytics";

type CoverageStatus = "inside" | "edge" | "outside";

interface Area {
  name: string;
  status: CoverageStatus;
  hint?: string;
}

const AREAS: Area[] = [
  { name: "Colombo (1–15)",          status: "inside" },
  { name: "Rajagiriya / Battaramulla", status: "inside" },
  { name: "Nugegoda / Maharagama",   status: "inside" },
  { name: "Dehiwala / Mt. Lavinia",  status: "inside" },
  { name: "Nawala / Narahenpita",    status: "inside" },
  { name: "Thalawathugoda / Kotte",  status: "inside" },
  { name: "Wattala / Ja-Ela",        status: "inside" },
  { name: "Moratuwa / Piliyandala",  status: "edge", hint: "Travel surcharge may apply (Rs. 300–500)" },
  { name: "Negombo",                 status: "edge", hint: "Travel surcharge may apply (Rs. 500–800)" },
  { name: "Other area",              status: "outside" },
];

const COVERAGE_BADGES: Record<CoverageStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  inside:  { label: "Full Coverage",     icon: CheckCircle2, className: "text-green-700 bg-green-500/10" },
  edge:    { label: "Extended Zone",     icon: Clock,        className: "text-amber-700 bg-amber-500/10" },
  outside: { label: "Limited Coverage",  icon: AlertTriangle, className: "text-muted-foreground bg-muted" },
};

interface Props {
  onSelect: (area: string) => void;
  selected: string | null;
}

export default function DiagnoseStepArea({ onSelect, selected }: Props) {
  const selectedArea = AREAS.find(a => a.name === selected);

  return (
    <div className="space-y-3">
      {/* Area list */}
      <div className="space-y-1.5">
        {AREAS.map((area) => {
          const isSelected = selected === area.name;
          const isOutside = area.status === "outside";
          const badge = COVERAGE_BADGES[area.status];
          const BadgeIcon = badge.icon;

          return (
            <button
              key={area.name}
              onClick={() => onSelect(area.name)}
              aria-label={`Select area: ${area.name}`}
              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : isOutside
                  ? "border-border/40 bg-muted/30 hover:border-border/60"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <MapPin className={`w-4 h-4 shrink-0 ${
                isSelected ? "text-primary" : isOutside ? "text-muted-foreground/50" : "text-muted-foreground"
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium block ${
                  isSelected ? "text-primary" : isOutside ? "text-muted-foreground" : "text-foreground"
                }`}>
                  {area.name}
                </span>
                {area.hint && (
                  <span className="text-[10px] text-amber-600 font-medium">{area.hint}</span>
                )}
                {isOutside && (
                  <span className="text-[10px] text-muted-foreground">We'll check availability for your area</span>
                )}
              </div>
              <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 shrink-0 flex items-center gap-1 ${badge.className}`}>
                <BadgeIcon className="w-2.5 h-2.5" />
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contextual coverage message */}
      {selectedArea && selectedArea.status === "outside" && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Limited coverage area</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                We're expanding to your area soon. Submit your request and our team will check technician availability.
                If we can't service your location yet, we'll let you know honestly — no wasted time.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedArea && selectedArea.status === "edge" && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Extended service zone</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Technicians are available in your area. A small travel surcharge may apply — you'll see the exact amount before confirming.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
