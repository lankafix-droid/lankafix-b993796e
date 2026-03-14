/**
 * Unified Service Evidence Panel used in the TrackerPage.
 * Orchestrates the full proof workflow: before evidence → service → after evidence → customer review.
 */
import { useServiceEvidence } from "@/hooks/useServiceEvidence";
import { getEvidenceRule } from "@/config/evidenceRules";
import BeforeAfterEvidence from "./BeforeAfterEvidence";
import CustomerReviewPanel from "./CustomerReviewPanel";
import ServiceProofBadge from "./ServiceProofBadge";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceEvidencePanelProps {
  bookingId: string;
  categoryCode: string;
  bookingStatus: string;
  role?: "technician" | "customer";
}

const ServiceEvidencePanel = ({
  bookingId,
  categoryCode,
  bookingStatus,
  role = "customer",
}: ServiceEvidencePanelProps) => {
  const { evidence, loading, upsertEvidence, confirmService, openDispute } = useServiceEvidence(bookingId);
  const rule = getEvidenceRule(categoryCode);

  if (loading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  // Show evidence capture for technicians during active service
  const isActiveService = [
    "assigned", "tech_en_route", "arrived", "inspection_started",
    "in_progress", "repair_started",
  ].includes(bookingStatus);

  // Show review for customers after service
  const isReviewable = ["completed", "rated"].includes(bookingStatus);

  // Show evidence photos always if they exist
  const hasEvidence = evidence && (
    (evidence.before_photos?.length > 0) || (evidence.after_photos?.length > 0)
  );

  if (!isActiveService && !isReviewable && !hasEvidence) return null;

  return (
    <div className="space-y-3">
      {/* Evidence capture or display */}
      {(isActiveService || hasEvidence) && (
        <BeforeAfterEvidence
          evidence={evidence}
          rule={rule}
          role={isActiveService ? role : "customer"}
          onUploadBefore={(photos, notes) =>
            upsertEvidence({
              before_photos: photos,
              before_notes: notes,
              before_uploaded_at: new Date().toISOString(),
            } as any)
          }
          onUploadAfter={(photos, notes) =>
            upsertEvidence({
              after_photos: photos,
              after_notes: notes,
              after_uploaded_at: new Date().toISOString(),
              technician_notes: notes,
            } as any)
          }
        />
      )}

      {/* Customer review panel */}
      {isReviewable && evidence && (
        <CustomerReviewPanel
          evidence={evidence}
          onConfirm={confirmService}
          onDispute={openDispute}
        />
      )}

      {/* Badge display */}
      {evidence?.service_verified && (
        <div className="flex justify-center">
          <ServiceProofBadge verified={true} size="md" />
        </div>
      )}
    </div>
  );
};

export default ServiceEvidencePanel;
