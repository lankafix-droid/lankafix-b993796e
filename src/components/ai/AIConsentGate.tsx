/**
 * AIConsentGate — Shows a consent prompt when an AI module requires user consent.
 * Does NOT run the gated module until consent is explicitly granted.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";
import { setAIConsent, type AIConsentCapability } from "@/services/aiConsentService";
import { track } from "@/lib/analytics";

interface AIConsentGateProps {
  requiredConsent: AIConsentCapability;
  moduleName: string;
  onConsented: () => void;
  className?: string;
}

const CONSENT_LABELS: Record<AIConsentCapability, { title: string; description: string }> = {
  advisory_acknowledged: {
    title: "AI Advisory Features",
    description: "Allow AI to provide advisory recommendations during your service experience.",
  },
  photo_analysis_consent: {
    title: "Photo Analysis",
    description: "Allow AI to analyze uploaded photos to help diagnose issues and provide better estimates.",
  },
  personalization_consent: {
    title: "Personalized Recommendations",
    description: "Allow AI to use your service history to provide tailored suggestions and reminders.",
  },
  voice_booking_consent: {
    title: "Voice Booking",
    description: "Allow AI to process voice input for hands-free booking (coming soon).",
  },
  camera_diagnostics_consent: {
    title: "Camera Diagnostics",
    description: "Allow AI to use your device camera for real-time issue diagnosis (coming soon).",
  },
};

const AIConsentGate = ({
  requiredConsent,
  moduleName,
  onConsented,
  className = "",
}: AIConsentGateProps) => {
  const [granting, setGranting] = useState(false);
  const config = CONSENT_LABELS[requiredConsent];

  const handleGrant = () => {
    setGranting(true);
    setAIConsent({ [requiredConsent]: true });
    track("ai_consent_granted", { module: moduleName, consent: requiredConsent });
    onConsented();
  };

  return (
    <div className={`rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{config.title}</p>
          <p className="text-[11px] text-muted-foreground">Consent required</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {config.description}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleGrant}
          disabled={granting}
          className="text-xs"
        >
          <Shield className="w-3 h-3 mr-1" />
          Allow
        </Button>
        <p className="text-[10px] text-muted-foreground">
          You can revoke this anytime in Settings.
        </p>
      </div>
    </div>
  );
};

export default AIConsentGate;
