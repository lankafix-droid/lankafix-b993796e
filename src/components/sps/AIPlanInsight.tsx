/**
 * AI Plan Insight — Advisory panel shown after plan recommendation
 */
import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertTriangle, ArrowUpRight, Shield, Phone, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { SPSPlan, FindMyPlanInputs, FitConfidence } from "@/types/sps";

interface Props {
  plan: SPSPlan;
  inputs: FindMyPlanInputs;
  confidence: FitConfidence;
  reason: string;
}

interface PlanInsight {
  why_fits: string;
  best_for_usage: string;
  watchouts: string;
  upgrade_hint?: string;
  review_reason?: string;
  savings_insight: string;
  confidence_label: "strong" | "moderate" | "low";
}

export default function AIPlanInsight({ plan, inputs, confidence, reason }: Props) {
  const [insight, setInsight] = useState<PlanInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchInsight();
  }, [plan.id]);

  const fetchInsight = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("sps-ai", {
        body: { action: "plan_insight", payload: { plan, inputs, confidence, reason } },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      setInsight(data.insight as PlanInsight);
    } catch {
      setError(true);
      // Fallback insight
      setInsight({
        why_fits: `This plan suits your ${inputs.monthlyPages} pages/month need with ${plan.included_pages} pages included.`,
        best_for_usage: `Designed for ${plan.best_for}.`,
        watchouts: inputs.monthlyPages > plan.included_pages * 0.8
          ? "Your usage is close to the limit — watch for overage charges."
          : "Stay within included pages to keep costs predictable.",
        savings_insight: `Avoids a large upfront purchase. Monthly subscription keeps cash flow flexible.`,
        confidence_label: confidence === "recommended" ? "strong" : confidence === "good_fit" ? "moderate" : "low",
        upgrade_hint: inputs.monthlyPages > plan.included_pages * 0.9 ? "Consider the next plan up if pages grow." : "",
        review_reason: confidence === "review_required" ? "A LankaFix advisor should review your specific needs." : "",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">Generating AI Plan Insight…</div>
        </CardContent>
      </Card>
    );
  }

  if (!insight) return null;

  const confBadge = {
    strong: { label: "Strong Fit", cls: "bg-accent/10 text-accent" },
    moderate: { label: "Good Fit", cls: "bg-primary/10 text-primary" },
    low: { label: "Needs Review", cls: "bg-warning/10 text-warning" },
  }[insight.confidence_label];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">AI Plan Insight</div>
              <div className="text-[10px] text-muted-foreground">Advisory only • Not a commitment</div>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confBadge.cls}`}>
            {confBadge.label}
          </span>
        </div>

        {/* Why it fits */}
        <div className="space-y-2">
          <InsightRow icon={<TrendingUp className="w-3.5 h-3.5 text-accent" />} label="Why this fits you">
            {insight.why_fits}
          </InsightRow>

          <InsightRow icon={<Shield className="w-3.5 h-3.5 text-primary" />} label="Best for your usage">
            {insight.best_for_usage}
          </InsightRow>

          {insight.watchouts && (
            <InsightRow icon={<AlertTriangle className="w-3.5 h-3.5 text-warning" />} label="Things to note">
              {insight.watchouts}
            </InsightRow>
          )}

          {insight.upgrade_hint && (
            <InsightRow icon={<ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />} label="Upgrade consideration">
              {insight.upgrade_hint}
            </InsightRow>
          )}

          <InsightRow icon={<TrendingUp className="w-3.5 h-3.5 text-accent" />} label="Savings insight">
            {insight.savings_insight}
          </InsightRow>

          {insight.review_reason && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-2.5">
              <div className="text-[11px] font-semibold text-warning mb-0.5">LankaFix Review Recommended</div>
              <div className="text-[11px] text-muted-foreground">{insight.review_reason}</div>
            </div>
          )}
        </div>

        {/* CTA for low confidence */}
        {insight.confidence_label === "low" && (
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Talk to a LankaFix Advisor
          </Button>
        )}

        {error && (
          <div className="text-[10px] text-muted-foreground text-center">
            AI insight generated from plan data (offline mode)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wide">{label}</div>
        <div className="text-xs text-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
