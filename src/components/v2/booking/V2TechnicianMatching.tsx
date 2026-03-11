import type { CategoryCode } from "@/types/booking";
import { useSmartDispatch } from "@/hooks/useSmartDispatch";
import { useOnlinePartners } from "@/hooks/usePartners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, MapPin, Zap, Users, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
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
  // Use real smart dispatch backed by the database
  const dispatch = useSmartDispatch(categoryCode, false, undefined, undefined, true);
  const { phase, bestMatch, totalEligible, refresh } = dispatch;
  const tech = bestMatch?.partner;

  // Get real nearby count from DB
  const { data: onlinePartners } = useOnlinePartners(categoryCode);
  const nearbyCount = onlinePartners?.length || 0;

  const isSearching = phase === "loading" || phase === "searching";
  const noMatch = phase === "no_match" || phase === "escalated" || phase === "error";

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

      {/* Searching animation */}
      {isSearching && (
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
            <p className="text-sm text-muted-foreground">
              {nearbyCount > 0 ? `${nearbyCount} verified technicians in your area` : "Searching verified providers..."}
            </p>
          </div>
        </div>
      )}

      {/* No match — production-safe fallback */}
      {!isSearching && noMatch && (
        <div className="bg-card rounded-xl border border-warning/20 p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <p className="font-medium text-foreground">No verified provider available right now</p>
          <p className="text-sm text-muted-foreground">
            We're actively onboarding providers in your area. You can still book and we'll assign one as soon as possible.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
            <Button size="sm" onClick={onConfirm} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Book Anyway
            </Button>
          </div>
        </div>
      )}

      {/* Match result — real verified provider */}
      {!isSearching && !noMatch && tech && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {tech.profile_photo_url ? (
                <img src={tech.profile_photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                tech.full_name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{tech.full_name}</h3>
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </Badge>
              </div>
              {tech.business_name && (
                <p className="text-sm text-muted-foreground">{tech.business_name}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1 text-warning">
                  <Star className="w-3.5 h-3.5 fill-warning" /> {(tech.rating_average || 0).toFixed(1)}
                </span>
                <span className="text-muted-foreground">{tech.completed_jobs_count || 0} jobs</span>
                {bestMatch?.eta_minutes && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> ~{bestMatch.eta_minutes} min
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Match details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{bestMatch?.score?.total || 0}%</div>
              <div className="text-xs text-muted-foreground">Match Score</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{bestMatch?.distance_km || "?"} km</div>
              <div className="text-xs text-muted-foreground">Distance</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{bestMatch?.etaRangeLabel || "—"}</div>
              <div className="text-xs text-muted-foreground">ETA</div>
            </div>
          </div>
        </div>
      )}

      {/* Nearby count */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Verified technicians in your area</span>
        <span className="font-medium text-foreground">{nearbyCount} available</span>
      </div>

      <Button onClick={onConfirm} disabled={isSearching} size="lg" className="w-full gap-2">
        <CheckCircle2 className="w-4 h-4" /> Confirm Booking
      </Button>
    </div>
  );
};

export default V2TechnicianMatching;
