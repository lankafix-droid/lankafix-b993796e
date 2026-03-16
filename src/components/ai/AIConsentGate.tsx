/**
 * AIConsentGate — Shows a consent prompt when an AI module requires user consent.
 * Does NOT run the gated module until consent is explicitly granted.
 * Offers: Allow AI, Not now, Continue without AI.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Lock, X } from "lucide-react";
import { setAIConsent, type AIConsentCapability } from "@/services/aiConsentService";
import { trackAIAnalytics } from "@/services/aiEventTracking";

interface AIConsentGateProps {
  requiredConsent: AIConsentCapability;
  moduleName: string;
  onConsented: () => void;
  /** Called when user dismisses without granting */
  onDismissed?: () => void;
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
  onDismissed,
  className = "",
}: AIConsentGateProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [granting, setGranting] = useState(false);
  const config = CONSENT_LABELS[requiredConsent];

  if (dismissed) return null;

  const handleGrant = () => {
    setGranting(true);
    setAIConsent({ [requiredConsent]: true });
    trackAIAnalytics("ai_consent_granted", { module: moduleName, consent: requiredConsent });
    onConsented();
  };

  const handleDismiss = () => {
    setDismissed(true);
    trackAIAnalytics("blocked_by_consent", { module: moduleName, consent: requiredConsent, action: "dismissed" });
    onDismissed?.();
  };

  return (
    <div className={`rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{config.title}</p>
            <p className="text-[11px] text-muted-foreground">Optional — your booking works without this</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center shrink-0"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {config.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={handleGrant}
          disabled={granting}
          className="text-xs"
        >
          <Shield className="w-3 h-3 mr-1" />
          Allow AI
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
          className="text-xs"
        >
          Not now
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Your booking can continue without AI assistance. You can change this later in Settings.
      </p>
    </div>
  );
};

export default AIConsentGate;
