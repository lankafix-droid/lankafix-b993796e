/**
 * LankaFix Technician Location Card
 * Shows tech info, distance, ETA, vehicle type during live tracking.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TechnicianInfo } from "@/types/booking";
import type { TrackingData } from "@/lib/trackingEngine";
import { TECHNICIAN_CAPABILITIES } from "@/lib/dispatchEngine";
import { getTrafficLabel } from "@/lib/etaEngine";
import { getETARange } from "@/lib/etaEngine";
import { Star, MapPin, Clock, Car, Bike, Truck, Monitor, CheckCircle2, ShieldCheck } from "lucide-react";

interface TechnicianLocationCardProps {
  technician: TechnicianInfo;
  tracking: TrackingData;
}

const VEHICLE_ICONS: Record<string, typeof Car> = {
  car: Car,
  motorcycle: Bike,
  van: Truck,
  none: Monitor,
};

export default function TechnicianLocationCard({ technician, tracking }: TechnicianLocationCardProps) {
  const caps = TECHNICIAN_CAPABILITIES[technician.technicianId || ""];
  const vehicleType = caps?.vehicleType || "car";
  const VehicleIcon = VEHICLE_ICONS[vehicleType] || Car;
  const etaRange = getETARange(tracking.etaMinutes);

  return (
    <Card className="border overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {technician.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{technician.name}</h3>
              <p className="text-xs text-muted-foreground">{technician.partnerName}</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
            <ShieldCheck className="w-3 h-3 mr-1" /> Verified
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Star className="w-3.5 h-3.5 text-warning mx-auto mb-0.5" />
            <p className="text-sm font-bold text-foreground">{technician.rating}</p>
            <p className="text-[9px] text-muted-foreground">Rating</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-success mx-auto mb-0.5" />
            <p className="text-sm font-bold text-foreground">{technician.jobsCompleted}</p>
            <p className="text-[9px] text-muted-foreground">Jobs</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <VehicleIcon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-bold text-foreground capitalize">{vehicleType}</p>
            <p className="text-[9px] text-muted-foreground">Vehicle</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-bold text-foreground">{tracking.distanceRemainingKm}</p>
            <p className="text-[9px] text-muted-foreground">km away</p>
          </div>
        </div>

        {/* ETA & Status */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-bold text-primary">ETA: {etaRange}</p>
              <p className="text-[10px] text-muted-foreground">{getTrafficLabel(tracking.trafficLevel)}</p>
            </div>
          </div>
          {tracking.isTracking && (
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-[10px] text-success font-medium">Live</span>
            </div>
          )}
        </div>

        {/* Trust note */}
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-success" />
          No work starts without your approval
        </p>
      </CardContent>
    </Card>
  );
}
