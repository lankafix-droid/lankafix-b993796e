import type { CategoryCode } from "@/types/booking";
import type { V2AssignmentType, V2PartnerShopInfo } from "@/data/v2CategoryFlows";
import { useLocationStore, getTravelFeeForZone } from "@/store/locationStore";
import { useSmartDispatch, type SmartDispatchCandidate } from "@/hooks/useSmartDispatch";
import { intelligenceFromCandidate } from "@/engines/matchIntelligenceEngine";
import MatchReasoningPanel from "@/components/v2/booking/MatchReasoningPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Star, Clock, MapPin, Users, CheckCircle2, Store, Calendar,
  Monitor, Navigation, Zap, Wifi, RefreshCw, Car, Bike, Truck, Timer, Award,
  Brain, BarChart3, Target, Briefcase, Info,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

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
  const { phase, bestMatch, candidates, totalEligible, acceptCountdown, dispatchMode, dispatchRound } = dispatch;
  const tech = bestMatch?.partner;
  const VehicleIcon = tech ? (VEHICLE_ICONS[tech.vehicle_type || "motorcycle"] || Car) : Car;
  const searchingTechCount = totalEligible;

  // Compute match intelligence for best match
  const matchIntelligence = useMemo(() => {
    if (!bestMatch) return null;
    return intelligenceFromCandidate(bestMatch, categoryCode, isEmergency, customerZoneId);
  }, [bestMatch, categoryCode, isEmergency, customerZoneId]);

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
          <h2 className="text-xl font-bold text-foreground">Choose a Repair Shop</h2>
          <p className="text-sm text-muted-foreground mt-1">Verified partner shops near you</p>
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
          <motion.div
            key={i}
            className={`bg-card rounded-2xl border overflow-hidden ${i === 0 ? "border-primary/30 ring-1 ring-primary/10" : "border-border/60"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            {i === 0 && (
              <div className="bg-primary/5 px-4 py-1.5 text-[10px] font-semibold text-primary flex items-center gap-1.5">
                <Award className="w-3 h-3" /> Recommended
              </div>
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-foreground text-sm">{s.name}</h3>
                    {s.verified && (
                      <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {s.location}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="text-sm font-bold text-foreground">{s.rating}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Rating</div>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-bold text-foreground">{s.distance?.toFixed(1) || "?"}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">km away</div>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-bold text-foreground">{s.repairTimeEstimate}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Est. time</div>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] font-bold text-foreground leading-tight">{s.openHours}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Hours</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        <Button onClick={onConfirm} size="lg" className="w-full gap-2 rounded-xl h-12">
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
          <p className="text-sm text-muted-foreground mt-1">A qualified team will assess your requirements on-site</p>
        </div>

        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 space-y-4 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Inspection Team</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred time slot</p>
            </div>
          </div>

          {activeAddress && (
            <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{activeAddress.displayName || activeAddress.area}</p>
                <p className="text-xs text-muted-foreground">{activeAddress.city}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { day: "Tomorrow", time: "9 AM – 12 PM", selected: false },
              { day: "Day After", time: "2 PM – 5 PM", selected: true },
            ].map((slot) => (
              <button
                key={slot.day}
                className={`rounded-xl p-4 text-center transition-all ${
                  slot.selected
                    ? "bg-primary/5 border-2 border-primary"
                    : "bg-muted/50 border-2 border-transparent hover:border-primary/20"
                }`}
              >
                <div className="text-sm font-bold text-foreground">{slot.day}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{slot.time}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /><span>2-person qualified inspection team</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /><span>Detailed quote within 24 hours</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /><span>Visit fee deductible from final project cost</span></div>
          </div>

          {travelFee && travelFee.fee > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Travel charge</span>
              <span className="font-bold text-foreground">LKR {travelFee.fee.toLocaleString()}</span>
            </div>
          )}
        </motion.div>

        <Button onClick={onConfirm} size="lg" className="w-full gap-2 rounded-xl h-12">
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
          <p className="text-sm text-muted-foreground mt-1">Connect with an IT specialist from anywhere</p>
        </div>

        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 space-y-4 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Remote Support</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pick a convenient time</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["10:00 AM", "2:00 PM", "4:00 PM"].map((slot, i) => (
              <button key={slot} className={`rounded-xl p-3 text-center text-sm transition-all ${
                i === 0 ? "bg-primary/10 border-2 border-primary text-primary font-semibold" : "bg-muted/50 text-muted-foreground hover:bg-muted border-2 border-transparent"
              }`}>{slot}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <div className="text-sm font-bold text-foreground">30 min</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Session length</div>
            </div>
            <div className="bg-success/5 rounded-xl p-3 text-center border border-success/20">
              <div className="text-sm font-bold text-success">LKR 2,000</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">vs LKR 3,500 on-site</div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">How it works</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-success shrink-0" /><span>You'll receive a screen-sharing link via SMS</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-success shrink-0" /><span>No software installation needed</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-success shrink-0" /><span>If unresolved, we'll schedule an on-site visit</span></div>
            </div>
          </div>
        </motion.div>

        <Button onClick={onConfirm} size="lg" className="w-full gap-2 rounded-xl h-12">
          <CheckCircle2 className="w-4 h-4" /> Book Session
        </Button>
      </div>
    );
  }

  // ─── Default: Smart Technician Match ─────────────────────────────

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Technician Assignment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isEmergency ? "Priority matching — faster response for urgent issues" : "Connecting you with verified technicians in your area"}
        </p>
      </div>

      {/* Emergency mode banner — softened wording */}
      {isEmergency && (
        <motion.div
          className="bg-warning/8 border border-warning/25 rounded-2xl p-4 flex items-start gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Priority Response Enabled</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your request is prioritized for a faster response. An additional emergency fee may apply — you'll see the exact amount before any work begins.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Searching Phase ── */}
      {(phase === "searching" || phase === "loading") && (
        <LiveSearchingCard techCount={searchingTechCount} isEmergency={isEmergency} />
      )}

      {/* ── No Match / Escalated — calm trust-first messaging ── */}
      {(phase === "no_match" || phase === "escalated") && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">
                {phase === "escalated" ? "Our Team Is On It" : "Expanding Search"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {phase === "escalated"
                  ? "The LankaFix operations team has been notified and is personally finding the right technician for you. You'll receive an update shortly."
                  : "All nearby technicians are currently on jobs. We're expanding the search area and our team is being notified to assist."}
              </p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Your booking is safe — no charges until a technician is confirmed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>You'll be notified as soon as a match is found</span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={dispatch.refresh} className="gap-1.5 rounded-xl w-full">
            <RefreshCw className="w-3.5 h-3.5" /> Check Again
          </Button>
        </motion.div>
      )}

      {/* ── Matched / Accepting / Confirmed — Premium Tech Card ── */}
      {(phase === "matched" || phase === "accepting" || phase === "confirmed") && bestMatch && tech && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Live status bar */}
          <div className="bg-success/5 px-5 py-2.5 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
              <span className="text-xs font-semibold text-success">Online Now</span>
              {bestMatch.currentZoneName && (
                <span className="text-[10px] text-muted-foreground">· {bestMatch.currentZoneName}</span>
              )}
            </div>
            {phase === "confirmed" && (
              <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-semibold gap-1">
                <CheckCircle2 className="w-3 h-3" /> Confirmed
              </Badge>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Tech header */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
                  {tech.profile_photo_url ? (
                    <img src={tech.profile_photo_url} alt={tech.full_name} className="w-full h-full object-cover" />
                  ) : (
                    tech.full_name.charAt(0)
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-card flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-success-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-base">{tech.full_name}</h3>
                {tech.business_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tech.business_name}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-bold text-foreground">{(tech.rating_average || 0).toFixed(1)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {tech.completed_jobs_count || 0} jobs
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Award className="w-3 h-3" /> {tech.experience_years || 0}y exp
                  </span>
                </div>
              </div>
            </div>

            {/* Specialization badges */}
            {tech.brand_specializations && tech.brand_specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tech.brand_specializations.slice(0, 4).map((brand) => (
                  <Badge key={brand} variant="secondary" className="text-[10px] font-normal rounded-full">{brand}</Badge>
                ))}
                {tech.brand_specializations.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] font-normal rounded-full">+{tech.brand_specializations.length - 4}</Badge>
                )}
              </div>
            )}

            {/* Key stats — clean 3-column grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-primary">~{bestMatch.eta_minutes}</div>
                <div className="text-[10px] text-muted-foreground font-medium">min ETA</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-foreground">{bestMatch.distance_km}</div>
                <div className="text-[10px] text-muted-foreground font-medium">km away</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-foreground">{matchIntelligence?.confidenceScore || bestMatch.score?.total || 0}%</div>
                <div className="text-[10px] text-muted-foreground font-medium">Match</div>
              </div>
            </div>

            {/* Match Intelligence Panel */}
            {matchIntelligence && (
              <MatchReasoningPanel intelligence={matchIntelligence} compact />
            )}

            {/* Travel fee */}
            {travelFee && travelFee.fee > 0 && (
              <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Travel charge</span>
                <span className="font-medium text-foreground">LKR {travelFee.fee.toLocaleString()}</span>
              </div>
            )}

            {/* Acceptance countdown */}
            {phase === "accepting" && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-primary" /> Awaiting confirmation
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
              <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Technician accepted your booking!</span>
              </div>
            )}
          </div>

          {/* Trust footer */}
          <div className="border-t border-border/40 px-5 py-3 bg-muted/20 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Verified & background checked</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>OTP required to start</span>
            </div>
          </div>
        </motion.div>
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
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                bestMatch?.partner_id === c.partner_id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
                  {c.partner.profile_photo_url ? (
                    <img src={c.partner.profile_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    c.partner.full_name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm truncate">{c.partner.full_name}</span>
                    {i === 0 && <Badge className="text-[9px] bg-primary/10 text-primary border-0">Best Match</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-warning text-warning" /> {c.partner.rating_average}</span>
                    <span>·</span>
                    <span>{c.partner.completed_jobs_count} jobs</span>
                    <span>·</span>
                    <span>{c.distance_km} km · ~{c.eta_minutes} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">{c.score?.total}%</div>
                  <div className="text-[10px] text-muted-foreground">Match</div>
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
        <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-foreground">{activeAddress.displayName || activeAddress.area}</p>
        </div>
      )}

      {/* Zone intelligence */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Verified technicians nearby</span>
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
        className="w-full gap-2 rounded-xl h-12"
      >
        {(phase === "searching" || phase === "loading") && <><RefreshCw className="w-4 h-4 animate-spin" /> Finding your technician…</>}
        {phase === "matched" && <><CheckCircle2 className="w-4 h-4" /> Confirm & Book</>}
        {phase === "accepting" && <><Timer className="w-4 h-4 animate-pulse" /> Technician reviewing…</>}
        {phase === "confirmed" && <><CheckCircle2 className="w-4 h-4" /> Proceed to Confirmation</>}
        {phase === "no_match" && <><Clock className="w-4 h-4" /> Searching for technicians…</>}
        {phase === "escalated" && <><Clock className="w-4 h-4" /> Operations team assisting…</>}
        {phase === "timeout" && <><RefreshCw className="w-4 h-4" /> Search Again</>}
        {phase === "error" && <><RefreshCw className="w-4 h-4" /> Try Again</>}
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
    <motion.div
      className="bg-card rounded-2xl border border-border/60 p-8 text-center space-y-5 shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
        <div className="absolute inset-4 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.8s" }} />
        <div className="absolute inset-6 rounded-full bg-primary flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      <div>
        <p className="font-bold text-foreground">
          {isEmergency ? "Priority matching in progress" : "Finding the best technician"}
          {".".repeat(dots)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Scanning {techCount || 8} verified technicians nearby
        </p>
      </div>
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Distance</span>
        <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Rating</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Availability</span>
      </div>
    </motion.div>
  );
};

export default V2AssignmentStep;
