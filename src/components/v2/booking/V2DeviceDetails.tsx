import { useMemo } from "react";
import type { V2DeviceQuestion } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Camera, ArrowRight, Smartphone, CheckCircle2 } from "lucide-react";
import { useDevicePassportStore } from "@/store/devicePassportStore";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  questions: V2DeviceQuestion[];
  answers: Record<string, string | boolean>;
  onUpdate: (answers: Record<string, string | boolean>) => void;
  onContinue: () => void;
  photoHint?: string;
  dataDisclaimer?: string;
  dataRiskAccepted?: boolean;
  onDataRiskAccept?: (v: boolean) => void;
  /** Currently selected service type — used to filter conditional questions */
  activeServiceTypeId?: string;
  /** Category code for filtering saved devices */
  categoryCode?: string;
}

/** Check if a question should be visible based on service type and answer conditions */
function isQuestionVisible(
  q: V2DeviceQuestion,
  activeServiceTypeId: string | undefined,
  answers: Record<string, string | boolean>
): boolean {
  // Filter by service type
  if (q.showForServiceTypes && q.showForServiceTypes.length > 0) {
    if (!activeServiceTypeId || !q.showForServiceTypes.includes(activeServiceTypeId)) return false;
  }
  // Filter by dependent answer
  if (q.showIfAnswer) {
    const currentVal = answers[q.showIfAnswer.key];
    const expected = Array.isArray(q.showIfAnswer.value) ? q.showIfAnswer.value : [q.showIfAnswer.value];
    if (!currentVal || !expected.includes(String(currentVal))) return false;
  }
  return true;
}

const V2DeviceDetails = ({
  questions, answers, onUpdate, onContinue,
  photoHint, dataDisclaimer, dataRiskAccepted, onDataRiskAccept,
  activeServiceTypeId,
}: Props) => {
  const setAnswer = (key: string, value: string | boolean) => {
    onUpdate({ ...answers, [key]: value });
  };

  const visibleQuestions = useMemo(() =>
    questions.filter(q => isQuestionVisible(q, activeServiceTypeId, answers)),
    [questions, activeServiceTypeId, answers]
  );

  const requiredFilled = visibleQuestions
    .filter((q) => q.required)
    .every((q) => {
      const val = answers[q.key];
      if (q.type === "toggle") return val !== undefined;
      return val !== undefined && val !== "";
    });

  const canContinue = requiredFilled && (!dataDisclaimer || dataRiskAccepted);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">Device / System Details</h2>
      <p className="text-sm text-muted-foreground">Help us prepare the right tools and parts</p>

      <div className="space-y-4">
        {visibleQuestions.map((q) => (
          <div key={q.key} className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {q.label}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </label>

            {q.type === "select" && q.options && (
              <Select value={(answers[q.key] as string) || ""} onValueChange={(v) => setAnswer(q.key, v)}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={`Select ${q.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {q.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {q.type === "text" && (
              <Input
                placeholder={`Enter ${q.label.toLowerCase()}`}
                value={(answers[q.key] as string) || ""}
                onChange={(e) => setAnswer(q.key, e.target.value)}
                className="bg-card"
              />
            )}

            {q.type === "toggle" && (
              <div className="flex items-center justify-between bg-card rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">{q.label}</span>
                <Switch
                  checked={!!answers[q.key]}
                  onCheckedChange={(v) => setAnswer(q.key, v)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photo upload hint */}
      {photoHint && (
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <Camera className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">Add photos (optional)</p>
            <p className="text-xs text-muted-foreground mt-0.5">{photoHint}</p>
          </div>
        </div>
      )}

      {/* Data risk disclaimer */}
      {dataDisclaimer && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Data Risk Acknowledgement</p>
              <p className="text-xs text-muted-foreground mb-3">{dataDisclaimer}</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dataRiskAccepted || false}
                  onChange={(e) => onDataRiskAccept?.(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">I understand and accept</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onContinue} disabled={!canContinue} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2DeviceDetails;
