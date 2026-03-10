import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, Clock, Sparkles, Loader2, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { streamAI, parsePredictions } from "@/lib/aiStream";
import { track } from "@/lib/analytics";

interface Alert {
  severity: "high" | "medium" | "low";
  message: string;
  action: string;
}

interface PredictionData {
  risk_score: number;
  next_service_due: string;
  alerts: Alert[];
  seasonal_tip: string;
}

interface Props {
  deviceCategory?: string;
  deviceAge?: string;
  lastServiceDate?: string;
  location?: string;
}

const SEVERITY_STYLES = {
  high: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/8", border: "border-destructive/20" },
  medium: { icon: Clock, color: "text-warning", bg: "bg-warning/8", border: "border-warning/20" },
  low: { icon: CheckCircle2, color: "text-success", bg: "bg-success/8", border: "border-success/20" },
};

export default function AIPredictiveMaintenance({ deviceCategory, deviceAge, lastServiceDate, location }: Props) {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadPredictions = () => {
    if (hasLoaded || isLoading) return;
    setIsLoading(true);

    const prompt = `Device: ${deviceCategory || "Air Conditioner"}, Age: ${deviceAge || "2 years"}, Last service: ${lastServiceDate || "6 months ago"}, Location: ${location || "Colombo, Sri Lanka"}. Current month: ${new Date().toLocaleString("en", { month: "long" })}. Provide maintenance predictions.`;

    let text = "";
    streamAI({
      messages: [{ role: "user", content: prompt }],
      mode: "maintenance",
      onDelta: (chunk) => { text += chunk; },
      onDone: () => {
        const parsed = parsePredictions(text);
        if (parsed) setPredictions(parsed);
        setIsLoading(false);
        setHasLoaded(true);
        track("ai_maintenance_loaded", { deviceCategory, riskScore: parsed?.risk_score });
      },
      onError: () => { setIsLoading(false); setHasLoaded(true); },
    });
  };

  if (!hasLoaded && !isLoading) {
    return (
      <button
        onClick={loadPredictions}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card hover:shadow-card-hover transition-smooth group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-spring">
          <Activity className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            Predictive Maintenance
            <Sparkles className="w-3 h-3 text-primary" />
          </p>
          <p className="text-[11px] text-muted-foreground">AI-powered device health analysis</p>
        </div>
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Analyzing device health...
      </div>
    );
  }

  if (!predictions) return null;

  const riskColor = predictions.risk_score > 70 ? "text-destructive" : predictions.risk_score > 40 ? "text-warning" : "text-success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      {/* Header with risk score */}
      <div className="p-4 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-heading font-bold text-foreground text-sm">Device Health</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${riskColor}`}>{predictions.risk_score}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">risk<br/>score</span>
        </div>
      </div>

      {/* Alerts */}
      <div className="p-4 space-y-2.5">
        {predictions.alerts.map((alert, i) => {
          const style = SEVERITY_STYLES[alert.severity];
          const Icon = style.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-start gap-3 p-3 rounded-xl ${style.bg} border ${style.border}`}
            >
              <Icon className={`w-4 h-4 ${style.color} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{alert.action}</p>
              </div>
            </motion.div>
          );
        })}

        {/* Next service */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">Next service due</span>
          <Badge variant="outline" className="text-xs font-semibold">{predictions.next_service_due}</Badge>
        </div>

        {/* Seasonal tip */}
        {predictions.seasonal_tip && (
          <div className="flex items-start gap-2 text-[11px] text-primary/80 bg-primary/5 rounded-lg px-3 py-2">
            <Leaf className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {predictions.seasonal_tip}
          </div>
        )}
      </div>
    </motion.div>
  );
}
