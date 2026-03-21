/**
 * BookingReadinessGate — Production-safe booking validation gate.
 * Persists category answers, enforces escalations, backend-aligned.
 */
import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, User, Phone, MapPin, Loader2, CheckCircle2, AlertTriangle, Camera, ChevronRight, Ban, FileSearch } from "lucide-react";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useBookingIntake, type EscalationOutcome } from "@/hooks/useBookingIntake";
import { getCategoryRules, getVisibleFields, checkEscalationRules, type OnboardingField } from "@/lib/categoryOnboardingConfig";
import CoverageWaitlist from "@/components/profile/CoverageWaitlist";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

export type BookingOutcome = "ready_for_booking" | "ready_for_inspection_only" | "blocked" | "outside_coverage_waitlist";

interface Props {
  open: boolean;
  onClose: () => void;
  onReady: (outcome: BookingOutcome, categoryAnswers?: Record<string, any>) => void;
  categoryCode?: string;
}

type Step = "auth" | "identity" | "address" | "category_answers" | "consents" | "escalation_review" | "outside_coverage" | "done";

const stepAnimation = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.2 } };

export default function BookingReadinessGate({ open, onClose, onReady, categoryCode }: Props) {
  const { user } = useAuth();
  const { profile, getBookingReadiness, updateProfile, recordConsent, hasServiceableAddress, defaultAddress, acceptedConsents } = useCustomerProfile();
  const { answers: persistedAnswers, upsertAnswers, computeEscalationOutcome, isLoading: intakeLoading } = useBookingIntake(categoryCode);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [catAnswers, setCatAnswers] = useState<Record<string, any>>({});
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>({});
  const [escalationsAcked, setEscalationsAcked] = useState(false);
  const [answersInitialized, setAnswersInitialized] = useState(false);

  // Load persisted answers on mount
  useEffect(() => {
    if (persistedAnswers && Object.keys(persistedAnswers).length > 0 && !answersInitialized) {
      setCatAnswers(persistedAnswers);
      setAnswersInitialized(true);
    }
  }, [persistedAnswers, answersInitialized]);

  // Sync form values when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile?.full_name, profile?.phone]);

  const rules = categoryCode ? getCategoryRules(categoryCode) : null;
  const readiness = getBookingReadiness(categoryCode, catAnswers);
  const firedEscalations = categoryCode ? checkEscalationRules(categoryCode, catAnswers) : [];
  const blockingEscalations = firedEscalations.filter(e => e.action === "block");
  const inspectionEscalations = firedEscalations.filter(e => e.action === "inspection_required");
  const diagnosticFeeEscalations = firedEscalations.filter(e => e.action === "diagnostic_fee");

  // Determine current step
  const getCurrentStep = useCallback((): Step => {
    if (!user) return "auth";
    if (!profile?.full_name || !profile?.phone) return "identity";

    if (!defaultAddress || readiness.errors.includes("address_outside_coverage")) {
      if (readiness.errors.includes("address_outside_coverage")) return "outside_coverage";
      return "address";
    }
    if (readiness.missing.includes("address_coordinates") || readiness.missing.includes("address_verification")) {
      return "address";
    }

    const catMissing = readiness.missing.filter(m => m.startsWith("category:"));
    if (readiness.missing.includes("category_answers") || catMissing.length > 0) return "category_answers";

    const consentMissing = readiness.missing.filter(m => m.startsWith("consent:"));
    if (consentMissing.length > 0) return "consents";

    if (firedEscalations.length > 0 && !escalationsAcked) return "escalation_review";

    return "done";
  }, [user, profile, defaultAddress, readiness, firedEscalations, escalationsAcked]);

  const currentStep = getCurrentStep();

  // Auto-proceed when done
  useEffect(() => {
    if (currentStep === "done" && open && !saving) {
      const outcome = computeOutcome();
      const timer = setTimeout(() => onReady(outcome, catAnswers), 150);
      return () => clearTimeout(timer);
    }
  }, [currentStep, open, saving]);

  function computeOutcome(): BookingOutcome {
    if (readiness.errors.includes("address_outside_coverage")) return "outside_coverage_waitlist";
    if (blockingEscalations.length > 0) return "blocked";
    const escOutcome = computeEscalationOutcome(catAnswers);
    if (escOutcome === "inspection_only" || escOutcome === "diagnostic_fee_required") return "ready_for_inspection_only";
    if (rules?.inspectionOnly) return "ready_for_inspection_only";
    return "ready_for_booking";
  }

  const completedSteps = [
    !!user,
    !!profile?.full_name && !!profile?.phone,
    hasServiceableAddress,
    !readiness.missing.some(m => m.startsWith("consent:") || m.startsWith("category:")),
  ].filter(Boolean).length;
  const totalSteps = 4;

  const handleSaveIdentity = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ full_name: name.trim(), phone: phone.trim() } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategoryAnswers = async () => {
    setSaving(true);
    try {
      const outcome = computeEscalationOutcome(catAnswers);
      await upsertAnswers.mutateAsync({ answers: catAnswers, escalationOutcome: outcome });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConsents = async () => {
    setSaving(true);
    try {
      const consentMissing = readiness.missing
        .filter(m => m.startsWith("consent:"))
        .map(m => m.replace("consent:", ""));
      for (const key of consentMissing) {
        if (consentChecks[key]) {
          await recordConsent.mutateAsync({
            consentType: "category_requirement",
            consentKey: key,
            accepted: true,
            context: { category: categoryCode },
          });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const consentMissingKeys = readiness.missing
    .filter(m => m.startsWith("consent:"))
    .map(m => m.replace("consent:", ""));
  const allConsentsChecked = consentMissingKeys.every(k => consentChecks[k]);

  // Visible category fields
  const visibleFields = categoryCode ? getVisibleFields(categoryCode, catAnswers) : [];
  const nonConsentFields = visibleFields.filter(f => !f.consentType && f.required);
  const catFieldsMissing = nonConsentFields.filter(f => {
    if (f.showWhen && !f.showWhen.values.includes(catAnswers[f.showWhen.field])) return false;
    return !catAnswers[f.key];
  });
  const allCatFieldsFilled = catFieldsMissing.length === 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="text-left pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <SheetTitle className="text-lg font-bold">Almost ready to book</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {completedSteps}/{totalSteps} steps complete
            {rules && <span className="ml-1">• {rules.label}</span>}
          </SheetDescription>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < completedSteps ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {/* AUTH */}
          {currentStep === "auth" && (
            <motion.div key="auth" {...stepAnimation} className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">Sign in to continue with your booking</p>
              <SocialSignInButtons />
            </motion.div>
          )}

          {/* IDENTITY */}
          {currentStep === "identity" && (
            <motion.div key="identity" {...stepAnimation} className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">We need a few details to process your booking</p>
              {!profile?.full_name && (
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-1"><User className="w-3 h-3" /> Full Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="rounded-xl h-11" />
                </div>
              )}
              {!profile?.phone && (
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-1"><Phone className="w-3 h-3" /> Phone Number</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07X XXX XXXX" type="tel" className="rounded-xl h-11" />
                </div>
              )}
              <Button onClick={handleSaveIdentity} disabled={saving || !name.trim() || !phone.trim()} className="w-full rounded-xl h-12 font-semibold text-sm">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Continue
              </Button>
            </motion.div>
          )}

          {/* ADDRESS */}
          {currentStep === "address" && (
            <motion.div key="address" {...stepAnimation} className="py-4 space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Service address needed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {readiness.missing.includes("address_verification")
                      ? "Your address needs location verification. Please confirm with GPS or map pin."
                      : readiness.missing.includes("address_coordinates")
                      ? "Your address needs GPS coordinates. Update with location services."
                      : "Add an address within Greater Colombo to proceed."}
                  </p>
                </div>
              </div>
              {defaultAddress && defaultAddress.verification_state === "needs_verification" && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Needs Verification</span>
                  <span className="text-xs text-muted-foreground">{defaultAddress.address_line_1}</span>
                </div>
              )}
              <Button onClick={onClose} variant="outline" className="w-full rounded-xl h-11">
                <MapPin className="w-4 h-4 mr-2" />
                Go to Address Manager
              </Button>
            </motion.div>
          )}

          {/* OUTSIDE COVERAGE */}
          {currentStep === "outside_coverage" && (
            <motion.div key="outside" {...stepAnimation}>
              <CoverageWaitlist
                city={defaultAddress?.city || undefined}
                district={defaultAddress?.district || undefined}
                latitude={defaultAddress?.latitude || undefined}
                longitude={defaultAddress?.longitude || undefined}
                category={categoryCode}
                onClose={onClose}
                sourceScreen="booking_gate"
              />
            </motion.div>
          )}

          {/* CATEGORY ANSWERS */}
          {currentStep === "category_answers" && rules && (
            <motion.div key="catanswers" {...stepAnimation} className="py-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">{rules.label} — Service Details</p>
              <p className="text-xs text-muted-foreground">Help us prepare for your service</p>
              {nonConsentFields.map(field => (
                <CategoryFieldInput
                  key={field.key}
                  field={field}
                  value={catAnswers[field.key]}
                  onChange={(v) => setCatAnswers(prev => ({ ...prev, [field.key]: v }))}
                  answers={catAnswers}
                />
              ))}
              <Button
                onClick={handleSaveCategoryAnswers}
                disabled={!allCatFieldsFilled || saving}
                className="w-full rounded-xl h-12 font-semibold text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                Save & Continue
              </Button>
            </motion.div>
          )}

          {/* CONSENTS */}
          {currentStep === "consents" && (
            <motion.div key="consents" {...stepAnimation} className="py-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Required Acknowledgements</p>
              <p className="text-xs text-muted-foreground">Please review and accept to continue</p>
              {consentMissingKeys.map(key => (
                <label key={key} className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/20 cursor-pointer transition-colors">
                  <Checkbox
                    checked={!!consentChecks[key]}
                    onCheckedChange={(v) => setConsentChecks(prev => ({ ...prev, [key]: !!v }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{getConsentDescription(key)}</p>
                  </div>
                </label>
              ))}
              <Button
                onClick={handleSaveConsents}
                disabled={saving || !allConsentsChecked}
                className="w-full rounded-xl h-12 font-semibold text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm & Continue
              </Button>
            </motion.div>
          )}

          {/* ESCALATION REVIEW */}
          {currentStep === "escalation_review" && (
            <motion.div key="escalation" {...stepAnimation} className="py-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Important Notes</p>
              {firedEscalations.map((esc, i) => (
                <div key={i} className={`p-3.5 rounded-xl border ${
                  esc.action === "block" ? "bg-destructive/5 border-destructive/20" :
                  esc.action === "inspection_required" ? "bg-amber-500/5 border-amber-500/20" :
                  esc.action === "diagnostic_fee" ? "bg-amber-500/5 border-amber-500/20" :
                  "bg-muted/30 border-border"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {esc.action === "block" ? <Ban className="w-4 h-4 text-destructive" /> :
                     esc.action === "inspection_required" ? <FileSearch className="w-4 h-4 text-amber-600" /> :
                     <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {esc.action === "inspection_required" ? "Inspection Required" :
                       esc.action === "diagnostic_fee" ? "Diagnostic Fee Required" :
                       esc.action === "block" ? "Cannot Proceed" :
                       "Notice"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{esc.message}</p>
                </div>
              ))}
              {blockingEscalations.length > 0 ? (
                <Button onClick={onClose} variant="outline" className="w-full rounded-xl h-11">
                  Close
                </Button>
              ) : (
                <div className="space-y-2">
                  {(inspectionEscalations.length > 0 || diagnosticFeeEscalations.length > 0) && (
                    <p className="text-xs text-muted-foreground text-center">
                      This booking will proceed as an {inspectionEscalations.length > 0 ? "inspection-first" : "diagnostic"} request.
                    </p>
                  )}
                  <Button onClick={() => setEscalationsAcked(true)} className="w-full rounded-xl h-12 font-semibold text-sm">
                    I Understand, Continue
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ────────────────────────────────────────

function CategoryFieldInput({ field, value, onChange, answers }: {
  field: OnboardingField;
  value: any;
  onChange: (v: any) => void;
  answers: Record<string, any>;
}) {
  if (field.showWhen && !field.showWhen.values.includes(answers[field.showWhen.field])) {
    return null;
  }

  if (field.type === "select" && field.options) {
    return (
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</Label>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger className="rounded-xl h-11">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</Label>
        <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.description || field.label} className="rounded-xl h-11" />
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/20 cursor-pointer transition-colors">
        <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
        </div>
      </label>
    );
  }

  if (field.type === "photo") {
    return (
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</Label>
        <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border hover:bg-muted/10 cursor-pointer">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{field.description || "Tap to upload photo"}</span>
        </div>
      </div>
    );
  }

  return null;
}

function getConsentDescription(key: string): string {
  const descriptions: Record<string, string> = {
    data_safety: "Your personal data and device info are handled securely by vetted LankaFix partners.",
    backup_responsibility: "Please back up important data before service. LankaFix is not liable for data loss.",
    backup_recommendation: "We strongly recommend backing up all data before service begins.",
    data_risk: "I understand repairs may carry data-loss risk and have taken precautions.",
    pin_sharing: "I may need to share my device PIN for proper diagnosis.",
    quote_variance: "Final pricing may differ from the initial estimate based on diagnosis.",
    inspection_first: "This service requires a technician inspection before final pricing.",
    adult_presence: "An adult (18+) will be present during the service.",
    network_readiness: "I confirm network/power readiness at the service location.",
    data_access_permission: "I grant permission for data access during repair.",
    diagnostic_fee_ack: "I acknowledge a diagnostic fee is required before work begins.",
    no_full_recovery_ack: "Full data recovery is not guaranteed. I understand the limitations.",
    inspection_ack: "I understand an inspection is needed before final pricing.",
  };
  return descriptions[key] || `I acknowledge the ${key.replace(/_/g, " ")} requirement.`;
}
