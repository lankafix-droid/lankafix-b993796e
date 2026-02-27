import { MapPin, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ZoneIntelligenceCardProps {
  zone: string;
}

const ZoneIntelligenceCard = ({ zone }: ZoneIntelligenceCardProps) => {
  // Mock zone intelligence data — API contract: GET /api/zones/:zone/intelligence
  const techsNearby = 3 + Math.floor(Math.random() * 5);
  const avgResponse = `${18 + Math.floor(Math.random() * 12)} mins`;

  return (
    <div className="bg-card rounded-xl border p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          Zone Intelligence
        </h3>
        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">{zone}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-success" />
          <div>
            <p className="font-medium text-foreground">{techsNearby}</p>
            <p className="text-[10px] text-muted-foreground">Verified techs nearby</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-warning" />
          <div>
            <p className="font-medium text-foreground">{avgResponse}</p>
            <p className="text-[10px] text-muted-foreground">Avg response time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneIntelligenceCard;
