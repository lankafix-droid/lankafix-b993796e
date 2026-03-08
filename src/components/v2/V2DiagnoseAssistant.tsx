import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Stethoscope, Smartphone, Snowflake, Monitor, Tv, Camera, Home, Sun, ChevronRight, RotateCcw } from "lucide-react";
import { track } from "@/lib/analytics";

interface DiagnoseStep {
  question: string;
  options: { id: string; label: string; icon?: React.ReactNode }[];
}

const DEVICE_STEP: DiagnoseStep = {
  question: "What device or system has the issue?",
  options: [
    { id: "phone", label: "Mobile Phone", icon: <Smartphone className="w-5 h-5" /> },
    { id: "ac", label: "Air Conditioner", icon: <Snowflake className="w-5 h-5" /> },
    { id: "laptop", label: "Laptop / Computer", icon: <Monitor className="w-5 h-5" /> },
    { id: "tv", label: "TV / Appliance", icon: <Tv className="w-5 h-5" /> },
    { id: "cctv", label: "CCTV System", icon: <Camera className="w-5 h-5" /> },
    { id: "solar", label: "Solar System", icon: <Sun className="w-5 h-5" /> },
    { id: "smart", label: "Smart Home Device", icon: <Home className="w-5 h-5" /> },
  ],
};

const SYMPTOM_MAP: Record<string, DiagnoseStep> = {
  phone: {
    question: "What is happening?",
    options: [
      { id: "screen_broken", label: "Screen is cracked or broken" },
      { id: "not_charging", label: "Won't charge or battery dies fast" },
      { id: "water_damage", label: "Got wet or water damage" },
      { id: "slow_crash", label: "Slow, freezing or crashing" },
      { id: "camera", label: "Camera not working properly" },
      { id: "other", label: "Something else" },
    ],
  },
  ac: {
    question: "What is happening?",
    options: [
      { id: "not_cooling", label: "Not cooling properly" },
      { id: "leaking", label: "Water leaking from unit" },
      { id: "bad_smell", label: "Bad smell when running" },
      { id: "noise", label: "Making unusual noise" },
      { id: "not_turning_on", label: "Won't turn on" },
      { id: "needs_service", label: "Needs regular service" },
    ],
  },
  laptop: {
    question: "What is happening?",
    options: [
      { id: "slow", label: "Running very slow" },
      { id: "no_power", label: "Won't turn on" },
      { id: "virus", label: "Virus or malware suspected" },
      { id: "wifi", label: "WiFi / internet not working" },
      { id: "screen", label: "Screen issue" },
      { id: "other", label: "Something else" },
    ],
  },
  tv: {
    question: "What is happening?",
    options: [
      { id: "no_power", label: "Won't turn on" },
      { id: "no_picture", label: "No picture or display issue" },
      { id: "no_sound", label: "No sound" },
      { id: "washing", label: "Washing machine issue" },
      { id: "fridge", label: "Fridge not cooling" },
      { id: "other", label: "Other appliance problem" },
    ],
  },
  cctv: {
    question: "What do you need?",
    options: [
      { id: "new_install", label: "New CCTV installation" },
      { id: "not_working", label: "Camera not working" },
      { id: "upgrade", label: "Add more cameras" },
      { id: "inspection", label: "Security assessment" },
    ],
  },
  solar: {
    question: "What do you need?",
    options: [
      { id: "new_install", label: "New solar installation" },
      { id: "not_working", label: "System not performing" },
      { id: "maintenance", label: "Panel cleaning / maintenance" },
      { id: "expand", label: "Add more panels" },
    ],
  },
  smart: {
    question: "What do you need?",
    options: [
      { id: "setup", label: "New smart home setup" },
      { id: "not_working", label: "Device not working" },
      { id: "expand", label: "Add more devices" },
      { id: "consultation", label: "Consultation needed" },
    ],
  },
};

const TIMING_STEP: DiagnoseStep = {
  question: "When did the problem start?",
  options: [
    { id: "today", label: "Today — it's urgent" },
    { id: "recent", label: "Last few days" },
    { id: "ongoing", label: "Ongoing for a while" },
    { id: "new_need", label: "It's a new requirement" },
  ],
};

const DAMAGE_STEP: DiagnoseStep = {
  question: "Is there visible damage?",
  options: [
    { id: "yes", label: "Yes, I can see damage" },
    { id: "no", label: "No visible damage" },
    { id: "not_sure", label: "Not sure" },
  ],
};

// Route mapping from diagnosis answers to booking flow
function getRecommendation(device: string, symptom: string): {
  category: string;
  serviceType: string;
  pricingLabel: string;
  description: string;
} {
  const routes: Record<string, Record<string, { category: string; serviceType: string; pricingLabel: string; description: string }>> = {
    phone: {
      screen_broken: { category: "MOBILE", serviceType: "screen", pricingLabel: "Fixed Price — from LKR 5,000", description: "Screen replacement by a verified repair partner" },
      not_charging: { category: "MOBILE", serviceType: "charging", pricingLabel: "Fixed Price — from LKR 1,500", description: "Charging port inspection and repair" },
      water_damage: { category: "MOBILE", serviceType: "water", pricingLabel: "Diagnostic First — LKR 500", description: "Full device diagnostic to assess water damage" },
      slow_crash: { category: "MOBILE", serviceType: "software", pricingLabel: "Fixed Price — from LKR 1,500", description: "Software troubleshooting and optimization" },
      camera: { category: "MOBILE", serviceType: "camera", pricingLabel: "Diagnostic First — LKR 500", description: "Camera module inspection and replacement" },
      other: { category: "MOBILE", serviceType: "not_sure", pricingLabel: "Diagnostic First — LKR 500", description: "Full device diagnosis by our technician" },
    },
    ac: {
      not_cooling: { category: "AC", serviceType: "repair", pricingLabel: "Diagnostic First — LKR 2,500", description: "On-site inspection and cooling diagnosis" },
      leaking: { category: "AC", serviceType: "repair", pricingLabel: "Diagnostic First — LKR 2,500", description: "Leak inspection and repair" },
      bad_smell: { category: "AC", serviceType: "deep_clean", pricingLabel: "Fixed Price — LKR 7,500", description: "Deep chemical wash to eliminate odor" },
      noise: { category: "AC", serviceType: "repair", pricingLabel: "Diagnostic First — LKR 2,500", description: "Noise diagnosis and component check" },
      not_turning_on: { category: "AC", serviceType: "repair", pricingLabel: "Diagnostic First — LKR 2,500", description: "Electrical and compressor diagnosis" },
      needs_service: { category: "AC", serviceType: "service", pricingLabel: "Fixed Price — LKR 4,500", description: "Standard AC service and filter clean" },
    },
    laptop: {
      slow: { category: "IT", serviceType: "software", pricingLabel: "From LKR 2,000", description: "Performance optimization and cleanup" },
      no_power: { category: "IT", serviceType: "laptop", pricingLabel: "Diagnostic First — LKR 3,500", description: "Hardware diagnosis for power issue" },
      virus: { category: "IT", serviceType: "software", pricingLabel: "Fixed Price — LKR 2,000", description: "Virus removal and security setup" },
      wifi: { category: "IT", serviceType: "network", pricingLabel: "From LKR 2,000", description: "WiFi troubleshooting and fix" },
      screen: { category: "IT", serviceType: "laptop", pricingLabel: "Diagnostic First — LKR 3,500", description: "Screen assessment and replacement quote" },
      other: { category: "IT", serviceType: "not_sure", pricingLabel: "Diagnostic First — LKR 3,500", description: "Full IT diagnosis" },
    },
    tv: {
      no_power: { category: "CONSUMER_ELEC", serviceType: "tv", pricingLabel: "Diagnostic First — LKR 2,500", description: "TV power circuit diagnosis" },
      no_picture: { category: "CONSUMER_ELEC", serviceType: "tv", pricingLabel: "Diagnostic First — LKR 2,500", description: "Display panel and board diagnosis" },
      no_sound: { category: "CONSUMER_ELEC", serviceType: "tv", pricingLabel: "Diagnostic First — LKR 2,500", description: "Audio circuit inspection" },
      washing: { category: "CONSUMER_ELEC", serviceType: "washing", pricingLabel: "Diagnostic First — LKR 2,500", description: "Washing machine inspection" },
      fridge: { category: "CONSUMER_ELEC", serviceType: "fridge", pricingLabel: "Diagnostic First — LKR 2,500", description: "Refrigerator cooling diagnosis" },
      other: { category: "CONSUMER_ELEC", serviceType: "other", pricingLabel: "Diagnostic First — LKR 1,500", description: "Appliance inspection and diagnosis" },
    },
    cctv: {
      new_install: { category: "CCTV", serviceType: "new_install", pricingLabel: "Quote After Inspection — LKR 3,000", description: "Site inspection and system design" },
      not_working: { category: "CCTV", serviceType: "repair", pricingLabel: "Diagnostic First — LKR 5,000", description: "CCTV system troubleshooting" },
      upgrade: { category: "CCTV", serviceType: "upgrade", pricingLabel: "Quote After Inspection — LKR 3,000", description: "System upgrade assessment" },
      inspection: { category: "CCTV", serviceType: "inspection", pricingLabel: "Site Visit — LKR 3,000", description: "Professional security assessment" },
    },
    solar: {
      new_install: { category: "SOLAR", serviceType: "new_install", pricingLabel: "Quote After Inspection — LKR 5,000", description: "Roof assessment and system design" },
      not_working: { category: "SOLAR", serviceType: "troubleshoot", pricingLabel: "Diagnostic First — LKR 5,000", description: "Solar system performance diagnosis" },
      maintenance: { category: "SOLAR", serviceType: "maintenance", pricingLabel: "Fixed Price — LKR 8,000", description: "Panel cleaning and system check" },
      expand: { category: "SOLAR", serviceType: "expand", pricingLabel: "Quote After Inspection — LKR 5,000", description: "System expansion assessment" },
    },
    smart: {
      setup: { category: "SMART_HOME_OFFICE", serviceType: "automation", pricingLabel: "Consultation Required", description: "Smart home consultation and design" },
      not_working: { category: "SMART_HOME_OFFICE", serviceType: "automation", pricingLabel: "Diagnostic First", description: "Smart device troubleshooting" },
      expand: { category: "SMART_HOME_OFFICE", serviceType: "automation", pricingLabel: "Consultation Required", description: "System expansion planning" },
      consultation: { category: "SMART_HOME_OFFICE", serviceType: "security", pricingLabel: "Free Consultation", description: "Expert needs assessment" },
    },
  };

  return routes[device]?.[symptom] || {
    category: "MOBILE",
    serviceType: "not_sure",
    pricingLabel: "Diagnostic First",
    description: "Our technician will diagnose your issue",
  };
}

const V2DiagnoseAssistant = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{ device?: string; symptom?: string; timing?: string; damage?: string }>({});

  const steps = [
    DEVICE_STEP,
    answers.device ? SYMPTOM_MAP[answers.device] || SYMPTOM_MAP.phone : SYMPTOM_MAP.phone,
    TIMING_STEP,
    DAMAGE_STEP,
  ];

  const handleSelect = (stepIndex: number, optionId: string) => {
    const keys = ["device", "symptom", "timing", "damage"] as const;
    const key = keys[stepIndex];
    const newAnswers = { ...answers, [key]: optionId };
    setAnswers(newAnswers);

    if (stepIndex < 3) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const recommendation = answers.device && answers.symptom
    ? getRecommendation(answers.device, answers.symptom)
    : null;

  const isComplete = currentStep === 3 && answers.damage;

  const handleBook = () => {
    if (!recommendation) return;
    track("v2_diagnose_book", { ...answers, category: recommendation.category });
    navigate(`/v2/book/${recommendation.category}`);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
  };

  const step = steps[currentStep];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Diagnose My Problem</h2>
          <p className="text-sm text-muted-foreground">Answer 4 quick questions — takes less than 30 seconds</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentStep ? "bg-success" : i === currentStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Show result or current step */}
      {isComplete && recommendation ? (
        <div className="space-y-4">
          <div className="bg-success/5 border border-success/20 rounded-2xl p-5 space-y-3">
            <Badge className="bg-success/10 text-success border-success/20 text-xs">Diagnosis Complete</Badge>
            <h3 className="text-lg font-bold text-foreground">{recommendation.description}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pricing</span>
                <span className="font-medium text-foreground">{recommendation.pricingLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Urgency</span>
                <span className="font-medium text-foreground">
                  {answers.timing === "today" ? "Emergency — same day" : answers.timing === "recent" ? "Priority" : "Standard"}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={handleBook} size="lg" className="w-full gap-2">
            Book This Service <ArrowRight className="w-4 h-4" />
          </Button>

          <button onClick={handleReset} className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Start Over
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">{step.question}</h3>
          <div className="space-y-2">
            {step.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelect(currentStep, opt.id)}
                className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-3"
              >
                {opt.icon && (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {opt.icon}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground flex-1">{opt.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default V2DiagnoseAssistant;
