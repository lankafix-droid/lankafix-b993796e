import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Lightbulb,
  Info,
} from "lucide-react";
import type { CategoryCode } from "@/types/booking";

interface RiskFlag {
  code: string;
  label: string;
  severity: "info" | "warning" | "error";
  message: string;
}

interface AIQuoteResult {
  ai_suggested_labor: { min: number; max: number; typical: number };
  ai_price_band: { min: number; max: number; typical: number } | null;
  approval_probability: number;
  risk_flags: RiskFlag[];
  suggestions: string[];
  suggested_warranty: string;
  estimated_total: number;
  response_time_ms: number;
}

interface AIQuoteAssistantPanelProps {
  bookingId?: string;
  partnerId?: string;
  categoryCode: CategoryCode;
  serviceType?: string;
  serviceKey?: string;
  issueSummary?: string;
  laborAmount: number;
  parts: { description: string; amount: number }[];
  transportAmount?: number;
  addOnAmount?: number;
  warrantyText?: string;
  technicianNote?: string;
  onApplyLaborSuggestion?: (amount: number) => void;
  onApplyWarranty?: (text: string) => void;
}

export default function AIQuoteAssistantPanel({
  bookingId,
  partnerId,
  categoryCode,
  serviceType,
  serviceKey,
  issueSummary,
  laborAmount,
  parts,
  transportAmount = 0,
  addOnAmount = 0,
  warrantyText,
  technicianNote,
  onApplyLaborSuggestion,
  onApplyWarranty,
}: AIQuoteAssistantPanelProps) {
  const [result, setResult] = useState<AIQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-quote-assist", {
        body: {
          booking_id: bookingId,
          partner_id: partnerId,
          category_code: categoryCode,
          service_type: serviceType,
          service_key: serviceKey,
          issue_summary: issueSummary,
          labor_amount: laborAmount,
          parts,
          transport_amount: transportAmount,
          add_on_amount: addOnAmount,
          warranty_text: warrantyText,
          technician_note: technicianNote,
        },
      });

      if (fnErr) throw new Error(fnErr.message);
      setResult(data as AIQuoteResult);
      track("quote_ai_suggestion_generated", {
        category_code: categoryCode,
        service_type: serviceType,
        approval_probability: (data as AIQuoteResult).approval_probability,
        risk_flags: (data as AIQuoteResult).risk_flags.map((f: RiskFlag) => f.code),
      });
    } catch (e: any) {
      setError(e.message || "Failed to get AI suggestion");
    } finally {
      setLoading(false);
    }
  }, [bookingId, partnerId, categoryCode, serviceType, serviceKey, issueSummary, laborAmount, parts, transportAmount, addOnAmount, warrantyText, technicianNote]);

  useEffect(() => {
    track("quote_assistant_viewed", { category_code: categoryCode });
  }, [categoryCode]);

  const approvalColor =
    result && result.approval_probability >= 80
      ? "text-success"
      : result && result.approval_probability >= 60
      ? "text-warning"
      : "text-destructive";

  const approvalBg =
    result && result.approval_probability >= 80
      ? "bg-success/10"
      : result && result.approval_probability >= 60
      ? "bg-warning/10"
      : "bg-destructive/10";

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Quote Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestion}
            disabled={loading}
            className="h-7 text-xs gap-1"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {result ? "Refresh" : "Analyze"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {!result && !loading && !error && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Click "Analyze" to get AI pricing suggestions and risk analysis.
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing quote...
          </div>
        )}

        {result && !loading && (
          <>
            {/* Approval Probability */}
            <div className={`rounded-lg p-3 ${approvalBg}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">Approval Probability</span>
                <span className={`text-lg font-bold ${approvalColor}`}>
                  {result.approval_probability}%
                </span>
              </div>
              <Progress value={result.approval_probability} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {result.approval_probability >= 80
                  ? "High chance of customer approval"
                  : result.approval_probability >= 60
                  ? "Moderate approval chance — consider improvements"
                  : "Low approval probability — review risk flags below"}
              </p>
            </div>

            {/* Price Band */}
            {result.ai_price_band && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  Market Price Band
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    LKR {result.ai_price_band.min.toLocaleString()}
                  </Badge>
                  <span className="text-muted-foreground">—</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    LKR {result.ai_price_band.max.toLocaleString()}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Typical: LKR {result.ai_price_band.typical.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Suggested Labor */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-primary" />
                Suggested Labor Range
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  LKR {result.ai_suggested_labor.min.toLocaleString()} – {result.ai_suggested_labor.max.toLocaleString()}
                </span>
                {onApplyLaborSuggestion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-primary"
                    onClick={() => onApplyLaborSuggestion(result.ai_suggested_labor.typical)}
                  >
                    Apply typical
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Risk Flags */}
            {result.risk_flags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Risk Flags</p>
                {result.risk_flags.map((flag) => (
                  <div
                    key={flag.code}
                    className={`flex items-start gap-2 rounded-lg p-2 text-xs ${
                      flag.severity === "error"
                        ? "bg-destructive/10 text-destructive"
                        : flag.severity === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{flag.label}</span>
                      <p className="text-[10px] mt-0.5 opacity-80">{flag.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.risk_flags.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                No risk flags detected
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                  Suggestions
                </p>
                {result.suggestions.map((s, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground pl-5">
                    • {s}
                  </p>
                ))}
              </div>
            )}

            {/* Suggested Warranty */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span className="text-[10px] text-muted-foreground">{result.suggested_warranty}</span>
              </div>
              {onApplyWarranty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] text-primary"
                  onClick={() => onApplyWarranty(result.suggested_warranty)}
                >
                  Apply
                </Button>
              )}
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 pt-1">
              <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground">
                AI suggestions are advisory only. Final quote is set by the technician. All prices in LKR.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
