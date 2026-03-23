/**
 * ServiceRequestFlow — Multi-step guided booking flow.
 * Steps: Service → Issue Details → Urgency/Mode → Identity Check → Location → Review → Submit
 * Keeps location capture at the FINAL stage only.
 */
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getCategoryLandingConfig, type ServiceOption } from "@/data/categoryLandingConfig";
import { CONSUMER_CATEGORIES, getIssuesForCategory } from "@/data/consumerBookingCategories";
import { useAuth } from "@/hooks/useAuth";
import { useProfileAutoFill } from "@/hooks/useProfileAutoFill";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Clock, Loader2,
  MapPin, Phone, Sparkles, User, Wrench, Shield, CheckCircle2,
  Navigation, Edit3, Send,
} from "lucide-react";

type FlowStep = "service" | "details" | "urgency" | "identity" | "location" | "review";

const STEPS: FlowStep[] = ["service", "details", "urgency", "identity", "location", "review"];
const STEP_LABELS: Record<FlowStep, string> = {
  service: "Service",
  details: "Details",
  urgency: "When",
  identity: "You",
  location: "Location",
  review: "Review",
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
  savedAddressId: string;
}

const INITIAL_STATE: FlowState = {
  serviceId: "", serviceLabel: "", issueId: "", issueLabel: "",
  description: "", urgency: "", serviceMode: "",
  name: "", phone: "", locationMethod: "",
  addressLine1: "", city: "", district: "", landmark: "", savedAddressId: "",
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
  const config = getCategoryLandingConfig(categoryCode);
  const categoryMeta = CONSUMER_CATEGORIES.find((c) => c.code === categoryCode);
  const issues = getIssuesForCategory(categoryCode);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<FlowState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const currentStep = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // Pre-select service/issue from URL params
  useEffect(() => {
    const svc = searchParams.get("service");
    const issue = searchParams.get("issue");
    if (svc && config) {
      const match = config.services.find((s) => s.id === svc);
      if (match) {
        setState((p) => ({ ...p, serviceId: match.id, serviceLabel: match.label }));
        // Auto-advance to details if service pre-selected
        setStepIndex(1);
      }
    }
    if (issue) {
      const match = issues.find((i) => i.id === issue);
      if (match) {
        setState((p) => ({ ...p, issueId: match.id, issueLabel: match.label }));
      }
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
      }));
      setAutoFilled(true);
    }
  }, [autoFill.isLoading, autoFilled, autoFill.hasProfileData]);

  const update = (field: keyof FlowState, value: string) =>
    setState((p) => ({ ...p, [field]: value }));

  const goNext = () => {
    // Skip identity step if already authenticated with name+phone
    let next = stepIndex + 1;
    if (STEPS[next] === "identity" && isAuthenticated && state.name && state.phone) {
      next++;
    }
    // Skip location if saved address is available and user hasn't cleared it
    if (next < STEPS.length) {
      setDirection(1);
      setStepIndex(next);
    }
  };

  const goBack = () => {
    let prev = stepIndex - 1;
    if (STEPS[prev] === "identity" && isAuthenticated && state.name && state.phone) {
      prev--;
    }
    if (prev >= 0) {
      setDirection(-1);
      setStepIndex(prev);
    } else {
      navigate(-1);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "service": return !!state.serviceId;
      case "details": return !!state.issueId;
      case "urgency": return !!state.urgency;
      case "identity": return !!state.name.trim() && !!state.phone.trim();
      case "location": return !!state.addressLine1.trim() || !!state.savedAddressId;
      case "review": return true;
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
        notes: [
          state.serviceLabel,
          state.issueLabel,
          state.description,
        ].filter(Boolean).join(" | "),
        diagnostic_answers: {
          service: state.serviceId,
          issue: state.issueId,
          urgency: state.urgency,
          service_mode: state.serviceMode,
          description: state.description,
        },
        customer_address: {
          address_line_1: state.addressLine1,
          city: state.city,
          district: state.district,
          landmark: state.landmark,
          saved_address_id: state.savedAddressId,
        },
        scheduled_at: state.urgency === "asap" ? new Date().toISOString() : null,
        booking_source: "service_flow",
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

  if (!config) {
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

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      {/* Header with progress */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">
              {config.heroTitle}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progress} className="h-1 flex-1" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {stepIndex + 1}/{STEPS.length}
              </span>
            </div>
          </div>
        </div>
        {/* Step indicators */}
        <div className="flex px-4 pb-2 gap-1 overflow-x-auto scrollbar-none">
          {STEPS.map((s, i) => (
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
          ))}
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
                services={config.services}
                selected={state.serviceId}
                onSelect={(svc) => {
                  update("serviceId", svc.id);
                  update("serviceLabel", svc.label);
                }}
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
                categoryCode={categoryCode}
              />
            )}
            {currentStep === "urgency" && (
              <UrgencyStep
                urgencyOptions={config.urgencyOptions}
                serviceModes={config.serviceModes}
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
            {currentStep === "location" && (
              <LocationStep
                state={state}
                update={update}
                savedAddress={autoFill.address}
                savedAddressDisplay={autoFill.addressDisplayString}
              />
            )}
            {currentStep === "review" && (
              <ReviewStep
                state={state}
                config={config}
                onEdit={(step) => {
                  const idx = STEPS.indexOf(step as FlowStep);
                  if (idx >= 0) {
                    setDirection(-1);
                    setStepIndex(idx);
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/40 px-4 py-3 safe-area-bottom">
        <div className="max-w-md mx-auto">
          {currentStep === "review" ? (
            <Button
              className="w-full h-12 rounded-xl font-bold text-sm gap-2"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
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

/* ─── Step Components ─── */

function ServiceStep({
  services,
  selected,
  onSelect,
}: {
  services: ServiceOption[];
  selected: string;
  onSelect: (svc: ServiceOption) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          What do you need?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the service that best matches your need
        </p>
      </div>
      <div className="space-y-2.5">
        {services.map((svc) => (
          <button
            key={svc.id}
            onClick={() => onSelect(svc)}
            className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
              selected === svc.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/40 bg-card hover:border-primary/20"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selected === svc.id ? "bg-primary/15" : "bg-secondary"
            }`}>
              <Wrench className={`w-4.5 h-4.5 ${selected === svc.id ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{svc.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{svc.description}</p>
            </div>
            {selected === svc.id && (
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsStep({
  issues,
  selectedIssue,
  description,
  onSelectIssue,
  onDescriptionChange,
  categoryCode,
}: {
  issues: { id: string; label: string; hint?: string }[];
  selectedIssue: string;
  description: string;
  onSelectIssue: (id: string, label: string) => void;
  onDescriptionChange: (v: string) => void;
  categoryCode: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Describe the issue
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the closest match or describe your problem
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => onSelectIssue(issue.id, issue.label)}
            className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
              selectedIssue === issue.id
                ? "border-primary bg-primary/5"
                : "border-border/40 bg-card hover:border-primary/20"
            }`}
          >
            <p className="text-xs font-semibold text-foreground">{issue.label}</p>
            {issue.hint && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {issue.hint}
              </p>
            )}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          Additional details <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          placeholder="Tell us more about the issue..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="rounded-xl min-h-[80px] text-sm resize-none"
        />
      </div>
    </div>
  );
}

function UrgencyStep({
  urgencyOptions,
  serviceModes,
  selectedUrgency,
  selectedMode,
  onSelectUrgency,
  onSelectMode,
}: {
  urgencyOptions: { id: string; label: string; hint?: string }[];
  serviceModes: { id: string; label: string; available: boolean }[];
  selectedUrgency: string;
  selectedMode: string;
  onSelectUrgency: (v: string) => void;
  onSelectMode: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          When do you need this?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us match the right technician
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {urgencyOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelectUrgency(opt.id)}
            className={`p-4 rounded-xl border text-left transition-all active:scale-[0.97] ${
              selectedUrgency === opt.id
                ? "border-primary bg-primary/5"
                : "border-border/40 bg-card hover:border-primary/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${selectedUrgency === opt.id ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
            </div>
            {opt.hint && (
              <p className="text-[10px] text-muted-foreground">{opt.hint}</p>
            )}
          </button>
        ))}
      </div>

      {serviceModes.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Service Mode</h3>
          <div className="flex gap-2.5 flex-wrap">
            {serviceModes.filter((m) => m.available).map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedMode === mode.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/40 bg-card text-foreground hover:border-primary/20"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IdentityStep({
  name,
  phone,
  onNameChange,
  onPhoneChange,
  isAuthenticated,
}: {
  name: string;
  phone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Your details
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          So we can coordinate your service
        </p>
      </div>

      {isAuthenticated && name && phone ? (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Your name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="What should we call you?"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Phone number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="07X XXX XXXX"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Your phone is used for coordination only
          </p>
        </div>
      )}
    </div>
  );
}

function LocationStep({
  state,
  update,
  savedAddress,
  savedAddressDisplay,
}: {
  state: FlowState;
  update: (field: keyof FlowState, value: string) => void;
  savedAddress: any;
  savedAddressDisplay: string;
}) {
  const [method, setMethod] = useState<string>(
    savedAddress ? "saved" : ""
  );

  const handleMethod = (m: string) => {
    setMethod(m);
    update("locationMethod", m);
    if (m === "saved" && savedAddress) {
      update("savedAddressId", savedAddress.id);
      update("addressLine1", savedAddress.addressLine1);
      update("city", savedAddress.city);
      update("district", savedAddress.district);
      update("landmark", savedAddress.landmark);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Where do you need service?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is where the technician will arrive
        </p>
      </div>

      {/* Method selection */}
      <div className="space-y-2.5">
        {savedAddress && (
          <button
            onClick={() => handleMethod("saved")}
            className={`w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
              method === "saved" ? "border-primary bg-primary/5" : "border-border/40 bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                method === "saved" ? "bg-primary/15" : "bg-secondary"
              }`}>
                <MapPin className={`w-4 h-4 ${method === "saved" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {savedAddress.label || "Saved Address"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {savedAddressDisplay}
                </p>
              </div>
              {method === "saved" && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </div>
          </button>
        )}

        <button
          onClick={() => handleMethod("current")}
          className={`w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
            method === "current" ? "border-primary bg-primary/5" : "border-border/40 bg-card"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              method === "current" ? "bg-primary/15" : "bg-secondary"
            }`}>
              <Navigation className={`w-4 h-4 ${method === "current" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Use Current Location</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Auto-detect with GPS</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleMethod("manual")}
          className={`w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
            method === "manual" ? "border-primary bg-primary/5" : "border-border/40 bg-card"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              method === "manual" ? "bg-primary/15" : "bg-secondary"
            }`}>
              <Edit3 className={`w-4 h-4 ${method === "manual" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Enter Address</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Type your service location</p>
            </div>
          </div>
        </button>
      </div>

      {/* Manual address form */}
      {method === "manual" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          <Input
            placeholder="Address line 1"
            value={state.addressLine1}
            onChange={(e) => update("addressLine1", e.target.value)}
            className="h-11 rounded-xl"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="City"
              value={state.city}
              onChange={(e) => update("city", e.target.value)}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder="District"
              value={state.district}
              onChange={(e) => update("district", e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Input
            placeholder="Landmark (optional)"
            value={state.landmark}
            onChange={(e) => update("landmark", e.target.value)}
            className="h-11 rounded-xl"
          />
        </motion.div>
      )}

      {method === "current" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-2xl bg-secondary/50 border border-border/40"
        >
          <p className="text-xs text-muted-foreground text-center">
            📍 Your browser will ask for location permission.
            <br />
            You can refine the pin after granting access.
          </p>
        </motion.div>
      )}
    </div>
  );
}

function ReviewStep({
  state,
  config,
  onEdit,
}: {
  state: FlowState;
  config: NonNullable<ReturnType<typeof getCategoryLandingConfig>>;
  onEdit: (step: string) => void;
}) {
  const urgencyLabel = config.urgencyOptions.find((u) => u.id === state.urgency)?.label || state.urgency;
  const modeLabel = config.serviceModes.find((m) => m.id === state.serviceMode)?.label;
  const location = [state.addressLine1, state.city, state.district].filter(Boolean).join(", ");

  const Row = ({ label, value, step }: { label: string; value: string; step: string }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
      </div>
      <button onClick={() => onEdit(step)} className="text-xs text-primary font-medium shrink-0 mt-1">
        Edit
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Review your request
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Make sure everything looks correct
        </p>
      </div>

      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <Row label="Service" value={state.serviceLabel} step="service" />
        <Row label="Issue" value={state.issueLabel} step="details" />
        {state.description && <Row label="Details" value={state.description} step="details" />}
        <Row label="When" value={urgencyLabel} step="urgency" />
        {modeLabel && <Row label="Mode" value={modeLabel} step="urgency" />}
        <Row label="Name" value={state.name} step="identity" />
        <Row label="Phone" value={state.phone} step="identity" />
        <Row label="Location" value={location} step="location" />
      </div>

      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your request is protected by the LankaFix Guarantee.
          A verified technician will be matched and coordinated for you.
        </p>
      </div>
    </div>
  );
}
