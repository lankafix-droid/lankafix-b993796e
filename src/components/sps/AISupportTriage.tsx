/**
 * AI Support Triage — Shown after support ticket submission
 */
import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, Wrench, Phone, Monitor, Replace, Loader2, CheckCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface TriageResult {
  probable_issue: string;
  confidence: number;
  urgency: "low" | "moderate" | "high" | "business_critical";
  recommended_action: string;
  support_mode: "self_help" | "remote_troubleshooting" | "technician_visit" | "replacement_review";
  self_help_tips?: string[];
  repeat_risk?: boolean;
  replacement_risk?: boolean;
}

interface Props {
  category: string;
  description: string;
  assetType?: string;
  planSupportLevel?: string;
  previousTicketsCount?: number;
  onDismiss?: () => void;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  self_help: <Info className="w-4 h-4 text-accent" />,
  remote_troubleshooting: <Monitor className="w-4 h-4 text-primary" />,
  technician_visit: <Wrench className="w-4 h-4 text-warning" />,
  replacement_review: <Replace className="w-4 h-4 text-destructive" />,
};

const MODE_LABELS: Record<string, string> = {
  self_help: "Self-Help",
  remote_troubleshooting: "Remote Support",
  technician_visit: "Technician Visit",
  replacement_review: "Replacement Review",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  moderate: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  business_critical: "bg-destructive/10 text-destructive",
};

export default function AISupportTriage({ category, description, assetType, planSupportLevel, previousTicketsCount, onDismiss }: Props) {
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (description.length >= 10) fetchTriage();
    else setLoading(false);
  }, []);

  const fetchTriage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sps-ai", {
        body: {
          action: "support_triage",
          payload: { category, description, assetType, planSupportLevel },
        },
      });
      if (!error && data?.triage) setTriage(data.triage as TriageResult);
    } catch { /* fallback: no triage shown */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <Card className="border-primary/15">
        <CardContent className="p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Analyzing your issue…</span>
        </CardContent>
      </Card>
    );
  }

  if (!triage) return null;

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">AI Support Guidance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${URGENCY_STYLES[triage.urgency]}`}>
              {triage.urgency.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="bg-background/60 rounded-lg p-3 space-y-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Likely Issue</div>
          <div className="text-sm font-semibold text-foreground">{triage.probable_issue}</div>

          <div className="flex items-center gap-2 mt-1">
            {MODE_ICONS[triage.support_mode]}
            <span className="text-xs text-foreground font-medium">{MODE_LABELS[triage.support_mode]}</span>
            <span className="text-[10px] text-muted-foreground">recommended</span>
          </div>
        </div>

        <div className="text-xs text-foreground leading-relaxed">
          <span className="font-semibold">Next step:</span> {triage.recommended_action}
        </div>

        {triage.self_help_tips && triage.self_help_tips.length > 0 && (
          <div className="bg-accent/5 rounded-lg p-2.5 space-y-1">
            <div className="text-[10px] font-semibold text-accent uppercase tracking-wide">Try These First</div>
            {triage.self_help_tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                <CheckCircle className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                {tip}
              </div>
            ))}
          </div>
        )}

        {(triage.repeat_risk || triage.replacement_risk) && (
          <div className="flex gap-2">
            {triage.repeat_risk && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                Recurring Issue
              </span>
            )}
            {triage.replacement_risk && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                Replacement May Apply
              </span>
            )}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground">
          AI Guidance • Our support team will review your ticket
        </div>
      </CardContent>
    </Card>
  );
}
