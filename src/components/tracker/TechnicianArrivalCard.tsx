/**
 * TechnicianArrivalCard — Trust-building card showing assigned technician details.
 * Displayed after a technician accepts the job. Reuses existing partner data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, ShieldCheck, Award, Clock, CheckCircle2, Navigation, Wrench } from "lucide-react";
import { motion } from "framer-motion";

interface TechnicianArrivalCardProps {
  partnerId: string;
  bookingStatus: string;
  promisedEtaMinutes?: number | null;
  etaRange?: string;
  etaConfidence?: string;
  lastPingAt?: string | null;
}

interface PartnerTrustData {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  rating_average: number | null;
  completed_jobs_count: number | null;
  verification_status: string;
  reliability_tier: string;
  experience_years: number | null;
  categories_supported: string[];
  on_time_rate: number | null;
}

/** Arrival status derived from booking status */
const ARRIVAL_STATES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  assigned: { label: "Preparing for your job", icon: CheckCircle2, color: "text-primary" },
  tech_en_route: { label: "On the way to you", icon: Navigation, color: "text-accent" },
  arrived: { label: "Has arrived at your location", icon: ShieldCheck, color: "text-success" },
  inspection_started: { label: "Inspecting the issue", icon: Wrench, color: "text-warning" },
  repair_started: { label: "Repair in progress", icon: Wrench, color: "text-warning" },
  in_progress: { label: "Working on your job", icon: Wrench, color: "text-warning" },
};

function getTrustBadges(partner: PartnerTrustData) {
  const badges: { label: string; color: string }[] = [];
  if (partner.verification_status === "verified") {
    badges.push({ label: "Verified", color: "bg-success/10 text-success border-success/20" });
  }
  if ((partner.rating_average ?? 0) >= 4.5) {
    badges.push({ label: "Top Rated", color: "bg-warning/10 text-warning border-warning/20" });
  }
  if ((partner.completed_jobs_count ?? 0) >= 100) {
    badges.push({ label: "Experienced", color: "bg-primary/10 text-primary border-primary/20" });
  }
  if (partner.reliability_tier === "elite" || partner.reliability_tier === "pro") {
    badges.push({ label: partner.reliability_tier === "elite" ? "Elite" : "Pro", color: "bg-accent/10 text-accent border-accent/20" });
  }
  return badges;
}

export default function TechnicianArrivalCard({
  partnerId,
  bookingStatus,
  promisedEtaMinutes,
  etaRange,
  etaConfidence,
  lastPingAt,
}: TechnicianArrivalCardProps) {
  const { data: partner, isLoading } = useQuery<PartnerTrustData | null>({
    queryKey: ["partner-trust", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, full_name, profile_photo_url, rating_average, completed_jobs_count, verification_status, reliability_tier, experience_years, categories_supported, on_time_rate")
        .eq("id", partnerId)
        .single();
      if (error || !data) return null;
      return data as PartnerTrustData;
    },
    staleTime: 60_000,
  });

  if (isLoading || !partner) return null;

  const arrivalState = ARRIVAL_STATES[bookingStatus] || ARRIVAL_STATES.assigned;
  const ArrivalIcon = arrivalState.icon;
  const trustBadges = getTrustBadges(partner);
  const initials = partner.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Arrival status banner */}
      <div className="bg-primary/5 border-b border-primary/10 px-4 py-2.5 flex items-center gap-2">
        <ArrivalIcon className={`w-4 h-4 ${arrivalState.color}`} />
        <span className="text-xs font-semibold text-foreground">Your Technician — {arrivalState.label}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Technician identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              {partner.profile_photo_url ? (
                <AvatarImage src={partner.profile_photo_url} alt={partner.full_name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            {partner.verification_status === "verified" && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success flex items-center justify-center border-2 border-card">
                <ShieldCheck className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">{partner.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                <span className="text-sm font-semibold text-foreground">{partner.rating_average?.toFixed(1) || "New"}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{partner.completed_jobs_count || 0} jobs</span>
              {partner.experience_years && (
                <>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{partner.experience_years}y exp</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        {trustBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trustBadges.map((badge) => (
              <Badge key={badge.label} variant="outline" className={`text-[10px] font-medium ${badge.color}`}>
                {badge.label}
              </Badge>
            ))}
            {partner.on_time_rate && partner.on_time_rate >= 85 && (
              <Badge variant="outline" className="text-[10px] font-medium bg-success/10 text-success border-success/20">
                <Clock className="w-2.5 h-2.5 mr-0.5" /> {partner.on_time_rate}% On-time
              </Badge>
            )}
          </div>
        )}

        {/* ETA display */}
        {bookingStatus === "tech_en_route" && etaRange && (
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Arriving in</span>
              <div className="flex items-center gap-1.5">
                {etaConfidence && (
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                    etaConfidence === "high" ? "bg-success/10 text-success" :
                    etaConfidence === "medium" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {etaConfidence === "high" ? "High accuracy" : etaConfidence === "medium" ? "Estimated" : "Approximate"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-lg font-bold text-primary">{etaRange}</p>
            {lastPingAt && (
              <ETAFreshnessIndicator lastPingAt={lastPingAt} />
            )}
          </div>
        )}

        {/* Promised ETA for non-en-route statuses */}
        {bookingStatus === "assigned" && promisedEtaMinutes && (
          <div className="p-3 bg-muted/50 rounded-xl">
            <span className="text-xs text-muted-foreground">Expected arrival</span>
            <p className="text-sm font-semibold text-foreground">~{promisedEtaMinutes} minutes after departure</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** ETA freshness indicator — shows last updated time with stale warning */
function ETAFreshnessIndicator({ lastPingAt }: { lastPingAt: string }) {
  const diffSeconds = Math.round((Date.now() - new Date(lastPingAt).getTime()) / 1000);
  const isStale = diffSeconds > 300; // 5 minutes

  if (isStale) {
    return (
      <p className="text-[10px] text-warning mt-0.5 flex items-center gap-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-warning" />
        </span>
        ETA updating…
      </p>
    );
  }

  return (
    <p className="text-[10px] text-muted-foreground mt-0.5">
      Updated {getTimeAgo(lastPingAt)}
    </p>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 120) return "1 minute ago";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  return "a while ago";
}
