/**
 * AI Pricing Advisor Panel
 * Technician-facing component showing AI pricing guidance,
 * market context, risk flags, and smart recommendations.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  AlertTriangle,
  Sparkles,
  Package,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
} from "lucide-react";
import {
  getPricingAdvice,
  getComplexityDisplay,
  formatLKR,
  formatTimeEstimate,
  type PricingAdvisorRequest,
  type PricingAdvisorResponse,
} from "@/services/aiPricingAdvisorService";
import { toast } from "sonner";

interface AIPricingAdvisorPanelProps {
  categoryCode: string;
  serviceType?: string;
  serviceKey?: string;
  issueDescription?: string;
  deviceBrand?: string;
  deviceModel?: string;
  isEmergency?: boolean;
  zoneCode?: string;
  /** Optional: validate existing quote */
  proposedLabor?: number;
  proposedParts?: { name: string; amount: number }[];
  proposedTotal?: number;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function AIPricingAdvisorPanel({
  categoryCode,
  serviceType,
  serviceKey,
  issueDescription,
  deviceBrand,
  deviceModel,
  isEmergency = false,
  zoneCode,
  proposedLabor,
  proposedParts,
  proposedTotal,
  compact = false,
}: AIPricingAdvisorPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingAdvisorResponse | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [error, setError] = useState<string | null>(null);

  const handleGetAdvice = async () => {
    setLoading(true);
    setError(null);

    const request: PricingAdvisorRequest = {
      category_code: categoryCode,
      service_type: serviceType,
      service_key: serviceKey,
      issue_description: issueDescription,
      device_brand: deviceBrand,
      device_model: deviceModel,
      is_emergency: isEmergency,
      zone_code: zoneCode,
      proposed_labor: proposedLabor,
      proposed_parts: proposedParts,
      proposed_total: proposedTotal,
    };

    const { data, error: err } = await getPricingAdvice(request);

    if (err) {
      setError(err);
      toast.error("Failed to get pricing advice", { description: err });
    } else if (data) {
      setResult(data);
    }

    setLoading(false);
  };

  if (!result) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <div className="rounded-full bg-primary/10 p-3">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-sm">AI Pricing Advisor</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Get smart pricing guidance based on market data and job complexity
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button
            size="sm"
            onClick={handleGetAdvice}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Analyzing..." : "Get AI Pricing Advice"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Advisory only · Final pricing set by technician
          </p>
        </CardContent>
      </Card>
    );
  }

  const advice = result.ai_advice;
  const complexityDisplay = advice
    ? getComplexityDisplay(advice.complexity_level)
    : null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Pricing Advisor
          </CardTitle>
          <div className="flex items-center gap-2">
            {advice && complexityDisplay && (
              <Badge variant="outline" className={complexityDisplay.color}>
                {complexityDisplay.icon} {complexityDisplay.label}
              </Badge>
            )}
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 w-6 p-0"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Market Band */}
          {result.market_band && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Sri Lankan Market Range</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatLKR(result.market_band.min)}
                </span>
                <div className="flex-1 mx-3">
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-primary/30 rounded-full"
                      style={{ left: "0%", width: "100%" }}
                    />
                    {/* Typical marker */}
                    <div
                      className="absolute top-0 h-full w-1 bg-primary rounded-full"
                      style={{
                        left: `${((result.market_band.typical - result.market_band.min) / (result.market_band.max - result.market_band.min)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatLKR(result.market_band.max)}
                </span>
              </div>
              <div className="text-center mt-1">
                <span className="text-xs text-primary font-medium">
                  Typical: {formatLKR(result.market_band.typical)}
                </span>
              </div>
            </div>
          )}

          {advice && (
            <>
              {/* Complexity reasoning */}
              <div className="text-xs text-muted-foreground">
                {advice.complexity_reasoning}
              </div>

              {/* Recommended Range */}
              <div className="rounded-lg border p-3">
                <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI Recommended Range
                </h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Low</div>
                    <div className="text-sm font-semibold">
                      {formatLKR(advice.recommended_price_range.min_lkr)}
                    </div>
                  </div>
                  <div className="bg-primary/5 rounded-md py-1">
                    <div className="text-xs text-primary font-medium">Sweet Spot</div>
                    <div className="text-sm font-bold text-primary">
                      {formatLKR(advice.recommended_price_range.sweet_spot_lkr)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">High</div>
                    <div className="text-sm font-semibold">
                      {formatLKR(advice.recommended_price_range.max_lkr)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price factors */}
              <div className="grid grid-cols-2 gap-3">
                {advice.price_factors_up.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-1 flex items-center gap-1 text-orange-600">
                      <TrendingUp className="h-3 w-3" /> Price Up
                    </h5>
                    <ul className="space-y-0.5">
                      {advice.price_factors_up.map((f, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {advice.price_factors_down.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-1 flex items-center gap-1 text-emerald-600">
                      <TrendingDown className="h-3 w-3" /> Price Down
                    </h5>
                    <ul className="space-y-0.5">
                      {advice.price_factors_down.map((f, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Separator />

              {/* Parts + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">Parts</span>
                  </div>
                  {advice.parts_assessment.likely_needed ? (
                    <>
                      <div className="text-[11px] text-muted-foreground">
                        {advice.parts_assessment.estimated_parts_cost_min != null &&
                        advice.parts_assessment.estimated_parts_cost_max != null
                          ? `${formatLKR(advice.parts_assessment.estimated_parts_cost_min)} – ${formatLKR(advice.parts_assessment.estimated_parts_cost_max)}`
                          : "Cost varies"}
                      </div>
                      {advice.parts_assessment.common_parts && advice.parts_assessment.common_parts.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {advice.parts_assessment.common_parts.join(", ")}
                        </div>
                      )}
                      {advice.parts_assessment.parts_availability && (
                        <Badge variant="outline" className="mt-1 text-[10px] h-5">
                          {advice.parts_assessment.parts_availability === "readily_available"
                            ? "✅ Available"
                            : advice.parts_assessment.parts_availability === "may_need_ordering"
                            ? "📦 May need ordering"
                            : "🔍 Specialist sourcing"}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Labor-only job likely
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">Time</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatTimeEstimate(advice.time_estimate)}
                  </div>
                  {advice.time_estimate.includes_diagnostics && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Includes diagnostics
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Warnings */}
              {advice.risk_warnings.length > 0 && (
                <div className="space-y-1.5">
                  {advice.risk_warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-md p-2 text-[11px] ${
                        w.severity === "critical"
                          ? "bg-destructive/10 text-destructive"
                          : w.severity === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {w.severity === "critical" ? (
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      ) : (
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      )}
                      {w.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Quote Validation */}
              {advice.quote_validation && (
                <div
                  className={`rounded-lg p-3 ${
                    advice.quote_validation.is_fair
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-amber-50 border border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Quote Assessment:{" "}
                      {advice.quote_validation.is_fair ? "Fair Price" : "Needs Review"}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5 ml-auto">
                      {advice.quote_validation.approval_likelihood === "very_likely"
                        ? "🟢 Very Likely"
                        : advice.quote_validation.approval_likelihood === "likely"
                        ? "🟡 Likely"
                        : advice.quote_validation.approval_likelihood === "uncertain"
                        ? "🟠 Uncertain"
                        : "🔴 Unlikely"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {advice.quote_validation.feedback}
                  </p>
                </div>
              )}

              {/* Customer Explanation */}
              <div className="rounded-lg bg-muted/30 p-3">
                <h5 className="text-xs font-medium mb-1">
                  📝 Suggested Customer Explanation
                </h5>
                <p className="text-[11px] text-muted-foreground italic">
                  "{advice.customer_explanation}"
                </p>
              </div>

              {/* Upsell Opportunities */}
              {advice.upsell_opportunities && advice.upsell_opportunities.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Cross-sell Opportunities
                  </h5>
                  <div className="space-y-1">
                    {advice.upsell_opportunities.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5"
                      >
                        <div>
                          <div className="text-[11px] font-medium">{u.service}</div>
                          <div className="text-[10px] text-muted-foreground">{u.reason}</div>
                        </div>
                        {u.estimated_cost_lkr && (
                          <span className="text-[11px] font-medium text-primary">
                            {formatLKR(u.estimated_cost_lkr)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warranty Template */}
              <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2">
                <strong>Warranty template:</strong> {result.warranty_template}
              </div>
            </>
          )}

          {/* Refresh button + disclaimer */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetAdvice}
              disabled={loading}
              className="text-xs h-7"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Refresh Analysis
            </Button>
            <span className="text-[9px] text-muted-foreground">
              Advisory only · {result.response_time_ms}ms
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
