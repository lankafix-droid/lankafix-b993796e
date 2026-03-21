/**
 * BookingReadinessGate — Smart bottom sheet that surfaces only the missing
 * items needed to proceed with a booking. Category-aware.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, User, Phone, MapPin, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { getCategoryOnboarding, type OnboardingField } from "@/lib/categoryOnboardingConfig";
import CoverageWaitlist from "@/components/profile/CoverageWaitlist";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onReady: () => void;
  categoryCode?: string;
}

type Step = "auth" | "identity" | "address" | "category_fields" | "outside_coverage" | "done";

export default function BookingReadinessGate({ open, onClose, onReady, categoryCode }: Props) {
  const { user } = useAuth();
  const { profile, getBookingReadiness, updateProfile, recordConsent, hasServiceableAddress, defaultAddress } = useCustomerProfile();
  const [saving, setSaving] = useState(false);

  // Identity form
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  // Category fields
  const [catAnswers, setCatAnswers] = useState<Record<string, any>>({});

  const readiness = getBookingReadiness(categoryCode);

  // Determine current step
  let currentStep: Step = "done";
  if (!user) {
    currentStep = "auth";
  } else if (readiness.missing.includes("full_name") || readiness.missing.includes("phone")) {
    currentStep = "identity";
  } else if (readiness.missing.includes("serviceable_address") || readiness.missing.includes("address")) {
    if (readiness.serviceability?.status === "outside") {
      currentStep = "outside_coverage";
    } else {
      currentStep = "address";
    }
  } else if (readiness.missing.some(m => m.startsWith("consent:"))) {
    currentStep = "category_fields";
  } else {
    currentStep = "done";
  }

  // If ready, auto-proceed
  if (currentStep === "done" && open) {
    setTimeout(() => onReady(), 100);
  }

  const handleSaveIdentity = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    await updateProfile.mutateAsync({ full_name: name.trim(), phone: phone.trim() } as any);
    setSaving(false);
  };

  const handleSaveCategoryConsents = async () => {
    setSaving(true);
    const catConfig = getCategoryOnboarding(categoryCode || "");
    if (catConfig) {
      for (const field of catConfig.fields) {
        if (field.consentType && catAnswers[field.key]) {
          await recordConsent.mutateAsync({
            consentType: "category_requirement",
            consentKey: field.consentType,
            accepted: true,
            context: { category: categoryCode },
          });
        }
      }
    }
    setSaving(false);
  };

  const catConfig = getCategoryOnboarding(categoryCode || "");
  const requiredConsents = catConfig?.fields.filter(f => f.required && f.consentType) || [];
  const allConsentsChecked = requiredConsents.every(f => catAnswers[f.key]);

  const completedSteps = [
    !!user,
    !!profile?.full_name && !!profile?.phone,
    hasServiceableAddress,
    !readiness.missing.some(m => m.startsWith("consent:")),
  ].filter(Boolean).length;
  const totalSteps = 4;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <SheetTitle className="text-lg">Almost ready to book</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            {completedSteps}/{totalSteps} steps complete
          </SheetDescription>
          {/* Mini progress */}
          <div className="flex gap-1 mt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < completedSteps ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {currentStep === "auth" && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">Sign in to continue with your booking</p>
              <SocialSignInButtons />
            </motion.div>
          )}

          {currentStep === "identity" && (
            <motion.div key="identity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">We need a few details to process your booking</p>
              {!profile?.full_name && (
                <div>
                  <Label className="text-xs flex items-center gap-1"><User className="w-3 h-3" /> Full Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="rounded-xl mt-1 h-10" />
                </div>
              )}
              {!profile?.phone && (
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07X XXX XXXX" type="tel" className="rounded-xl mt-1 h-10" />
                </div>
              )}
              <Button onClick={handleSaveIdentity} disabled={saving || (!name.trim() && !phone.trim())} className="w-full rounded-xl h-11 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </motion.div>
          )}

          {currentStep === "address" && (
            <motion.div key="address" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Add a service address</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We need an address within Greater Colombo to process your booking.
                  </p>
                </div>
              </div>
              <Button onClick={onClose} variant="outline" className="w-full rounded-xl">
                <MapPin className="w-4 h-4 mr-2" />
                Go to Address Manager
              </Button>
            </motion.div>
          )}

          {currentStep === "outside_coverage" && (
            <motion.div key="outside" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CoverageWaitlist
                city={defaultAddress?.city || undefined}
                district={defaultAddress?.district || undefined}
                latitude={defaultAddress?.latitude || undefined}
                longitude={defaultAddress?.longitude || undefined}
                category={categoryCode}
                onClose={onClose}
              />
            </motion.div>
          )}

          {currentStep === "category_fields" && catConfig && (
            <motion.div key="catfields" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 space-y-4">
              <p className="text-sm font-medium text-foreground">{catConfig.label} — Required Acknowledgements</p>
              {requiredConsents.map(field => (
                <label key={field.key} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                  <Checkbox
                    checked={!!catAnswers[field.key]}
                    onCheckedChange={(v) => setCatAnswers(prev => ({ ...prev, [field.key]: !!v }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{field.label}</p>
                    {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                  </div>
                </label>
              ))}
              <Button
                onClick={handleSaveCategoryConsents}
                disabled={saving || !allConsentsChecked}
                className="w-full rounded-xl h-11 font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm & Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
