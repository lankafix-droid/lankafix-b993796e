import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import mascotImg from "@/assets/lankafix-mascot.jpg";
import DiagnoseStepCategory from "@/components/diagnose/DiagnoseStepCategory";
import DiagnoseStepProblem from "@/components/diagnose/DiagnoseStepProblem";
import DiagnoseStepUrgency from "@/components/diagnose/DiagnoseStepUrgency";
import DiagnoseStepArea from "@/components/diagnose/DiagnoseStepArea";
import DiagnoseResult from "@/components/diagnose/DiagnoseResult";
import DiagnosePhotoUpload from "@/components/diagnose/DiagnosePhotoUpload";
import DiagnoseVoiceInput from "@/components/diagnose/DiagnoseVoiceInput";
import { getDiagnoseRecommendation } from "@/engines/diagnoseEngine";
import { track } from "@/lib/analytics";
import type { CategoryCode } from "@/types/booking";
import type { DiagnoseRecommendation } from "@/engines/diagnoseEngine";

const STEP_TITLES = [
  "What needs help?",
  "What is the problem?",
  "How urgent is this?",
  "Where are you located?",
];

const MASCOT_COPY = [
  "Let me help you find the right service! 🔍",
  "Tell us what's wrong — you can also speak or upload photos",
  "How soon do you need help?",
  "Let's check service availability in your area",
];

const DiagnosePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnoseRecommendation | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");

  const [sessionId] = useState(() => `SES-${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    track("diagnose_start", { sessionId });
    const saved = localStorage.getItem("lankafix_area");
    if (saved) setSelectedArea(saved);
  }, []);

  useEffect(() => {
    track("diagnose_step_view", { step, sessionId });
  }, [step]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step > 0 && step < 4 && !result) {
        track("diagnose_abandoned", {
          sessionId,
          category: selectedCategory,
          problem: selectedProblem,
          step,
        });
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [step, selectedCategory, selectedProblem, result]);

  const totalSteps = 4;
  const showResult = step === 4;
  const progress = showResult ? 100 : ((step + 1) / totalSteps) * 100;

  const handleBack = () => {
    if (step === 0) navigate("/");
    else {
      setStep(step - 1);
      if (step === 4) setResult(null);
    }
  };

  const handleCategorySelect = (code: CategoryCode) => {
    setSelectedCategory(code);
    setSelectedProblem(null);
    track("diagnose_category_select", { category: code, sessionId });
    setTimeout(() => setStep(1), 200);
  };

  const handleProblemSelect = (key: string) => {
    setSelectedProblem(key);
    track("diagnose_problem_select", { problem: key, sessionId });
    setTimeout(() => setStep(2), 200);
  };

  const handleUrgencySelect = (key: string) => {
    setSelectedUrgency(key);
    track("diagnose_urgency_select", { urgency: key, sessionId });
    setTimeout(() => setStep(3), 200);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    localStorage.setItem("lankafix_area", area);
    track("diagnose_area_select", { area, sessionId });
    if (selectedCategory && selectedProblem) {
      const rec = getDiagnoseRecommendation(selectedCategory, selectedProblem, selectedUrgency ?? "flexible", area);
      setResult(rec);
      track("diagnose_result_view", { ...rec, sessionId, photoCount: photos.length, hasVoiceInput: !!voiceTranscript });
      setTimeout(() => setStep(4), 200);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setVoiceTranscript(text);
    track("diagnose_voice_transcript", { text, sessionId });
  };

  const handleRestart = () => {
    setStep(0);
    setSelectedCategory(null);
    setSelectedProblem(null);
    setSelectedUrgency(null);
    setResult(null);
    setPhotos([]);
    setVoiceTranscript("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-lg">
          {/* Back + Progress */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label={step > 0 ? "Go back" : "Go home"}
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "Home" : "Back"}
            </button>
            {!showResult && (
              <span className="text-xs text-muted-foreground ml-auto">
                Step {step + 1} of {totalSteps}
              </span>
            )}
          </div>

          <Progress value={progress} className="h-1.5 mb-6" />

          {/* Mascot banner with real mascot image */}
          {!showResult && (
            <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4">
              <img
                src={mascotImg}
                alt="FixBuddy mascot"
                className={`w-14 h-14 rounded-full object-cover shadow-md border-2 border-card shrink-0 ${step === 1 ? "animate-pulse-soft" : ""}`}
              />
              <div>
                <h1 className="text-lg font-bold text-foreground">{STEP_TITLES[step]}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{MASCOT_COPY[step]}</p>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="animate-fade-in">
            {step === 0 && (
              <DiagnoseStepCategory onSelect={handleCategorySelect} selected={selectedCategory} />
            )}
            {step === 1 && selectedCategory && (
              <div className="space-y-6">
                <DiagnoseStepProblem categoryCode={selectedCategory} onSelect={handleProblemSelect} selected={selectedProblem} />
                <div className="border-t pt-4">
                  <DiagnoseVoiceInput onTranscript={handleVoiceTranscript} />
                </div>
                <div className="border-t pt-4">
                  <DiagnosePhotoUpload photos={photos} onPhotosChange={setPhotos} />
                </div>
              </div>
            )}
            {step === 2 && selectedCategory && (
              <DiagnoseStepUrgency categoryCode={selectedCategory} onSelect={handleUrgencySelect} selected={selectedUrgency} />
            )}
            {step === 3 && (
              <DiagnoseStepArea onSelect={handleAreaSelect} selected={selectedArea} />
            )}
            {showResult && result && selectedArea && (
              <DiagnoseResult result={result} userArea={selectedArea} urgency={selectedUrgency || "flexible"} onRestart={handleRestart} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiagnosePage;
