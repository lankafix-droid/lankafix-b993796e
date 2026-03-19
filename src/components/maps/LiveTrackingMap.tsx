/**
 * LankaFix — Live Technician Tracking Map (Google Maps)
 * Shows real Google Map with technician + customer markers.
 * Falls back to existing CSS map if API unavailable.
 */
import { useMemo, useCallback, useRef, useEffect } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Circle, MapPin, Navigation } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "./GoogleMapsProvider";

interface Props {
  technicianLat: number | null;
  technicianLng: number | null;
  customerLat: number | null;
  customerLng: number | null;
  technicianName?: string;
  isLive?: boolean;
  distanceKm?: number;
  etaMinutes?: number;
  etaRange?: string;
  arrived?: boolean;
  className?: string;
}

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

// Colombo-centric default center
const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "simplified" }] },
  ],
};

export default function LiveTrackingMap({
  technicianLat,
  technicianLng,
  customerLat,
  customerLng,
  technicianName = "Technician",
  isLive = false,
  distanceKm = 0,
  etaMinutes = 0,
  etaRange,
  arrived = false,
  className = "",
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const techPos = useMemo(
    () => (technicianLat && technicianLng ? { lat: technicianLat, lng: technicianLng } : null),
    [technicianLat, technicianLng]
  );

  const custPos = useMemo(
    () => (customerLat && customerLng ? { lat: customerLat, lng: customerLng } : null),
    [customerLat, customerLng]
  );

  const center = useMemo(() => techPos || custPos || DEFAULT_CENTER, [techPos, custPos]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Fit bounds when both positions available
  useEffect(() => {
    if (!mapRef.current || !techPos || !custPos) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(techPos);
    bounds.extend(custPos);
    mapRef.current.fitBounds(bounds, { top: 40, bottom: 60, left: 40, right: 40 });
  }, [techPos, custPos]);

  // Fallback CSS map if no API key
  if (!GOOGLE_MAPS_API_KEY) {
    return <FallbackMap {...{ technicianName, distanceKm, etaMinutes, etaRange, isLive, arrived, className }} />;
  }

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      <div className="relative h-52">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={14}
          onLoad={onLoad}
          options={MAP_OPTIONS}
        >
          {/* Technician marker */}
          {techPos && (
            <Marker
              position={techPos}
              icon={{
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#0E4C92" stroke="white" stroke-width="3"/>
                    <text x="20" y="26" text-anchor="middle" fill="white" font-size="18">🔧</text>
                  </svg>`
                ),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }}
              title={technicianName}
            />
          )}

          {/* Customer marker */}
          {custPos && (
            <Marker
              position={custPos}
              icon={{
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#16a34a" stroke="white" stroke-width="3"/>
                    <text x="20" y="26" text-anchor="middle" fill="white" font-size="18">📍</text>
                  </svg>`
                ),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }}
              title="Your location"
            />
          )}
        </GoogleMap>

        {/* Arrived overlay */}
        {arrived && (
          <div className="absolute inset-0 bg-success/20 flex items-center justify-center backdrop-blur-sm z-10">
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
            <p className="font-bold text-foreground">{distanceKm.toFixed(1)} km</p>
          </div>
          <div>
            <span className="text-muted-foreground">ETA</span>
            <p className="font-bold text-primary">{etaRange || `${etaMinutes} min`}</p>
          </div>
        </div>
        {isLive && (
          <div className="flex items-center gap-1 text-[10px] text-success">
            <Circle className="w-2 h-2 fill-success" />
            Live
          </div>
        )}
      </div>
    </div>
  );
}

/** Fallback CSS-only map when Google Maps is unavailable */
function FallbackMap({
  technicianName,
  distanceKm,
  etaMinutes,
  etaRange,
  isLive,
  arrived,
  className,
}: Omit<Props, "technicianLat" | "technicianLng" | "customerLat" | "customerLng">) {
  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      <div className="relative h-48 bg-gradient-to-br from-primary/5 via-muted/30 to-primary/10 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Navigation className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{technicianName} is on the way</p>
          </div>
        </div>
        {arrived && (
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
      <div className="px-4 py-3 flex items-center justify-between border-t bg-card">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Distance</span>
            <p className="font-bold text-foreground">{(distanceKm ?? 0).toFixed(1)} km</p>
          </div>
          <div>
            <span className="text-muted-foreground">ETA</span>
            <p className="font-bold text-primary">{etaRange || `${etaMinutes} min`}</p>
          </div>
        </div>
        {isLive && (
          <div className="flex items-center gap-1 text-[10px] text-success">
            <Circle className="w-2 h-2 fill-success" />
            Live
          </div>
        )}
      </div>
    </div>
  );
}
