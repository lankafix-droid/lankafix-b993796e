/**
 * LankaFix Technician Map — CSS-based tracking visualization.
 * Shows technician and customer positions with animated travel progress.
 * (Replace with Mapbox GL JS in production when API key is available)
 */
import { useEffect, useRef } from "react";
import { MapPin, Navigation, Circle } from "lucide-react";
import type { TrackingData } from "@/lib/trackingEngine";

interface TechnicianMapProps {
  tracking: TrackingData;
  technicianName?: string;
  className?: string;
}

export default function TechnicianMap({ tracking, technicianName, className = "" }: TechnicianMapProps) {
  const { technicianLocation, customerLocation, distanceRemainingKm, routePath, isTracking } = tracking;

  // Calculate progress percentage for visual
  const initialDist = routePath.length > 0 && customerLocation
    ? Math.max(distanceRemainingKm, 0.1)
    : 1;
  const totalTraveled = tracking.travelDistanceKm;
  const totalDist = totalTraveled + distanceRemainingKm;
  const progress = totalDist > 0 ? Math.min((totalTraveled / totalDist) * 100, 100) : 0;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      {/* Map Area */}
      <div className="relative h-48 bg-gradient-to-br from-primary/5 via-muted/30 to-primary/10 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Route line */}
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="relative w-full h-1 bg-muted-foreground/20 rounded-full">
            {/* Traveled portion */}
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
            {/* Pulse on active */}
            {isTracking && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
              >
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
              </div>
            )}
          </div>
        </div>

        {/* Technician marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
          style={{ left: `${Math.max(8, Math.min(progress * 0.84 + 8, 84))}%` }}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background">
              <Navigation className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-primary whitespace-nowrap">
              {technicianName || "Technician"}
            </span>
          </div>
        </div>

        {/* Customer marker (fixed at right) */}
        <div className="absolute top-1/2 -translate-y-1/2 right-[8%]">
          <div className="relative">
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center shadow-lg border-2 border-background">
              <MapPin className="w-5 h-5 text-success-foreground" />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-success whitespace-nowrap">
              Your location
            </span>
          </div>
        </div>

        {/* Arrived overlay */}
        {tracking.arrivedAt && (
          <div className="absolute inset-0 bg-success/10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-success-foreground" />
              </div>
              <p className="text-sm font-bold text-success">Technician Arrived!</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="px-4 py-3 flex items-center justify-between border-t bg-card">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Distance</span>
            <p className="font-bold text-foreground">{distanceRemainingKm} km</p>
          </div>
          <div>
            <span className="text-muted-foreground">Traveled</span>
            <p className="font-bold text-foreground">{totalTraveled} km</p>
          </div>
          <div>
            <span className="text-muted-foreground">ETA</span>
            <p className="font-bold text-primary">{tracking.etaMinutes} min</p>
          </div>
        </div>
        {isTracking && (
          <div className="flex items-center gap-1 text-[10px] text-success">
            <Circle className="w-2 h-2 fill-success" />
            Live
          </div>
        )}
      </div>
    </div>
  );
}
