/**
 * Customer review panel for confirming service or opening disputes.
 * Shows before/after evidence, technician notes, and action buttons.
 */
import { useState } from "react";
import { CheckCircle2, AlertTriangle, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ServiceProofBadge from "./ServiceProofBadge";
import type { ServiceEvidenceData } from "@/hooks/useServiceEvidence";

interface CustomerReviewPanelProps {
  evidence: ServiceEvidenceData | null;
  onConfirm: () => Promise<any>;
  onDispute: (reason: string) => Promise<any>;
}

const CustomerReviewPanel = ({ evidence, onConfirm, onDispute }: CustomerReviewPanelProps) => {
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!evidence) return null;

  const isConfirmed = evidence.customer_confirmed;
  const isDisputed = evidence.customer_dispute;
  const beforePhotos = evidence.before_photos || [];
  const afterPhotos = evidence.after_photos || [];

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm();
    toast.success("Service confirmed! Thank you.");
    setSubmitting(false);
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    setSubmitting(true);
    await onDispute(disputeReason);
    toast.info("Dispute opened. Our team will investigate.");
    setSubmitting(false);
    setShowDispute(false);
  };

  return (
    <div className="bg-card rounded-xl border p-5 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Service Review
        </h3>
        <ServiceProofBadge verified={evidence.service_verified} />
      </div>

      {/* Before/After comparison */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Before</p>
            <div className="space-y-1.5">
              {beforePhotos.map((url, i) => (
                <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={url} alt={`Before ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {beforePhotos.length === 0 && (
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No photos</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">After</p>
            <div className="space-y-1.5">
              {afterPhotos.map((url, i) => (
                <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={url} alt={`After ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {afterPhotos.length === 0 && (
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No photos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Technician notes */}
      {evidence.technician_notes && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Technician Notes</p>
          <p className="text-sm text-foreground">{evidence.technician_notes}</p>
        </div>
      )}

      {/* Status & Actions */}
      {isConfirmed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-success">Service Confirmed</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {evidence.customer_confirmed_at && new Date(evidence.customer_confirmed_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {isDisputed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div>
            <span className="text-sm font-medium text-destructive">Dispute Open</span>
            {evidence.dispute_reason && (
              <p className="text-xs text-muted-foreground mt-0.5">{evidence.dispute_reason}</p>
            )}
          </div>
        </div>
      )}

      {!isConfirmed && !isDisputed && (
        <>
          {showDispute ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Describe the issue..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="text-sm min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDispute}
                  disabled={submitting}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Submit Dispute
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDispute(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleConfirm}
                disabled={submitting}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Confirm Service
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDispute(true)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Dispute
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerReviewPanel;
