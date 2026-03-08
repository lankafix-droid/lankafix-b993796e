/**
 * QuoteValidationBanner — Shows pricing intelligence warnings
 * when a technician submits a quote outside market range.
 */
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  type QuoteValidationResult,
  formatPriceRange,
} from "@/engines/pricingIntelligenceEngine";
import { useState } from "react";

interface QuoteValidationBannerProps {
  validation: QuoteValidationResult;
  onExplanationSubmit?: (explanation: string) => void;
  className?: string;
}

const LEVEL_CONFIG = {
  normal: {
    icon: CheckCircle2,
    bg: "bg-success/5 border-success/20",
    iconColor: "text-success",
    badgeVariant: "outline" as const,
    badgeText: "Within Range",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-warning/5 border-warning/20",
    iconColor: "text-warning",
    badgeVariant: "outline" as const,
    badgeText: "Above Market Range",
  },
  requires_explanation: {
    icon: ShieldAlert,
    bg: "bg-destructive/5 border-destructive/20",
    iconColor: "text-destructive",
    badgeVariant: "destructive" as const,
    badgeText: "Explanation Required",
  },
  rejected: {
    icon: XCircle,
    bg: "bg-destructive/10 border-destructive/30",
    iconColor: "text-destructive",
    badgeVariant: "destructive" as const,
    badgeText: "Exceeds Limit",
  },
};

export default function QuoteValidationBanner({
  validation,
  onExplanationSubmit,
  className = "",
}: QuoteValidationBannerProps) {
  const [explanation, setExplanation] = useState("");
  const config = LEVEL_CONFIG[validation.level];
  const Icon = config.icon;

  if (validation.level === "normal") {
    return (
      <div className={`border rounded-lg p-3 flex items-center gap-2 ${config.bg} ${className}`}>
        <Icon className={`w-4 h-4 ${config.iconColor} shrink-0`} />
        <p className="text-xs text-foreground">{validation.message}</p>
        {validation.suggestedRange && (
          <Badge variant={config.badgeVariant} className="ml-auto text-[10px] shrink-0">
            {formatPriceRange(validation.suggestedRange.min, validation.suggestedRange.max)}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${config.bg} ${className}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.badgeVariant} className="text-[10px]">
              {config.badgeText}
            </Badge>
            {validation.percentAbove && (
              <span className="text-[10px] text-muted-foreground">+{validation.percentAbove}% above range</span>
            )}
            {validation.percentBelow && (
              <span className="text-[10px] text-muted-foreground">{validation.percentBelow}% below range</span>
            )}
          </div>
          <p className="text-xs text-foreground">{validation.message}</p>
          {validation.suggestedRange && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Market range: {formatPriceRange(validation.suggestedRange.min, validation.suggestedRange.max)}
            </p>
          )}
        </div>
      </div>

      {(validation.level === "requires_explanation" || validation.level === "rejected") && onExplanationSubmit && (
        <div className="space-y-2">
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain why this quote exceeds the market range (e.g., premium parts, complex repair, imported components)..."
            className="text-xs min-h-[60px]"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExplanationSubmit(explanation)}
            disabled={explanation.trim().length < 10}
            className="text-xs"
          >
            Submit with Explanation
          </Button>
        </div>
      )}
    </div>
  );
}
