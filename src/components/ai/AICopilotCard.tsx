import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles } from "lucide-react";
import AIConfidenceBadge from "./AIConfidenceBadge";

interface AICopilotCardProps {
  title: string;
  recommendation: string;
  confidence: number;
  module: string;
  reasons?: string[];
  actions?: React.ReactNode;
  className?: string;
}

const AICopilotCard = ({
  title,
  recommendation,
  confidence,
  module,
  reasons = [],
  actions,
  className = "",
}: AICopilotCardProps) => (
  <Card className={`relative overflow-hidden ${className}`}>
    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] pointer-events-none" />
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        <AIConfidenceBadge score={confidence} />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <Badge key={r} variant="secondary" className="text-[10px] font-normal">
              {r}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>AI Advisory · {module}</span>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </CardContent>
  </Card>
);

export default AICopilotCard;
