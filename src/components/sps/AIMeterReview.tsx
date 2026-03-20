/**
 * AI Meter Anomaly Review — Shown after meter reading submission
 */
import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, CheckCircle, Camera, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface AnomalyResult {
  score: number;
  type: string;
  explanation: string;
  suggested_action: string;
  customer_message?: string;
}

interface Props {
  currentReading: number;
  previousReading: number;
  daysSinceLast: number;
  includedPages: number;
  historicalAvgDaily?: number;
  hasPhoto: boolean;
}

export default function AIMeterReview({ currentReading, previousReading, daysSinceLast, includedPages, historicalAvgDaily, hasPhoto }: Props) {
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyze();
  }, [currentReading]);

  const analyze = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sps-ai", {
        body: {
          action: "meter_anomaly",
          payload: { currentReading, previousReading, daysSinceLast, includedPages, historicalAvgDaily: historicalAvgDaily ?? 0, hasPhoto },
        },
      });
      if (!error && data?.anomaly) setResult(data.anomaly as AnomalyResult);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <Card className="border-primary/15">
        <CardContent className="p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Reviewing reading…</span>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const isNormal = result.score < 30;
  const isMild = result.score >= 30 && result.score < 60;
  const isSevere = result.score >= 60;

  return (
    <Card className={`border ${
      isNormal ? "border-accent/20 bg-accent/5" :
      isMild ? "border-warning/20 bg-warning/5" :
      "border-destructive/20 bg-destructive/5"
    }`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {isNormal ? (
            <ShieldCheck className="w-4 h-4 text-accent" />
          ) : isMild ? (
            <AlertTriangle className="w-4 h-4 text-warning" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
          <span className="text-xs font-bold text-foreground">
            {isNormal ? "Reading Looks Normal" : isMild ? "Manual Review May Be Needed" : "Submission Needs Review"}
          </span>
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isNormal ? "bg-accent/10 text-accent" :
            isMild ? "bg-warning/10 text-warning" :
            "bg-destructive/10 text-destructive"
          }`}>
            <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />AI Review
          </span>
        </div>

        <div className="text-xs text-foreground leading-relaxed">
          {result.customer_message || result.explanation}
        </div>

        {!isNormal && result.suggested_action === "request_photo" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 rounded-lg p-2">
            <Camera className="w-3.5 h-3.5" />
            Please upload a clear photo of your page counter for faster verification.
          </div>
        )}

        {isNormal && (
          <div className="text-[10px] text-muted-foreground">
            Your reading will be verified by our team shortly.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
