import { PART_GRADES, type PartGradeCode } from "@/data/partsPricing";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  selectedGrade: PartGradeCode | "";
  onSelect: (grade: PartGradeCode) => void;
  onContinue: () => void;
  /** Base price to calculate per-grade estimates */
  basePrice?: number;
}

const V2PartGradeSelection = ({ selectedGrade, onSelect, onContinue, basePrice = 10000 }: Props) => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Choose Part Quality</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select your preferred part grade — price and warranty vary
        </p>
      </div>

      <div className="space-y-3">
        {PART_GRADES.map((grade) => {
          const isSelected = selectedGrade === grade.code;
          const estimatedPrice = Math.round(basePrice * grade.priceMultiplier);
          return (
            <button
              key={grade.code}
              onClick={() => onSelect(grade.code)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{grade.label}</h3>
                    {grade.code === "oem" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Popular</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{grade.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 text-success" />
                  <span>{grade.warrantyLabel}</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  From LKR {estimatedPrice.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground text-sm">Starting From Pricing</p>
        <p>Final price depends on your device model, spare part availability, part grade, and repair complexity.</p>
        <p>You will receive an exact quote for approval before any work begins.</p>
      </div>

      <Button onClick={onContinue} disabled={!selectedGrade} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2PartGradeSelection;
