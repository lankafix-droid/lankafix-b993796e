import type { CategoryCode } from "@/types/booking";
import { useSmartDispatch } from "@/hooks/useSmartDispatch";
import { useOnlinePartners } from "@/hooks/usePartners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, MapPin, Zap, Users, CheckCircle2, RefreshCw, AlertTriangle, Briefcase, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
  const dispatch = useSmartDispatch(categoryCode, false, undefined, undefined, true);
  const { phase, bestMatch, totalEligible, refresh } = dispatch;
  const tech = bestMatch?.partner;

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
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-8 text-center space-y-4 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-2 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
            <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Finding the best technician...</p>
            <p className="text-sm text-muted-foreground">
              {nearbyCount > 0 ? `${nearbyCount} verified technicians in your area` : "Searching verified providers..."}
            </p>
          </div>
        </motion.div>
      )}

      {/* No match — calm trust-first messaging */}
      {!isSearching && noMatch && (
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Our Team Is On It</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                All nearby technicians are currently on jobs. Our operations team has been notified and will assign the right technician for you shortly.
              </p>
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
            <span>Your booking is safe — no charges until a technician is confirmed</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="flex-1 gap-1.5 rounded-xl">
              <RefreshCw className="w-3.5 h-3.5" /> Check Again
            </Button>
            <Button size="sm" onClick={onConfirm} className="flex-1 gap-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" /> Book Anyway
            </Button>
          </div>
        </div>
      )}

      {/* Match result — premium tech card */}
      {!isSearching && !noMatch && tech && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Online status bar */}
          <div className="bg-success/5 px-5 py-2 flex items-center gap-2 border-b border-border/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[10px] font-semibold text-success">Available Now</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg overflow-hidden">
                  {tech.profile_photo_url ? (
                    <img src={tech.profile_photo_url} alt={tech.full_name} className="w-full h-full object-cover" />
                  ) : (
                    tech.full_name.charAt(0)
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-success border-2 border-card flex items-center justify-center">
                  <ShieldCheck className="w-2.5 h-2.5 text-success-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">{tech.full_name}</h3>
                  <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Verified
                  </Badge>
                </div>
                {tech.business_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tech.business_name}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-sm">
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="w-3.5 h-3.5 fill-warning" /> {(tech.rating_average || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {tech.completed_jobs_count || 0} jobs
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Award className="w-3 h-3" /> {tech.experience_years || 0}y
                  </span>
                </div>
              </div>
            </div>

            {/* Match details */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/5 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-primary">{bestMatch?.score?.total || 0}%</div>
                <div className="text-[10px] text-muted-foreground">Match</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-foreground">{bestMatch?.distance_km || "?"} km</div>
                <div className="text-[10px] text-muted-foreground">Distance</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-foreground">{bestMatch?.etaRangeLabel || `~${bestMatch?.eta_minutes || "?"}m`}</div>
                <div className="text-[10px] text-muted-foreground">ETA</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Nearby count */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Verified technicians nearby</span>
        <span className="font-medium text-foreground">{nearbyCount} available</span>
      </div>

      <Button onClick={onConfirm} disabled={isSearching} size="lg" className="w-full gap-2 rounded-xl h-12">
        <CheckCircle2 className="w-4 h-4" /> Confirm Booking
      </Button>
    </div>
  );
};

export default V2TechnicianMatching;
