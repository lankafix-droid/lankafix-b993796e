import { useParams, useNavigate, Link } from "react-router-dom";
import PageTransition from "@/components/motion/PageTransition";
import { useState, useMemo, useEffect } from "react";
import { getV2Flow } from "@/data/v2CategoryFlows";
import type { PartGradeCode } from "@/data/partsPricing";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import V2CategoryLanding from "@/components/v2/booking/V2CategoryLanding";
import V2ServiceSelection from "@/components/v2/booking/V2ServiceSelection";
import V2DeviceDetails from "@/components/v2/booking/V2DeviceDetails";
import V2PricingBuilder from "@/components/v2/booking/V2PricingBuilder";
import V2BookingConfirmation from "@/components/v2/booking/V2BookingConfirmation";
import V2SiteConditions from "@/components/v2/booking/V2SiteConditions";
import V2ServiceModeSelection from "@/components/v2/booking/V2ServiceModeSelection";
import V2PricingExpectation from "@/components/v2/booking/V2PricingExpectation";
import V2AssignmentStep from "@/components/v2/booking/V2AssignmentStep";
import V2PartGradeSelection from "@/components/v2/booking/V2PartGradeSelection";
import V2ACInstallAddons from "@/components/v2/booking/V2ACInstallAddons";
import SmartDiagnosisStep from "@/components/v2/booking/SmartDiagnosisStep";
import DiagnosisSummaryCard from "@/components/v2/booking/DiagnosisSummaryCard";
import LocationPicker from "@/components/v2/location/LocationPicker";
import BookingProtectionCard from "@/components/v2/booking/BookingProtectionCard";
import type { CategoryCode } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { getCategoryLaunchState, isCategoryComingSoon } from "@/config/categoryLaunchConfig";
import { logCategoryInterest } from "@/lib/demandCapture";
import { getDiagnosticBlock, generateDiagnosisSummary } from "@/data/diagnosticQuestions";
import type { DiagAnswer } from "@/data/diagnosticQuestions";
import { motion, AnimatePresence } from "framer-motion";
import { getServiceSteps, getServiceTypeConfig } from "@/engines/serviceStepEngine";
import type { ServiceTypeConfig } from "@/engines/serviceStepEngine";
import { getInstantPrice } from "@/data/instantPricing";
import type { InstantPriceEntry } from "@/data/instantPricing";
import InstantPriceCard from "@/components/v2/booking/InstantPriceCard";
import { getPriorityConfig } from "@/data/priorityServiceConfig";
import type { PriorityServiceEntry } from "@/data/priorityServiceConfig";
import PriorityServiceSelector from "@/components/v2/booking/PriorityServiceSelector";
import type { ServiceSpeed } from "@/components/v2/booking/PriorityServiceSelector";

export interface V2BookingState {
  serviceTypeId: string;
  issueId?: string;
  deviceAnswers: Record<string, string | boolean>;
  serviceModeId: string;
  packageId: string;
  siteConditions: Record<string, string | boolean>;
  technicianFilter: "auto" | "fastest" | "top_rated" | "preferred_time";
  preferredTime?: string;
  photoUrls: string[];
  dataRiskAccepted?: boolean;
  partGrade?: PartGradeCode;
  acInstallAddons?: Record<string, number>;
  isEmergency?: boolean;
  diagnosticAnswers?: Record<string, DiagAnswer>;
  serviceSpeed?: ServiceSpeed;
}

const INITIAL_STATE: V2BookingState = {
  serviceTypeId: "",
  deviceAnswers: {},
  serviceModeId: "",
  packageId: "",
  siteConditions: {},
  technicianFilter: "auto",
  photoUrls: [],
  isEmergency: false,
};

const STEP_LABELS: Record<string, string> = {
  landing: "Overview",
  service_type: "Service",
  issue: "Issue",
  pricing_expectation: "Pricing",
  part_grade: "Part Quality",
  service_mode: "Mode",
  location: "Location",
  device_details: "Details",
  smart_diagnosis: "Diagnosis",
  diagnosis_summary: "Summary",
  ac_install_addons: "Add-ons",
  site_conditions: "Site",
  pricing: "Package",
  booking_protection: "Protection",
  assignment: "Technician",
  confirmation: "Confirm",
};

/* Milestone steps for the visual stepper — only show key labels */
const MILESTONE_STEPS = new Set([
  "service_type", "device_details", "pricing", "assignment", "confirmation",
]);

const V2BookingPage = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<V2BookingState>({ ...INITIAL_STATE, diagnosticAnswers: {} });

  const flow = getV2Flow(category || "");

  const serviceConfig: ServiceTypeConfig | undefined = useMemo(() => {
    if (!flow || !booking.serviceTypeId) return undefined;
    return getServiceTypeConfig(flow.code, booking.serviceTypeId);
  }, [flow, booking.serviceTypeId]);

  const instantPrice: InstantPriceEntry | null = useMemo(() => {
    if (!flow || !booking.serviceTypeId) return null;
    return getInstantPrice(flow.code, booking.serviceTypeId, booking.issueId);
  }, [flow, booking.serviceTypeId, booking.issueId]);

  const priorityConfig: PriorityServiceEntry | null = useMemo(() => {
    if (!flow || !booking.serviceTypeId) return null;
    return getPriorityConfig(flow.code, booking.serviceTypeId);
  }, [flow, booking.serviceTypeId]);

  const diagBlock = useMemo(() => {
    if (!flow || !booking.serviceTypeId) return undefined;
    return getDiagnosticBlock(flow.code, booking.serviceTypeId);
  }, [flow, booking.serviceTypeId]);

  const steps = useMemo(() => {
    if (!flow) return ["landing"];
    return getServiceSteps(flow.code, booking.serviceTypeId || undefined, {
      serviceModeId: booking.serviceModeId || undefined,
      hasDiagBlock: !!diagBlock,
      hasIssueSelectors: !!(flow.issueSelectors && flow.issueSelectors.length > 0),
      hasSiteConditions: !!(flow.siteConditions && flow.siteConditions.length > 0),
      hasServiceModes: !!(flow.serviceModes && flow.serviceModes.length > 0),
    });
  }, [flow, booking.serviceTypeId, booking.serviceModeId, diagBlock]);

  useEffect(() => {
    if (step >= steps.length) setStep(steps.length - 1);
  }, [steps.length, step]);

  if (!flow) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 px-6">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto">
              <span className="text-2xl">🔍</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Category Not Found</h1>
            <p className="text-sm text-muted-foreground">We couldn't find this service category.</p>
            <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStepName = steps[step];
  const totalSteps = steps.length;
  const progress = ((step) / (totalSteps - 1)) * 100;

  const goNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
      track("v2_booking_step", { category: flow.code, step: steps[step + 1], stepNumber: step + 1 });
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate("/");
  };

  const updateBooking = (updates: Partial<V2BookingState>) => {
    setBooking((prev) => ({ ...prev, ...updates }));
  };

  const getBasePrice = () => {
    const service = flow.packages.find(p => p.id !== "diagnostic");
    return service?.price || 10000;
  };

  const activePricingArchetype: "fixed_price" | "diagnostic_first" | "quote_required" = serviceConfig?.pricing_archetype
    ? (
        serviceConfig.pricing_archetype === "starting_from" ? "diagnostic_first" :
        serviceConfig.pricing_archetype === "inspection_required" ? "quote_required" :
        serviceConfig.pricing_archetype === "diagnostic_first" ? "diagnostic_first" :
        serviceConfig.pricing_archetype === "fixed_price" ? "fixed_price" :
        "diagnostic_first"
      )
    : flow.pricingArchetype;

  const activeAssignmentType = serviceConfig?.booking_outcome === "inspection_booking"
    ? "site_inspection" as const
    : serviceConfig?.booking_outcome === "remote_session_booking"
    ? "remote_support" as const
    : flow.assignmentType;

  /* Build milestone indices for stepper dots */
  const milestoneIndices = steps
    .map((s, i) => ({ step: s, index: i }))
    .filter(({ step: s, index: i }) => i > 0 && (MILESTONE_STEPS.has(s) || i === totalSteps - 1));

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Premium sticky progress stepper */}
        {step > 0 && (
          <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/40 safe-area-top">
            <div className="container max-w-2xl py-3 px-4">
              {/* Top row */}
              <div className="flex items-center gap-3 mb-2.5">
                <button
                  onClick={goBack}
                  className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors active:scale-95 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{flow.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {STEP_LABELS[currentStepName] || currentStepName}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1">
                  <span className="text-xs font-bold text-primary">{step}</span>
                  <span className="text-[10px] text-primary/60">/{totalSteps - 1}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* Milestone dots — only key steps */}
              {milestoneIndices.length > 2 && (
                <div className="flex items-center justify-between mt-2 px-1">
                  {milestoneIndices.map(({ step: s, index: idx }) => {
                    const isDone = idx < step;
                    const isCurrent = idx === step;
                    return (
                      <div key={s} className="flex flex-col items-center gap-0.5">
                        <div className={`transition-all duration-300 ${
                          isDone
                            ? "w-2.5 h-2.5 rounded-full bg-success"
                            : isCurrent
                            ? "w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20"
                            : "w-2 h-2 rounded-full bg-muted-foreground/15"
                        }`}>
                          {isDone && <CheckCircle2 className="w-2.5 h-2.5 text-success-foreground" />}
                        </div>
                        <span className={`text-[9px] leading-none mt-0.5 ${
                          isCurrent ? "text-primary font-semibold" : isDone ? "text-success" : "text-muted-foreground/50"
                        }`}>
                          {STEP_LABELS[s]?.slice(0, 7) || ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="container max-w-2xl py-5 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepName}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {currentStepName === "landing" && (
                <V2CategoryLanding
                  flow={flow}
                  onContinue={goNext}
                  isEmergency={booking.isEmergency}
                  onEmergencyToggle={(v) => updateBooking({ isEmergency: v })}
                />
              )}
              {currentStepName === "service_type" && (
                <V2ServiceSelection
                  options={flow.serviceTypes}
                  selected={booking.serviceTypeId}
                  onSelect={(id) => {
                    updateBooking({
                      serviceTypeId: id,
                      issueId: undefined,
                      deviceAnswers: {},
                      siteConditions: {},
                      diagnosticAnswers: {},
                      acInstallAddons: undefined,
                      partGrade: undefined,
                      serviceModeId: "",
                      packageId: "",
                    });
                    setStep(2);
                    track("v2_booking_step", { category: flow.code, step: "service_selected", serviceType: id });
                  }}
                  title="What do you need?"
                />
              )}
              {currentStepName === "issue" && flow.issueSelectors && (
                <V2ServiceSelection
                  options={flow.issueSelectors}
                  selected={booking.issueId || ""}
                  onSelect={(id) => { updateBooking({ issueId: id }); goNext(); }}
                  title="What's the problem?"
                />
              )}
              {currentStepName === "pricing_expectation" && (
                <div className="space-y-5">
                  {instantPrice ? (
                    <InstantPriceCard entry={instantPrice} onBookNow={goNext} />
                  ) : (
                    <V2PricingExpectation
                      archetype={activePricingArchetype}
                      explanation={flow.pricingExplanation}
                      onContinue={goNext}
                      categoryCode={flow.code}
                      serviceType={booking.serviceTypeId || undefined}
                    />
                  )}
                  {priorityConfig && (
                    <PriorityServiceSelector
                      config={priorityConfig}
                      selected={booking.serviceSpeed || "standard"}
                      onSelect={(speed) => updateBooking({ serviceSpeed: speed })}
                    />
                  )}
                </div>
              )}
              {currentStepName === "part_grade" && (
                <V2PartGradeSelection
                  selectedGrade={booking.partGrade || ""}
                  onSelect={(grade) => updateBooking({ partGrade: grade })}
                  onContinue={goNext}
                  basePrice={getBasePrice()}
                />
              )}
              {currentStepName === "service_mode" && flow.serviceModes && (
                <V2ServiceModeSelection
                  modes={flow.serviceModes}
                  selected={booking.serviceModeId}
                  onSelect={(id) => { updateBooking({ serviceModeId: id }); goNext(); }}
                />
              )}
              {currentStepName === "location" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Service Location</h2>
                    <p className="text-sm text-muted-foreground mt-1">Where do you need this service?</p>
                  </div>
                  <LocationPicker onContinue={goNext} showTravelFee={true} />
                </div>
              )}
              {currentStepName === "device_details" && (
                <V2DeviceDetails
                  questions={flow.deviceQuestions}
                  answers={booking.deviceAnswers}
                  onUpdate={(answers) => updateBooking({ deviceAnswers: answers })}
                  onContinue={goNext}
                  photoHint={flow.photoUploadHint}
                  dataDisclaimer={flow.dataRiskDisclaimer}
                  dataRiskAccepted={booking.dataRiskAccepted}
                  onDataRiskAccept={(v) => updateBooking({ dataRiskAccepted: v })}
                  activeServiceTypeId={booking.serviceTypeId}
                  categoryCode={flow.code}
                />
              )}
              {currentStepName === "smart_diagnosis" && diagBlock && (
                <SmartDiagnosisStep
                  block={diagBlock}
                  answers={booking.diagnosticAnswers || {}}
                  onUpdate={(answers) => updateBooking({ diagnosticAnswers: answers })}
                  onContinue={goNext}
                  photos={booking.photoUrls}
                  onPhotosChange={(photos) => updateBooking({ photoUrls: photos })}
                />
              )}
              {currentStepName === "diagnosis_summary" && diagBlock && (
                <DiagnosisSummaryCard
                  summary={generateDiagnosisSummary(diagBlock, booking.diagnosticAnswers || {}, booking.deviceAnswers)}
                  onContinue={goNext}
                />
              )}
              {currentStepName === "ac_install_addons" && (
                <V2ACInstallAddons
                  onContinue={(addons) => { updateBooking({ acInstallAddons: addons }); goNext(); }}
                />
              )}
              {currentStepName === "site_conditions" && flow.siteConditions && (
                <V2SiteConditions
                  conditions={flow.siteConditions}
                  answers={booking.siteConditions}
                  onUpdate={(a) => updateBooking({ siteConditions: a })}
                  onContinue={goNext}
                />
              )}
              {currentStepName === "pricing" && (
                <V2PricingBuilder
                  packages={flow.packages}
                  selectedId={booking.packageId}
                  onSelect={(id) => updateBooking({ packageId: id })}
                  onContinue={goNext}
                  categoryCode={flow.code}
                />
              )}
              {currentStepName === "booking_protection" && (
                <BookingProtectionCard
                  categoryCode={flow.code as CategoryCode}
                  isEmergency={booking.isEmergency}
                  onConfirmPayment={(_fee, _type, _method) => {
                    track("booking_protection_paid", { category: flow.code, fee: _fee, type: _type, method: _method });
                    goNext();
                  }}
                />
              )}
              {currentStepName === "assignment" && (
                <V2AssignmentStep
                  categoryCode={flow.code}
                  assignmentType={activeAssignmentType}
                  serviceModeId={booking.serviceModeId}
                  partnerShops={flow.partnerShops}
                  isEmergency={booking.isEmergency}
                  onConfirm={goNext}
                />
              )}
              {currentStepName === "confirmation" && <V2BookingConfirmation flow={flow} booking={booking} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {step === 0 && <Footer />}
    </PageTransition>
  );
};

export default V2BookingPage;
