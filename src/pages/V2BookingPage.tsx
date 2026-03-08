import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { getV2Flow } from "@/data/v2CategoryFlows";
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
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { track } from "@/lib/analytics";

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
}

const INITIAL_STATE: V2BookingState = {
  serviceTypeId: "",
  deviceAnswers: {},
  serviceModeId: "",
  packageId: "",
  siteConditions: {},
  technicianFilter: "auto",
  photoUrls: [],
};

const V2BookingPage = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<V2BookingState>({ ...INITIAL_STATE });

  const flow = getV2Flow(category || "");

  const hasIssueStep = flow?.issueSelectors && flow.issueSelectors.length > 0;
  const hasSiteConditions = flow?.siteConditions && flow.siteConditions.length > 0;
  const hasServiceModes = flow?.serviceModes && flow.serviceModes.length > 0;

  // New step order: landing → service_type → issue? → pricing_expectation → service_mode? → device_details → site_conditions? → pricing → assignment → confirmation
  const steps = useMemo(() => {
    if (!flow) return ["landing"];
    const s: string[] = ["landing", "service_type"];
    if (hasIssueStep) s.push("issue");
    s.push("pricing_expectation");
    if (hasServiceModes) s.push("service_mode");
    s.push("device_details");
    if (hasSiteConditions) s.push("site_conditions");
    s.push("pricing", "assignment", "confirmation");
    return s;
  }, [flow, hasIssueStep, hasSiteConditions, hasServiceModes]);

  if (!flow) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Category Not Found</h1>
            <Button variant="outline" onClick={() => navigate("/v2")}>Back to Home</Button>
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
    else navigate("/v2");
  };

  const updateBooking = (updates: Partial<V2BookingState>) => {
    setBooking((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {step > 0 && (
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
            <div className="container max-w-2xl py-3">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={goBack} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <span className="text-sm font-medium text-foreground">{flow.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">Step {step} of {totalSteps - 1}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="container max-w-2xl py-6">
          {currentStepName === "landing" && <V2CategoryLanding flow={flow} onContinue={goNext} />}
          {currentStepName === "service_type" && (
            <V2ServiceSelection
              options={flow.serviceTypes}
              selected={booking.serviceTypeId}
              onSelect={(id) => { updateBooking({ serviceTypeId: id }); goNext(); }}
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
              archetype={flow.pricingArchetype}
              explanation={flow.pricingExplanation}
              onContinue={goNext}
            />
          )}
          {currentStepName === "service_mode" && flow.serviceModes && (
            <V2ServiceModeSelection
              modes={flow.serviceModes}
              selected={booking.serviceModeId}
              onSelect={(id) => { updateBooking({ serviceModeId: id }); goNext(); }}
            />
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
          {currentStepName === "assignment" && (
            <V2AssignmentStep
              categoryCode={flow.code}
              assignmentType={flow.assignmentType}
              serviceModeId={booking.serviceModeId}
              partnerShops={flow.partnerShops}
              onConfirm={goNext}
            />
          )}
          {currentStepName === "confirmation" && <V2BookingConfirmation flow={flow} booking={booking} />}
        </div>
      </main>
      {step === 0 && <Footer />}
    </div>
  );
};

export default V2BookingPage;
