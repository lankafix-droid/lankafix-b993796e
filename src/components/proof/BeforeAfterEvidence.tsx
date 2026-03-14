/**
 * Before/After evidence capture and display component.
 * Used by technicians to upload evidence and customers to review.
 */
import { useState } from "react";
import { Camera, Upload, Image, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ServiceEvidenceData } from "@/hooks/useServiceEvidence";
import type { EvidenceRule } from "@/config/evidenceRules";

interface BeforeAfterEvidenceProps {
  evidence: ServiceEvidenceData | null;
  rule: EvidenceRule;
  role: "technician" | "customer";
  onUploadBefore?: (photos: string[], notes: string) => void;
  onUploadAfter?: (photos: string[], notes: string) => void;
}

const BeforeAfterEvidence = ({
  evidence,
  rule,
  role,
  onUploadBefore,
  onUploadAfter,
}: BeforeAfterEvidenceProps) => {
  const [beforeNotes, setBeforeNotes] = useState(evidence?.before_notes || "");
  const [afterNotes, setAfterNotes] = useState(evidence?.after_notes || "");

  const beforePhotos = evidence?.before_photos || [];
  const afterPhotos = evidence?.after_photos || [];

  const beforeComplete = beforePhotos.length >= (rule.minBeforePhotos || 0);
  const afterComplete = afterPhotos.length >= (rule.minAfterPhotos || 0);

  const handleDemoBeforeUpload = () => {
    const demoUrl = `https://placehold.co/400x300/1e40af/ffffff?text=BEFORE+${Date.now() % 1000}`;
    onUploadBefore?.([...beforePhotos, demoUrl], beforeNotes);
    toast.success("Before photo added");
  };

  const handleDemoAfterUpload = () => {
    const demoUrl = `https://placehold.co/400x300/059669/ffffff?text=AFTER+${Date.now() % 1000}`;
    onUploadAfter?.([...afterPhotos, demoUrl], afterNotes);
    toast.success("After photo added");
  };

  return (
    <div className="space-y-4">
      {rule.privacyNote && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {rule.privacyNote}
        </div>
      )}

      {/* Before Evidence */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Before Service
          </h4>
          {beforeComplete ? (
            <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
            </Badge>
          ) : rule.requiresBefore ? (
            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
              Required
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground text-[10px]">Optional</Badge>
          )}
        </div>

        {beforePhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {beforePhotos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt={`Before ${i + 1}`} className="w-full h-full object-cover" />
                <Badge className="absolute bottom-1 left-1 text-[9px] bg-card/80 text-foreground">Before</Badge>
              </div>
            ))}
          </div>
        )}

        {role === "technician" && (
          <>
            <Textarea
              placeholder="Diagnostic notes (e.g., Screen cracked top left corner)"
              value={beforeNotes}
              onChange={(e) => setBeforeNotes(e.target.value)}
              className="text-sm mb-2 min-h-[60px]"
            />
            <Button variant="outline" size="sm" className="w-full" onClick={handleDemoBeforeUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Add Before Photo
            </Button>
          </>
        )}

        {role === "customer" && evidence?.before_notes && (
          <p className="text-xs text-muted-foreground italic">"{evidence.before_notes}"</p>
        )}
      </div>

      {/* After Evidence */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Image className="w-4 h-4 text-success" />
            After Service
          </h4>
          {afterComplete ? (
            <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
            </Badge>
          ) : rule.requiresAfter ? (
            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
              Required
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground text-[10px]">Optional</Badge>
          )}
        </div>

        {afterPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {afterPhotos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt={`After ${i + 1}`} className="w-full h-full object-cover" />
                <Badge className="absolute bottom-1 left-1 text-[9px] bg-card/80 text-foreground">After</Badge>
              </div>
            ))}
          </div>
        )}

        {role === "technician" && (
          <>
            <Textarea
              placeholder="Completion notes (e.g., Display replaced and tested successfully)"
              value={afterNotes}
              onChange={(e) => setAfterNotes(e.target.value)}
              className="text-sm mb-2 min-h-[60px]"
            />
            <Button variant="outline" size="sm" className="w-full" onClick={handleDemoAfterUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Add After Photo
            </Button>
          </>
        )}

        {role === "customer" && evidence?.after_notes && (
          <p className="text-xs text-muted-foreground italic">"{evidence.after_notes}"</p>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterEvidence;
