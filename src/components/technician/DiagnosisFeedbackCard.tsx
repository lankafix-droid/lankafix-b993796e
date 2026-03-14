/**
 * Diagnosis Feedback Card — technician provides actual issue feedback
 * after service completion to improve diagnosis accuracy.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDiagnosisOutcome } from "@/hooks/useDiagnosisOutcome";
import { CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  predictedIssue?: string;
  actualPrice?: number;
}

const ACCURACY_OPTIONS = [
  { value: "accurate" as const, label: "Accurate", icon: CheckCircle2, color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "partially_accurate" as const, label: "Partially", icon: TrendingUp, color: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "inaccurate" as const, label: "Inaccurate", icon: AlertCircle, color: "border-red-300 bg-red-50 text-red-700" },
];

export default function DiagnosisFeedbackCard({ bookingId, predictedIssue, actualPrice }: Props) {
  const { submitTechnicianFeedback } = useDiagnosisOutcome();
  const [actualIssue, setActualIssue] = useState("");
  const [accuracy, setAccuracy] = useState<"accurate" | "partially_accurate" | "inaccurate" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!accuracy) return;
    await submitTechnicianFeedback(bookingId, actualIssue || predictedIssue || "", accuracy, actualPrice);
    setSubmitted(true);
    toast.success("Feedback submitted — thank you!");
  };

  if (submitted) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardContent className="py-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-sm text-success font-medium">Diagnosis feedback recorded</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Diagnosis Accuracy Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictedIssue && (
          <div className="text-xs">
            <span className="text-muted-foreground">Predicted: </span>
            <span className="font-medium">{predictedIssue}</span>
          </div>
        )}
        <div>
          <Label className="text-xs">Was the diagnosis accurate?</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {ACCURACY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAccuracy(opt.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs ${
                    accuracy === opt.value ? opt.color : "border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label className="text-xs">Actual issue (optional)</Label>
          <Textarea
            value={actualIssue}
            onChange={e => setActualIssue(e.target.value)}
            placeholder="What was the actual problem?"
            className="text-xs mt-1"
            rows={2}
          />
        </div>
        <Button onClick={handleSubmit} disabled={!accuracy} size="sm" className="w-full">
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}
