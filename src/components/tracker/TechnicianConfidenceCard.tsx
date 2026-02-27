import { Star, ShieldCheck, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { whatsappLink, SUPPORT_WHATSAPP, TECHNICIAN_WHATSAPP } from "@/config/contact";
import type { TechnicianInfo } from "@/types/booking";

interface TechnicianConfidenceCardProps {
  technician: TechnicianInfo;
  jobId: string;
}

const TechnicianConfidenceCard = ({ technician, jobId }: TechnicianConfidenceCardProps) => {
  return (
    <div className="bg-card rounded-xl border p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3">Assigned Technician</h3>
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
  );
};

export default TechnicianConfidenceCard;
