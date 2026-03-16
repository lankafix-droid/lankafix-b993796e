/**
 * AIPhotoTriagePlaceholder — Future-ready scaffold for image-based issue analysis.
 * Advisory-only. Does not call any backend. Respects photo_analysis_consent gating.
 */
import { Camera, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hasAIConsent } from "@/services/aiConsentService";
import AIConsentGate from "./AIConsentGate";

interface AIPhotoTriagePlaceholderProps {
  className?: string;
}

const AIPhotoTriagePlaceholder = ({ className = "" }: AIPhotoTriagePlaceholderProps) => {
  const consented = hasAIConsent("photo_analysis_consent");

  if (!consented) {
    return (
      <AIConsentGate
        requiredConsent="photo_analysis_consent"
        moduleName="ai_photo_triage"
        onConsented={() => {}}
        className={className}
      />
    );
  }

  return (
    <div className={`rounded-xl border border-border/30 bg-muted/10 p-4 space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Camera className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Photo Issue Analysis</p>
          <p className="text-[10px] text-muted-foreground">Coming soon</p>
        </div>
        <Badge variant="outline" className="text-[9px] ml-auto text-muted-foreground">Advisory</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Upload a photo of the issue and AI will help identify the problem and suggest the right service.
        This feature is currently being prepared.
      </p>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
        <Sparkles className="w-2.5 h-2.5" />
        <span>Advisory only — final diagnosis by a qualified technician.</span>
      </div>
    </div>
  );
};

export default AIPhotoTriagePlaceholder;
