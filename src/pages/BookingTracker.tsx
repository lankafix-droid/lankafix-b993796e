import { useParams, Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import { whatsappLink, SUPPORT_WHATSAPP, TECHNICIAN_WHATSAPP } from "@/config/contact";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Phone, MessageCircle, Star, Upload,
  CheckCircle2, Circle, Clock, MapPin, Calendar,
  XCircle, FileText, ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import {
  BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS,
  BOOKING_TIMELINE_STEPS, QUOTE_TIMELINE_STEPS,
  CANCELLABLE_STATUSES, SERVICE_MODE_LABELS,
} from "@/types/booking";
import type { BookingStatus } from "@/types/booking";

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
  const { getBooking, cancelBooking, setBookingRating } = useBookingStore();

  const booking = getBooking(jobId || "");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-4">No booking found for "{jobId}"</p>
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

  // Derive completed steps from current status
  const statusOrder = timelineSteps.map((s) => s.status);
  const currentIdx = statusOrder.indexOf(booking.status);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{booking.jobId}</h1>
              <p className="text-sm text-muted-foreground">{booking.categoryName} • {booking.serviceName}</p>
            </div>
            <Badge className={BOOKING_STATUS_COLORS[booking.status] || "bg-muted text-muted-foreground"}>
              {BOOKING_STATUS_LABELS[booking.status] || booking.status}
            </Badge>
          </div>

          {/* Booking Info */}
          <div className="bg-card rounded-xl border p-5 mb-4">
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
              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{booking.address}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Created: {new Date(booking.createdAt).toLocaleString()}</p>
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Status Timeline</h3>
            <div className="space-y-0">
              {timelineSteps.map((step, i) => {
                const isCompleted = currentIdx >= i;
                const isCurrent = statusOrder[i] === booking.status;
                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {isCompleted ? (
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isCurrent ? "text-primary" : "text-success"}`} />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                      )}
                      {i < timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${isCompleted ? "bg-success/30" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quote Link (for quote-required jobs) */}
          {isQuoteFlow && (booking.status === "quote_submitted" || booking.status === "quote_approved" || booking.status === "quote_rejected") && (
            <Button variant="outline" className="w-full mb-4" asChild>
              <Link to={`/quote/${booking.jobId}`}>
                <FileText className="w-4 h-4 mr-2" />
                {booking.status === "quote_submitted" ? "View & Approve Quote" : "View Quote Details"}
              </Link>
            </Button>
          )}

          {/* Technician Card */}
          {booking.technician && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assigned Technician</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {booking.technician.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{booking.technician.name}</p>
                  <p className="text-xs text-muted-foreground">{booking.technician.partnerName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                    <span>{booking.technician.rating}</span>
                    <span>•</span>
                    <span>{booking.technician.jobsCompleted} jobs</span>
                    <span>•</span>
                    <span>ETA: {booking.technician.eta}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={whatsappLink(TECHNICIAN_WHATSAPP, `Hi, regarding job ${booking.jobId}`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp Tech
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={whatsappLink(SUPPORT_WHATSAPP, `Support for job ${booking.jobId}`)} target="_blank" rel="noopener noreferrer">
                    <Phone className="w-4 h-4 mr-1" /> WhatsApp Support
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Evidence */}
          <div className="bg-card rounded-xl border p-5 mb-4">
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

          {/* Completion / Rating */}
          {(booking.status === "completed" || booking.status === "rated") && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Completion</h3>
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
                  <Button variant="success" size="sm" onClick={handleRate} disabled={rating === 0}>
                    Submit Rating
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Cancel */}
          {canCancel && booking.status !== "cancelled" && (
            <>
              {showCancel ? (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-destructive" /> Cancel Booking
                  </h3>
                  {booking.pricing.depositRequired && (
                    <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-3">
                      ⚠ Cancellation fee may apply based on dispatch status.
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
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 mb-4 text-center">
              <p className="font-semibold text-destructive">Booking Cancelled</p>
              {booking.cancelReason && <p className="text-xs text-muted-foreground mt-1">Reason: {booking.cancelReason}</p>}
            </div>
          )}

          {/* Warranty Claim Placeholder */}
          {(booking.status === "completed" || booking.status === "rated") && (
            <Button variant="outline" className="w-full" disabled>
              <ShieldCheck className="w-4 h-4 mr-2" /> Warranty Claim (Coming Soon)
            </Button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookingTracker;
