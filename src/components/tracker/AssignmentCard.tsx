import { Badge } from "@/components/ui/badge";
import { Star, ShieldCheck, MapPin, Clock, Briefcase, CheckCircle2 } from "lucide-react";
import type { TechnicianInfo, ServiceMode } from "@/types/booking";
import { SERVICE_MODE_LABELS } from "@/types/booking";

interface Props {
  technician: TechnicianInfo;
  distanceKm?: number;
  etaRange?: string;
  extendedCoverage?: boolean;
  confidenceScore?: number;
  serviceMode?: ServiceMode;
}

function getYearsExperience(verifiedSince: string): number {
  const start = new Date(verifiedSince);
  return Math.max(1, Math.round((Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

const AssignmentCard = ({ technician, distanceKm, etaRange, extendedCoverage, confidenceScore, serviceMode }: Props) => {
  const years = getYearsExperience(technician.verifiedSince);

  return (
    <div className="bg-card rounded-2xl border p-5 space-y-4 animate-fade-in">
      {/* Technician header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {technician.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground">{technician.name}</h3>
          <p className="text-xs text-muted-foreground">{technician.partnerName}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span className="text-xs font-semibold text-foreground">{technician.rating}</span>
            <span className="text-xs text-muted-foreground">• {technician.jobsCompleted} jobs</span>
          </div>
        </div>
        {confidenceScore !== undefined && confidenceScore >= 70 && (
          <Badge className="bg-success/10 text-success border-success/20 text-[10px] shrink-0">
            Best Match
          </Badge>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
          <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">{years} years</p>
            <p className="text-[10px] text-muted-foreground">Experience</p>
          </div>
        </div>
        {distanceKm !== undefined && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{distanceKm} km</p>
              <p className="text-[10px] text-muted-foreground">Distance</p>
            </div>
          </div>
        )}
        {etaRange && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground capitalize">{etaRange}</p>
              <p className="text-[10px] text-muted-foreground">Est. arrival</p>
            </div>
          </div>
        )}
        {serviceMode && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{SERVICE_MODE_LABELS[serviceMode]}</p>
              <p className="text-[10px] text-muted-foreground">Service mode</p>
            </div>
          </div>
        )}
      </div>

      {/* Verification badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px] gap-1 border-success/20 text-success">
          <ShieldCheck className="w-3 h-3" /> Verified Technician
        </Badge>
        <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
          <CheckCircle2 className="w-3 h-3" /> Background Checked
        </Badge>
        <Badge variant="outline" className="text-[10px] gap-1">
          LankaFix Partner
        </Badge>
      </div>

      {extendedCoverage && (
        <Badge variant="outline" className="text-xs border-warning/30 text-warning">
          Assigned from nearby zone
        </Badge>
      )}

      {/* Trust microcopy */}
      <div className="flex items-center gap-2 text-xs text-success pt-1 border-t">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>No work starts without your approval</span>
      </div>
    </div>
  );
};

export default AssignmentCard;
