import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Star, MapPin, Clock, ShieldCheck, Sparkles,
  AlertTriangle, ArrowRight, ChevronDown, ChevronUp,
  Loader2, ClipboardList, Wrench, CheckCircle2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { track } from "@/lib/analytics";

interface MatchedTechnician {
  partner_id: string;
  technician_name: string;
  business_name: string | null;
  photo_url: string | null;
  specializations: string[];
  rating: number;
  completed_jobs: number;
  distance_km: number;
  eta_minutes: number;
  match_score: number;
  match_reason: string;
  verified: boolean;
  availability_status: string;
  inspection_capable: boolean;
  express_capable: boolean;
  on_time_rate: number;
  score_breakdown: Record<string, number>;
}

interface MatchResponse {
  matches: MatchedTechnician[];
  no_match_found: boolean;
  total_candidates: number;
  match_duration_ms: number;
  fallback_message: string | null;
}

interface Props {
  categoryCode: string;
  serviceType?: string;
  bookingPath?: string;
  urgency?: string;
  brand?: string;
  customerLat?: number;
  customerLng?: number;
  customerZone?: string;
  isEmergency?: boolean;
  bookingId?: string;
  onSelectTechnician?: (partnerId: string, techName: string) => void;
  onBookInspection?: () => void;
}

const MATCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technician-match`;

function getScoreTier(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Excellent Match", color: "text-success" };
  if (score >= 70) return { label: "Strong Match", color: "text-primary" };
  if (score >= 55) return { label: "Good Match", color: "text-primary" };
  if (score >= 40) return { label: "Fair Match", color: "text-warning" };
  return { label: "Available", color: "text-muted-foreground" };
}

const FACTOR_LABELS: Record<string, { label: string; icon: typeof MapPin }> = {
  proximity: { label: "Proximity", icon: MapPin },
  specialization: { label: "Skill Match", icon: Wrench },
  rating: { label: "Rating", icon: Star },
  reliability: { label: "Reliability", icon: CheckCircle2 },
  acceptance: { label: "Acceptance", icon: Zap },
  workload: { label: "Workload", icon: Users },
  emergency: { label: "Emergency", icon: AlertTriangle },
};

const TechnicianCard = ({
  tech,
  rank,
  isInspectionFlow,
  onSelect,
}: {
  tech: MatchedTechnician;
  rank: number;
  isInspectionFlow: boolean;
  onSelect: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const tier = getScoreTier(tech.match_score);
  const isPrimary = rank === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`bg-card rounded-2xl border p-4 ${
        isPrimary ? "border-primary/30 shadow-lg" : "border-border/40"
      }`}
    >
      {/* Top badge for #1 */}
      {isPrimary && (
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Best Match</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
          isPrimary ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
        }`}>
          {tech.photo_url ? (
            <img src={tech.photo_url} alt={tech.technician_name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            tech.technician_name.charAt(0)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground truncate">{tech.technician_name}</h3>
            {tech.verified && (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 gap-0.5 px-1.5 py-0">
                <ShieldCheck className="w-2.5 h-2.5" /> Verified
              </Badge>
            )}
            {tech.express_capable && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-0.5 px-1.5 py-0">
                <Zap className="w-2.5 h-2.5" /> Express
              </Badge>
            )}
          </div>
          {tech.business_name && (
            <p className="text-[11px] text-muted-foreground truncate">{tech.business_name}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
            <span className="flex items-center gap-0.5 text-warning font-semibold">
              <Star className="w-3 h-3 fill-warning" /> {tech.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">{tech.completed_jobs} jobs</span>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <MapPin className="w-3 h-3" /> {tech.distance_km} km
            </span>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Clock className="w-3 h-3" /> ~{tech.eta_minutes} min
            </span>
          </div>
        </div>

        {/* Score ring */}
        <div className="relative w-11 h-11 shrink-0">
          <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={`${tech.match_score * 0.88} ${88 - tech.match_score * 0.88}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
            {tech.match_score}
          </span>
        </div>
      </div>

      {/* Match reason */}
      <div className="mt-3 p-2.5 rounded-xl bg-secondary/30">
        <p className={`text-[11px] font-medium ${tier.color}`}>{tier.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{tech.match_reason}</p>
      </div>

      {/* Expandable score breakdown */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide" : "View"} match breakdown
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 pt-2 border-t border-border/30">
              {Object.entries(tech.score_breakdown)
                .filter(([k, v]) => k !== "penalty" && k !== "category_bonus" && v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value]) => {
                  const factor = FACTOR_LABELS[key];
                  const maxForFactor = key === "proximity" ? 30 : key === "specialization" ? 20 : key === "rating" ? 15 : 10;
                  const pct = Math.min(100, (value / maxForFactor) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 truncate">{factor?.label || key}</span>
                      <Progress value={pct} className="flex-1 h-1.5" />
                      <span className="text-[10px] font-medium text-foreground w-6 text-right">{value}</span>
                    </div>
                  );
                })}
              {tech.on_time_rate > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  On-time rate: {tech.on_time_rate}% · {tech.inspection_capable ? "Inspection capable" : "Standard service"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      {isPrimary && (
        <Button
          onClick={onSelect}
          className="w-full mt-3 rounded-xl h-10 bg-gradient-brand text-primary-foreground font-bold gap-2 text-sm"
        >
          {isInspectionFlow ? (
            <>
              <ClipboardList className="w-3.5 h-3.5" />
              Book Inspection with {tech.technician_name.split(" ")[0]}
            </>
          ) : (
            <>
              Confirm {tech.technician_name.split(" ")[0]}
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      )}

      {!isPrimary && (
        <Button
          variant="outline"
          onClick={onSelect}
          className="w-full mt-3 rounded-xl h-9 text-xs gap-1.5"
        >
          Select {tech.technician_name.split(" ")[0]}
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </motion.div>
  );
};

const AITechnicianMatchCards = ({
  categoryCode,
  serviceType,
  bookingPath,
  urgency,
  brand,
  customerLat,
  customerLng,
  customerZone,
  isEmergency = false,
  bookingId,
  onSelectTechnician,
  onBookInspection,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(MATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          category_code: categoryCode,
          service_type: serviceType,
          booking_path: bookingPath,
          urgency,
          brand,
          customer_lat: customerLat,
          customer_lng: customerLng,
          customer_zone: customerZone,
          is_emergency: isEmergency,
          booking_id: bookingId,
        }),
      });

      const result: MatchResponse = await resp.json();
      setData(result);

      track("ai_match_results_viewed", {
        category: categoryCode,
        total_candidates: result.total_candidates,
        top_score: result.matches[0]?.match_score,
        no_match: result.no_match_found,
        match_duration_ms: result.match_duration_ms,
      });
    } catch (e: any) {
      setError(e.message || "Failed to find technicians");
      setData({ matches: [], no_match_found: true, total_candidates: 0, match_duration_ms: 0, fallback_message: "Matching service temporarily unavailable." });
    } finally {
      setLoading(false);
    }
  }, [categoryCode, serviceType, bookingPath, urgency, brand, customerLat, customerLng, customerZone, isEmergency, bookingId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleSelect = (tech: MatchedTechnician) => {
    track("ai_technician_selected", {
      partner_id: tech.partner_id,
      technician_name: tech.technician_name,
      match_score: tech.match_score,
      category: categoryCode,
      distance_km: tech.distance_km,
    });
    onSelectTechnician?.(tech.partner_id, tech.technician_name);
  };

  const isInspectionFlow = bookingPath === "inspection" || bookingPath === "quote_required";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isInspectionFlow ? "Best Available Inspection Technician" : "Top Matched Technicians"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {loading ? "Finding the best match..." : `${data?.total_candidates || 0} verified technicians evaluated`}
            </p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-card rounded-2xl border p-8 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Matching technicians...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Evaluating proximity, skills, rating, and reliability
            </p>
          </div>
          <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
        </div>
      )}

      {/* Results */}
      {!loading && data && !data.no_match_found && (
        <div className="space-y-3">
          {data.matches.map((tech, i) => (
            <TechnicianCard
              key={tech.partner_id}
              tech={tech}
              rank={i}
              isInspectionFlow={isInspectionFlow}
              onSelect={() => handleSelect(tech)}
            />
          ))}

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-2">
            <ShieldCheck className="w-3 h-3" />
            <span>All technicians are LankaFix verified · Backed by platform guarantee</span>
          </div>
        </div>
      )}

      {/* No match fallback */}
      {!loading && data?.no_match_found && (
        <div className="bg-card rounded-2xl border border-warning/20 p-5 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No Technicians Available</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.fallback_message || "No verified technicians available in your area right now."}
            </p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={onBookInspection}
              className="w-full rounded-xl h-10 bg-gradient-brand text-primary-foreground font-bold gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              Book Inspection Instead
            </Button>
            <Button
              variant="outline"
              onClick={fetchMatches}
              className="w-full rounded-xl h-9 text-xs gap-1.5"
            >
              <Loader2 className="w-3 h-3" />
              Retry Matching
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !data?.no_match_found && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="mt-2 rounded-lg" onClick={fetchMatches}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITechnicianMatchCards;
