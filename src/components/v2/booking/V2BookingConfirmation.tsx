import type { V2CategoryFlow } from "@/data/v2CategoryFlows";
import type { V2BookingState } from "@/pages/V2BookingPage";
import { PART_GRADES } from "@/data/partsPricing";
import { getServiceWarranty } from "@/data/partsPricing";
import { TRAVEL_ZONES } from "@/data/travelFees";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ShieldCheck, Clock, FileText, AlertTriangle, Phone,
  MessageCircle, Shield, ArrowRight, Circle, MapPin, Award, Sparkles,
  Loader2, RotateCcw, Headphones, Star, Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLocationStore } from "@/store/locationStore";
import { createBooking } from "@/services/bookingService";
import BookingAuthGate from "@/components/auth/BookingAuthGate";
import { isCategoryOperational, isCategoryConsultation, isCategoryComingSoon } from "@/config/categoryLaunchConfig";
import AIEstimateAssist from "@/components/ai/AIEstimateAssist";
import AIBookingSummaryCard from "@/components/ai/AIBookingSummaryCard";

interface Props {
  flow: V2CategoryFlow;
  booking: V2BookingState;
}

const WARRANTY_NOTES: Record<string, string> = {
  AC: "All AC services include a 30-day labour warranty. Parts warranty depends on the grade selected.",
  MOBILE: "Screen and battery repairs include a 90-day parts warranty. Labour covered for 30 days.",
  CONSUMER_ELEC: "Appliance repairs include a 30-day labour warranty. Replacement parts carry manufacturer warranty.",
  IT: "IT repairs include a 14-day labour warranty. Software fixes covered for 7 days.",
};

const TRACKING_STAGES = [
  { label: "Submitted", key: "submitted" },
  { label: "Matching", key: "matching" },
  { label: "Assigned", key: "assigned" },
  { label: "En Route", key: "en_route" },
  { label: "Diagnosis", key: "diagnosis" },
  { label: "Quote Approval", key: "quote" },
  { label: "In Progress", key: "repair" },
  { label: "Completed", key: "completed" },
];

function SummaryRow({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border/20 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground text-right max-w-[55%] ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

const V2BookingConfirmation = ({ flow, booking }: Props) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { getActiveAddress } = useLocationStore();

  const [confirmed, setConfirmed] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const selectedService = flow.serviceTypes.find((s) => s.id === booking.serviceTypeId);
  const selectedPackage = flow.packages.find((p) => p.id === booking.packageId);
  const selectedMode = flow.serviceModes?.find((m) => m.id === booking.serviceModeId);
  const selectedGrade = booking.partGrade ? PART_GRADES.find(g => g.code === booking.partGrade) : null;
  const warranty = getServiceWarranty(flow.code, booking.serviceTypeId);
  const travelZone = TRAVEL_ZONES[0];
  const activeAddress = getActiveAddress();

  const [zoneBlocked, setZoneBlocked] = useState(false);

  const submitBooking = async (userId: string) => {
    if (submitting) return;
    setSubmitting(true);

    const locationData = {
      lat: activeAddress?.lat,
      lng: activeAddress?.lng,
      address: activeAddress?.displayName || activeAddress?.area || "Greater Colombo",
      zoneCode: activeAddress?.zoneId || null,
    };

    const result = await createBooking({
      flow,
      booking,
      userId,
      locationData,
    });

    if (result.success && result.bookingId) {
      setCreatedJobId(result.bookingId);
      setConfirmed(true);
      toast.success("Booking confirmed!");
    } else if (result.errorCode === "zone_not_supported") {
      setZoneBlocked(true);
      toast.error(result.error || "Service not yet available in your area.");
    } else {
      toast.error(result.error || "Failed to create booking. Please try again.");
    }
    setSubmitting(false);
  };

  const handleConfirm = async () => {
    if (isCategoryComingSoon(flow.code)) {
      toast.info("This category is coming soon! Join the waitlist.");
      navigate("/waitlist");
      return;
    }
    if (!isAuthenticated || !user) {
      setShowAuthGate(true);
      return;
    }
    await submitBooking(user.id);
  };

  const handleAuthSuccess = async (userId: string) => {
    setShowAuthGate(false);
    await submitBooking(userId);
  };

  /* ─── ZONE BLOCKED STATE ─── */
  if (zoneBlocked) {
    return (
      <div className="space-y-5 text-center py-6 pb-28">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
          <MapPin className="w-10 h-10 text-warning" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">Launching Soon in Your Area</h2>
        <p className="text-muted-foreground text-sm">We currently serve Greater Colombo. Join the waitlist to be notified when we expand to your area.</p>
        <Button onClick={() => navigate("/waitlist")} className="w-full rounded-xl h-12">Join the Waitlist</Button>
        <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-xl h-11">Back to Home</Button>
      </div>
    );
  }

  /* ─── COMING SOON STATE ─── */
  if (isCategoryComingSoon(flow.code)) {
    return (
      <div className="space-y-5 text-center py-6 pb-28">
        <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">Coming Soon</h2>
        <p className="text-muted-foreground text-sm">This service category is launching soon in your area.</p>
        <Button onClick={() => navigate("/waitlist")} className="w-full rounded-xl h-12">Join the Waitlist</Button>
        <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-xl h-11">Back to Home</Button>
      </div>
    );
  }

  /* ─── CONSULTATION STATE ─── */
  if (isCategoryConsultation(flow.code)) {
    return (
      <div className="space-y-5 text-center py-6 pb-28">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Phone className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">Request Consultation</h2>
        <p className="text-muted-foreground text-sm">This service requires a site assessment. Our team will match you with the right specialist.</p>
        <Button onClick={handleConfirm} disabled={submitting} className="w-full rounded-xl h-12 gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Submit Consultation Request
        </Button>
        <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-xl h-11">Back to Home</Button>
        <BookingAuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} onAuthenticated={handleAuthSuccess} />
      </div>
    );
  }

  /* ─── SUCCESS STATE ─── */
  if (confirmed) {
    const shortId = createdJobId ? createdJobId.slice(0, 8).toUpperCase() : "";
    const categoryWarranty = WARRANTY_NOTES[flow.code] || flow.warrantyNote;

    return (
      <motion.div
        className="space-y-4 py-6 pb-28"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Success header */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 className="w-10 h-10 text-success" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-foreground">Booking Confirmed!</h2>
          <p className="text-muted-foreground text-sm">Your service request has been submitted</p>
        </motion.div>

        {/* Booking summary card */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 space-y-0 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Summary</span>
            <span className="font-mono font-bold text-[11px] bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">{shortId}</span>
          </div>
          <SummaryRow label="Status" value={
            <Badge className="bg-primary/10 text-primary border-0 font-semibold text-xs">Finding Provider</Badge>
          } />
          <SummaryRow label="Category" value={flow.name} />
          {selectedService && <SummaryRow label="Service" value={selectedService.label} />}
          {booking.issueId && (
            <SummaryRow label="Issue" value={flow.issueSelectors?.find((i) => i.id === booking.issueId)?.label || "Described in notes"} />
          )}
          {selectedPackage && <SummaryRow label="Package" value={selectedPackage.name} />}
          {selectedMode && <SummaryRow label="Service Mode" value={selectedMode.label} />}
          {selectedGrade && <SummaryRow label="Part Quality" value={selectedGrade.label} />}
          {activeAddress && (
            <SummaryRow label="Location" value={activeAddress.displayName || activeAddress.area || "Greater Colombo"} />
          )}
          {flow.requiresCommitmentFee && (
            <SummaryRow label="Commitment Fee" value={`LKR ${flow.commitmentFeeAmount.toLocaleString()}`} />
          )}
          {selectedPackage && (
            <SummaryRow label="Estimated Cost" value={
              selectedPackage.price === 0 ? "Free" :
              selectedPackage.priceType === "starts_from"
                ? `From LKR ${selectedPackage.price.toLocaleString()}`
                : `LKR ${selectedPackage.price.toLocaleString()}`
            } bold />
          )}
        </motion.div>

        {/* Warranty note */}
        <motion.div
          className="bg-success/5 border border-success/20 rounded-2xl p-4 flex items-start gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Award className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Service Warranty Included</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{categoryWarranty}</p>
          </div>
        </motion.div>

        {/* What happens next — compact */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="font-bold text-foreground text-sm mb-4">What happens next</h3>
          <div className="space-y-0">
            {TRACKING_STAGES.map((stage, i) => {
              const isDone = i <= 0;
              const isCurrent = i === 1;
              return (
                <div key={stage.key} className="flex items-start gap-3 relative">
                  {i < TRACKING_STAGES.length - 1 && (
                    <div className={`absolute left-[11px] top-6 w-0.5 h-full ${isDone ? "bg-success/40" : "bg-muted"}`} />
                  )}
                  <div className="relative z-10 mt-0.5">
                    {isDone ? (
                      <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Circle className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/15 flex items-center justify-center bg-card">
                        <Circle className="w-2.5 h-2.5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className={`pb-3 ${isDone || isCurrent ? "" : "opacity-50"}`}>
                    <span className={`text-sm ${isDone || isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <p className="text-[11px] text-primary mt-0.5">In progress...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Protected by LankaFix Service Guarantee</span>
        </div>

        {/* Primary CTA */}
        {createdJobId && (
          <Button onClick={() => navigate(`/tracker/${createdJobId}`)} variant="hero" className="w-full rounded-xl h-12 gap-2">
            Track My Booking <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        {/* Support shortcuts */}
        <div className="flex gap-3">
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-xl h-11">
              <Phone className="w-4 h-4" /> Call
            </Button>
          </a>
          <a href={whatsappLink(SUPPORT_WHATSAPP, `Booking ${shortId} - Need help`)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-xl h-11">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
          </a>
        </div>

        <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-xl h-11 gap-2">
          <RotateCcw className="w-4 h-4" /> Book Another Service
        </Button>
      </motion.div>
    );
  }

  /* ─── REVIEW STATE ─── */
  return (
    <div className="space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-bold text-foreground">Review & Confirm</h2>
        <p className="text-sm text-muted-foreground mt-1">Verify your details before confirming</p>
      </div>

      {/* Service summary */}
      <motion.div
        className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="font-bold text-foreground text-sm mb-1">Service Summary</h3>
        <SummaryRow label="Category" value={flow.name} />
        {selectedService && <SummaryRow label="Service" value={selectedService.label} />}
        {booking.issueId && (
          <SummaryRow label="Issue" value={flow.issueSelectors?.find((i) => i.id === booking.issueId)?.label || "Described"} />
        )}
        {selectedMode && <SummaryRow label="Mode" value={selectedMode.label} />}
        {selectedGrade && <SummaryRow label="Part Quality" value={selectedGrade.label} />}
        <SummaryRow label="Pricing" value={
          <Badge variant="outline" className={`text-[10px] font-semibold ${
            flow.pricingArchetype === "fixed_price" ? "bg-success/10 text-success border-success/20" :
            flow.pricingArchetype === "diagnostic_first" ? "bg-warning/10 text-warning border-warning/20" :
            "bg-primary/10 text-primary border-primary/20"
          }`}>
            {flow.pricingArchetype === "fixed_price" ? "Fixed Price" : flow.pricingArchetype === "diagnostic_first" ? "Diagnostic First" : "Quote Required"}
          </Badge>
        } />
      </motion.div>

      {/* Device details — handle "Not sure" gracefully */}
      {Object.keys(booking.deviceAnswers).length > 0 && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
        >
          <h3 className="font-bold text-foreground text-sm mb-1">Device Details</h3>
          {Object.entries(booking.deviceAnswers).map(([key, value]) => {
            const question = flow.deviceQuestions.find((q) => q.key === key);
            const rawValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
            const displayValue = rawValue === "not_sure" || rawValue === "Not Sure" || rawValue === "not_known"
              ? "Will confirm on-site"
              : (question?.options?.find((o) => o.value === rawValue)?.label || rawValue);
            return <SummaryRow key={key} label={question?.label || key} value={String(displayValue)} />;
          })}
        </motion.div>
      )}

      {/* Location */}
      {activeAddress && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{activeAddress.displayName || activeAddress.area}</p>
            <p className="text-xs text-muted-foreground">{activeAddress.city || "Greater Colombo"}</p>
          </div>
        </motion.div>
      )}

      {/* Price breakdown */}
      <motion.div
        className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        <h3 className="font-bold text-foreground text-sm mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Estimated Cost
        </h3>

        {selectedPackage && (
          <div className="flex justify-between items-start py-2.5 border-b border-border/20">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{selectedPackage.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedPackage.description}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-bold text-foreground">
                {selectedPackage.price === 0 ? "Free" : selectedPackage.priceType === "starts_from"
                  ? `From LKR ${selectedPackage.price.toLocaleString()}`
                  : `LKR ${selectedPackage.price.toLocaleString()}`}
              </p>
              {selectedPackage.priceMax && (
                <p className="text-[11px] text-muted-foreground">up to LKR {selectedPackage.priceMax.toLocaleString()}</p>
              )}
            </div>
          </div>
        )}

        {selectedMode?.extraFee && (
          <SummaryRow label={`${selectedMode.label} fee`} value={`+LKR ${selectedMode.extraFee.toLocaleString()}`} />
        )}

        <div className="flex justify-between items-center py-2 text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Travel ({travelZone.label})
          </span>
          <span className="text-foreground font-medium">{travelZone.fee === 0 ? "Included" : `LKR ${travelZone.fee.toLocaleString()}`}</span>
        </div>

        {selectedPackage?.priceType === "starts_from" && (
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 text-xs text-muted-foreground mt-2">
            <p className="font-semibold text-foreground mb-0.5">Starting From Price</p>
            <p className="leading-relaxed">Final price depends on device model and repair complexity. You'll receive a detailed quote for approval before work begins.</p>
          </div>
        )}
      </motion.div>

      {/* Warranty */}
      {(selectedGrade || warranty) && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.3 }}
        >
          <h3 className="font-bold text-foreground text-sm mb-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-primary" />
            Warranty
          </h3>
          {selectedGrade && <SummaryRow label={`Part Warranty (${selectedGrade.label})`} value={selectedGrade.warrantyLabel} />}
          {warranty && (
            <>
              <SummaryRow label="Labour Warranty" value={warranty.laborWarrantyLabel} />
              <SummaryRow label="Parts" value={warranty.partsWarrantyNote} />
            </>
          )}
        </motion.div>
      )}

      {/* Commitment fee */}
      {flow.requiresCommitmentFee && (
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Commitment Fee: LKR {flow.commitmentFeeAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{flow.commitmentFeeNote}</p>
          </div>
        </div>
      )}

      {/* Trust guarantee */}
      <div className="bg-success/5 border border-success/20 rounded-2xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-foreground">No extra work without your approval</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">You'll receive a detailed quote for approval before any additional work begins.</p>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{flow.cancellationNote}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{flow.warrantyNote}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Digital invoice after service completion</span>
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]">
        <h4 className="text-sm font-bold text-foreground mb-2">Payment Options</h4>
        <div className="flex flex-wrap gap-2">
          {["Cash", "Card", "LankaQR", "Bank Transfer"].map((m) => (
            <Badge key={m} variant="secondary" className="text-xs rounded-full px-3 py-1">{m}</Badge>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="flex gap-2">
        <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1">
          <Button variant="outline" className="w-full gap-2 rounded-xl h-11 text-xs">
            <Phone className="w-3.5 h-3.5" /> Call LankaFix
          </Button>
        </a>
        <a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="outline" className="w-full gap-2 rounded-xl h-11 text-xs">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </Button>
        </a>
      </div>

      {/* Sticky CTA */}
      <div className="sticky-cta">
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          size="lg"
          className="w-full gap-2 h-12 rounded-xl text-base font-bold bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm active:scale-[0.97] transition-transform"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? "Submitting..." : "Confirm Booking"}
          {!submitting && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Auth Gate Modal */}
      <BookingAuthGate
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        onAuthenticated={handleAuthSuccess}
      />
    </div>
  );
};

export default V2BookingConfirmation;
