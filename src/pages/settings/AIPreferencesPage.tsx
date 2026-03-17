/**
 * AIPreferencesPage — Consumer-facing AI settings screen.
 * Lets users manage optional AI consent preferences.
 * Advisory only — never modifies booking or dispatch logic.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Brain, Shield, Camera, Mic, Sparkles, Eye, ArrowLeft, Info, ShieldCheck } from "lucide-react";
import {
  getAIConsent,
  revokeAllAIConsent,
  type AIConsentState,
  type AIConsentCapability,
} from "@/services/aiConsentService";
import { useAIConsentSync, saveAndSyncConsent } from "@/hooks/useAIConsentSync";
import { getAIFlags } from "@/lib/aiFeatureFlags";
import { trackAIAnalytics } from "@/services/aiEventTracking";
import { toast } from "@/hooks/use-toast";

interface ConsentToggle {
  key: AIConsentCapability;
  label: string;
  description: string;
  icon: typeof Brain;
  comingSoon?: boolean;
}

const CONSENT_TOGGLES: ConsentToggle[] = [
  {
    key: "advisory_acknowledged",
    label: "Smart Suggestions",
    description: "Get AI-powered issue analysis, price estimates, and technician recommendations during booking.",
    icon: Sparkles,
  },
  {
    key: "photo_analysis_consent",
    label: "Photo Analysis",
    description: "Allow AI to analyze uploaded photos to help identify issues and suggest repairs.",
    icon: Eye,
  },
  {
    key: "personalization_consent",
    label: "Personalized Tips",
    description: "Receive reminders and suggestions based on your service history.",
    icon: Brain,
  },
  {
    key: "voice_booking_consent",
    label: "Voice Booking",
    description: "Book services using voice commands for hands-free convenience.",
    icon: Mic,
    comingSoon: true,
  },
  {
    key: "camera_diagnostics_consent",
    label: "Camera Diagnostics",
    description: "Use your phone camera for real-time issue diagnosis with AI guidance.",
    icon: Camera,
    comingSoon: true,
  },
];

const AIPreferencesPage = () => {
  const [consent, setConsentState] = useState<AIConsentState>(getAIConsent());
  const flags = getAIFlags();

  const activeModules = Object.values(flags).filter(Boolean).length;
  const grantedPermissions = CONSENT_TOGGLES.filter(
    (t) => !t.comingSoon && consent[t.key]
  ).length;

  const handleToggle = (key: AIConsentCapability, value: boolean) => {
    const updated = setAIConsent({ [key]: value });
    setConsentState(updated);
    trackAIAnalytics(value ? "ai_consent_granted" : "blocked_by_consent", {
      consent: key,
      action: value ? "granted" : "revoked",
    });
  };

  const handleRevokeAll = () => {
    revokeAllAIConsent();
    setConsentState(getAIConsent());
    trackAIAnalytics("blocked_by_consent", { action: "revoke_all" });
    toast({ title: "AI permissions revoked", description: "All optional AI features have been turned off." });
  };

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-lg py-6 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Account
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Preferences</h1>
              <p className="text-sm text-muted-foreground">Manage optional smart features</p>
            </div>
          </div>
        </div>

        {/* Trust banner */}
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Your booking always works without AI</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI features are optional tools that provide helpful suggestions. They never make decisions for you.
            A qualified technician always provides the final assessment.
          </p>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/50 bg-card p-3.5 text-center">
            <p className="text-xl font-bold text-primary">{activeModules}</p>
            <p className="text-[11px] text-muted-foreground">Active AI features</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3.5 text-center">
            <p className="text-xl font-bold text-foreground">{grantedPermissions}</p>
            <p className="text-[11px] text-muted-foreground">Permissions granted</p>
          </div>
        </div>

        {/* Consent toggles */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Optional Features</h2>
          {CONSENT_TOGGLES.map((toggle) => {
            const Icon = toggle.icon;
            const enabled = consent[toggle.key];
            return (
              <div
                key={toggle.key}
                className={`rounded-xl border bg-card p-4 flex items-start gap-3 ${
                  toggle.comingSoon ? "opacity-60 border-border/30" : "border-border/50"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  enabled && !toggle.comingSoon ? "bg-primary/10" : "bg-muted/60"
                }`}>
                  <Icon className={`w-4 h-4 ${enabled && !toggle.comingSoon ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{toggle.label}</p>
                    {toggle.comingSoon && (
                      <Badge variant="secondary" className="text-[9px]">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {toggle.description}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(val) => handleToggle(toggle.key, val)}
                  disabled={toggle.comingSoon}
                  className="shrink-0 mt-1"
                />
              </div>
            );
          })}
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Turning off AI features won't affect your active or past bookings.
            You can change these settings anytime.
          </span>
        </div>

        {/* Revoke all */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeAll}
          className="w-full text-xs text-muted-foreground"
        >
          <Shield className="w-3.5 h-3.5 mr-1.5" />
          Turn Off All AI Features
        </Button>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AIPreferencesPage;
