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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import { motion } from "framer-motion";
import { useBookingStore } from "@/store/bookingStore";
import type { CategoryCode, ServiceMode, PricingBreakdown } from "@/types/booking";

interface Props {
  flow: V2CategoryFlow;
  booking: V2BookingState;
}

const TRACKING_STAGES = [
  { label: "Booking Confirmed", key: "confirmed", icon: "✓" },
  { label: "Technician Assigned", key: "assigned", icon: "👤" },
  { label: "On the Way", key: "en_route", icon: "🚗" },
  { label: "Diagnosis / Inspection", key: "diagnosis", icon: "🔍" },
  { label: "Quote Awaiting Approval", key: "quote", icon: "📋" },
  { label: "Repair in Progress", key: "repair", icon: "🔧" },
  { label: "Quality Check", key: "quality", icon: "✅" },
  { label: "Invoice Ready", key: "invoice", icon: "🧾" },
  { label: "Completed", key: "completed", icon: "🎉" },
];

/* Summary row helper */
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
  const [confirmed, setConfirmed] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const { setDraftCategory, setDraftService, setDraftMode, setDraftEmergency, setDraftLocation, confirmBooking } = useBookingStore();

  const selectedService = flow.serviceTypes.find((s) => s.id === booking.serviceTypeId);
  const selectedPackage = flow.packages.find((p) => p.id === booking.packageId);
  const selectedMode = flow.serviceModes?.find((m) => m.id === booking.serviceModeId);
  const selectedGrade = booking.partGrade ? PART_GRADES.find(g => g.code === booking.partGrade) : null;
  const warranty = getServiceWarranty(flow.code, booking.serviceTypeId);
  const travelZone = TRAVEL_ZONES[0];

  const handleConfirm = () => {
    // Set up draft in store
    setDraftCategory(flow.code as CategoryCode, flow.name);
    setDraftService(booking.serviceTypeId || flow.code, selectedService?.label || flow.name);
    const modeMap: Record<string, ServiceMode> = { on_site: "on_site", drop_off: "drop_off", pickup_return: "pickup_return", remote: "remote" };
    setDraftMode(modeMap[booking.serviceModeId] || "on_site");
    setDraftEmergency(booking.isEmergency || false);
    setDraftLocation("Colombo 7", "Greater Colombo Area");

    // Build pricing breakdown
    const basePrice = selectedPackage?.price || 2500;
    const isQuoteRequired = flow.pricingArchetype === "diagnostic_first" || flow.pricingArchetype === "inspection_required";
    const pricing: PricingBreakdown = {
      visitFee: travelZone.fee,
      diagnosticFee: isQuoteRequired ? 500 : 0,
      emergencySurcharge: booking.isEmergency ? 500 : 0,
      estimatedMin: basePrice,
      estimatedMax: selectedPackage?.priceMax || basePrice * 1.5,
      depositRequired: flow.requiresCommitmentFee || false,
      depositAmount: flow.commitmentFeeAmount || 0,
      partsSeparate: true,
      quoteRequired: isQuoteRequired,
      cancelPolicy: { freeWindowMinutes: 30, afterWindowPercent: 50, afterAssignmentPercent: 100 },
    };

    const jobId = confirmBooking(pricing, isQuoteRequired);
    setCreatedJobId(jobId);
    setConfirmed(true);
  };

  /* ─── SUCCESS STATE ─── */
  if (confirmed) {
    return (
      <motion.div
        className="space-y-5 text-center py-6 pb-28"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Success hero */}
        <motion.div
          className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-extrabold text-foreground">Booking Confirmed!</h2>
          <p className="text-muted-foreground mt-1 text-sm">Your service request has been placed</p>
        </motion.div>

        {/* Job card */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 text-left space-y-0 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <SummaryRow label="Job ID" value={<span className="font-mono font-bold">{jobId}</span>} />
          <SummaryRow label="Status" value={
            <Badge className="bg-primary/10 text-primary border-0 font-semibold text-xs">Technician Assigned</Badge>
          } />
          <SummaryRow label="ETA" value="Within 2 hours" bold />
        </motion.div>

        {/* Timeline */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 text-left shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-bold text-foreground text-sm mb-4">Job Timeline</h3>
          <div className="space-y-0">
            {TRACKING_STAGES.map((stage, i) => {
              const isDone = i <= 1;
              const isCurrent = i === 1;
              return (
                <div key={stage.key} className="flex items-start gap-3 relative">
                  {/* Connector line */}
                  {i < TRACKING_STAGES.length - 1 && (
                    <div className={`absolute left-[11px] top-6 w-0.5 h-full ${isDone ? "bg-success/40" : "bg-muted"}`} />
                  )}
                  <div className="relative z-10 mt-0.5">
                    {isDone ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCurrent ? "bg-primary" : "bg-success"
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/15 flex items-center justify-center bg-card">
                        <Circle className="w-2.5 h-2.5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className={`pb-4 ${isDone ? "" : "opacity-50"}`}>
                    <span className={`text-sm ${isDone ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
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

        {/* Trust */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Protected by LankaFix Service Guarantee</span>
        </div>

        {/* Contact */}
        <div className="flex gap-3">
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-xl h-11">
              <Phone className="w-4 h-4" /> Call
            </Button>
          </a>
          <a href={whatsappLink(SUPPORT_WHATSAPP, `Job ${jobId} - Need help`)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-xl h-11">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
          </a>
        </div>

        <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-xl h-11">
          Back to Home
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
        {selectedService && <SummaryRow label="Service Type" value={selectedService.label} />}
        {booking.issueId && (
          <SummaryRow label="Issue" value={flow.issueSelectors?.find((i) => i.id === booking.issueId)?.label} />
        )}
        {selectedMode && <SummaryRow label="Service Mode" value={selectedMode.label} />}
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

      {/* Device details */}
      {Object.keys(booking.deviceAnswers).length > 0 && (
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
        >
          <h3 className="font-bold text-foreground text-sm mb-1">Device / Property Details</h3>
          {Object.entries(booking.deviceAnswers).map(([key, value]) => {
            const question = flow.deviceQuestions.find((q) => q.key === key);
            const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : (question?.options?.find((o) => o.value === value)?.label || value);
            return <SummaryRow key={key} label={question?.label || key} value={String(displayValue)} />;
          })}
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
            Warranty Information
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
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">You'll receive a revised quote for approval before any additional work begins.</p>
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
          size="lg"
          className="w-full gap-2 h-12 rounded-xl text-base font-bold bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm active:scale-[0.97] transition-transform"
        >
          Confirm Booking <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default V2BookingConfirmation;
