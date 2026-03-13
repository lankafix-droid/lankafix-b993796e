import { useParams, Link, useNavigate } from "react-router-dom";
import PageTransition from "@/components/motion/PageTransition";
import { useBookingStore } from "@/store/bookingStore";
import { useBookingFromDB, useBookingTimeline } from "@/hooks/useBookingFromDB";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Star, CheckCircle2, Circle, Calendar,
  XCircle, FileText, AlertTriangle, Phone, MessageCircle,
  CreditCard, Play, Flag, Shield, Clock, MapPin, Sparkles,
  ChevronDown, HelpCircle, ClipboardList, Search, UserCheck,
  Navigation, Wrench, Package, Building2, SearchCheck, CheckSquare,
  Award, RotateCcw, Headphones,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS,
  BOOKING_TIMELINE_STEPS, QUOTE_TIMELINE_STEPS,
  CANCELLABLE_STATUSES, SERVICE_MODE_LABELS,
  getTimelineStepsForBooking,
} from "@/types/booking";
import type { BookingStatus, TimelineStepDef } from "@/types/booking";
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
// Zone intelligence now returns conservative defaults — real data comes from useOnlinePartners
import { track } from "@/lib/analytics";
import CareUpsellBanner from "@/components/tracker/CareUpsellBanner";
import InlineQuoteCard from "@/components/tracker/InlineQuoteCard";
import QuoteApprovalCard from "@/components/quotes/QuoteApprovalCard";
import { createSimulation, advanceSimulation } from "@/lib/trackingEngine";
import type { TrackingSimulation } from "@/lib/trackingEngine";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import ReportIssueModal from "@/components/support/ReportIssueModal";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPaymentForBooking } from "@/services/paymentService";
import { useTechnicianTracking } from "@/hooks/useTechnicianTracking";
import { getTrafficLabel } from "@/lib/etaEngine";
import RatingModal from "@/components/ratings/RatingModal";
import { getRatingForBooking } from "@/services/ratingService";
import { useAuth } from "@/hooks/useAuth";

/** Sub-component: Live technician tracking for DB-backed bookings */
function DBBookingLiveTracking({ bookingId, partnerId, bookingStatus }: { bookingId: string; partnerId: string | null; bookingStatus: string }) {
  // Only show live tracking during active travel — tech_en_route only
  const { data: tracking } = useTechnicianTracking(bookingId, partnerId, bookingStatus);

  if (!tracking || !tracking.technicianLat) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Live Tracking</span>
        </div>
        {tracking.isLive && (
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[10px] text-success font-medium">Live</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold text-primary">{tracking.etaRange}</p>
          <p className="text-[9px] text-muted-foreground">ETA</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold text-foreground">{tracking.distanceKm} km</p>
          <p className="text-[9px] text-muted-foreground">Away</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold text-foreground capitalize">{tracking.vehicleType}</p>
          <p className="text-[9px] text-muted-foreground">Vehicle</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{tracking.partnerName} • ⭐ {tracking.partnerRating}</span>
        <span>{getTrafficLabel(tracking.trafficLevel)}</span>
      </div>
    </div>
  );
}

/** Sub-component: fetches and shows quote approval for DB-backed bookings */
function TrackerQuoteSection({ bookingId, bookingStatus }: { bookingId: string; bookingStatus: string }) {
  const queryClient = useQueryClient();
  const { data: quote } = useQuery({
    queryKey: ["tracker-quote", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("status", "submitted" as any)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: bookingStatus === "quote_submitted",
    refetchInterval: 10_000,
  });

  if (!quote || bookingStatus !== "quote_submitted") return null;

  return (
    <QuoteApprovalCard
      quote={quote}
      onAction={() => {
        queryClient.invalidateQueries({ queryKey: ["tracker-quote", bookingId] });
        queryClient.invalidateQueries({ queryKey: ["booking-db", bookingId] });
        queryClient.invalidateQueries({ queryKey: ["booking-timeline", bookingId] });
      }}
    />
  );
}

/** Sub-component: Payment status indicator for DB-backed bookings */
function TrackerPaymentStatus({ bookingId }: { bookingId: string }) {
  const { data: payment } = useQuery({
    queryKey: ["tracker-payment", bookingId],
    queryFn: () => getPaymentForBooking(bookingId),
    enabled: !!bookingId,
    staleTime: 30_000,
  });

  if (!payment) return null;

  const isPaid = payment.payment_status === "paid";
  const statusColor = isPaid ? "text-success" : "text-warning";
  const statusLabel = isPaid ? "Paid" : payment.payment_status === "failed" ? "Failed" : "Pending";

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Payment Status</span>
        </div>
        <Badge variant="outline" className={`text-[10px] ${statusColor} border-current/20`}>
          {statusLabel}
        </Badge>
      </div>
      <div className="flex justify-between text-sm mt-2">
        <span className="text-muted-foreground capitalize">{payment.payment_type}</span>
        <span className="font-medium text-foreground">LKR {payment.amount_lkr.toLocaleString()}</span>
      </div>
    </div>
  );
}

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

// ─── Next Best Action ───
interface NextAction {
  label: string;
  description: string;
  variant: "hero" | "outline" | "destructive";
  onClick: () => void;
  icon: React.ElementType;
}

function getNextBestAction(
  booking: any,
  handlers: Record<string, () => void>,
): NextAction | null {
  const s = booking.status as BookingStatus;

  if (s === "matching" || s === "awaiting_partner_confirmation") {
    return { label: "Matching in progress…", description: "We're finding you the best technician", variant: "outline", onClick: () => {}, icon: Clock };
  }
  if (s === "assigned" && booking.dispatchStatus === "pending") {
    return { label: "Start Live Tracking", description: "See your technician's route in real-time", variant: "hero", onClick: handlers.startTracking, icon: MapPin };
  }
  if (s === "tech_en_route") {
    return { label: "Track Arrival", description: "Your technician is on the way", variant: "hero", onClick: () => {}, icon: MapPin };
  }
  if ((s === "arrived" || s === "assigned") && !booking.startOtpVerifiedAt) {
    return { label: "Verify Start OTP", description: "Share the code with your technician to begin", variant: "hero", onClick: handlers.verifyStart, icon: Shield };
  }
  if (s === "inspection_started" || (s === "arrived" && booking.pricing.quoteRequired && !booking.quote)) {
    return { label: "Inspection in progress…", description: "Technician is diagnosing the issue", variant: "outline", onClick: () => {}, icon: Clock };
  }
  if (s === "quote_submitted") {
    return { label: "Review & Approve Quote", description: "Your technician submitted a quote for approval", variant: "hero", onClick: handlers.viewQuote, icon: FileText };
  }
  if (s === "quote_approved") {
    return { label: "Repair in progress…", description: "Your technician is working on it", variant: "outline", onClick: () => {}, icon: Clock };
  }
  if (!booking.completionOtpVerifiedAt && (s === "arrived" || s === "assigned")) {
    return { label: "Verify Completion OTP", description: "Confirm the job is done", variant: "hero", onClick: handlers.verifyCompletion, icon: CheckCircle2 };
  }
  if (s === "completed" && !booking.rating) {
    return { label: "Rate Your Experience", description: "Help us improve — rate this service", variant: "hero", onClick: handlers.scrollToRating, icon: Star };
  }
  return null;
}

// ─── Step Icon Mapper ───
const STEP_ICON_MAP: Record<string, React.ElementType> = {
  clipboard: ClipboardList, search: Search, "user-check": UserCheck,
  navigation: Navigation, "map-pin": MapPin, wrench: Wrench,
  "check-circle": CheckCircle2, "search-check": SearchCheck,
  "file-text": FileText, "check-square": CheckSquare,
  package: Package, building: Building2,
};

function getStepIcon(iconName?: string): React.ElementType {
  return (iconName && STEP_ICON_MAP[iconName]) || Circle;
}

// ─── Premium Progress Stepper (enhanced with icons + descriptions) ───
function PremiumStepper({ steps, currentIdx }: { steps: TimelineStepDef[]; currentIdx: number }) {
  const progress = steps.length > 1 ? Math.max(0, currentIdx / (steps.length - 1)) * 100 : 0;
  const currentStep = steps[Math.min(currentIdx, steps.length - 1)];
  const CurrentIcon = getStepIcon(currentStep?.icon);

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/60 rounded-2xl p-4 mb-4 shadow-[var(--shadow-card)]">
      {/* Current status highlight */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <CurrentIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{currentStep?.label}</p>
          <p className="text-[11px] text-muted-foreground">{currentStep?.description}</p>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium bg-secondary px-2 py-1 rounded-full shrink-0">
          {Math.min(currentIdx + 1, steps.length)}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Milestone dots */}
      <div className="flex items-center justify-between px-1">
        {steps.map((step, i) => {
          const completed = currentIdx >= i;
          const isCurrent = i === currentIdx;
          const StepIcon = getStepIcon(step.icon);
          return (
            <div key={step.status} className="flex flex-col items-center" style={{ flex: "0 0 auto" }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isCurrent
                  ? "bg-primary ring-3 ring-primary/20"
                  : completed
                  ? "bg-success"
                  : "bg-muted"
              }`}>
                <StepIcon className={`w-3 h-3 ${isCurrent || completed ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </div>
              {(i === 0 || isCurrent || i === steps.length - 1) && (
                <span className={`text-[8px] text-center leading-tight mt-1.5 max-w-[48px] ${
                  isCurrent ? "text-primary font-semibold" : completed ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Collapsible Section ───
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, delay = 0 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean; delay?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 group">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className="w-4 h-4 text-muted-foreground" />
            {title}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// ─── Section Card Wrapper ───
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}

// ─── Animated Section ───
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }} className="mb-4">
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

  // Try Zustand first (legacy), then DB
  const zustandBooking = getBooking(jobId || "");
  const { data: dbBooking, isLoading: dbLoading } = useBookingFromDB(
    !zustandBooking ? jobId : undefined
  );
  const { data: dbTimeline } = useBookingTimeline(
    !zustandBooking ? jobId : undefined
  );

  // Use Zustand booking if available, otherwise show DB booking view
  const booking = zustandBooking;

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showOtp, setShowOtp] = useState<"start" | "completion" | null>(null);
  const [showSos, setShowSos] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [simulation, setSimulation] = useState<TrackingSimulation | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ratingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!booking) return;
    const isEnRoute = booking.status === "tech_en_route";
    const hasTracking = booking.trackingData?.isTracking;
    if (isEnRoute && hasTracking && !simulation) {
      const td = booking.trackingData!;
      if (td.technicianLocation && td.customerLocation) {
        const sim = createSimulation(booking.jobId, td.technicianLocation.lat, td.technicianLocation.lng, td.customerLocation.lat, td.customerLocation.lng, 15);
        setSimulation(sim);
      }
    }
  }, [booking?.status, booking?.trackingData?.isTracking]);

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

  // Auth for rating
  const { user } = useAuth();

  // Check if already rated (for DB bookings)
  const { data: existingRating, refetch: refetchRating } = useQuery({
    queryKey: ["booking-rating", jobId],
    queryFn: () => getRatingForBooking(jobId!),
    enabled: !!jobId,
    staleTime: 60_000,
  });

  const [showRatingModal, setShowRatingModal] = useState(false);

  // Auto-show rating modal for completed DB bookings (once)
  const [ratingModalShown, setRatingModalShown] = useState(false);

    // DB-backed booking view (real bookings from Phase 1)
    if (!booking && dbBooking) {
    const shortId = dbBooking.id.slice(0, 8).toUpperCase();
    const STATUS_LABELS: Record<string, string> = {
      requested: "Submitted",
      matching: "Finding Provider",
      assigned: "Provider Assigned",
      tech_en_route: "On the Way",
      arrived: "Provider Arrived",
      inspection_started: "Inspecting",
      quote_submitted: "Quote Ready",
      quote_approved: "Quote Approved",
      quote_rejected: "Quote Rejected",
      in_progress: "In Progress",
      repair_started: "Repair Started",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    const DISPATCH_MESSAGES: Record<string, { label: string; description: string; icon: React.ElementType }> = {
      pending: { label: "Submitted", description: "Your booking has been received. We're finding the best provider for you.", icon: Clock },
      dispatching: { label: "Finding Provider", description: "Matching you with verified technicians in your area.", icon: Search },
      pending_acceptance: { label: "Provider Found", description: "A technician has been matched and is reviewing your request.", icon: UserCheck },
      accepted: { label: "Provider Confirmed", description: "Your technician is confirmed and preparing for the job.", icon: CheckCircle2 },
      escalated: { label: "Team Assisting", description: "Our operations team is personally finding the best technician for you. You'll be updated shortly.", icon: Headphones },
      no_provider_found: { label: "Expanding Search", description: "All nearby technicians are currently busy. We're expanding the search — you'll be notified once matched.", icon: Search },
      manual: { label: "Under Review", description: "Our team is reviewing your request and will assign the right specialist.", icon: ClipboardList },
    };

    const dispatchInfo = DISPATCH_MESSAGES[dbBooking.dispatch_status || "pending"] || DISPATCH_MESSAGES.pending;
    const StatusIcon = dbBooking.status === "assigned" ? CheckCircle2 : dispatchInfo.icon;
    const statusLabel = dbBooking.status === "assigned" ? "Provider Assigned" : (STATUS_LABELS[dbBooking.status] || dispatchInfo.label);
    const statusDesc = dbBooking.status === "assigned"
      ? "Your provider has been assigned and is preparing for the job."
      : dbBooking.status === "quote_submitted" ? "Your technician has submitted a quote for review."
      : dbBooking.status === "quote_approved" ? "Quote approved — repair will begin shortly."
      : dbBooking.status === "repair_started" ? "Your technician is performing the repair."
      : dbBooking.status === "completed" ? "Your service has been completed!"
      : dispatchInfo.description;

    const isCompleted = dbBooking.status === "completed";
    const isCancelled = dbBooking.status === "cancelled";
    const isActive = !isCompleted && !isCancelled;

    return (
      <PageTransition className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="container max-w-2xl py-5 px-4 space-y-4">
            {/* Sticky header */}
            <div className="flex items-center gap-3">
              <Link to="/track" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">Job {shortId}</p>
                <p className="text-xs text-muted-foreground">{dbBooking.category_code}</p>
              </div>
              <Badge className={`text-xs font-semibold ${isCompleted ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-0"}`}>
                {statusLabel}
              </Badge>
            </div>

            {/* Status card — premium design */}
            <motion.div
              className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)] space-y-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCompleted ? "bg-success/10" : "bg-primary/10"}`}>
                  <StatusIcon className={`w-6 h-6 ${isCompleted ? "text-success" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">{statusLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{statusDesc}</p>
                </div>
              </div>

              {/* Booking details grid */}
              <div className="border-t border-border/30 pt-3 space-y-2">
                {dbBooking.service_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-foreground">{dbBooking.service_type}</span>
                  </div>
                )}
                {dbBooking.estimated_price_lkr && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated</span>
                    <span className="font-bold text-foreground">LKR {dbBooking.estimated_price_lkr.toLocaleString()}</span>
                  </div>
                )}
                {dbBooking.is_emergency && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Priority</span>
                    <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Emergency</Badge>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium text-foreground">{new Date(dbBooking.created_at).toLocaleString()}</span>
                </div>
                {dbBooking.assigned_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assigned</span>
                    <span className="font-medium text-foreground">{new Date(dbBooking.assigned_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Live Technician Tracking */}
            <DBBookingLiveTracking bookingId={dbBooking.id} partnerId={dbBooking.partner_id} bookingStatus={dbBooking.status} />

            {/* Quote Approval Card */}
            <TrackerQuoteSection bookingId={dbBooking.id} bookingStatus={dbBooking.status} />

            {/* Payment Status */}
            <TrackerPaymentStatus bookingId={dbBooking.id} />

            {/* Timeline events from DB — refined design */}
            {dbTimeline && dbTimeline.length > 0 && (
              <motion.div
                className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Service Timeline
                </h3>
                <div className="space-y-0">
                  {dbTimeline.map((evt, i) => {
                    const isLatest = i === 0;
                    return (
                      <div key={evt.id} className="flex items-start gap-3 relative">
                        {i < dbTimeline.length - 1 && (
                          <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border/40" />
                        )}
                        <div className="relative z-10 mt-0.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isLatest ? "bg-primary" : "bg-success"
                          }`}>
                            {isLatest ? (
                              <Circle className="w-2.5 h-2.5 text-primary-foreground" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="pb-4 flex-1">
                          <p className={`text-sm ${isLatest ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                            {evt.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          {evt.note && <p className="text-xs text-muted-foreground mt-0.5">{evt.note}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(evt.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Completion state — premium */}
            {isCompleted && (
              <motion.div
                className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-[var(--shadow-card)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-success/5 border-b border-success/20 px-5 py-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Service Completed</p>
                    {dbBooking.completed_at && (
                      <p className="text-xs text-muted-foreground">{new Date(dbBooking.completed_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {dbBooking.final_price_lkr && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Final Amount</span>
                      <span className="text-lg font-bold text-foreground">LKR {dbBooking.final_price_lkr.toLocaleString()}</span>
                    </div>
                  )}

                  {dbBooking.service_type && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium text-foreground">{dbBooking.service_type}</span>
                    </div>
                  )}

                  {/* Warranty card */}
                  <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Warranty Active</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Your service warranty is active from the completion date. Keep your Job ID ({shortId}) for warranty claims.
                      </p>
                    </div>
                  </div>

                  {/* Invoice status */}
                  <div className="flex items-center justify-between text-sm bg-muted/30 rounded-xl p-3">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Invoice
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                      Available
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs gap-1.5" onClick={() => navigate(`/book/${dbBooking.category_code}`)}>
                      <RotateCcw className="w-3.5 h-3.5" /> Book Again
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs gap-1.5" asChild>
                      <a href={whatsappLink(SUPPORT_WHATSAPP, `Booking ${shortId} - Support needed`)} target="_blank" rel="noopener noreferrer">
                        <Headphones className="w-3.5 h-3.5" /> Support
                      </a>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rating Section for completed DB bookings */}
            {isCompleted && dbBooking.partner_id && user?.id && (
              <>
                {existingRating ? (
                  <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)] text-center">
                    <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
                    <p className="text-sm font-semibold text-success mb-2">Thanks for your feedback!</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-5 h-5 ${s <= existingRating.rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    {existingRating.review_text && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{existingRating.review_text}"</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl border border-primary/20 p-5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-5 h-5 text-warning" />
                      <h3 className="text-sm font-semibold text-foreground">Rate Your Experience</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Help us improve — your feedback matters!</p>
                    <Button variant="hero" className="w-full rounded-xl h-11" onClick={() => setShowRatingModal(true)}>
                      Leave a Review
                    </Button>
                  </div>
                )}
                <RatingModal
                  open={showRatingModal}
                  onClose={() => setShowRatingModal(false)}
                  bookingId={dbBooking.id}
                  partnerId={dbBooking.partner_id}
                  customerId={user.id}
                  onSubmitted={() => refetchRating()}
                />
              </>
            )}

            {/* Support shortcut — active bookings */}
            {isActive && (
              <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Headphones className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Need help?</p>
                      <p className="text-[11px] text-muted-foreground">Chat with our support team</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl h-9" asChild>
                    <a href={whatsappLink(SUPPORT_WHATSAPP, `Hi, booking ${shortId} - need help`)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Chat
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Trust footer */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Protected by LankaFix Service Guarantee</span>
            </div>

            {/* Report Issue */}
            <Button variant="outline" className="w-full rounded-xl h-11 text-sm" onClick={() => setShowReportIssue(true)}>
              <Flag className="w-4 h-4 mr-1.5" />
              Report an Issue
            </Button>

            <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-xl h-11">
              Back to Home
            </Button>

            <ReportIssueModal
              open={showReportIssue}
              onClose={() => setShowReportIssue(false)}
              bookingId={dbBooking.id}
              userId={dbBooking.customer_id || ""}
              role="customer"
            />
          </div>
        </main>
        <Footer />
      </PageTransition>
    );
  }

  // Loading state for DB lookup
  if (!booking && dbLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading booking...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <EmptyState icon={MapPin} title="Booking Not Found" description={`No booking found for "${jobId}". Check the Job ID and try again.`} actionLabel="Track a Job" onAction={() => navigate("/track")} />
        </main>
        <Footer />
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);
  const isQuoteFlow = booking.pricing.quoteRequired;
  const timelineSteps = getTimelineStepsForBooking(booking.serviceMode, isQuoteFlow);
  const statusOrder = timelineSteps.map((s) => s.status);
  const currentIdx = statusOrder.indexOf(booking.status);
  const mascotState = statusToMascotState[booking.status];
  const isCompleted = booking.status === "completed" || booking.status === "rated";
  const depositPaid = booking.payments.deposit?.status === "paid";
  const refundInfo = getRefundEligibility(booking);
  const mascotKey = getMascotKey(booking.status, !!booking.sos?.active);
  const isMatching = booking.status === "matching" || booking.status === "awaiting_partner_confirmation";
  const isAssigned = booking.technician && !isMatching;
  const zoneIntel = { techsNearby: 0, avgResponseMinutes: 30 }; // Real counts come from DB-backed components

  // Handlers
  const handleCancel = () => { if (!cancelReason) return; cancelBooking(booking.jobId, cancelReason); setShowCancel(false); toast.success("Booking cancelled"); };
  const handleRate = () => { if (rating > 0) { setBookingRating(booking.jobId, rating); setRatingSubmitted(true); toast.success("Thanks for your feedback!"); } };
  const handleOtpVerify = () => { if (showOtp) { verifyOtp(booking.jobId, showOtp); toast.success(`${showOtp === "start" ? "Job start" : "Completion"} OTP verified`); setShowOtp(null); } };
  const handleGenerateQuote = () => { const quote = generateDemoQuote(booking.categoryCode, booking.serviceCode, booking.pricing.estimatedMin); setBookingQuote(booking.jobId, quote); toast.success("Demo quote generated"); };
  const handleDemoConfirmPartner = () => { updateBookingStatus(booking.jobId, "assigned"); toast.success("Partner confirmed"); };
  const handleDemoInspection = () => { updateBookingStatus(booking.jobId, "inspection_started"); toast.success("Inspection started"); };
  const handleDemoRepairStarted = () => { updateBookingStatus(booking.jobId, "repair_started"); toast.success("Repair started"); };
  const handleStartTracking = () => {
    const techGeo = { lat: 6.9090 + Math.random() * 0.02, lng: 79.8620 + Math.random() * 0.02 };
    const custGeo = { lat: 6.8720 + Math.random() * 0.02, lng: 79.8890 + Math.random() * 0.02 };
    startTravel(booking.jobId, techGeo.lat, techGeo.lng, custGeo.lat, custGeo.lng);
    toast.success("Technician is on the way! 🚗");
  };

  const nextAction = getNextBestAction(booking, {
    startTracking: handleStartTracking,
    verifyStart: () => setShowOtp("start"),
    verifyCompletion: () => setShowOtp("completion"),
    viewQuote: () => navigate(`/quote/${booking.jobId}`),
    scrollToRating: () => ratingRef.current?.scrollIntoView({ behavior: "smooth" }),
  });

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* ─── Sticky Status Header ─── */}
        <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="container max-w-2xl py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Link to="/track" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <MascotIcon state={mascotState} badge={booking.isEmergency ? "emergency" : "verified"} size="sm" />
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm leading-tight truncate">{booking.jobId}</p>
                  <p className="text-xs text-muted-foreground truncate">{booking.categoryName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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

        <div className="container py-5 px-4 max-w-2xl pb-28">

          {/* ═══ BLOCK 1: Current Status + ETA + Technician ═══ */}
          
          {/* Mascot Guide */}
          <Section delay={0.05}>
            <MascotGuide messageKey={mascotKey} />
          </Section>

          {/* Progress Stepper */}
          <PremiumStepper steps={timelineSteps} currentIdx={currentIdx} />

          {/* ─── Next Best Action CTA ─── */}
          {nextAction && (
            <Section delay={0.1}>
              <motion.div
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                className="rounded-2xl overflow-hidden"
              >
                <Button
                  variant={nextAction.variant}
                  className={`w-full rounded-2xl h-14 text-left justify-start gap-3 px-5 ${nextAction.variant === "hero" ? "shadow-brand" : ""}`}
                  onClick={nextAction.onClick}
                  disabled={nextAction.variant === "outline" && nextAction.label.includes("…")}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center shrink-0">
                    <nextAction.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold leading-tight">{nextAction.label}</p>
                    <p className="text-[11px] opacity-80 leading-tight mt-0.5">{nextAction.description}</p>
                  </div>
                </Button>
              </motion.div>
            </Section>
          )}

          {/* Matching or Assignment */}
          {isMatching && (
            <Section delay={0.15}>
              <MatchingCard
                nearbyTechCount={lastMatchResult?.nearbyTechCount ?? zoneIntel.techsNearby}
                avgResponseMinutes={zoneIntel.avgResponseMinutes}
                zone={booking.zone}
                extendedCoverage={lastMatchResult?.extendedCoverage}
                status={booking.status as "matching" | "awaiting_partner_confirmation"}
              />
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

          {/* ═══ INLINE QUOTE CARD ═══ */}
          {booking.quote && (booking.status === "quote_submitted" || booking.status === "quote_revised" || booking.status === "quote_approved" || booking.status === "repair_started") && (
            <Section delay={0.18}>
              <InlineQuoteCard quote={booking.quote} jobId={booking.jobId} status={booking.status} />
            </Section>
          )}

          {/* ═══ BLOCK 2: Live Tracking / Map ═══ */}
          {booking.trackingData?.isTracking && booking.technician && (
            <Section delay={0.2}>
              <div className="space-y-3">
                <TechnicianMap tracking={booking.trackingData} technicianName={booking.technician.name} />
                <TechnicianLocationCard technician={booking.technician} tracking={booking.trackingData} />
              </div>
            </Section>
          )}

          {booking.trackingData?.arrivedAt && !booking.trackingData?.isTracking && booking.technician && (
            <Section delay={0.2}>
              <TechnicianLocationCard technician={booking.technician} tracking={booking.trackingData} />
            </Section>
          )}

          {/* ═══ BLOCK 3: Booking Details + Payment ═══ */}
          <Section delay={0.25}>
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <LankaFixLogo size="sm" />
                <span className="text-[10px] text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">Booking Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Date</span>
                    <span className="font-medium text-foreground text-sm">{booking.scheduledDate || "TBD"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Time</span>
                    <span className="font-medium text-foreground text-sm">{booking.scheduledTime || booking.preferredWindow || "TBD"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Zone</span>
                    <span className="font-medium text-foreground text-sm">{booking.zone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Mode</span>
                    <span className="font-medium text-foreground text-sm">{SERVICE_MODE_LABELS[booking.serviceMode]}</span>
                  </div>
                </div>
              </div>
              {booking.address && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">{booking.address}</p>
              )}
              {booking.payments.deposit && (
                <div className={`mt-3 pt-3 border-t border-border/50 text-xs flex items-center gap-2 ${depositPaid ? "text-success" : "text-warning"}`}>
                  {depositPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  <span className="font-medium">Deposit: LKR {booking.payments.deposit.amount.toLocaleString("en-LK")} — {depositPaid ? "Paid" : "Pending"}</span>
                </div>
              )}
            </SectionCard>
          </Section>

          <Section delay={0.3}>
            <PaymentCard booking={booking} />
          </Section>

          {/* ═══ BLOCK 4: Collapsible Lower Sections ═══ */}

          {/* Demo controls removed for production — partner actions are handled via partner app */}

          {/* Trust & Protection */}
          <CollapsibleSection title="Trust & Protection" icon={Shield} delay={0.4}>
            <TrustStackCard booking={booking} />
          </CollapsibleSection>

          {/* Zone Intelligence */}
          {booking.zone && (
            <CollapsibleSection title="Zone Intelligence" icon={MapPin} delay={0.45}>
              <ZoneIntelligenceCard zone={booking.zone} />
            </CollapsibleSection>
          )}

          {/* Technician Confidence */}
          {!isMatching && booking.technician && (
            <CollapsibleSection title="Match Details" icon={Sparkles} delay={0.5}>
              <TechnicianConfidenceCard technician={booking.technician} jobId={booking.jobId} />
            </CollapsibleSection>
          )}

          {/* Job History / Timeline */}
          {booking.timelineEvents.length > 0 && (
            <CollapsibleSection title="Job History" icon={Clock} delay={0.55}>
              <TimelineEventLog events={booking.timelineEvents} />
            </CollapsibleSection>
          )}

          {/* Evidence */}
          <CollapsibleSection title="Evidence & Photos" icon={FileText} delay={0.6}>
            <EvidenceCard jobId={booking.jobId} photos={booking.photos} />
          </CollapsibleSection>

          {/* Warranty (completed) */}
          {isCompleted && (
            <Section delay={0.65}>
              <WarrantyCard booking={booking} />
            </Section>
          )}

          {/* Care Upsell (completed) */}
          {isCompleted && (
            <Section delay={0.7}>
              <CareUpsellBanner categoryCode={booking.categoryCode} />
            </Section>
          )}

          {/* ─── Rating ─── */}
          {isCompleted && (
            <Section delay={0.75}>
              <div ref={ratingRef}>
                <SectionCard>
                  <div className="flex items-center gap-2 mb-4">
                    <MascotIcon state="completed" size="sm" />
                    <h3 className="text-sm font-semibold text-foreground">Rate Your Experience</h3>
                  </div>
                  {booking.status === "rated" || ratingSubmitted ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-4">
                      <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                      <p className="text-sm text-success font-semibold">Thank you for your feedback!</p>
                      <div className="flex justify-center gap-1.5 mt-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-6 h-6 ${s <= (booking.rating || rating) ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      {reviewText && <p className="text-xs text-muted-foreground mt-3 italic">"{reviewText}"</p>}
                    </motion.div>
                  ) : (
                    <div>
                      <div className="flex gap-3 mb-4 justify-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <motion.button key={s} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }} onClick={() => setRating(s)} aria-label={`Rate ${s} stars`} className="p-1">
                            <Star className={`w-9 h-9 cursor-pointer transition-colors ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground/30 hover:text-warning/50"}`} />
                          </motion.button>
                        ))}
                      </div>
                      {rating > 0 && (
                        <p className="text-center text-xs text-muted-foreground mb-3">
                          {rating >= 5 ? "Excellent! 🎉" : rating >= 4 ? "Great experience! 👍" : rating >= 3 ? "Good service" : rating >= 2 ? "Room for improvement" : "Sorry to hear that"}
                        </p>
                      )}
                      <Textarea
                        placeholder="Share details about your experience (optional)"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="mb-4 text-sm rounded-xl resize-none min-h-[80px]"
                        rows={3}
                      />
                      <Button variant="hero" className="w-full rounded-xl h-12" onClick={handleRate} disabled={rating === 0}>
                        Submit Review
                      </Button>
                    </div>
                  )}
                </SectionCard>
              </div>
            </Section>
          )}

          {/* ─── Need Help? ─── */}
          {booking.status !== "cancelled" && !isCompleted && (
            <Section delay={0.8}>
              <SectionCard className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Need help?</p>
                      <p className="text-[11px] text-muted-foreground">Chat with our support team</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl h-9" asChild>
                    <a href={whatsappLink(SUPPORT_WHATSAPP, `Hi, I need help with booking ${booking.jobId}`)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Chat
                    </a>
                  </Button>
                </div>
              </SectionCard>
            </Section>
          )}

          {/* ─── SOS (visually separated) ─── */}
          {booking.status !== "cancelled" && !isCompleted && (
            <Section delay={0.85}>
              {showSos ? (
                <SOSPanel jobId={booking.jobId} technicianName={booking.technician?.name} onClose={() => setShowSos(false)} />
              ) : (
                <button
                  onClick={() => setShowSos(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 group-hover:bg-destructive/20 transition-colors">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-destructive">Emergency SOS</p>
                    <p className="text-[11px] text-destructive/70">Feel unsafe? Report an issue immediately</p>
                  </div>
                </button>
              )}
            </Section>
          )}

          {/* ─── Report Issue ─── */}
          {booking.status !== "cancelled" && (
            <Section delay={0.87}>
              <Button variant="outline" className="w-full rounded-xl h-11 text-sm" onClick={() => setShowReportIssue(true)}>
                <Flag className="w-4 h-4 mr-1.5" />
                Report an Issue
              </Button>
              <ReportIssueModal
                open={showReportIssue}
                onClose={() => setShowReportIssue(false)}
                bookingId={booking.jobId}
                userId=""
                role="customer"
              />
            </Section>
          )}

          {/* ─── Cancel ─── */}
          {canCancel && booking.status !== "cancelled" && (
            <Section delay={0.9}>
              <AnimatePresence mode="wait">
                {showCancel ? (
                  <motion.div key="cancel-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 overflow-hidden">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" /> Cancel Booking
                    </h3>
                    {booking.pricing.depositRequired && (
                      <div className="bg-warning/10 rounded-xl px-4 py-3 mb-4 space-y-1">
                        <p className="text-xs font-semibold text-warning">Refund: {refundInfo.refundPercent}%</p>
                        <p className="text-[11px] text-muted-foreground">{refundInfo.reason}</p>
                        <p className="text-[11px] text-muted-foreground">Need help? Our support team can assist with any concerns before you cancel.</p>
                      </div>
                    )}
                    <div className="space-y-2 mb-4">
                      {CANCEL_REASONS.map((r) => (
                        <button key={r} onClick={() => setCancelReason(r)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all min-h-[44px] ${cancelReason === r ? "bg-destructive/10 border-destructive/30 text-destructive font-medium" : "bg-card text-foreground hover:border-destructive/20"}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="ghost" className="flex-1 rounded-xl h-11" onClick={() => setShowCancel(false)}>Go Back</Button>
                      <Button variant="destructive" className="flex-1 rounded-xl h-11" onClick={handleCancel} disabled={!cancelReason}>Confirm Cancel</Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="cancel-btn">
                    <button onClick={() => setShowCancel(true)} className="w-full text-center py-3 text-sm text-muted-foreground hover:text-destructive transition-colors">
                      Cancel this booking
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>
          )}

          {booking.status === "cancelled" && (
            <Section delay={0.85}>
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="font-semibold text-destructive text-base">Booking Cancelled</p>
                {booking.cancelReason && <p className="text-sm text-muted-foreground mt-2">Reason: {booking.cancelReason}</p>}
              </div>
            </Section>
          )}
        </div>
      </main>
      <Footer />

      {/* OTP Modal */}
      <OtpVerifyModal open={showOtp !== null} onClose={() => setShowOtp(null)} onVerify={handleOtpVerify} type={showOtp || "start"} jobId={booking.jobId} />
    </PageTransition>
  );
};

export default TrackerPage;
