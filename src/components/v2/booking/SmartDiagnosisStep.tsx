import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ArrowRight, HelpCircle, CheckCircle2, XCircle, Stethoscope } from "lucide-react";
import type { DiagAnswer, DiagnosticBlock, DiagnosticQuestion } from "@/data/diagnosticQuestions";
import { getVisibleQuestions } from "@/data/diagnosticQuestions";

interface Props {
  block: DiagnosticBlock;
  answers: Record<string, DiagAnswer>;
  onUpdate: (answers: Record<string, DiagAnswer>) => void;
  onContinue: () => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const ANSWER_OPTIONS: { value: DiagAnswer; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "yes", label: "Yes", icon: CheckCircle2, color: "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300" },
  { value: "no", label: "No", icon: XCircle, color: "bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300" },
  { value: "not_sure", label: "Not Sure", icon: HelpCircle, color: "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300" },
];

const SmartDiagnosisStep = ({ block, answers, onUpdate, onContinue, photos, onPhotosChange }: Props) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  const visibleQuestions = useMemo(() => getVisibleQuestions(block, answers), [block, answers]);
  const totalQuestions = visibleQuestions.length;
  const currentQ = visibleQuestions[currentIdx];
  const progress = totalQuestions > 0 ? ((currentIdx + 1) / totalQuestions) * 100 : 0;

  const allAnswered = visibleQuestions.every(q => answers[q.id] !== undefined);

  const handleAnswer = (questionId: string, answer: DiagAnswer) => {
    const updated = { ...answers, [questionId]: answer };
    onUpdate(updated);

    // Auto-advance to next unanswered question
    setTimeout(() => {
      const nextVisible = getVisibleQuestions(block, updated);
      const nextIdx = nextVisible.findIndex((q, i) => i > currentIdx && !updated[q.id]);
      if (nextIdx >= 0) setCurrentIdx(nextIdx);
      else if (currentIdx < nextVisible.length - 1) setCurrentIdx(currentIdx + 1);
    }, 300);
  };

  const handlePhotoUpload = () => {
    // Simulate photo upload (in production, this connects to file picker)
    const mockUrl = `photo_${Date.now()}.jpg`;
    onPhotosChange([...photos, mockUrl]);
  };

  if (!currentQ) {
    return (
      <div className="space-y-4 text-center py-8">
        <Stethoscope className="w-10 h-10 text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">No diagnostic questions for this service.</p>
        <Button onClick={onContinue} size="lg" className="gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Smart Diagnosis</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Answer a few quick questions to help your technician prepare
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentIdx + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-card border rounded-xl p-5 space-y-4 animate-fade-in">
        <p className="text-base font-medium text-foreground leading-relaxed">
          {currentQ.text}
        </p>

        {/* Tri-state answer buttons */}
        <div className="grid grid-cols-3 gap-3">
          {ANSWER_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = answers[currentQ.id] === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleAnswer(currentQ.id, opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? opt.color
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contextual photo prompt */}
        {currentQ.photoPrompt && (
          <button
            onClick={handlePhotoUpload}
            className="flex items-center gap-2 w-full p-3 rounded-lg bg-primary/5 border border-primary/15 text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>{currentQ.photoPrompt}</span>
          </button>
        )}
      </div>

      {/* Question Navigator */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {visibleQuestions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(idx)}
            className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
              idx === currentIdx
                ? "bg-primary text-primary-foreground"
                : answers[q.id]
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Photo upload area */}
      {block.photoHint && (
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <Camera className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">Photos help our technician prepare</p>
            <p className="text-xs text-muted-foreground mt-0.5">{block.photoHint}</p>
            {photos.length > 0 && (
              <p className="text-xs text-primary mt-1">{photos.length} photo(s) attached</p>
            )}
            <button
              onClick={handlePhotoUpload}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              + Add photo
            </button>
          </div>
        </div>
      )}

      {/* Reassurance */}
      <p className="text-xs text-muted-foreground text-center italic">
        Don't worry if you're unsure. Your LankaFix technician will confirm the issue before any repair begins.
      </p>

      {/* Continue */}
      <Button onClick={onContinue} disabled={!allAnswered} size="lg" className="w-full gap-2">
        {allAnswered ? "View Diagnosis Summary" : "Answer all questions to continue"}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SmartDiagnosisStep;
