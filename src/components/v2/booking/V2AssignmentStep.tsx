import type { CategoryCode } from "@/types/booking";
import type { V2AssignmentType, V2PartnerShopInfo } from "@/data/v2CategoryFlows";
import { matchTechnician, getZoneIntelligence } from "@/engines/matchingEngine";
import { useLocationStore, getTravelFeeForZone } from "@/store/locationStore";
import { calculateDistance } from "@/lib/locationUtils";
import { calculateETA, getETARange, detectTrafficLevel, getTrafficLabel } from "@/lib/etaEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, MapPin, Users, CheckCircle2, Store, Calendar, Monitor, ArrowRight, Navigation } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface Props {
  categoryCode: CategoryCode;
  assignmentType: V2AssignmentType;
  serviceModeId?: string;
  partnerShops?: V2PartnerShopInfo[];
  onConfirm: () => void;
}

const V2AssignmentStep = ({ categoryCode, assignmentType, serviceModeId, partnerShops, onConfirm }: Props) => {
  const [isMatching, setIsMatching] = useState(true);
  const [match, setMatch] = useState<ReturnType<typeof matchTechnician> | null>(null);
  const [shopSort, setShopSort] = useState<"nearest" | "rated" | "fastest">("nearest");
  const { getActiveAddress } = useLocationStore();
  const activeAddress = getActiveAddress();

  const customerZoneId = activeAddress?.zoneId || "col_07";
  const zoneIntel = getZoneIntelligence(customerZoneId);
  const trafficLevel = detectTrafficLevel();

  const effectiveType = serviceModeId === "remote" ? "remote_support" as V2AssignmentType :
    (serviceModeId === "drop_off" && assignmentType === "partner_shop") ? "partner_shop" : assignmentType;

  useEffect(() => {
    setIsMatching(true);
    const timer = setTimeout(() => {
      const result = matchTechnician(categoryCode, customerZoneId, false);
      setMatch(result);
      setIsMatching(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [categoryCode, customerZoneId]);

  // Sort partner shops by distance from customer
  const sortedShops = useMemo(() => {
    if (!partnerShops || !activeAddress) return partnerShops || [];
    // Demo: assign rough distances
    const withDist = partnerShops.map((shop, i) => ({
      ...shop,
      distance: activeAddress.lat ? (2.5 + i * 1.8) : (3 + i * 2),
    }));
    if (shopSort === "nearest") return [...withDist].sort((a, b) => a.distance - b.distance);
    if (shopSort === "rated") return [...withDist].sort((a, b) => b.rating - a.rating);
    return withDist;
  }, [partnerShops, activeAddress, shopSort]);

  // Travel fee for active address
  const travelFee = activeAddress ? getTravelFeeForZone(activeAddress.zoneStatus) : null;

  // ─── Partner Shop Match ─────────────────────────────
  if (effectiveType === "partner_shop") {
    const shop = sortedShops[0] || {
      name: "TechFix Colombo 7", location: "Near Majestic City",
      rating: 4.8, repairTimeEstimate: "1-2 hours", openHours: "9 AM – 7 PM", verified: true, distance: 3.2
    };

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Partner Shop Assigned</h2>
          <p className="text-sm text-muted-foreground mt-1">Your nearest verified repair shop</p>
        </div>

        {isMatching ? <MatchingAnimation count={zoneIntel.techsNearby} label="Finding nearest partner shop..." /> : (
          <>
            {/* Sort options */}
            <div className="flex gap-2">
              {(["nearest", "rated", "fastest"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setShopSort(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    shopSort === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s === "nearest" ? "Nearest" : s === "rated" ? "Top Rated" : "Fastest"}
                </button>
              ))}
            </div>

            {sortedShops.map((s: any, i: number) => (
              <div key={i} className={`bg-card rounded-xl border p-5 space-y-4 ${i === 0 ? "border-primary/30" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      {s.verified && (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 gap-1">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> {s.location}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-sm font-bold text-foreground">{s.rating}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Rating</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-foreground">{s.distance?.toFixed(1) || "?"} km</div>
                    <div className="text-[10px] text-muted-foreground">Distance</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-foreground">{s.repairTimeEstimate}</div>
                    <div className="text-[10px] text-muted-foreground">Est. Time</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-[10px] font-bold text-foreground">{s.openHours}</div>
                    <div className="text-[10px] text-muted-foreground">Hours</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        <Button onClick={onConfirm} disabled={isMatching} size="lg" className="w-full gap-2">
          <CheckCircle2 className="w-4 h-4" /> Confirm Booking
        </Button>
      </div>
    );
  }

  // ─── Site Inspection Booking ─────────────────────────────
  if (effectiveType === "site_inspection") {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Book Site Inspection</h2>
          <p className="text-sm text-muted-foreground mt-1">Our inspection team will visit your property</p>
        </div>

        {isMatching ? <MatchingAnimation count={zoneIntel.techsNearby} label="Checking team availability..." /> : (
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Inspection Team Available</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Next available slot</p>
              </div>
            </div>

            {/* Service address */}
            {activeAddress && (
              <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{activeAddress.displayName || activeAddress.area}</p>
                  <p className="text-xs text-muted-foreground">{activeAddress.city}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm font-bold text-foreground">Tomorrow</div>
                <div className="text-xs text-muted-foreground">9 AM – 12 PM</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center border-2 border-primary">
                <div className="text-sm font-bold text-foreground">Day After</div>
                <div className="text-xs text-muted-foreground">2 PM – 5 PM</div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>2-person inspection team</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Detailed quote within 24 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Visit fee deductible from project</span>
              </div>
            </div>

            {/* Travel fee */}
            {travelFee && travelFee.fee > 0 && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" /> Travel charge
                </span>
                <span className="font-medium text-foreground">LKR {travelFee.fee.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        <Button onClick={onConfirm} disabled={isMatching} size="lg" className="w-full gap-2">
          <CheckCircle2 className="w-4 h-4" /> Book Inspection
        </Button>
      </div>
    );
  }

  // ─── Remote Support Slot ─────────────────────────────
  if (effectiveType === "remote_support") {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Book Remote Session</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect with an IT specialist remotely</p>
        </div>

        {isMatching ? <MatchingAnimation count={zoneIntel.techsNearby} label="Checking specialist availability..." /> : (
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Remote Support Available</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Available slots today</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["10:00 AM", "2:00 PM", "4:00 PM"].map((slot, i) => (
                <button key={slot} className={`rounded-lg p-3 text-center text-sm transition-all ${
                  i === 0 ? "bg-primary/10 border-2 border-primary text-primary font-medium" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                  {slot}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-sm font-bold text-foreground">30 min</div>
                <div className="text-xs text-muted-foreground">Session</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-sm font-bold text-foreground">LKR 2,000</div>
                <div className="text-xs text-muted-foreground">vs LKR 3,500 on-site</div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Screen sharing connection link sent via SMS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>No software installation needed</span>
              </div>
            </div>
          </div>
        )}

        <Button onClick={onConfirm} disabled={isMatching} size="lg" className="w-full gap-2">
          <CheckCircle2 className="w-4 h-4" /> Book Session
        </Button>
      </div>
    );
  }

  // ─── Default: Technician Match ─────────────────────────────
  const techEtaMinutes = match?.distanceKm ? calculateETA(match.distanceKm, trafficLevel) : null;
  const techEtaRange = techEtaMinutes ? getETARange(techEtaMinutes) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Technician Assignment</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll match you with the best available technician</p>
      </div>

      {isMatching ? <MatchingAnimation count={zoneIntel.techsNearby} label="Finding the best technician..." /> : null}

      {!isMatching && match?.technician && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {match.technician.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{match.technician.name}</h3>
                <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{match.technician.partnerName}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1 text-warning">
                  <Star className="w-3.5 h-3.5 fill-warning" /> {match.technician.rating}
                </span>
                <span className="text-muted-foreground">{match.technician.jobsCompleted} jobs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{match.confidenceScore}%</div>
              <div className="text-xs text-muted-foreground">Match</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{match.distanceKm} km</div>
              <div className="text-xs text-muted-foreground">Distance</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-foreground">{techEtaRange || match.etaRange}</div>
              <div className="text-xs text-muted-foreground">ETA</div>
            </div>
          </div>

          {/* Traffic & ETA detail */}
          <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {getTrafficLabel(trafficLevel)}
            </span>
            {techEtaMinutes && (
              <span className="text-foreground font-medium">~{techEtaMinutes} min estimated</span>
            )}
          </div>

          {/* Travel fee */}
          {travelFee && travelFee.fee > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" /> Travel charge
              </span>
              <span className="font-medium text-foreground">LKR {travelFee.fee.toLocaleString()}</span>
            </div>
          )}

          {/* Service address */}
          {activeAddress && (
            <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm text-foreground">{activeAddress.displayName || activeAddress.area}</p>
            </div>
          )}
        </div>
      )}

      {!isMatching && (
        <button className="w-full text-center text-sm text-primary font-medium py-2 hover:underline">
          See other options →
        </button>
      )}

      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Technicians in your area</span>
        <span className="font-medium text-foreground">{zoneIntel.techsNearby} available</span>
      </div>

      <Button onClick={onConfirm} disabled={isMatching} size="lg" className="w-full gap-2">
        <CheckCircle2 className="w-4 h-4" /> Confirm Booking
      </Button>
    </div>
  );
};

// ─── Shared matching animation ─────────────────────────────
const MatchingAnimation = ({ count, label }: { count: number; label: string }) => (
  <div className="bg-card rounded-xl border p-8 text-center space-y-4">
    <div className="relative w-16 h-16 mx-auto">
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      <div className="absolute inset-2 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: "0.3s" }} />
      <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
        <Users className="w-5 h-5 text-primary-foreground" />
      </div>
    </div>
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{count} available nearby</p>
    </div>
  </div>
);

export default V2AssignmentStep;
