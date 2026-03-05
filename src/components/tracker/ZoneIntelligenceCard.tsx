import { MapPin, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getZoneIntelligence } from "@/engines/matchingEngine";
import { getZoneByLabel } from "@/data/colomboZones";
import { useMemo } from "react";

interface ZoneIntelligenceCardProps {
  zone: string;
}

const ZoneIntelligenceCard = ({ zone }: ZoneIntelligenceCardProps) => {
  const zoneData = getZoneByLabel(zone);
  const intelligence = useMemo(() => getZoneIntelligence(zoneData?.id || ""), [zoneData?.id]);

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
            <p className="font-medium text-foreground">{intelligence.techsNearby}</p>
            <p className="text-[10px] text-muted-foreground">Verified techs nearby</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-warning" />
          <div>
            <p className="font-medium text-foreground">{intelligence.avgResponseMinutes} mins</p>
            <p className="text-[10px] text-muted-foreground">Avg response time</p>
          </div>
        </div>
      </div>
      {zoneData?.surgeFactor && zoneData.surgeFactor > 1 && (
        <p className="text-[10px] text-warning mt-2">⚡ Extended zone — {Math.round((zoneData.surgeFactor - 1) * 100)}% zone surcharge applies</p>
      )}
    </div>
  );
};

export default ZoneIntelligenceCard;
