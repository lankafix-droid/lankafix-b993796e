import { Star, ShieldCheck, MessageCircle, Phone, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { whatsappLink, SUPPORT_WHATSAPP, TECHNICIAN_WHATSAPP } from "@/config/contact";
import MatchReasoningPanel from "@/components/v2/booking/MatchReasoningPanel";
import { computeMatchIntelligence, type MatchIntelligenceInput } from "@/engines/matchIntelligenceEngine";
import type { TechnicianInfo } from "@/types/booking";
import { useMemo } from "react";

interface TechnicianConfidenceCardProps {
  technician: TechnicianInfo;
  jobId: string;
  distanceKm?: number;
  isEmergency?: boolean;
}

const TIER_BADGE: Record<string, string> = {
  excellent: "bg-success/10 text-success border-success/20",
  strong: "bg-primary/10 text-primary border-primary/20",
  good: "bg-primary/10 text-primary border-primary/20",
  fair: "bg-warning/10 text-warning border-warning/20",
  limited: "bg-warning/10 text-warning border-warning/20",
};

const TechnicianConfidenceCard = ({ technician, jobId, distanceKm = 3.5, isEmergency = false }: TechnicianConfidenceCardProps) => {
  const intelligence = useMemo(() => {
    const input: MatchIntelligenceInput = {
      distanceKm,
      zoneMatch: distanceKm < 3,
      matchesCategory: true,
      matchesBrand: false,
      ratingAverage: technician.rating,
      jobsCompleted: technician.jobsCompleted,
      avgResponseMinutes: 12,
      currentJobs: technician.activeJobsCount ?? 1,
      maxConcurrent: 3,
      completionRate: 96,
      isEmergency,
      emergencyAvailable: true,
      technicianName: technician.name,
      etaMinutes: parseInt(technician.eta) || 25,
    };
    return computeMatchIntelligence(input);
  }, [technician, distanceKm, isEmergency]);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Assigned Technician</h3>
          <Badge variant="outline" className={`text-[10px] font-semibold ${TIER_BADGE[intelligence.confidenceTier]}`}>
            <Brain className="w-3 h-3 mr-1" />
            {intelligence.confidenceScore}% · {intelligence.tierLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg relative shrink-0">
            {technician.name.split(" ").map((n) => n[0]).join("")}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success flex items-center justify-center border-2 border-card">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
              {technician.name}
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">Verified</Badge>
            </p>
            <p className="text-xs text-muted-foreground">{technician.partnerName}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <span>{technician.rating}</span>
              <span>•</span>
              <span>{technician.jobsCompleted} jobs</span>
              <span>•</span>
              <span>ETA: {technician.eta}</span>
            </div>
          </div>
        </div>

        {/* Top match reasons */}
        {intelligence.topReasons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {intelligence.topReasons.slice(0, 2).map((reason, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-success/8 text-success text-[10px] font-medium px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Extended info */}
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Verified Since</span>
            <p className="font-medium text-foreground">{new Date(technician.verifiedSince).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Specializations</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {technician.specializations.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={whatsappLink(TECHNICIAN_WHATSAPP, `Hi, regarding job ${jobId}`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp Tech
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={whatsappLink(SUPPORT_WHATSAPP, `Support for job ${jobId}`)} target="_blank" rel="noopener noreferrer">
              <Phone className="w-4 h-4 mr-1" /> WhatsApp Support
            </a>
          </Button>
        </div>
      </div>

      {/* Full Match Intelligence Panel */}
      <MatchReasoningPanel intelligence={intelligence} />
    </div>
  );
};

export default TechnicianConfidenceCard;
