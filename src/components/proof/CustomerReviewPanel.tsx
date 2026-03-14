/**
 * Customer review panel for confirming service or opening disputes.
 * Confirmation activates warranty + schedules maintenance reminder.
 * Dispute auto-creates support case + incident event.
 */
import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, MessageSquare, Shield, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ServiceProofBadge from "./ServiceProofBadge";
import { getEvidencePhotoUrl } from "@/hooks/useServiceEvidence";
import type { ServiceEvidenceData } from "@/hooks/useServiceEvidence";

interface CustomerReviewPanelProps {
  evidence: ServiceEvidenceData | null;
  categoryCode?: string;
  serviceType?: string | null;
  onConfirm: (categoryCode?: string, serviceType?: string | null) => Promise<any>;
  onDispute: (reason: string) => Promise<any>;
}

function ReviewPhotoGrid({ paths, label }: { paths: string[]; label: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(paths.map(p => getEvidencePhotoUrl(p))).then(r => {
      if (!cancelled) setUrls(r);
    });
    return () => { cancelled = true; };
  }, [paths]);

  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {urls.length > 0 ? urls.map((url, i) => (
          <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        )) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No photos</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WarrantyStatusBadge({ evidence }: { evidence: ServiceEvidenceData }) {
  if (!evidence.warranty_activated || !evidence.warranty_end_date) return null;
  const now = new Date();
  const end = new Date(evidence.warranty_end_date);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);

  if (evidence.customer_dispute) {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Disputed</Badge>;
  }
  if (daysLeft <= 0) {
    return <Badge className="bg-muted text-muted-foreground text-[10px]">Warranty Expired</Badge>;
  }
  if (daysLeft <= 7) {
    return <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Expiring Soon ({daysLeft}d)</Badge>;
  }
  return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Warranty Active</Badge>;
}

const CustomerReviewPanel = ({ evidence, categoryCode, serviceType, onConfirm, onDispute }: CustomerReviewPanelProps) => {
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
    await onConfirm(categoryCode, serviceType);
    toast.success("Service confirmed! Warranty activated.");
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
        <div className="flex items-center gap-1.5">
          <ServiceProofBadge verified={evidence.service_verified} />
          <WarrantyStatusBadge evidence={evidence} />
        </div>
      </div>

      {/* Before/After comparison */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <ReviewPhotoGrid paths={beforePhotos} label="Before" />
          <ReviewPhotoGrid paths={afterPhotos} label="After" />
        </div>
      )}

      {/* Technician notes */}
      {evidence.technician_notes && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Technician Notes</p>
          <p className="text-sm text-foreground">{evidence.technician_notes}</p>
        </div>
      )}

      {/* Warranty info when confirmed */}
      {isConfirmed && evidence.warranty_activated && evidence.warranty_text && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Award className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Warranty Active</p>
            <p className="text-[11px] text-muted-foreground">{evidence.warranty_text}</p>
            {evidence.warranty_end_date && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Expires: {new Date(evidence.warranty_end_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Maintenance reminder */}
      {isConfirmed && evidence.maintenance_due_date && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          Next maintenance due: {new Date(evidence.maintenance_due_date).toLocaleDateString()}
        </div>
      )}

      {/* Status */}
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

      {/* Actions */}
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
                <Button variant="outline" size="sm" onClick={() => setShowDispute(false)}>
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
