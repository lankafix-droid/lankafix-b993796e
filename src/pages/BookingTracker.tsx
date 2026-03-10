import { useParams, Link, useNavigate } from "react-router-dom";
import PageTransition from "@/components/motion/PageTransition";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Star, Upload,
  CheckCircle2, Circle, Calendar,
  XCircle, FileText, AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import {
  BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS,
  BOOKING_TIMELINE_STEPS, QUOTE_TIMELINE_STEPS,
  CANCELLABLE_STATUSES, SERVICE_MODE_LABELS,
} from "@/types/booking";
import MascotIcon from "@/components/brand/MascotIcon";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import OtpVerifyModal from "@/components/modals/OtpVerifyModal";
import SosModal from "@/components/modals/SosModal";
import TrustStackCard from "@/components/tracker/TrustStackCard";
import TimelineEventLog from "@/components/tracker/TimelineEventLog";
import WarrantyCard from "@/components/tracker/WarrantyCard";
import ZoneIntelligenceCard from "@/components/tracker/ZoneIntelligenceCard";
import TechnicianConfidenceCard from "@/components/tracker/TechnicianConfidenceCard";
import { toast } from "sonner";
import { statusToMascotState, TRUST_ICONS, getRefundEligibility } from "@/brand/trustSystem";

const CANCEL_REASONS = [
  "Found another provider",
  "No longer needed",
  "Too expensive",
  "Scheduling conflict",
  "Other",
];

const BookingTracker = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { getBooking, cancelBooking, setBookingRating, verifyOtp } = useBookingStore();

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

  const handleCancel = () => {
    if (!cancelReason) return;
    cancelBooking(booking.jobId, cancelReason);
    setShowCancel(false);
  };

  const handleRate = () => {
    if (rating > 0) {
      setBookingRating(booking.jobId, rating);
      setRatingSubmitted(true);
    }
  };

  const handleOtpVerify = (otp: string) => {
    if (showOtp) {
      verifyOtp(booking.jobId, showOtp);
      toast.success(`${showOtp === "start" ? "Job start" : "Completion"} OTP verified`);
      setShowOtp(null);
    }
  };

  return (
    <PageTransition className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>

          {/* Header with mascot */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <MascotIcon state={mascotState} badge={booking.isEmergency ? "emergency" : "verified"} size="md" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{booking.jobId}</h1>
                <p className="text-sm text-muted-foreground">{booking.categoryName} • {booking.serviceName}</p>
              </div>
            </div>
            <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
              {BOOKING_STATUS_LABELS[booking.status]}
            </Badge>
          </div>

          {/* Zone Intelligence */}
          {booking.zone && (
            <div className="mb-4">
              <ZoneIntelligenceCard zone={booking.zone} />
            </div>
          )}

          {/* Booking confirmation card */}
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
            {/* Deposit status */}
            {booking.payments.deposit && (
              <div className={`mt-2 pt-2 border-t text-xs flex items-center gap-1.5 ${depositPaid ? "text-success" : "text-warning"}`}>
                {depositPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TRUST_ICONS.Clock className="w-3.5 h-3.5" />}
                Deposit: LKR {booking.payments.deposit.amount.toLocaleString("en-LK")} — {depositPaid ? "Paid" : "Pending"}
              </div>
            )}
            {/* Dispatch status */}
            {booking.dispatchStatus !== "pending" && (
              <div className="mt-1 text-xs text-muted-foreground">
                Dispatch: {booking.dispatchStatus === "dispatched" ? "En Route" : "Arrived"}
                {booking.dispatchedAt && ` • ${new Date(booking.dispatchedAt).toLocaleTimeString()}`}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Created: {new Date(booking.createdAt).toLocaleString()}</p>
          </div>

          {/* OTP Controls */}
          {(booking.status === "assigned" || booking.status === "tech_en_route" || booking.status === "in_progress") && (
            <div className="bg-card rounded-xl border p-4 mb-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TRUST_ICONS.KeyRound className="w-4 h-4 text-primary" /> Job Verification
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={booking.startOtpVerifiedAt ? "outline" : "hero"}
                  size="sm"
                  className="flex-1"
                  disabled={!!booking.startOtpVerifiedAt}
                  onClick={() => setShowOtp("start")}
                >
                  {booking.startOtpVerifiedAt ? "✓ Start Verified" : "Verify Start OTP"}
                </Button>
                <Button
                  variant={booking.completionOtpVerifiedAt ? "outline" : "hero"}
                  size="sm"
                  className="flex-1"
                  disabled={!!booking.completionOtpVerifiedAt}
                  onClick={() => setShowOtp("completion")}
                >
                  {booking.completionOtpVerifiedAt ? "✓ Completion Verified" : "Verify Completion OTP"}
                </Button>
              </div>
            </div>
          )}

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

          {/* Timeline Event Log */}
          {booking.timelineEvents && booking.timelineEvents.length > 0 && (
            <div className="mb-4">
              <TimelineEventLog events={booking.timelineEvents} />
            </div>
          )}

          {/* Quote Link */}
          {isQuoteFlow && (booking.status === "quote_submitted" || booking.status === "quote_approved" || booking.status === "quote_rejected" || booking.status === "quote_revised") && (
            <Button variant="outline" className="w-full mb-4" asChild>
              <Link to={`/quote/${booking.jobId}`}>
                <FileText className="w-4 h-4 mr-2" />
                {booking.status === "quote_submitted" ? "View & Approve Quote" : "View Quote Details"}
              </Link>
            </Button>
          )}

          {/* Technician Confidence Card */}
          {booking.technician && (
            <div className="mb-4">
              <TechnicianConfidenceCard technician={booking.technician} jobId={booking.jobId} />
            </div>
          )}

          {/* Trust Stack */}
          <div className="mb-4">
            <TrustStackCard booking={booking} />
          </div>

          {/* SOS Button */}
          {booking.status !== "cancelled" && !isCompleted && (
            <Button
              variant="outline"
              className="w-full mb-4 border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={() => setShowSos(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              SOS — Emergency Support
            </Button>
          )}

          {/* Evidence */}
          <div className="bg-card rounded-xl border p-5 mb-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-foreground mb-3">Evidence & Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Upload className="w-5 h-5" />
              </div>
              <div className="aspect-square rounded-lg bg-muted/50 border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors">
                + Upload
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Upload before/after photos for your records</p>
          </div>

          {/* Warranty Card (when completed) */}
          {isCompleted && (
            <div className="mb-4">
              <WarrantyCard booking={booking} />
            </div>
          )}

          {/* Completion / Rating */}
          {isCompleted && (
            <div className="bg-card rounded-xl border p-5 mb-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <MascotIcon state="completed" size="sm" />
                <h3 className="text-sm font-semibold text-foreground">Completion</h3>
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
                  <p className="text-xs text-muted-foreground mb-3">Rate your experience</p>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star className={`w-7 h-7 cursor-pointer transition-colors ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground/30 hover:text-warning/50"}`} />
                      </button>
                    ))}
                  </div>
                  <Button variant="success" size="sm" onClick={handleRate} disabled={rating === 0}>Submit Rating</Button>
                </div>
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
                  <p className="text-sm text-muted-foreground mb-2">Select a reason:</p>
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

      {/* Modals */}
      <OtpVerifyModal
        open={showOtp !== null}
        onClose={() => setShowOtp(null)}
        onVerify={handleOtpVerify}
        type={showOtp || "start"}
        jobId={booking.jobId}
      />
      <SosModal
        open={showSos}
        onClose={() => setShowSos(false)}
        jobId={booking.jobId}
        technicianName={booking.technician?.name}
      />
    </PageTransition>
  );
};

export default BookingTracker;
