/**
 * ServiceRequestFlow — Production-grade multi-step guided booking flow.
 * Integrates the Category Flow Engine (Interfaces 2→3→4).
 * Steps: Service → Details → Diagnostic → Urgency → Identity → Confirm
 */
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getCategoryLandingConfig, type ServiceOption } from "@/data/categoryLandingConfig";
import {
  getCategoryFlowConfig, resolveFlowFamily, getVisibleDiagnosticFields,
  type FlowFamily, type CategoryFlowConfig,
} from "@/data/categoryFlowEngine";
import { CONSUMER_CATEGORIES, getIssuesForCategory } from "@/data/consumerBookingCategories";
import { useAuth } from "@/hooks/useAuth";
import { useProfileAutoFill } from "@/hooks/useProfileAutoFill";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/motion/PageTransition";
import DiagnosticBuilder from "@/components/service-flow/DiagnosticBuilder";
import ConfirmationStep from "@/components/service-flow/ConfirmationStep";
import ServiceStep from "@/components/service-flow/ServiceStep";
import DetailsStep from "@/components/service-flow/DetailsStep";
import UrgencyStep from "@/components/service-flow/UrgencyStep";
import IdentityStep from "@/components/service-flow/IdentityStep";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";

type FlowStep = "service" | "details" | "diagnostic" | "urgency" | "identity" | "confirm";

const STEPS: FlowStep[] = ["service", "details", "diagnostic", "urgency", "identity", "confirm"];
const STEP_LABELS: Record<FlowStep, string> = {
  service: "Service",
  details: "Issue",
  diagnostic: "Details",
  urgency: "When",
  identity: "You",
  confirm: "Confirm",
};

interface FlowState {
  serviceId: string;
  serviceLabel: string;
  issueId: string;
  issueLabel: string;
  description: string;
  urgency: string;
  serviceMode: string;
  name: string;
  phone: string;
  locationMethod: string;
  addressLine1: string;
  city: string;
  district: string;
  landmark: string;
  floorOrUnit: string;
  parkingNotes: string;
  savedAddressId: string;
  adultPresenceConfirmed: boolean;
  diagnosticAnswers: Record<string, string>;
  consentState: Record<string, boolean>;
}

const INITIAL_STATE: FlowState = {
  serviceId: "", serviceLabel: "", issueId: "", issueLabel: "",
  description: "", urgency: "", serviceMode: "",
  name: "", phone: "", locationMethod: "",
  addressLine1: "", city: "", district: "", landmark: "",
  floorOrUnit: "", parkingNotes: "", savedAddressId: "",
  adultPresenceConfirmed: false,
  diagnosticAnswers: {},
  consentState: {},
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function ServiceRequestFlow() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const autoFill = useProfileAutoFill();

  const categoryCode = code?.toUpperCase() || "";
  const landingConfig = getCategoryLandingConfig(categoryCode);
  const flowConfig = getCategoryFlowConfig(categoryCode);
  const issues = getIssuesForCategory(categoryCode);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<FlowState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const currentStep = STEPS[stepIndex];

  const activeFlowFamily = useMemo<FlowFamily>(() => {
    return resolveFlowFamily(categoryCode, state.serviceId, state.diagnosticAnswers);
  }, [categoryCode, state.serviceId, state.diagnosticAnswers]);

  // Pre-select service/issue from URL params
  useEffect(() => {
    const svc = searchParams.get("service");
    const issue = searchParams.get("issue");
    if (svc && landingConfig) {
      const match = landingConfig.services.find((s) => s.id === svc);
      if (match) {
        setState((p) => ({ ...p, serviceId: match.id, serviceLabel: match.label }));
        setStepIndex(1);
      }
    }
    if (issue) {
      const match = issues.find((i) => i.id === issue);
      if (match) setState((p) => ({ ...p, issueId: match.id, issueLabel: match.label }));
    }
  }, []);

  // Auto-fill profile data
  useEffect(() => {
    if (!autoFill.isLoading && !autoFilled && autoFill.hasProfileData) {
      setState((p) => ({
        ...p,
        name: p.name || autoFill.name,
        phone: p.phone || autoFill.phone,
        addressLine1: p.addressLine1 || autoFill.address?.addressLine1 || "",
        city: p.city || autoFill.address?.city || "",
        district: p.district || autoFill.address?.district || "",
        landmark: p.landmark || autoFill.address?.landmark || "",
        savedAddressId: autoFill.address?.id || "",
        locationMethod: autoFill.address ? "saved" : "",
      }));
      setAutoFilled(true);
    }
  }, [autoFill.isLoading, autoFilled, autoFill.hasProfileData]);

  const update = (field: keyof FlowState, value: any) =>
    setState((p) => ({ ...p, [field]: value }));

  const updateDiagnostic = (key: string, value: string) =>
    setState((p) => ({
      ...p,
      diagnosticAnswers: { ...p.diagnosticAnswers, [key]: value },
    }));

  const updateConsent = (key: string, checked: boolean) =>
    setState((p) => ({
      ...p,
      consentState: { ...p.consentState, [key]: checked },
    }));

  const shouldSkipStep = (step: FlowStep): boolean => {
    if (step === "identity" && isAuthenticated && state.name && state.phone) return true;
    if (step === "diagnostic" && !flowConfig) return true;
    return false;
  };

  // Effective steps for progress display (excludes skipped)
  const effectiveSteps = STEPS.filter(s => !shouldSkipStep(s));
  const effectiveIndex = effectiveSteps.indexOf(currentStep);
  const progress = ((effectiveIndex + 1) / effectiveSteps.length) * 100;

  const goNext = () => {
    let next = stepIndex + 1;
    while (next < STEPS.length && shouldSkipStep(STEPS[next])) next++;
    if (next < STEPS.length) {
      setDirection(1);
      setStepIndex(next);
    }
  };

  const goBack = () => {
    let prev = stepIndex - 1;
    while (prev >= 0 && shouldSkipStep(STEPS[prev])) prev--;
    if (prev >= 0) {
      setDirection(-1);
      setStepIndex(prev);
    } else {
      navigate(-1);
    }
  };

  const goToStep = (step: string) => {
    const idx = STEPS.indexOf(step as FlowStep);
    if (idx >= 0) { setDirection(-1); setStepIndex(idx); }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "service": return !!state.serviceId;
      case "details": return !!state.issueId;
      case "diagnostic": {
        if (!flowConfig) return true;
        const visible = getVisibleDiagnosticFields(categoryCode, state.diagnosticAnswers);
        const required = visible.filter(f => f.required);
        return required.every(f => !!state.diagnosticAnswers[f.key]);
      }
      case "urgency": return !!state.urgency;
      case "identity": return !!state.name.trim() && !!state.phone.trim();
      case "confirm": {
        const hasLocation = !!(state.addressLine1.trim() || state.savedAddressId || state.locationMethod === "current");
        const requiredConsents = flowConfig?.requiredConsents || [];
        const allConsented = requiredConsents.every(c => !!state.consentState[c]);
        return hasLocation && allConsented;
      }
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from("bookings").insert({
        category_code: categoryCode,
        service_type: state.serviceId,
        customer_id: user?.id || null,
        status: "requested",
        notes: [state.serviceLabel, state.issueLabel, state.description].filter(Boolean).join(" | "),
        diagnostic_answers: {
          ...state.diagnosticAnswers,
          _service: state.serviceId,
          _issue: state.issueId,
          _urgency: state.urgency,
          _service_mode: state.serviceMode,
          _description: state.description,
          _flow_family: activeFlowFamily,
        },
        customer_address: {
          address_line_1: state.addressLine1,
          city: state.city,
          district: state.district,
          landmark: state.landmark,
          floor_or_unit: state.floorOrUnit,
          parking_notes: state.parkingNotes,
          saved_address_id: state.savedAddressId,
          location_method: state.locationMethod,
        },
        scheduled_at: state.urgency === "asap" ? new Date().toISOString() : null,
        booking_source: "service_flow",
        is_emergency: state.urgency === "asap",
      }).select("id").single();

      if (error) throw error;
      toast.success("Request submitted! We'll coordinate your service.");
      navigate(`/tracker/${data.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!landingConfig) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Service not found</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Build diagnostic label map for review
  const diagnosticLabels: Record<string, string> = {};
  const diagnosticDisplayValues: Record<string, string> = {};
  if (flowConfig) {
    for (const field of flowConfig.diagnosticFields) {
      diagnosticLabels[field.key] = field.label;
      const val = state.diagnosticAnswers[field.key];
      if (val && field.options) {
        const opt = field.options.find(o => o.value === val);
        diagnosticDisplayValues[field.key] = opt?.label || val;
      } else if (val) {
        diagnosticDisplayValues[field.key] = val;
      }
    }
  }

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      {/* Header with progress */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{landingConfig.heroTitle}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progress} className="h-1 flex-1" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {effectiveIndex + 1}/{effectiveSteps.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex px-4 pb-2 gap-1 overflow-x-auto scrollbar-none">
          {STEPS.map((s, i) => {
            if (shouldSkipStep(s) && i !== stepIndex) return null;
            return (
              <Badge
                key={s}
                variant={i === stepIndex ? "default" : i < stepIndex ? "secondary" : "outline"}
                className={`text-[9px] shrink-0 px-2 py-0.5 rounded-full ${
                  i < stepIndex ? "bg-primary/15 text-primary border-primary/20" : ""
                }`}
              >
                {i < stepIndex && <Check className="w-2.5 h-2.5 mr-0.5" />}
                {STEP_LABELS[s]}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 container max-w-md py-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentStep === "service" && (
              <ServiceStep
                services={landingConfig.services}
                selected={state.serviceId}
                onSelect={(svc) => {
                  update("serviceId", svc.id);
                  update("serviceLabel", svc.label);
                }}
                flowFamily={activeFlowFamily}
              />
            )}
            {currentStep === "details" && (
              <DetailsStep
                issues={issues}
                selectedIssue={state.issueId}
                description={state.description}
                onSelectIssue={(id, label) => {
                  update("issueId", id);
                  update("issueLabel", label);
                }}
                onDescriptionChange={(v) => update("description", v)}
              />
            )}
            {currentStep === "diagnostic" && flowConfig && (
              <DiagnosticBuilder
                categoryCode={categoryCode}
                answers={state.diagnosticAnswers}
                onAnswer={updateDiagnostic}
                commercial={flowConfig.commercial}
                trustSignals={flowConfig.trustSignals}
                photoUploadEnabled={flowConfig.photoUploadEnabled}
                serviceId={state.serviceId}
                defaultFlowFamily={flowConfig.serviceFlowMap[state.serviceId] || flowConfig.defaultFlowFamily}
              />
            )}
            {currentStep === "urgency" && (
              <UrgencyStep
                urgencyOptions={landingConfig.urgencyOptions}
                serviceModes={landingConfig.serviceModes}
                selectedUrgency={state.urgency}
                selectedMode={state.serviceMode}
                onSelectUrgency={(v) => update("urgency", v)}
                onSelectMode={(v) => update("serviceMode", v)}
              />
            )}
            {currentStep === "identity" && (
              <IdentityStep
                name={state.name}
                phone={state.phone}
                onNameChange={(v) => update("name", v)}
                onPhoneChange={(v) => update("phone", v)}
                isAuthenticated={isAuthenticated}
              />
            )}
            {currentStep === "confirm" && (
              <ConfirmationStep
                flowFamily={activeFlowFamily}
                commercial={flowConfig?.commercial || { expectations: [], priceVisibility: "transparent", expectationLabel: "Standard pricing" }}
                categoryLabel={landingConfig.heroTitle}
                serviceLabel={state.serviceLabel}
                issueLabel={state.issueLabel}
                urgencyLabel={landingConfig.urgencyOptions.find(u => u.id === state.urgency)?.label || state.urgency}
                modeLabel={landingConfig.serviceModes.find(m => m.id === state.serviceMode)?.label}
                description={state.description}
                diagnosticSummary={diagnosticDisplayValues}
                diagnosticLabels={diagnosticLabels}
                name={state.name}
                phone={state.phone}
                locationMethod={state.locationMethod}
                addressLine1={state.addressLine1}
                city={state.city}
                district={state.district}
                landmark={state.landmark}
                floorOrUnit={state.floorOrUnit}
                parkingNotes={state.parkingNotes}
                savedAddressId={state.savedAddressId}
                savedAddress={autoFill.address}
                savedAddressDisplay={autoFill.addressDisplayString}
                onLocationMethodChange={(m) => {
                  update("locationMethod", m);
                  if (m === "saved" && autoFill.address) {
                    update("savedAddressId", autoFill.address.id);
                    update("addressLine1", autoFill.address.addressLine1);
                    update("city", autoFill.address.city);
                    update("district", autoFill.address.district);
                    update("landmark", autoFill.address.landmark);
                  }
                }}
                onFieldChange={(k, v) => update(k as keyof FlowState, v)}
                onEditStep={goToStep}
                adultPresenceRequired={flowConfig?.adultPresenceRequired ?? false}
                accessDetailsRequired={flowConfig?.accessDetailsRequired ?? true}
                adultPresenceConfirmed={state.adultPresenceConfirmed}
                onAdultPresenceChange={(v) => update("adultPresenceConfirmed", v)}
                requiredConsents={flowConfig?.requiredConsents || []}
                consentState={state.consentState}
                onConsentChange={updateConsent}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/40 px-4 py-3 safe-area-bottom">
        <div className="max-w-md mx-auto">
          {currentStep === "confirm" ? (
            <Button
              className="w-full h-12 rounded-xl font-bold text-sm gap-2"
              disabled={submitting || !canProceed()}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Confirm Request"}
            </Button>
          ) : (
            <Button
              className="w-full h-12 rounded-xl font-bold text-sm gap-2"
              disabled={!canProceed()}
              onClick={goNext}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
