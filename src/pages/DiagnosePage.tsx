import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import MascotIcon from "@/components/brand/MascotIcon";
import DiagnoseStepCategory from "@/components/diagnose/DiagnoseStepCategory";
import DiagnoseStepProblem from "@/components/diagnose/DiagnoseStepProblem";
import DiagnoseStepUrgency from "@/components/diagnose/DiagnoseStepUrgency";
import DiagnoseStepArea from "@/components/diagnose/DiagnoseStepArea";
import DiagnoseResult from "@/components/diagnose/DiagnoseResult";
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
  "Choose what needs help",
  "Tell us what's wrong",
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

  // Load persisted area
  useEffect(() => {
    track("diagnose_start", {});
    const saved = localStorage.getItem("lankafix_area");
    if (saved) setSelectedArea(saved);
  }, []);

  useEffect(() => {
    track("diagnose_step_view", { step });
  }, [step]);

  const totalSteps = 4;
  const showResult = step === 4;
  const progress = showResult ? 100 : ((step + 1) / totalSteps) * 100;

  const handleBack = () => {
    if (step === 0) {
      navigate("/");
    } else {
      setStep(step - 1);
      if (step === 4) setResult(null);
    }
  };

  const handleCategorySelect = (code: CategoryCode) => {
    setSelectedCategory(code);
    setSelectedProblem(null); // reset downstream
    track("diagnose_category_select", { category: code });
    setTimeout(() => setStep(1), 200);
  };

  const handleProblemSelect = (key: string) => {
    setSelectedProblem(key);
    track("diagnose_problem_select", { problem: key });
    setTimeout(() => setStep(2), 200);
  };

  const handleUrgencySelect = (key: string) => {
    setSelectedUrgency(key);
    track("diagnose_urgency_select", { urgency: key });
    setTimeout(() => setStep(3), 200);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    localStorage.setItem("lankafix_area", area);
    track("diagnose_area_select", { area });

    // Compute result
    if (selectedCategory && selectedProblem) {
      const rec = getDiagnoseRecommendation(selectedCategory, selectedProblem, selectedUrgency ?? "flexible", area);
      setResult(rec);
      track("diagnose_result_view", { ...rec });
      setTimeout(() => setStep(4), 200);
    }
  };

  const handleRestart = () => {
    setStep(0);
    setSelectedCategory(null);
    setSelectedProblem(null);
    setSelectedUrgency(null);
    setResult(null);
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

          {/* Mascot banner */}
          {!showResult && (
            <div className="flex items-center gap-3 mb-5">
              <MascotIcon state="default" size="md" />
              <div>
                <h1 className="text-xl font-bold text-foreground">{STEP_TITLES[step]}</h1>
                <p className="text-xs text-muted-foreground">{MASCOT_COPY[step]}</p>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="animate-fade-in">
            {step === 0 && (
              <DiagnoseStepCategory onSelect={handleCategorySelect} selected={selectedCategory} />
            )}
            {step === 1 && selectedCategory && (
              <DiagnoseStepProblem categoryCode={selectedCategory} onSelect={handleProblemSelect} selected={selectedProblem} />
            )}
            {step === 2 && selectedCategory && (
              <DiagnoseStepUrgency categoryCode={selectedCategory} onSelect={handleUrgencySelect} selected={selectedUrgency} />
            )}
            {step === 3 && (
              <DiagnoseStepArea onSelect={handleAreaSelect} selected={selectedArea} />
            )}
            {showResult && result && selectedArea && (
              <DiagnoseResult result={result} userArea={selectedArea} onRestart={handleRestart} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiagnosePage;
