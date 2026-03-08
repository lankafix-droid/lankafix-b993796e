import type { V2CategoryFlow } from "@/data/v2CategoryFlows";
import type { V2BookingState } from "@/pages/V2BookingPage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, Clock, FileText, AlertTriangle, Phone, MessageCircle, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface Props {
  flow: V2CategoryFlow;
  booking: V2BookingState;
}

const V2BookingConfirmation = ({ flow, booking }: Props) => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const selectedService = flow.serviceTypes.find((s) => s.id === booking.serviceTypeId);
  const selectedPackage = flow.packages.find((p) => p.id === booking.packageId);
  const selectedMode = flow.serviceModes?.find((m) => m.id === booking.serviceModeId);
  const jobId = `LF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const handleConfirm = () => {
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Booking Confirmed!</h2>
          <p className="text-muted-foreground mt-1">Your service request has been placed</p>
        </div>

        <div className="bg-card rounded-xl border p-5 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Job ID</span>
            <span className="font-mono font-bold text-foreground">{jobId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-primary/10 text-primary border-0">Technician Assigned</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ETA</span>
            <span className="text-foreground font-medium">Within 2 hours</span>
          </div>
        </div>

        {/* Tracking stages */}
        <div className="bg-card rounded-xl border p-5 text-left space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Service Progress</h3>
          {[
            { label: "Booking Confirmed", done: true },
            { label: "Technician Assigned", done: true },
            { label: "Technician En Route", done: false },
            { label: "Service Started", done: false },
            { label: "Awaiting Approval", done: false },
            { label: "Service Completed", done: false },
            { label: "Invoice Issued", done: false },
          ].map((stage, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${stage.done ? "bg-success" : "bg-muted"}`}>
                {stage.done && <CheckCircle2 className="w-3.5 h-3.5 text-success-foreground" />}
              </div>
              <span className={`text-sm ${stage.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="flex gap-3">
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <Phone className="w-4 h-4" /> Call
            </Button>
          </a>
          <a href={whatsappLink(SUPPORT_WHATSAPP, `Job ${jobId} - Need help`)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
          </a>
        </div>

        <Button onClick={() => navigate("/v2")} variant="secondary" className="w-full">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">Review & Confirm</h2>

      {/* Service summary */}
      <div className="bg-card rounded-xl border p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Service Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="text-foreground">{flow.name}</span>
          </div>
          {selectedService && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Type</span>
              <span className="text-foreground">{selectedService.label}</span>
            </div>
          )}
          {booking.issueId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue</span>
              <span className="text-foreground">{flow.issueSelectors?.find((i) => i.id === booking.issueId)?.label}</span>
            </div>
          )}
          {selectedMode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Mode</span>
              <span className="text-foreground">{selectedMode.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Device details */}
      {Object.keys(booking.deviceAnswers).length > 0 && (
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Device / Property Details</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(booking.deviceAnswers).map(([key, value]) => {
              const question = flow.deviceQuestions.find((q) => q.key === key);
              const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : (question?.options?.find((o) => o.value === value)?.label || value);
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{question?.label || key}</span>
                  <span className="text-foreground">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected package */}
      {selectedPackage && (
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Selected Package</h3>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-foreground">{selectedPackage.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedPackage.description}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">
                {selectedPackage.price === 0 ? "Free" : `LKR ${selectedPackage.price.toLocaleString()}`}
              </p>
              {selectedPackage.priceMax && (
                <p className="text-xs text-muted-foreground">up to {selectedPackage.priceMax.toLocaleString()}</p>
              )}
            </div>
          </div>
          {selectedMode?.extraFee && (
            <div className="flex justify-between text-sm pt-2 border-t border-border/50">
              <span className="text-muted-foreground">{selectedMode.label} fee</span>
              <span className="text-foreground">+LKR {selectedMode.extraFee.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Commitment fee */}
      {flow.requiresCommitmentFee && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Commitment Fee: LKR {flow.commitmentFeeAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{flow.commitmentFeeNote}</p>
          </div>
        </div>
      )}

      {/* Trust guarantee */}
      <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">No extra work will proceed without your approval.</p>
          <p className="text-xs text-muted-foreground mt-0.5">If the technician identifies additional issues, you'll receive a revised quote for approval before any work begins.</p>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
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

      {/* Support */}
      <div className="flex gap-2">
        <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-xl py-2.5 text-xs text-muted-foreground hover:border-primary/30 transition-colors">
          <Phone className="w-3.5 h-3.5" /> Call LankaFix
        </a>
        <a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-xl py-2.5 text-xs text-muted-foreground hover:border-primary/30 transition-colors">
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
      </div>

      <Button onClick={handleConfirm} size="lg" className="w-full gap-2">
        Confirm Booking <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2BookingConfirmation;
