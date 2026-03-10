import { useParams, Link, useNavigate } from "react-router-dom";
import PageTransition from "@/components/motion/PageTransition";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Star, CheckCircle2, Circle, Calendar,
  XCircle, FileText, AlertTriangle, Phone, MessageCircle,
  CreditCard, Play, Flag, Shield, Clock, MapPin, Sparkles,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS,
  BOOKING_TIMELINE_STEPS, QUOTE_TIMELINE_STEPS,
  CANCELLABLE_STATUSES, SERVICE_MODE_LABELS,
} from "@/types/booking";
import type { BookingStatus } from "@/types/booking";
import MascotIcon from "@/components/brand/MascotIcon";
import MascotGuide from "@/components/mascot/MascotGuide";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import OtpVerifyModal from "@/components/modals/OtpVerifyModal";
import TrustStackCard from "@/components/tracker/TrustStackCard";
import TimelineEventLog from "@/components/tracker/TimelineEventLog";
import WarrantyCard from "@/components/tracker/WarrantyCard";
import ZoneIntelligenceCard from "@/components/tracker/ZoneIntelligenceCard";
import TechnicianConfidenceCard from "@/components/tracker/TechnicianConfidenceCard";
import EvidenceCard from "@/components/tracker/EvidenceCard";
import SOSPanel from "@/components/tracker/SOSPanel";
import MatchingCard from "@/components/tracker/MatchingCard";
import AssignmentCard from "@/components/tracker/AssignmentCard";
import PaymentCard from "@/components/tracker/PaymentCard";
import TechnicianMap from "@/components/tracking/TechnicianMap";
import TechnicianLocationCard from "@/components/tracking/TechnicianLocationCard";
import { toast } from "sonner";
import { statusToMascotState, TRUST_ICONS, getRefundEligibility, type MascotMessageKey } from "@/brand/trustSystem";
import { generateDemoQuote } from "@/engines/quoteEngine";
import { getZoneIntelligence } from "@/engines/matchingEngine";
import { track } from "@/lib/analytics";
import CareUpsellBanner from "@/components/tracker/CareUpsellBanner";
import { createSimulation, advanceSimulation } from "@/lib/trackingEngine";
import type { TrackingSimulation } from "@/lib/trackingEngine";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { motion, AnimatePresence } from "framer-motion";

const CANCEL_REASONS = [
  "Found another provider",
  "No longer needed",
  "Too expensive",
  "Scheduling conflict",
  "Other",
];

function getMascotKey(status: string, sosActive: boolean): MascotMessageKey {
  if (sosActive) return "sos";
  switch (status) {
    case "requested":
    case "matching":
    case "awaiting_partner_confirmation":
    case "scheduled":
      return "welcome";
    case "assigned": return "assigned";
    case "tech_en_route": return "on_the_way";
    case "arrived":
    case "inspection_started":
    case "in_progress":
    case "repair_started":
      return "in_progress";
    case "quote_submitted":
    case "quote_revised": return "quote_ready";
    case "quote_approved": return "assigned";
    case "completed": return "completed";
    case "rated": return "rating";
    default: return "welcome";
  }
}

// ─── Premium Progress Stepper ───
function PremiumStepper({ steps, currentIdx }: { steps: { status: string; label: string }[]; currentIdx: number }) {
  const progress = steps.length > 1 ? Math.max(0, currentIdx / (steps.length - 1)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-md border rounded-2xl p-5 mb-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Job Progress</h3>
        <span className="text-xs text-muted-foreground">
          Step {Math.min(currentIdx + 1, steps.length)} of {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-secondary rounded-full mb-4 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between">
        {steps.map((step, i) => {
          const completed = currentIdx >= i;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.status} className="flex flex-col items-center gap-1 flex-1">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.2 : 1 }}
                className={`w-3 h-3 rounded-full transition-colors ${
                  completed
                    ? isCurrent
                      ? "bg-primary ring-4 ring-primary/20"
                      : "bg-success"
                    : "bg-muted"
                }`}
              />
              {(i === 0 || i === currentIdx || i === steps.length - 1) && (
                <span className={`text-[10px] text-center leading-tight max-w-[60px] ${
                  completed ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Trust Badge Row ───
function TrustBadgeRow() {
  const badges = [
    { icon: Shield, label: "Verified Tech" },
    { icon: Clock, label: "OTP Protected" },
    { icon: Sparkles, label: "Warranty" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex gap-2 mb-5 overflow-x-auto scrollbar-none"
    >
      {badges.map((b, i) => (
        <motion.span
          key={b.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 + i * 0.08 }}
          className="inline-flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-full px-3 py-1.5 text-xs text-primary font-medium whitespace-nowrap"
        >
          <b.icon className="w-3.5 h-3.5" />
          {b.label}
        </motion.span>
      ))}
    </motion.div>
  );
}

// ─── Animated Section Wrapper ───
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mb-4"
    >
      {children}
    </motion.div>
  );
}

const TrackerPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const {
    getBooking, cancelBooking, setBookingRating, verifyOtp,
    setPayment, markDispatched, markArrived, updateBookingStatus,
    setBookingQuote, lastMatchResult, updateTracking, startTravel,
  } = useBookingStore();

  const booking = getBooking(jobId || "");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showOtp, setShowOtp] = useState<"start" | "completion" | null>(null);
  const [showSos, setShowSos] = useState(false);
  const [simulation, setSimulation] = useState<TrackingSimulation | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-start tracking simulation when tech is en route
  useEffect(() => {
    if (!booking) return;
    const isEnRoute = booking.status === "tech_en_route";
    const hasTracking = booking.trackingData?.isTracking;

    if (isEnRoute && hasTracking && !simulation) {
      const td = booking.trackingData!;
      if (td.technicianLocation && td.customerLocation) {
        const sim = createSimulation(
          booking.jobId,
          td.technicianLocation.lat, td.technicianLocation.lng,
          td.customerLocation.lat, td.customerLocation.lng,
          15
        );
        setSimulation(sim);
      }
    }
  }, [booking?.status, booking?.trackingData?.isTracking]);

  // Run simulation interval
  useEffect(() => {
    if (!simulation?.isRunning || !booking) return;

    simRef.current = setInterval(() => {
      setSimulation((prev) => {
        if (!prev || !prev.isRunning) return prev;
        const next = advanceSimulation(prev);
        updateTracking(booking.jobId, next.tracking);

        if (!next.isRunning && next.tracking.arrivedAt) {
          markArrived(booking.jobId);
          toast.success("Technician has arrived! 📍");
        }
        return next;
      });
    }, 2000);

    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [simulation?.isRunning]);

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center px-6"
          >
            <MascotIcon state="default" size="lg" className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-4">No booking found for &quot;{jobId}&quot;</p>
            <Button asChild variant="outline" className="rounded-xl"><Link to="/track">Track a Job</Link></Button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);
  const isQuoteFlow = booking.pricing.quoteRequired;
  const timelineSteps = isQuoteFlow ? QUOTE_TIMELINE_STEPS : BOOKING_TIMELINE_STEPS;
  const statusOrder = timelineSteps.map((s) => s.status);
  const currentIdx = statusOrder.indexOf(booking.status);
  const mascotState = statusToMascotState[booking.status];
  const isCompleted = booking.status === "completed" || booking.status === "rated";
  const depositPaid = booking.payments.deposit?.status === "paid";
  const refundInfo = getRefundEligibility(booking);
  const mascotKey = getMascotKey(booking.status, !!booking.sos?.active);
  const isMatching = booking.status === "matching" || booking.status === "awaiting_partner_confirmation";
  const isAssigned = booking.technician && !isMatching;
  const zoneIntel = getZoneIntelligence(booking.zone);

  const handleCancel = () => {
    if (!cancelReason) return;
    cancelBooking(booking.jobId, cancelReason);
    setShowCancel(false);
    toast.success("Booking cancelled");
  };

  const handleRate = () => {
    if (rating > 0) {
      setBookingRating(booking.jobId, rating);
      setRatingSubmitted(true);
      toast.success("Thanks for your feedback!");
    }
  };

  const handleOtpVerify = () => {
    if (showOtp) {
      verifyOtp(booking.jobId, showOtp);
      toast.success(`${showOtp === "start" ? "Job start" : "Completion"} OTP verified`);
      setShowOtp(null);
    }
  };

  const handlePayDeposit = () => {
    setPayment(booking.jobId, "deposit", {
      type: "deposit", amount: booking.pricing.depositAmount, method: "cash",
      status: "paid", refundableAmount: booking.pricing.depositAmount, refundStatus: "none",
      paidAt: new Date().toISOString(), provider: "manual",
    });
    toast.success("Deposit payment recorded");
  };

  const handlePayCompletion = () => {
    const amount = booking.quote?.options?.find((o) => o.id === booking.quote?.selectedOptionId)?.totals.total
      || booking.pricing.estimatedMin;
    setPayment(booking.jobId, "completion", {
      type: "completion", amount, method: "cash",
      status: "paid", refundableAmount: 0, refundStatus: "none",
      paidAt: new Date().toISOString(), provider: "manual",
    });
    toast.success("Completion payment recorded");
  };

  const handleGenerateQuote = () => {
    const quote = generateDemoQuote(booking.categoryCode, booking.serviceCode, booking.pricing.estimatedMin);
    setBookingQuote(booking.jobId, quote);
    toast.success("Demo quote generated");
  };

  const handleDemoConfirmPartner = () => {
    updateBookingStatus(booking.jobId, "assigned");
    toast.success("Partner confirmed — technician assigned");
  };

  const handleDemoInspection = () => {
    updateBookingStatus(booking.jobId, "inspection_started");
    toast.success("Inspection started");
  };

  const handleDemoRepairStarted = () => {
    updateBookingStatus(booking.jobId, "repair_started");
    toast.success("Repair started");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* ─── Sticky Status Header ─── */}
        <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-lg border-b">
          <div className="container max-w-2xl py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <MascotIcon state={mascotState} badge={booking.isEmergency ? "emergency" : "verified"} size="sm" />
                <div>
                  <p className="font-bold text-foreground text-sm leading-tight">{booking.jobId}</p>
                  <p className="text-xs text-muted-foreground">{booking.categoryName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${BOOKING_STATUS_COLORS[booking.status]}`}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </Badge>
                {booking.etaMinutes && booking.dispatchStatus === "dispatched" && (
                  <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                    ETA {lastMatchResult?.etaRange || `~${booking.etaMinutes}m`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container py-6 max-w-2xl">
          {/* Mascot Guide */}
          <Section delay={0.1}>
            <MascotGuide messageKey={mascotKey} />
          </Section>

          {/* Trust Badge Row */}
          <TrustBadgeRow />

          {/* Premium Progress Stepper */}
          <PremiumStepper steps={timelineSteps} currentIdx={currentIdx} />

          {/* Matching or Assignment Card */}
          {isMatching && (
            <Section delay={0.15}>
              <MatchingCard
                nearbyTechCount={lastMatchResult?.nearbyTechCount ?? zoneIntel.techsNearby}
                avgResponseMinutes={zoneIntel.avgResponseMinutes}
                zone={booking.zone}
                extendedCoverage={lastMatchResult?.extendedCoverage}
                status={booking.status as "matching" | "awaiting_partner_confirmation"}
              />
              {booking.status === "awaiting_partner_confirmation" && (
                <Button variant="outline" size="sm" className="w-full mt-2 rounded-xl" onClick={handleDemoConfirmPartner}>
                  <Play className="w-4 h-4 mr-2" /> Confirm Partner (Demo)
                </Button>
              )}
            </Section>
          )}

          {isAssigned && booking.technician && (
            <Section delay={0.15}>
              <AssignmentCard
                technician={booking.technician}
                distanceKm={lastMatchResult?.bestMatch?.distanceKm}
                etaRange={lastMatchResult?.etaRange}
                extendedCoverage={lastMatchResult?.extendedCoverage}
                confidenceScore={lastMatchResult?.bestMatch?.totalScore}
                serviceMode={booking.serviceMode}
                bookingConfirmed={true}
              />
            </Section>
          )}

          {/* Live Tracking Map */}
          {booking.trackingData?.isTracking && booking.technician && (
            <Section delay={0.2}>
              <div className="space-y-3">
                <TechnicianMap
                  tracking={booking.trackingData}
                  technicianName={booking.technician.name}
                />
                <TechnicianLocationCard
                  technician={booking.technician}
                  tracking={booking.trackingData}
                />
              </div>
            </Section>
          )}

          {/* Arrived notification */}
          {booking.trackingData?.arrivedAt && !booking.trackingData?.isTracking && booking.technician && (
            <Section delay={0.2}>
              <TechnicianLocationCard
                technician={booking.technician}
                tracking={booking.trackingData}
              />
            </Section>
          )}

          {/* ─── Booking Confirmation Card ─── */}
          <Section delay={0.25}>
            <div className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <LankaFixLogo size="sm" />
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full font-medium">
                  Booking Confirmation
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium text-foreground">{booking.scheduledDate || "TBD"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium text-foreground">{booking.scheduledTime || booking.preferredWindow || "TBD"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Zone:</span>
                  <span className="font-medium text-foreground">{booking.zone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mode: </span>
                  <span className="font-medium text-foreground">{SERVICE_MODE_LABELS[booking.serviceMode]}</span>
                </div>
              </div>
              {booking.address && (
                <p className="text-xs text-muted-foreground mt-3 border-t pt-3">{booking.address}</p>
              )}
              {booking.payments.deposit && (
                <div className={`mt-3 pt-3 border-t text-xs flex items-center gap-1.5 ${depositPaid ? "text-success" : "text-warning"}`}>
                  {depositPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  Deposit: LKR {booking.payments.deposit.amount.toLocaleString("en-LK")} — {depositPaid ? "Paid" : "Pending"}
                </div>
              )}
              <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Payment only happens after job completion
              </div>
            </div>
          </Section>

          {/* ─── Action Panel ─── */}
          <Section delay={0.3}>
            <div className="bg-card rounded-2xl border p-4 space-y-2 shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Actions</h3>

              {/* OTP Controls */}
              {(["assigned", "tech_en_route", "arrived", "inspection_started", "in_progress", "repair_started"] as BookingStatus[]).includes(booking.status) && (
                <div className="flex gap-2">
                  <Button
                    variant={booking.startOtpVerifiedAt ? "outline" : "hero"}
                    size="sm" className="flex-1 rounded-xl"
                    disabled={!!booking.startOtpVerifiedAt}
                    onClick={() => setShowOtp("start")}
                  >
                    {booking.startOtpVerifiedAt ? "✓ Start Verified" : "Verify Start OTP"}
                  </Button>
                  <Button
                    variant={booking.completionOtpVerifiedAt ? "outline" : "hero"}
                    size="sm" className="flex-1 rounded-xl"
                    disabled={!!booking.completionOtpVerifiedAt}
                    onClick={() => setShowOtp("completion")}
                  >
                    {booking.completionOtpVerifiedAt ? "✓ Completion Verified" : "Verify Completion OTP"}
                  </Button>
                </div>
              )}

              {/* Quote actions */}
              {isQuoteFlow && (
                <>
                  {booking.quote && (
                    <Button variant="outline" className="w-full rounded-xl" asChild>
                      <Link to={`/quote/${booking.jobId}`}>
                        <FileText className="w-4 h-4 mr-2" />
                        {booking.status === "quote_submitted" ? "View & Approve Quote" : "View Quote Details"}
                      </Link>
                    </Button>
                  )}
                  {!booking.quote && (
                    <Button variant="outline" className="w-full rounded-xl" onClick={handleGenerateQuote}>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Quote (Demo)
                    </Button>
                  )}
                </>
              )}

              {/* Demo dispatch/arrival/inspection/repair */}
              {booking.status === "assigned" && booking.dispatchStatus === "pending" && (
                <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => {
                  const techGeo = { lat: 6.9090 + Math.random() * 0.02, lng: 79.8620 + Math.random() * 0.02 };
                  const custGeo = { lat: 6.8720 + Math.random() * 0.02, lng: 79.8890 + Math.random() * 0.02 };
                  startTravel(booking.jobId, techGeo.lat, techGeo.lng, custGeo.lat, custGeo.lng);
                  toast.success("Technician is on the way! 🚗");
                }}>
                  <Play className="w-4 h-4 mr-2" /> Start Live Tracking (Demo)
                </Button>
              )}
              {booking.status === "tech_en_route" && (
                <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => markArrived(booking.jobId)}>
                  <MapPin className="w-4 h-4 mr-2" /> Mark Arrived (Demo)
                </Button>
              )}
              {booking.status === "arrived" && isQuoteFlow && (
                <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={handleDemoInspection}>
                  <Play className="w-4 h-4 mr-2" /> Start Inspection (Demo)
                </Button>
              )}
              {booking.status === "quote_approved" && (
                <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={handleDemoRepairStarted}>
                  <Play className="w-4 h-4 mr-2" /> Start Repair (Demo)
                </Button>
              )}
            </div>
          </Section>

          {/* Payment Card */}
          <Section delay={0.35}>
            <PaymentCard booking={booking} />
          </Section>

          {/* Zone Intelligence */}
          {booking.zone && (
            <Section delay={0.4}>
              <ZoneIntelligenceCard zone={booking.zone} />
            </Section>
          )}

          {/* Technician Confidence */}
          {!isMatching && booking.technician && (
            <Section delay={0.45}>
              <TechnicianConfidenceCard technician={booking.technician} jobId={booking.jobId} />
            </Section>
          )}

          {/* Trust Stack */}
          <Section delay={0.5}>
            <TrustStackCard booking={booking} />
          </Section>

          {/* Timeline Event Log */}
          {booking.timelineEvents.length > 0 && (
            <Section delay={0.55}>
              <TimelineEventLog events={booking.timelineEvents} />
            </Section>
          )}

          {/* Evidence */}
          <Section delay={0.6}>
            <EvidenceCard jobId={booking.jobId} photos={booking.photos} />
          </Section>

          {/* Warranty Card */}
          {isCompleted && (
            <Section delay={0.65}>
              <WarrantyCard booking={booking} />
            </Section>
          )}

          {/* Care Upsell */}
          {isCompleted && (
            <Section delay={0.7}>
              <CareUpsellBanner categoryCode={booking.categoryCode} />
            </Section>
          )}

          {/* ─── Rating ─── */}
          {isCompleted && (
            <Section delay={0.75}>
              <div className="bg-card rounded-2xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <MascotIcon state="completed" size="sm" />
                  <h3 className="text-sm font-semibold text-foreground">Rate Your Experience</h3>
                </div>
                {booking.status === "rated" || ratingSubmitted ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-center py-3"
                  >
                    <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
                    <p className="text-sm text-success font-medium">Thank you for your rating!</p>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-5 h-5 ${s <= (booking.rating || rating) ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div>
                    <div className="flex gap-2 mb-4 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <motion.button
                          key={s}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setRating(s)}
                          aria-label={`Rate ${s} stars`}
                        >
                          <Star className={`w-8 h-8 cursor-pointer transition-colors ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground/30 hover:text-warning/50"}`} />
                        </motion.button>
                      ))}
                    </div>
                    <Button variant="hero" size="sm" className="w-full rounded-xl" onClick={handleRate} disabled={rating === 0}>
                      Submit Rating
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ─── SOS ─── */}
          {booking.status !== "cancelled" && !isCompleted && (
            <Section delay={0.8}>
              {showSos ? (
                <SOSPanel jobId={booking.jobId} technicianName={booking.technician?.name} onClose={() => setShowSos(false)} />
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 rounded-xl"
                  onClick={() => setShowSos(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  SOS — Emergency Support
                </Button>
              )}
            </Section>
          )}

          {/* ─── Cancel ─── */}
          {canCancel && booking.status !== "cancelled" && (
            <Section delay={0.85}>
              <AnimatePresence mode="wait">
                {showCancel ? (
                  <motion.div
                    key="cancel-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 overflow-hidden"
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-destructive" /> Cancel Booking
                    </h3>
                    {booking.pricing.depositRequired && (
                      <p className="text-xs text-warning bg-warning/10 rounded-xl px-3 py-2 mb-3">
                        ⚠ Refund: {refundInfo.refundPercent}% — {refundInfo.reason}
                      </p>
                    )}
                    <div className="space-y-2 mb-3">
                      {CANCEL_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setCancelReason(r)}
                          className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${cancelReason === r ? "bg-destructive/10 border-destructive/30 text-destructive font-medium" : "bg-card text-foreground hover:border-destructive/20"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="rounded-xl" onClick={handleCancel} disabled={!cancelReason}>Confirm Cancel</Button>
                      <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setShowCancel(false)}>Go Back</Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="cancel-btn">
                    <Button variant="outline" className="w-full text-destructive hover:text-destructive rounded-xl" onClick={() => setShowCancel(true)}>
                      Cancel Booking
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>
          )}

          {booking.status === "cancelled" && (
            <Section delay={0.85}>
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 text-center">
                <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                <p className="font-semibold text-destructive">Booking Cancelled</p>
                {booking.cancelReason && <p className="text-xs text-muted-foreground mt-1">Reason: {booking.cancelReason}</p>}
              </div>
            </Section>
          )}
        </div>
      </main>
      <Footer />

      {/* OTP Modal */}
      <OtpVerifyModal
        open={showOtp !== null}
        onClose={() => setShowOtp(null)}
        onVerify={handleOtpVerify}
        type={showOtp || "start"}
        jobId={booking.jobId}
      />
    </div>
  );
};

export default TrackerPage;
