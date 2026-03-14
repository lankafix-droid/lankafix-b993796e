/**
 * Before/After evidence capture and display component.
 * Technicians upload real photos via Supabase Storage.
 * Supports upload progress, delete, replace, max count enforcement.
 */
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Image, AlertTriangle, CheckCircle2, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { uploadEvidencePhoto, getEvidencePhotoUrl, deleteEvidencePhoto } from "@/hooks/useServiceEvidence";
import type { ServiceEvidenceData } from "@/hooks/useServiceEvidence";
import type { EvidenceRule } from "@/config/evidenceRules";

const MAX_PHOTOS_PER_PHASE = 6;

interface BeforeAfterEvidenceProps {
  evidence: ServiceEvidenceData | null;
  rule: EvidenceRule;
  role: "technician" | "customer";
  bookingId: string;
  categoryCode?: string;
  onUploadBefore?: (photos: string[], notes: string) => void;
  onUploadAfter?: (photos: string[], notes: string) => void;
}

function PhotoGrid({ paths, label, onDelete }: { paths: string[]; label: string; onDelete?: (index: number) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(paths.map(p => getEvidencePhotoUrl(p))).then(resolved => {
      if (!cancelled) { setUrls(resolved); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [paths]);

  if (paths.length === 0) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 mb-3">
        {paths.map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {urls.map((url, i) => (
        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
          <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
          <Badge className="absolute bottom-1 left-1 text-[9px] bg-card/80 text-foreground">{label}</Badge>
          {onDelete && (
            <button
              onClick={() => onDelete(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const beforePhotos = evidence?.before_photos || [];
  const afterPhotos = evidence?.after_photos || [];
  const beforeComplete = beforePhotos.length >= (rule.minBeforePhotos || 0);
  const afterComplete = afterPhotos.length >= (rule.minAfterPhotos || 0);
  const isMobile = categoryCode === "MOBILE";

  const handleFileUpload = async (files: FileList | null, phase: "before" | "after") => {
    if (!files || files.length === 0) return;
    const existingPhotos = phase === "before" ? [...beforePhotos] : [...afterPhotos];
    const remaining = MAX_PHOTOS_PER_PHASE - existingPhotos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS_PER_PHASE} photos per phase`);
      return;
    }

    setUploading(phase);
    const filesToUpload = Array.from(files).slice(0, remaining);
    const notes = phase === "before" ? beforeNotes : afterNotes;

    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadProgress(Math.round(((i) / filesToUpload.length) * 100));
      const path = await uploadEvidencePhoto(filesToUpload[i], bookingId, phase);
      if (path) existingPhotos.push(path);
    }
    setUploadProgress(100);

    if (phase === "before") {
      onUploadBefore?.(existingPhotos, notes);
    } else {
      onUploadAfter?.(existingPhotos, notes);
    }
    setUploading(null);
    setUploadProgress(0);
    toast.success(`${phase === "before" ? "Before" : "After"} photo${filesToUpload.length > 1 ? "s" : ""} uploaded`);
  };

  const handleDeletePhoto = async (phase: "before" | "after", index: number) => {
    const photos = phase === "before" ? [...beforePhotos] : [...afterPhotos];
    const path = photos[index];
    const deleted = await deleteEvidencePhoto(path);
    if (!deleted) return;
    photos.splice(index, 1);
    const notes = phase === "before" ? beforeNotes : afterNotes;
    if (phase === "before") {
      onUploadBefore?.(photos, notes);
    } else {
      onUploadAfter?.(photos, notes);
    }
    toast.success("Photo removed");
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

        <PhotoGrid
          paths={beforePhotos}
          label="Before"
          onDelete={role === "technician" ? (i) => handleDeletePhoto("before", i) : undefined}
        />

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
            {uploading === "before" && (
              <div className="w-full h-1.5 bg-muted rounded-full mb-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading === "before" || beforePhotos.length >= MAX_PHOTOS_PER_PHASE}
              onClick={() => beforeInputRef.current?.click()}
            >
              {uploading === "before" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading === "before" ? "Uploading..." : `Add Before Photo (${beforePhotos.length}/${MAX_PHOTOS_PER_PHASE})`}
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

        <PhotoGrid
          paths={afterPhotos}
          label="After"
          onDelete={role === "technician" ? (i) => handleDeletePhoto("after", i) : undefined}
        />

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
            {uploading === "after" && (
              <div className="w-full h-1.5 bg-muted rounded-full mb-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading === "after" || afterPhotos.length >= MAX_PHOTOS_PER_PHASE}
              onClick={() => afterInputRef.current?.click()}
            >
              {uploading === "after" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading === "after" ? "Uploading..." : `Add After Photo (${afterPhotos.length}/${MAX_PHOTOS_PER_PHASE})`}
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
