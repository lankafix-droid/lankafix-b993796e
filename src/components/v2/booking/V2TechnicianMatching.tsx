import type { CategoryCode } from "@/types/booking";
import { matchTechnician, getZoneIntelligence } from "@/engines/matchingEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, MapPin, Zap, Users, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  categoryCode: CategoryCode;
  filter: "auto" | "fastest" | "top_rated" | "preferred_time";
  onFilterChange: (f: "auto" | "fastest" | "top_rated" | "preferred_time") => void;
  onConfirm: () => void;
}

const FILTERS = [
  { id: "auto" as const, label: "Auto Match", icon: Zap },
  { id: "fastest" as const, label: "Fastest", icon: Clock },
  { id: "top_rated" as const, label: "Top Rated", icon: Star },
  { id: "preferred_time" as const, label: "Schedule", icon: Clock },
];

const V2TechnicianMatching = ({ categoryCode, filter, onFilterChange, onConfirm }: Props) => {
  const [isMatching, setIsMatching] = useState(true);
  const [match, setMatch] = useState<ReturnType<typeof matchTechnician> | null>(null);
  const zoneIntel = getZoneIntelligence("col_07");

  useEffect(() => {
    setIsMatching(true);
    const timer = setTimeout(() => {
      const result = matchTechnician(categoryCode, "col_07", false);
      setMatch(result);
      setIsMatching(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [categoryCode, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Technician Assignment</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll match you with the best available technician</p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Matching animation */}
      {isMatching && (
        <div className="bg-card rounded-xl border p-8 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">Finding the best technician...</p>
            <p className="text-sm text-muted-foreground">{zoneIntel.techsNearby} technicians nearby</p>
          </div>
        </div>
      )}

      {/* Match result */}
      {!isMatching && match?.technician && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {match.technician.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{match.technician.name}</h3>
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{match.technician.partnerName}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1 text-warning">
                  <Star className="w-3.5 h-3.5 fill-warning" /> {match.technician.rating}
                </span>
                <span className="text-muted-foreground">{match.technician.jobsCompleted} jobs</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> {match.technician.eta}
                </span>
              </div>
            </div>
          </div>

          {/* Match details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{match.confidenceScore}%</div>
              <div className="text-xs text-muted-foreground">Match Score</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{match.distanceKm} km</div>
              <div className="text-xs text-muted-foreground">Distance</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{match.etaRange}</div>
              <div className="text-xs text-muted-foreground">ETA</div>
            </div>
          </div>

          {match.extendedCoverage && (
            <div className="flex items-center gap-2 bg-warning/5 border border-warning/20 rounded-lg p-3 text-sm">
              <MapPin className="w-4 h-4 text-warning shrink-0" />
              <span className="text-muted-foreground">Extended coverage — technician from nearby zone</span>
            </div>
          )}
        </div>
      )}

      {/* Zone intelligence */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Technicians in your area</span>
        <span className="font-medium text-foreground">{zoneIntel.techsNearby} available</span>
      </div>

      <Button onClick={onConfirm} disabled={isMatching} size="lg" className="w-full gap-2">
        <CheckCircle2 className="w-4 h-4" /> Confirm Booking
      </Button>
    </div>
  );
};

export default V2TechnicianMatching;
