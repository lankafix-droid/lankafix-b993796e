import type { V2SiteCondition } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ClipboardCheck } from "lucide-react";

interface Props {
  conditions: V2SiteCondition[];
  answers: Record<string, string | boolean>;
  onUpdate: (answers: Record<string, string | boolean>) => void;
  onContinue: () => void;
}

const V2SiteConditions = ({ conditions, answers, onUpdate, onContinue }: Props) => {
  const setAnswer = (key: string, value: string | boolean) => {
    onUpdate({ ...answers, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Site Conditions</h2>
          <p className="text-sm text-muted-foreground">Help us prepare for the visit</p>
        </div>
      </div>

      <div className="space-y-3">
        {conditions.map((cond) => (
          <div key={cond.key} className="bg-card rounded-xl border p-4">
            {cond.type === "toggle" && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{cond.label}</span>
                <Switch
                  checked={!!answers[cond.key]}
                  onCheckedChange={(v) => setAnswer(cond.key, v)}
                />
              </div>
            )}
            {cond.type === "select" && cond.options && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{cond.label}</label>
                <Select value={(answers[cond.key] as string) || ""} onValueChange={(v) => setAnswer(cond.key, v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cond.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2SiteConditions;
