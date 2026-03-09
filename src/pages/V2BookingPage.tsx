import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft } from "lucide-react";
import { track } from "@/lib/analytics";
import { getDiagnosticBlock, generateDiagnosisSummary } from "@/data/diagnosticQuestions";
import type { DiagAnswer } from "@/data/diagnosticQuestions";
import { motion, AnimatePresence } from "framer-motion";
import { getServiceSteps, getServiceTypeConfig } from "@/engines/serviceStepEngine";
import type { ServiceTypeConfig } from "@/engines/serviceStepEngine";

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

// Step labels for the stepper
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

const V2BookingPage = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<V2BookingState>({ ...INITIAL_STATE, diagnosticAnswers: {} });

  const flow = getV2Flow(category || "");

  // Get per-service-type config (drives the entire flow)
  const serviceConfig: ServiceTypeConfig | undefined = useMemo(() => {
    if (!flow || !booking.serviceTypeId) return undefined;
    return getServiceTypeConfig(flow.code, booking.serviceTypeId);
  }, [flow, booking.serviceTypeId]);

  const diagBlock = useMemo(() => {
    if (!flow || !booking.serviceTypeId) return undefined;
    return getDiagnosticBlock(flow.code, booking.serviceTypeId);
  }, [flow, booking.serviceTypeId]);

  // Build step sequence from service-type config flags
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

  // Clamp step index when steps array shrinks (e.g., after mode change)
  useEffect(() => {
    if (step >= steps.length) {
      setStep(steps.length - 1);
    }
  }, [steps.length, step]);

  if (!flow) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Category Not Found</h1>
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

  // Derive the pricing archetype to show — use per-service-type config if available
  const activePricingArchetype: "fixed_price" | "diagnostic_first" | "quote_required" = serviceConfig?.pricing_archetype
    ? (
        serviceConfig.pricing_archetype === "starting_from" ? "diagnostic_first" :
        serviceConfig.pricing_archetype === "inspection_required" ? "quote_required" :
        serviceConfig.pricing_archetype === "diagnostic_first" ? "diagnostic_first" :
        serviceConfig.pricing_archetype === "fixed_price" ? "fixed_price" :
        "diagnostic_first"
      )
    : flow.pricingArchetype;

  // Derive assignment type from service config
  const activeAssignmentType = serviceConfig?.booking_outcome === "inspection_booking"
    ? "site_inspection" as const
    : serviceConfig?.booking_outcome === "remote_session_booking"
    ? "remote_support" as const
    : flow.assignmentType;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Premium progress stepper */}
        {step > 0 && (
          <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b shadow-sm">
            <div className="container max-w-2xl py-3">
              {/* Top row: back + category + step count */}
              <div className="flex items-center gap-3 mb-3">
                <button onClick={goBack} className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{flow.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {STEP_LABELS[currentStepName] || currentStepName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-primary">{step}</span>
                  <span className="text-xs text-muted-foreground">/ {totalSteps - 1}</span>
                </div>
              </div>

              {/* Progress bar with animated fill */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* Step dots — show key milestones */}
              <div className="flex items-center justify-between mt-2 px-0.5">
                {steps.filter((_, i) => i > 0).map((s, i) => {
                  const realIndex = i + 1;
                  const isDone = realIndex < step;
                  const isCurrent = realIndex === step;
                  if (steps.length > 8 && realIndex % 2 !== 0 && !isCurrent && !isDone) return null;
                  return (
                    <div key={s} className="flex flex-col items-center">
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          isDone ? "bg-success" : isCurrent ? "bg-primary scale-125" : "bg-muted-foreground/20"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step content with animated transitions */}
        <div className="container max-w-2xl py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepName}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
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
                    // Reset all downstream answers when service type changes
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
                    // Advance past service_type (always index 1)
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
                <V2PricingExpectation
                  archetype={activePricingArchetype}
                  explanation={flow.pricingExplanation}
                  onContinue={goNext}
                />
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
    </div>
  );
};

export default V2BookingPage;
