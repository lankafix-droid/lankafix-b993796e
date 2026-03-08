import type { V2CategoryFlow } from "@/data/v2CategoryFlows";
import type { V2BookingState } from "@/pages/V2BookingPage";
import { PART_GRADES } from "@/data/partsPricing";
import { getServiceWarranty } from "@/data/partsPricing";
import { TRAVEL_ZONES } from "@/data/travelFees";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, Clock, FileText, AlertTriangle, Phone, MessageCircle, Shield, ArrowRight, Circle, MapPin, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import { motion } from "framer-motion";

interface Props {
  flow: V2CategoryFlow;
  booking: V2BookingState;
}

const TRACKING_STAGES = [
  { label: "Booking Confirmed", key: "confirmed" },
  { label: "Technician Assigned", key: "assigned" },
  { label: "On the Way", key: "en_route" },
  { label: "Diagnosis / Inspection", key: "diagnosis" },
  { label: "Quote Awaiting Approval", key: "quote" },
  { label: "Repair in Progress", key: "repair" },
  { label: "Quality Check", key: "quality" },
  { label: "Invoice Ready", key: "invoice" },
  { label: "Completed", key: "completed" },
];

const V2BookingConfirmation = ({ flow, booking }: Props) => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const selectedService = flow.serviceTypes.find((s) => s.id === booking.serviceTypeId);
  const selectedPackage = flow.packages.find((p) => p.id === booking.packageId);
  const selectedMode = flow.serviceModes?.find((m) => m.id === booking.serviceModeId);
  const selectedGrade = booking.partGrade ? PART_GRADES.find(g => g.code === booking.partGrade) : null;
  const warranty = getServiceWarranty(flow.code, booking.serviceTypeId);
  const jobId = `LF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const travelZone = TRAVEL_ZONES[0];

  const handleConfirm = () => {
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <motion.div
        className="space-y-6 text-center py-8"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Success animation */}
        <motion.div
          className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-extrabold text-foreground">Booking Confirmed!</h2>
          <p className="text-muted-foreground mt-1">Your service request has been placed</p>
        </motion.div>

        {/* Job details card */}
        <motion.div
          className="bg-card rounded-2xl border p-5 text-left space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Job ID</span>
            <span className="font-mono font-bold text-foreground">{jobId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-primary/10 text-primary border-0 font-semibold">Technician Assigned</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ETA</span>
            <span className="text-foreground font-bold">Within 2 hours</span>
          </div>
        </motion.div>

        {/* Job Timeline */}
        <motion.div
          className="bg-card rounded-2xl border p-5 text-left space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-bold text-foreground text-sm mb-3">Job Timeline</h3>
          {TRACKING_STAGES.map((stage, i) => {
            const isDone = i <= 1;
            const isCurrent = i === 1;
            return (
              <div key={stage.key} className="flex items-center gap-3 py-1.5">
                <div className="flex flex-col items-center">
                  {isDone ? (
                    <CheckCircle2 className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-success"}`} />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/20" />
                  )}
                  {i < TRACKING_STAGES.length - 1 && (
                    <div className={`w-0.5 h-4 ${isDone ? "bg-success/50" : "bg-muted"}`} />
                  )}
                </div>
                <span className={`text-sm ${isDone ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* Trust reassurance */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Protected by LankaFix Service Guarantee</span>
        </div>

        {/* Contact */}
        <div className="flex gap-3">
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-2xl">
              <Phone className="w-4 h-4" /> Call
            </Button>
          </a>
          <a href={whatsappLink(SUPPORT_WHATSAPP, `Job ${jobId} - Need help`)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-2xl">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
          </a>
        </div>

        <Button onClick={() => navigate("/")} variant="secondary" className="w-full rounded-2xl">
          Back to Home
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Review & Confirm</h2>
        <p className="text-sm text-muted-foreground mt-1">Verify your details before confirming</p>
      </div>

      {/* Service summary */}
      <motion.div
        className="bg-card rounded-2xl border p-5 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="font-bold text-foreground text-sm">Service Summary</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="text-foreground font-medium">{flow.name}</span>
          </div>
          {selectedService && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Type</span>
              <span className="text-foreground font-medium">{selectedService.label}</span>
            </div>
          )}
          {booking.issueId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue</span>
              <span className="text-foreground font-medium">{flow.issueSelectors?.find((i) => i.id === booking.issueId)?.label}</span>
            </div>
          )}
          {selectedMode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Mode</span>
              <span className="text-foreground font-medium">{selectedMode.label}</span>
            </div>
          )}
          {selectedGrade && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Part Quality</span>
              <span className="text-foreground font-medium">{selectedGrade.label}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pricing</span>
            <Badge variant="outline" className={`text-[10px] font-semibold ${
              flow.pricingArchetype === "fixed_price" ? "bg-success/10 text-success border-success/20" :
              flow.pricingArchetype === "diagnostic_first" ? "bg-warning/10 text-warning border-warning/20" :
              "bg-primary/10 text-primary border-primary/20"
            }`}>
              {flow.pricingArchetype === "fixed_price" ? "Fixed Price" : flow.pricingArchetype === "diagnostic_first" ? "Diagnostic First" : "Quote Required"}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Device details */}
      {Object.keys(booking.deviceAnswers).length > 0 && (
        <motion.div
          className="bg-card rounded-2xl border p-5 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <h3 className="font-bold text-foreground text-sm">Device / Property Details</h3>
          <div className="space-y-2.5 text-sm">
            {Object.entries(booking.deviceAnswers).map(([key, value]) => {
              const question = flow.deviceQuestions.find((q) => q.key === key);
              const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : (question?.options?.find((o) => o.value === value)?.label || value);
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{question?.label || key}</span>
                  <span className="text-foreground font-medium">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Price breakdown */}
      <motion.div
        className="bg-card rounded-2xl border p-5 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <h3 className="font-bold text-foreground text-sm">Estimated Cost</h3>

        {selectedPackage && (
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-foreground">{selectedPackage.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedPackage.description}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">
                {selectedPackage.price === 0 ? "Free" : selectedPackage.priceType === "starts_from"
                  ? `From LKR ${selectedPackage.price.toLocaleString()}`
                  : `LKR ${selectedPackage.price.toLocaleString()}`}
              </p>
              {selectedPackage.priceMax && (
                <p className="text-xs text-muted-foreground">up to LKR {selectedPackage.priceMax.toLocaleString()}</p>
              )}
            </div>
          </div>
        )}

        {selectedMode?.extraFee && (
          <div className="flex justify-between text-sm pt-2 border-t border-border/50">
            <span className="text-muted-foreground">{selectedMode.label} fee</span>
            <span className="text-foreground font-medium">+LKR {selectedMode.extraFee.toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-sm pt-2 border-t border-border/50">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Travel ({travelZone.label})
          </span>
          <span className="text-foreground font-medium">{travelZone.fee === 0 ? "Included" : `LKR ${travelZone.fee.toLocaleString()}`}</span>
        </div>

        {selectedPackage?.priceType === "starts_from" && (
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Starting From Price</p>
            <p className="leading-relaxed">Final price depends on device model, spare part availability, part grade, and repair complexity. You will receive a detailed quote for approval before work begins.</p>
          </div>
        )}
      </motion.div>

      {/* Part grade & warranty */}
      {(selectedGrade || warranty) && (
        <motion.div
          className="bg-card rounded-2xl border p-5 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground text-sm">Warranty Information</h3>
          </div>
          {selectedGrade && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Part Warranty ({selectedGrade.label})</span>
              <span className="text-foreground font-medium">{selectedGrade.warrantyLabel}</span>
            </div>
          )}
          {warranty && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labour Warranty</span>
                <span className="text-foreground font-medium">{warranty.laborWarrantyLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parts</span>
                <span className="text-foreground text-xs">{warranty.partsWarrantyNote}</span>
              </div>
            </>
          )}
          {!selectedGrade && !warranty && (
            <p className="text-xs text-muted-foreground">{flow.warrantyNote}</p>
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
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">If the technician identifies additional issues, you'll receive a revised quote for approval before any work begins.</p>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>{flow.cancellationNote}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>{flow.warrantyNote}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Digital invoice after service completion</span>
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-card rounded-2xl border p-4 space-y-2">
        <h4 className="text-sm font-bold text-foreground">Payment Options</h4>
        <div className="flex flex-wrap gap-2">
          {["Cash", "Card", "LankaQR", "Bank Transfer"].map((m) => (
            <Badge key={m} variant="secondary" className="text-xs rounded-full">{m}</Badge>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="flex gap-2">
        <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-2xl py-2.5 text-xs text-muted-foreground hover:border-primary/30 transition-colors">
          <Phone className="w-3.5 h-3.5" /> Call LankaFix
        </a>
        <a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-2xl py-2.5 text-xs text-muted-foreground hover:border-primary/30 transition-colors">
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
      </div>

      <Button onClick={handleConfirm} size="lg" className="w-full gap-2 min-h-[52px] rounded-2xl text-base font-bold">
        Confirm Booking <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2BookingConfirmation;
