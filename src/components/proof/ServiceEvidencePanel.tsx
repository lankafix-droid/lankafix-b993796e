/**
 * Unified Service Evidence Panel used in the TrackerPage.
 * Orchestrates the full proof workflow: before → service → after → customer review.
 * Enforces evidence completion before technician can mark job done.
 */
import { useServiceEvidence, isEvidenceComplete } from "@/hooks/useServiceEvidence";
import { getEvidenceRule } from "@/config/evidenceRules";
import BeforeAfterEvidence from "./BeforeAfterEvidence";
import CustomerReviewPanel from "./CustomerReviewPanel";
import ServiceProofBadge from "./ServiceProofBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface ServiceEvidencePanelProps {
  bookingId: string;
  categoryCode: string;
  bookingStatus: string;
  serviceType?: string | null;
  role?: "technician" | "customer";
  /** Callback to inform parent whether completion is blocked */
  onCompletionBlocked?: (blocked: boolean) => void;
}

const ServiceEvidencePanel = ({
  bookingId,
  categoryCode,
  bookingStatus,
  serviceType,
  role = "customer",
  onCompletionBlocked,
}: ServiceEvidencePanelProps) => {
  const { evidence, loading, upsertEvidence, confirmService, openDispute } = useServiceEvidence(bookingId);
  const rule = getEvidenceRule(categoryCode);

  // Compute if evidence blocks completion
  const evidenceBlocked = role === "technician" && !isEvidenceComplete(evidence, categoryCode);

  // Notify parent
  if (onCompletionBlocked) {
    onCompletionBlocked(evidenceBlocked);
  }

  if (loading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const isActiveService = [
    "assigned", "tech_en_route", "arrived", "inspection_started",
    "in_progress", "repair_started",
  ].includes(bookingStatus);

  const isReviewable = ["completed", "rated"].includes(bookingStatus);

  const hasEvidence = evidence && (
    (evidence.before_photos?.length > 0) || (evidence.after_photos?.length > 0)
  );

  if (!isActiveService && !isReviewable && !hasEvidence) return null;

  return (
    <div className="space-y-3">
      {/* Evidence completion enforcement banner for technicians */}
      {role === "technician" && isActiveService && evidenceBlocked && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Before/After evidence required before completion</p>
            <p className="text-warning/80 mt-0.5">
              Upload {rule.requiresBefore ? `min ${rule.minBeforePhotos} before photo(s)` : ""}
              {rule.requiresBefore && rule.requiresAfter ? " and " : ""}
              {rule.requiresAfter ? `min ${rule.minAfterPhotos} after photo(s)` : ""} to proceed.
            </p>
          </div>
        </div>
      )}

      {/* Evidence capture or display */}
      {(isActiveService || hasEvidence) && (
        <BeforeAfterEvidence
          evidence={evidence}
          rule={rule}
          role={isActiveService ? role : "customer"}
          bookingId={bookingId}
          categoryCode={categoryCode}
          onUploadBefore={(photos, notes) =>
            upsertEvidence({
              before_photos: photos,
              before_notes: notes,
              before_uploaded_at: new Date().toISOString(),
              category_code: categoryCode,
              uploaded_by_role: role,
            } as any)
          }
          onUploadAfter={(photos, notes) =>
            upsertEvidence({
              after_photos: photos,
              after_notes: notes,
              after_uploaded_at: new Date().toISOString(),
              technician_notes: notes,
              category_code: categoryCode,
              uploaded_by_role: role,
            } as any)
          }
        />
      )}

      {/* Customer review panel */}
      {isReviewable && evidence && (
        <CustomerReviewPanel
          evidence={evidence}
          categoryCode={categoryCode}
          serviceType={serviceType}
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
