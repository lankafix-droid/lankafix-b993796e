/**
 * Before/After evidence capture and display component.
 * Technicians upload real photos via Supabase Storage.
 * Customers view evidence in read-only mode.
 */
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Image, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { uploadEvidencePhoto, getEvidencePhotoUrl } from "@/hooks/useServiceEvidence";
import type { ServiceEvidenceData } from "@/hooks/useServiceEvidence";
import type { EvidenceRule } from "@/config/evidenceRules";

interface BeforeAfterEvidenceProps {
  evidence: ServiceEvidenceData | null;
  rule: EvidenceRule;
  role: "technician" | "customer";
  bookingId: string;
  categoryCode?: string;
  onUploadBefore?: (photos: string[], notes: string) => void;
  onUploadAfter?: (photos: string[], notes: string) => void;
}

function PhotoGrid({ paths, label }: { paths: string[]; label: string }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(paths.map(p => getEvidencePhotoUrl(p))).then(resolved => {
      if (!cancelled) setUrls(resolved);
    });
    return () => { cancelled = true; };
  }, [paths]);

  if (paths.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {urls.map((url, i) => (
        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
          <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
          <Badge className="absolute bottom-1 left-1 text-[9px] bg-card/80 text-foreground">{label}</Badge>
        </div>
      ))}
    </div>
  );
}

const BeforeAfterEvidence = ({
  evidence,
  rule,
  role,
  bookingId,
  categoryCode,
  onUploadBefore,
  onUploadAfter,
}: BeforeAfterEvidenceProps) => {
  const [beforeNotes, setBeforeNotes] = useState(evidence?.before_notes || "");
  const [afterNotes, setAfterNotes] = useState(evidence?.after_notes || "");
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const beforePhotos = evidence?.before_photos || [];
  const afterPhotos = evidence?.after_photos || [];
  const beforeComplete = beforePhotos.length >= (rule.minBeforePhotos || 0);
  const afterComplete = afterPhotos.length >= (rule.minAfterPhotos || 0);

  const isMobile = categoryCode === "MOBILE";

  const handleFileUpload = async (files: FileList | null, phase: "before" | "after") => {
    if (!files || files.length === 0) return;
    setUploading(phase);
    const existingPhotos = phase === "before" ? [...beforePhotos] : [...afterPhotos];
    const notes = phase === "before" ? beforeNotes : afterNotes;

    for (const file of Array.from(files)) {
      const path = await uploadEvidencePhoto(file, bookingId, phase);
      if (path) existingPhotos.push(path);
    }

    if (phase === "before") {
      onUploadBefore?.(existingPhotos, notes);
    } else {
      onUploadAfter?.(existingPhotos, notes);
    }
    setUploading(null);
    toast.success(`${phase === "before" ? "Before" : "After"} photo${files.length > 1 ? "s" : ""} uploaded`);
  };

  return (
    <div className="space-y-4">
      {rule.privacyNote && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {rule.privacyNote}
        </div>
      )}

      {isMobile && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Data Safety:</span> Capture device exterior only.
            Avoid photographing screen content, personal data, or notifications.
            IMEI/serial numbers may be masked.
          </div>
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
            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Required</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground text-[10px]">Optional</Badge>
          )}
        </div>

        <PhotoGrid paths={beforePhotos} label="Before" />

        {role === "technician" && (
          <>
            <Textarea
              placeholder={isMobile
                ? "Diagnostic notes (e.g., Screen cracked top left, no water damage signs)"
                : "Diagnostic notes (e.g., Screen cracked top left corner)"
              }
              value={beforeNotes}
              onChange={(e) => setBeforeNotes(e.target.value)}
              className="text-sm mb-2 min-h-[60px]"
            />
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files, "before")}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading === "before"}
              onClick={() => beforeInputRef.current?.click()}
            >
              {uploading === "before" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading === "before" ? "Uploading..." : "Add Before Photo"}
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
            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Required</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground text-[10px]">Optional</Badge>
          )}
        </div>

        <PhotoGrid paths={afterPhotos} label="After" />

        {role === "technician" && (
          <>
            <Textarea
              placeholder="Completion notes (e.g., Display replaced and tested successfully)"
              value={afterNotes}
              onChange={(e) => setAfterNotes(e.target.value)}
              className="text-sm mb-2 min-h-[60px]"
            />
            <input
              ref={afterInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files, "after")}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading === "after"}
              onClick={() => afterInputRef.current?.click()}
            >
              {uploading === "after" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading === "after" ? "Uploading..." : "Add After Photo"}
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
