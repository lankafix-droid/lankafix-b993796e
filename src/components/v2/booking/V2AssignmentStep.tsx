import type { CategoryCode } from "@/types/booking";
import type { V2AssignmentType, V2PartnerShopInfo } from "@/data/v2CategoryFlows";
import { useLocationStore, getTravelFeeForZone } from "@/store/locationStore";
import { useSmartDispatch, type SmartDispatchCandidate } from "@/hooks/useSmartDispatch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Star, Clock, MapPin, Users, CheckCircle2, Store, Calendar,
  Monitor, Navigation, Zap, Wifi, RefreshCw, Car, Bike, Truck, Timer, Award,
  Brain, BarChart3, Target,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface Props {
  categoryCode: CategoryCode;
  assignmentType: V2AssignmentType;
  serviceModeId?: string;
  partnerShops?: V2PartnerShopInfo[];
  isEmergency?: boolean;
  bookingId?: string;
  onConfirm: () => void;
}

const VEHICLE_ICONS: Record<string, typeof Car> = {
  car: Car,
  motorcycle: Bike,
  van: Truck,
};

const V2AssignmentStep = ({ categoryCode, assignmentType, serviceModeId, partnerShops, isEmergency = false, bookingId, onConfirm }: Props) => {
  const [shopSort, setShopSort] = useState<"nearest" | "rated" | "fastest">("nearest");
  const { getActiveAddress } = useLocationStore();
  const activeAddress = getActiveAddress();
  const customerZoneId = activeAddress?.zoneId || "col_07";

  const effectiveType = serviceModeId === "remote" ? "remote_support" as V2AssignmentType :
    (serviceModeId === "drop_off" && assignmentType === "partner_shop") ? "partner_shop" : assignmentType;

  // Smart dispatch — only for technician match type
  const isLiveMatch = effectiveType !== "partner_shop" && effectiveType !== "site_inspection" && effectiveType !== "remote_support";
  const dispatch = useSmartDispatch(categoryCode, isEmergency, undefined, undefined, isLiveMatch, bookingId);

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

  // ─── Default: Smart Technician Match ─────────────────────────────
  const { phase, bestMatch, candidates, totalEligible, acceptCountdown, dispatchMode, dispatchRound } = dispatch;
  const tech = bestMatch?.partner;
  const VehicleIcon = tech ? (VEHICLE_ICONS[tech.vehicle_type || "motorcycle"] || Car) : Car;
  const searchingTechCount = totalEligible;

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
      {(phase === "searching" || phase === "loading") && (
        <LiveSearchingCard techCount={searchingTechCount} isEmergency={isEmergency} />
      )}

      {/* ── No Match ── */}
      {(phase === "no_match" || phase === "escalated") && (
        <div className="bg-card rounded-xl border p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {phase === "escalated" ? "Escalated to Operations" : "Searching for available technician…"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {phase === "escalated"
                ? "Our operations team has been notified and will assign a technician shortly."
                : "All technicians are currently busy. We're notifying the Operations team."}
            </p>
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
              <Brain className="w-3 h-3 text-primary" />
              <span>AI Dispatch</span>
              {dispatchRound > 1 && <span>· Round {dispatchRound}</span>}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Tech header */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {tech.full_name.charAt(0)}
                </div>
                {/* Online pulse dot */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success border-2 border-card" />
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{tech.full_name}</h3>
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tech.business_name}</p>
                <div className="flex items-center gap-3 mt-1.5 text-sm">
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="w-3.5 h-3.5 fill-warning" /> {tech.rating_average}
                  </span>
                  <span className="text-muted-foreground">{tech.completed_jobs_count} jobs</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Award className="w-3.5 h-3.5" /> {tech.experience_years}y exp
                  </span>
                </div>
              </div>
            </div>

            {/* Specialization badges */}
            {tech.brand_specializations && tech.brand_specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tech.brand_specializations.slice(0, 4).map((brand) => (
                  <Badge key={brand} variant="secondary" className="text-[10px] font-normal">{brand}</Badge>
                ))}
                {tech.brand_specializations.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] font-normal">+{tech.brand_specializations.length - 4}</Badge>
                )}
              </div>
            )}

            {/* Smart dispatch stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">{bestMatch.score?.total || 0}%</div>
                <div className="text-[10px] text-muted-foreground">AI Score</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">{bestMatch.distance_km} km</div>
                <div className="text-[10px] text-muted-foreground">Distance</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <VehicleIcon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                <div className="text-[10px] text-muted-foreground capitalize">{tech.vehicle_type}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">~{bestMatch.eta_minutes}</div>
                <div className="text-[10px] text-muted-foreground">min ETA</div>
              </div>
            </div>

            {/* Score breakdown mini bar */}
            {bestMatch.score && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> AI Match Breakdown
                </p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Proximity</span><span className="font-medium text-foreground">{bestMatch.score.proximity}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Skill</span><span className="font-medium text-foreground">{bestMatch.score.specialization}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rating</span><span className="font-medium text-foreground">{bestMatch.score.rating}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Speed</span><span className="font-medium text-foreground">{bestMatch.score.response_speed}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Load</span><span className="font-medium text-foreground">{bestMatch.score.workload}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reliability</span><span className="font-medium text-foreground">{bestMatch.score.completion_rate}</span></div>
                </div>
              </div>
            )}

            {/* ETA & Traffic detail */}
            <div className="bg-primary/5 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary">ETA: {bestMatch.etaRangeLabel || `~${bestMatch.eta_minutes} min`}</p>
                  <p className="text-[10px] text-muted-foreground">{bestMatch.traffic_label || "Normal traffic"}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-[9px] gap-1"><Target className="w-3 h-3" /> {dispatchMode === "top_3" ? "Top 3" : dispatchMode === "manual" ? "Ops Review" : "Auto"}</Badge>
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

      {/* ── Top 3 Mode: Selectable candidates ── */}
      {dispatchMode === "top_3" && phase === "matched" && candidates.length > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" /> Choose your preferred technician
          </p>
          {candidates.slice(0, 3).map((c, i) => (
            <button
              key={c.partner_id}
              onClick={() => dispatch.selectCandidate(c.partner_id)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                bestMatch?.partner_id === c.partner_id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {c.partner.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm truncate">{c.partner.full_name}</span>
                    {i === 0 && <Badge className="text-[9px] bg-primary/10 text-primary border-0">Best Match</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-warning text-warning" /> {c.partner.rating_average}</span>
                    <span>·</span>
                    <span>{c.distance_km} km</span>
                    <span>·</span>
                    <span>~{c.eta_minutes} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">{c.score?.total}%</div>
                  <div className="text-[10px] text-muted-foreground">AI Score</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Other candidates preview (auto mode only) */}
      {dispatchMode === "auto" && (phase === "matched" || phase === "accepting") && candidates.length > 1 && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{candidates.length - 1} other technicians available as backup</p>
          <div className="flex -space-x-2">
            {candidates.slice(1, 5).map((c) => (
              <div key={c.partner.id} className="w-8 h-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-xs font-medium text-primary">
                {c.partner.full_name.charAt(0)}
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
          }
          if (phase === "confirmed") {
            onConfirm();
          }
          if (phase === "timeout" || phase === "error") {
            dispatch.refresh();
          }
        }}
        disabled={phase === "searching" || phase === "loading" || phase === "no_match" || phase === "accepting" || phase === "escalated"}
        size="lg"
        className="w-full gap-2"
      >
        {(phase === "searching" || phase === "loading") && <><RefreshCw className="w-4 h-4 animate-spin" /> AI finding best technician…</>}
        {phase === "matched" && <><CheckCircle2 className="w-4 h-4" /> Confirm Booking</>}
        {phase === "accepting" && <><Timer className="w-4 h-4 animate-pulse" /> Waiting for response…</>}
        {phase === "confirmed" && <><CheckCircle2 className="w-4 h-4" /> Continue</>}
        {(phase === "no_match" || phase === "escalated") && <><Users className="w-4 h-4" /> Waiting for operations…</>}
        {phase === "timeout" && <><RefreshCw className="w-4 h-4" /> Try again</>}
        {phase === "error" && <><RefreshCw className="w-4 h-4" /> Retry</>}
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
