import { useParams, Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Star, CheckCircle2, Circle, Calendar,
  XCircle, FileText, AlertTriangle, Phone, MessageCircle,
  CreditCard, Play, Flag,
} from "lucide-react";
import { useState } from "react";
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
import { toast } from "sonner";
import { statusToMascotState, TRUST_ICONS, getRefundEligibility, type MascotMessageKey } from "@/brand/trustSystem";
import { generateDemoQuote } from "@/engines/quoteEngine";
import { getZoneIntelligence } from "@/engines/matchingEngine";
import { track } from "@/lib/analytics";

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

const TrackerPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const {
    getBooking, cancelBooking, setBookingRating, verifyOtp,
    setPayment, markDispatched, markArrived, updateBookingStatus,
    setBookingQuote, lastMatchResult,
  } = useBookingStore();

  const booking = getBooking(jobId || "");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showOtp, setShowOtp] = useState<"start" | "completion" | null>(null);
  const [showSos, setShowSos] = useState(false);

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MascotIcon state="default" size="lg" className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-4">No booking found for &quot;{jobId}&quot;</p>
            <Button asChild variant="outline"><Link to="/track">Track a Job</Link></Button>
          </div>
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>

          {/* Status Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <MascotIcon state={mascotState} badge={booking.isEmergency ? "emergency" : "verified"} size="md" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{booking.jobId}</h1>
                <p className="text-sm text-muted-foreground">{booking.categoryName} • {booking.serviceName}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                {BOOKING_STATUS_LABELS[booking.status]}
              </Badge>
              {booking.dispatchStatus !== "pending" && (
                <Badge variant="outline" className="text-[10px]">
                  {booking.dispatchStatus === "dispatched" ? "🚗 En Route" : "📍 Arrived"}
                </Badge>
              )}
              {booking.etaMinutes && booking.dispatchStatus === "dispatched" && (
                <span className="text-[10px] text-muted-foreground">
                  ETA: {lastMatchResult?.etaRange || `~${booking.etaMinutes} min`}
                </span>
              )}
            </div>
          </div>

          {/* Mascot Guide */}
          <MascotGuide messageKey={mascotKey} className="mb-4" />

          {/* Matching or Assignment Card */}
          {isMatching && (
            <div className="mb-4">
              <MatchingCard
                nearbyTechCount={lastMatchResult?.nearbyTechCount ?? zoneIntel.techsNearby}
                avgResponseMinutes={zoneIntel.avgResponseMinutes}
                zone={booking.zone}
                extendedCoverage={lastMatchResult?.extendedCoverage}
                status={booking.status as "matching" | "awaiting_partner_confirmation"}
              />
              {booking.status === "awaiting_partner_confirmation" && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleDemoConfirmPartner}>
                  <Play className="w-4 h-4 mr-2" /> Confirm Partner (Demo)
                </Button>
              )}
            </div>
          )}

          {isAssigned && booking.technician && (
            <div className="mb-4">
             <AssignmentCard
                technician={booking.technician}
                distanceKm={lastMatchResult?.bestMatch?.distanceKm}
                etaRange={lastMatchResult?.etaRange}
                extendedCoverage={lastMatchResult?.extendedCoverage}
                confidenceScore={lastMatchResult?.bestMatch?.totalScore}
                serviceMode={booking.serviceMode}
              />
            </div>
          )}

          {/* Booking Info Card */}
          <div className="bg-card rounded-xl border p-5 mb-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <LankaFixLogo size="sm" />
              <span className="text-xs text-muted-foreground">Booking Confirmation</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium text-foreground">{booking.scheduledDate || "TBD"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TRUST_ICONS.Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium text-foreground">{booking.scheduledTime || booking.preferredWindow || "TBD"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TRUST_ICONS.MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Zone:</span>
                <span className="font-medium text-foreground">{booking.zone}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mode: </span>
                <span className="font-medium text-foreground">{SERVICE_MODE_LABELS[booking.serviceMode]}</span>
              </div>
            </div>
            {booking.address && (
              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{booking.address}</p>
            )}
            {booking.payments.deposit && (
              <div className={`mt-2 pt-2 border-t text-xs flex items-center gap-1.5 ${depositPaid ? "text-success" : "text-warning"}`}>
                {depositPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TRUST_ICONS.Clock className="w-3.5 h-3.5" />}
                Deposit: LKR {booking.payments.deposit.amount.toLocaleString("en-LK")} — {depositPaid ? "Paid" : "Pending"}
              </div>
            )}
            {/* Trust microcopy */}
            <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Payment only happens after job completion
            </div>
          </div>

          {/* Action Panel */}
          <div className="bg-card rounded-xl border p-4 mb-4 space-y-2 animate-fade-in">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Actions</h3>

            {/* OTP Controls */}
            {(["assigned", "tech_en_route", "arrived", "inspection_started", "in_progress", "repair_started"] as BookingStatus[]).includes(booking.status) && (
              <div className="flex gap-2">
                <Button
                  variant={booking.startOtpVerifiedAt ? "outline" : "hero"}
                  size="sm" className="flex-1"
                  disabled={!!booking.startOtpVerifiedAt}
                  onClick={() => setShowOtp("start")}
                >
                  {booking.startOtpVerifiedAt ? "✓ Start Verified" : "Verify Start OTP"}
                </Button>
                <Button
                  variant={booking.completionOtpVerifiedAt ? "outline" : "hero"}
                  size="sm" className="flex-1"
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
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/quote/${booking.jobId}`}>
                      <FileText className="w-4 h-4 mr-2" />
                      {booking.status === "quote_submitted" ? "View & Approve Quote" : "View Quote Details"}
                    </Link>
                  </Button>
                )}
                {!booking.quote && (
                  <Button variant="outline" className="w-full" onClick={handleGenerateQuote}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Quote (Demo)
                  </Button>
                )}
              </>
            )}

            {/* Demo dispatch/arrival/inspection/repair */}
            {booking.status === "assigned" && booking.dispatchStatus === "pending" && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => { markDispatched(booking.jobId); updateBookingStatus(booking.jobId, "tech_en_route"); }}>
                <Play className="w-4 h-4 mr-2" /> Dispatch Technician (Demo)
              </Button>
            )}
            {booking.status === "tech_en_route" && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => markArrived(booking.jobId)}>
                <TRUST_ICONS.MapPin className="w-4 h-4 mr-2" /> Mark Arrived (Demo)
              </Button>
            )}
            {booking.status === "arrived" && isQuoteFlow && (
              <Button variant="outline" size="sm" className="w-full" onClick={handleDemoInspection}>
                <Play className="w-4 h-4 mr-2" /> Start Inspection (Demo)
              </Button>
            )}
            {booking.status === "quote_approved" && (
              <Button variant="outline" size="sm" className="w-full" onClick={handleDemoRepairStarted}>
                <Play className="w-4 h-4 mr-2" /> Start Repair (Demo)
              </Button>
            )}

            {/* Payment actions */}
            {booking.payments.deposit && booking.payments.deposit.status === "pending" && (
              <Button variant="outline" size="sm" className="w-full" onClick={handlePayDeposit}>
                <CreditCard className="w-4 h-4 mr-2" /> Pay Commitment Fee — LKR {booking.payments.deposit.amount.toLocaleString("en-LK")}
              </Button>
            )}
            {isCompleted && !booking.payments.completion?.status && (
              <Button variant="outline" size="sm" className="w-full" onClick={handlePayCompletion}>
                <CreditCard className="w-4 h-4 mr-2" /> Pay Completion
              </Button>
            )}
            {isCompleted && booking.payments.completion?.status === "pending" && (
              <Button variant="outline" size="sm" className="w-full" onClick={handlePayCompletion}>
                <CreditCard className="w-4 h-4 mr-2" /> Pay Completion — LKR {booking.payments.completion.amount.toLocaleString("en-LK")}
              </Button>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-card rounded-xl border p-5 mb-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-foreground mb-4">Status Timeline</h3>
            <div className="space-y-0">
              {timelineSteps.map((step, i) => {
                const stepCompleted = currentIdx >= i;
                const isCurrent = statusOrder[i] === booking.status;
                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {stepCompleted ? (
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isCurrent ? "text-primary" : "text-success"}`} />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                      )}
                      {i < timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${stepCompleted ? "bg-success/30" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-medium ${stepCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zone Intelligence */}
          {booking.zone && (
            <div className="mb-4">
              <ZoneIntelligenceCard zone={booking.zone} />
            </div>
          )}

          {/* Technician Confidence (legacy card, shown if not matching) */}
          {!isMatching && booking.technician && (
            <div className="mb-4">
              <TechnicianConfidenceCard technician={booking.technician} jobId={booking.jobId} />
            </div>
          )}

          {/* Trust Stack */}
          <div className="mb-4">
            <TrustStackCard booking={booking} />
          </div>

          {/* Timeline Event Log */}
          {booking.timelineEvents.length > 0 && (
            <div className="mb-4">
              <TimelineEventLog events={booking.timelineEvents} />
            </div>
          )}

          {/* Evidence */}
          <div className="mb-4">
            <EvidenceCard jobId={booking.jobId} photos={booking.photos} />
          </div>

          {/* Warranty Card */}
          {isCompleted && (
            <div className="mb-4">
              <WarrantyCard booking={booking} />
            </div>
          )}

          {/* Rating */}
          {isCompleted && (
            <div className="bg-card rounded-xl border p-5 mb-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <MascotIcon state="completed" size="sm" />
                <h3 className="text-sm font-semibold text-foreground">Rate Your Experience</h3>
              </div>
              {booking.status === "rated" || ratingSubmitted ? (
                <div className="text-center py-2">
                  <p className="text-sm text-success font-medium">✓ Thank you for your rating!</p>
                  <div className="flex justify-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-5 h-5 ${s <= (booking.rating || rating) ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)} aria-label={`Rate ${s} stars`}>
                        <Star className={`w-7 h-7 cursor-pointer transition-colors ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground/30 hover:text-warning/50"}`} />
                      </button>
                    ))}
                  </div>
                  <Button variant="hero" size="sm" onClick={handleRate} disabled={rating === 0}>Submit Rating</Button>
                </div>
              )}
            </div>
          )}

          {/* SOS */}
          {booking.status !== "cancelled" && !isCompleted && (
            <div className="mb-4">
              {showSos ? (
                <SOSPanel jobId={booking.jobId} technicianName={booking.technician?.name} onClose={() => setShowSos(false)} />
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                  onClick={() => setShowSos(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  SOS — Emergency Support
                </Button>
              )}
            </div>
          )}

          {/* Cancel */}
          {canCancel && booking.status !== "cancelled" && (
            <>
              {showCancel ? (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 mb-4 animate-fade-in">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-destructive" /> Cancel Booking
                  </h3>
                  {booking.pricing.depositRequired && (
                    <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-3">
                      ⚠ Refund: {refundInfo.refundPercent}% — {refundInfo.reason}
                    </p>
                  )}
                  <div className="space-y-2 mb-3">
                    {CANCEL_REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setCancelReason(r)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${cancelReason === r ? "bg-destructive/10 border-destructive/30 text-destructive font-medium" : "bg-card text-foreground hover:border-destructive/20"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleCancel} disabled={!cancelReason}>Confirm Cancel</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>Go Back</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-destructive hover:text-destructive mb-4" onClick={() => setShowCancel(true)}>
                  Cancel Booking
                </Button>
              )}
            </>
          )}

          {booking.status === "cancelled" && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 mb-4 text-center animate-fade-in">
              <p className="font-semibold text-destructive">Booking Cancelled</p>
              {booking.cancelReason && <p className="text-xs text-muted-foreground mt-1">Reason: {booking.cancelReason}</p>}
            </div>
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
