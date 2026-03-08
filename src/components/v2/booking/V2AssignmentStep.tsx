import type { CategoryCode } from "@/types/booking";
import type { V2AssignmentType, V2PartnerShopInfo } from "@/data/v2CategoryFlows";
import { useLocationStore, getTravelFeeForZone } from "@/store/locationStore";
import { useLiveDispatch, type LiveTechCandidate } from "@/hooks/useLiveDispatch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Star, Clock, MapPin, Users, CheckCircle2, Store, Calendar,
  Monitor, Navigation, Zap, Wifi, RefreshCw, Car, Bike, Truck, Timer, Award
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface Props {
  categoryCode: CategoryCode;
  assignmentType: V2AssignmentType;
  serviceModeId?: string;
  partnerShops?: V2PartnerShopInfo[];
  isEmergency?: boolean;
  onConfirm: () => void;
}

const VEHICLE_ICONS: Record<string, typeof Car> = {
  car: Car,
  motorcycle: Bike,
  van: Truck,
};

const V2AssignmentStep = ({ categoryCode, assignmentType, serviceModeId, partnerShops, isEmergency = false, onConfirm }: Props) => {
  const [shopSort, setShopSort] = useState<"nearest" | "rated" | "fastest">("nearest");
  const { getActiveAddress } = useLocationStore();
  const activeAddress = getActiveAddress();
  const customerZoneId = activeAddress?.zoneId || "col_07";

  const effectiveType = serviceModeId === "remote" ? "remote_support" as V2AssignmentType :
    (serviceModeId === "drop_off" && assignmentType === "partner_shop") ? "partner_shop" : assignmentType;

  // Live dispatch — only for technician match type
  const isLiveMatch = effectiveType !== "partner_shop" && effectiveType !== "site_inspection" && effectiveType !== "remote_support";
  const dispatch = useLiveDispatch(categoryCode, customerZoneId, isEmergency, isLiveMatch);

  // Travel fee for active address
  const travelFee = activeAddress ? getTravelFeeForZone(activeAddress.zoneStatus) : null;

  // Sort partner shops by distance from customer
  const sortedShops = useMemo(() => {
    if (!partnerShops || !activeAddress) return partnerShops || [];
    const withDist = partnerShops.map((shop, i) => ({
      ...shop,
      distance: activeAddress.lat ? (2.5 + i * 1.8) : (3 + i * 2),
    }));
    if (shopSort === "nearest") return [...withDist].sort((a, b) => a.distance - b.distance);
    if (shopSort === "rated") return [...withDist].sort((a, b) => b.rating - a.rating);
    return withDist;
  }, [partnerShops, activeAddress, shopSort]);

  // ─── Partner Shop Match ─────────────────────────────
  if (effectiveType === "partner_shop") {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Partner Shop Assigned</h2>
          <p className="text-sm text-muted-foreground mt-1">Your nearest verified repair shop</p>
        </div>

        <div className="flex gap-2">
          {(["nearest", "rated", "fastest"] as const).map((s) => (
            <button key={s} onClick={() => setShopSort(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                shopSort === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >{s === "nearest" ? "Nearest" : s === "rated" ? "Top Rated" : "Fastest"}</button>
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

        <Button onClick={onConfirm} size="lg" className="w-full gap-2">
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
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span>2-person inspection team</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span>Detailed quote within 24 hours</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span>Visit fee deductible from project</span></div>
          </div>

          {travelFee && travelFee.fee > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Travel charge</span>
              <span className="font-medium text-foreground">LKR {travelFee.fee.toLocaleString()}</span>
            </div>
          )}
        </div>

        <Button onClick={onConfirm} size="lg" className="w-full gap-2">
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
              }`}>{slot}</button>
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
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span>Screen sharing link sent via SMS</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span>No software installation needed</span></div>
          </div>
        </div>

        <Button onClick={onConfirm} size="lg" className="w-full gap-2">
          <CheckCircle2 className="w-4 h-4" /> Book Session
        </Button>
      </div>
    );
  }

  // ─── Default: Live Technician Match ─────────────────────────────
  const { phase, bestMatch, candidates, searchingTechCount, acceptCountdown, isRefreshing, refreshCount, lastRefreshedAt } = dispatch;
  const tech = bestMatch?.tech;
  const VehicleIcon = tech ? (VEHICLE_ICONS[tech.vehicleType] || Car) : Car;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Technician Assignment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isEmergency ? "Priority matching — emergency response within 2 hours" : "Connecting you with verified technicians in your area"}
        </p>
      </div>

      {/* Emergency mode banner */}
      {isEmergency && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Emergency Mode Active</p>
            <p className="text-xs text-muted-foreground mt-0.5">Response within 2 hours · +25% surcharge applies · Priority dispatch</p>
          </div>
        </div>
      )}

      {/* ── Searching Phase ── */}
      {phase === "searching" && (
        <LiveSearchingCard techCount={searchingTechCount} isEmergency={isEmergency} />
      )}

      {/* ── No Match ── */}
      {phase === "no_match" && (
        <div className="bg-card rounded-xl border p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="font-medium text-foreground">Searching for available technician…</p>
            <p className="text-sm text-muted-foreground mt-1">All technicians are currently busy. We're notifying the Operations team.</p>
          </div>
          <Button variant="outline" size="sm" onClick={dispatch.refresh} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* ── Matched / Accepting / Confirmed — Live Tech Card ── */}
      {(phase === "matched" || phase === "accepting" || phase === "confirmed") && bestMatch && tech && (
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* Live status bar */}
          <div className="bg-muted/40 px-4 py-2 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-[11px] font-medium text-success">Online</span>
              <span className="text-[10px] text-muted-foreground">· Currently in {bestMatch.currentZoneName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isRefreshing ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> Refreshing…</>
              ) : (
                <><Wifi className="w-3 h-3" /> Live</>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Tech header */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {tech.name.charAt(0)}
                </div>
                {/* Online pulse dot */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success border-2 border-card" />
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{tech.name}</h3>
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tech.partnerName}</p>
                <div className="flex items-center gap-3 mt-1.5 text-sm">
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="w-3.5 h-3.5 fill-warning" /> {tech.rating}
                  </span>
                  <span className="text-muted-foreground">{tech.jobsCompleted} jobs</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Award className="w-3.5 h-3.5" /> {tech.experienceYears}y exp
                  </span>
                </div>
              </div>
            </div>

            {/* Specialization badges */}
            {tech.brandSpecializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tech.brandSpecializations.slice(0, 4).map((brand) => (
                  <Badge key={brand} variant="secondary" className="text-[10px] font-normal">{brand}</Badge>
                ))}
                {tech.brandSpecializations.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] font-normal">+{tech.brandSpecializations.length - 4}</Badge>
                )}
              </div>
            )}

            {/* Live stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">{bestMatch.matchScore}%</div>
                <div className="text-[10px] text-muted-foreground">Match</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">{bestMatch.distanceKm} km</div>
                <div className="text-[10px] text-muted-foreground">Distance</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <VehicleIcon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                <div className="text-[10px] text-muted-foreground capitalize">{tech.vehicleType}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">~{bestMatch.etaMinutes}</div>
                <div className="text-[10px] text-muted-foreground">min ETA</div>
              </div>
            </div>

            {/* ETA & Traffic detail */}
            <div className="bg-primary/5 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary">ETA: {bestMatch.etaRange}</p>
                  <p className="text-[10px] text-muted-foreground">{bestMatch.trafficLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Updated {refreshCount > 1 ? `${refreshCount}x` : "just now"}</p>
              </div>
            </div>

            {/* Travel fee */}
            {travelFee && travelFee.fee > 0 && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Travel charge</span>
                <span className="font-medium text-foreground">LKR {travelFee.fee.toLocaleString()}</span>
              </div>
            )}

            {/* Acceptance countdown */}
            {phase === "accepting" && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-primary" /> Awaiting technician response
                  </span>
                  <span className="text-sm font-bold text-primary">{acceptCountdown}s</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${(acceptCountdown / 60) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "confirmed" && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Technician accepted your booking!</span>
              </div>
            )}
          </div>

          {/* Trust note */}
          <div className="border-t px-5 py-2.5 bg-muted/20">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-success" />
              No work starts without your approval · OTP verification required
            </p>
          </div>
        </div>
      )}

      {/* Other candidates preview */}
      {(phase === "matched" || phase === "accepting") && candidates.length > 1 && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{candidates.length - 1} other technicians available</p>
          <div className="flex -space-x-2">
            {candidates.slice(1, 5).map((c) => (
              <div key={c.tech.technicianId} className="w-8 h-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-xs font-medium text-primary">
                {c.tech.name.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service address */}
      {activeAddress && (phase === "matched" || phase === "accepting" || phase === "confirmed") && (
        <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-foreground">{activeAddress.displayName || activeAddress.area}</p>
        </div>
      )}

      {/* Zone intelligence */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Technicians in your area</span>
        <span className="font-medium text-foreground">{searchingTechCount || candidates.length} available</span>
      </div>

      <Button
        onClick={() => {
          if (phase === "matched") {
            dispatch.startAcceptance();
            // Simulate partner accepting after 3-8 seconds
            setTimeout(() => {
              dispatch.confirmAcceptance();
            }, 3000 + Math.random() * 5000);
          }
          if (phase === "confirmed") {
            onConfirm();
          }
        }}
        disabled={phase === "searching" || phase === "no_match" || phase === "accepting"}
        size="lg"
        className="w-full gap-2"
      >
        {phase === "searching" && <><RefreshCw className="w-4 h-4 animate-spin" /> Finding technician…</>}
        {phase === "matched" && <><CheckCircle2 className="w-4 h-4" /> Confirm Booking</>}
        {phase === "accepting" && <><Timer className="w-4 h-4 animate-pulse" /> Waiting for response…</>}
        {phase === "confirmed" && <><CheckCircle2 className="w-4 h-4" /> Continue</>}
        {phase === "no_match" && <><Users className="w-4 h-4" /> No match — retrying…</>}
        {phase === "timeout" && <><RefreshCw className="w-4 h-4" /> Try again</>}
      </Button>
    </div>
  );
};

// ─── Live Searching Animation ─────────────────────────────
const LiveSearchingCard = ({ techCount, isEmergency }: { techCount: number; isEmergency: boolean }) => {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots(d => d >= 3 ? 1 : d + 1), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-card rounded-xl border p-8 text-center space-y-4">
      <div className="relative w-20 h-20 mx-auto">
        {/* Outer pulse */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
        {/* Mid pulse */}
        <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
        {/* Inner pulse */}
        <div className="absolute inset-4 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.8s" }} />
        {/* Center icon */}
        <div className="absolute inset-6 rounded-full bg-primary flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      <div>
        <p className="font-medium text-foreground">
          {isEmergency ? "Priority matching in progress" : "Finding the best technician"}
          {".".repeat(dots)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Scanning {techCount || 8} verified technicians nearby
        </p>
      </div>
      <div className="flex justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Checking distance</span>
        <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Rating match</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Availability</span>
      </div>
    </div>
  );
};

export default V2AssignmentStep;
