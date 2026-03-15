import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, CheckCircle2, XCircle, Loader2, Beaker, RotateCcw, Trash2, Zap, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface SimStep {
  step: string;
  ok: boolean;
  detail: string;
}

interface SimValidations {
  booking_created: boolean;
  dispatch_triggered: boolean;
  timeline_logged: boolean;
  automation_event_created: boolean;
  notification_created: boolean;
  ops_visibility_confirmed: boolean;
}

interface SimResult {
  scenario: string;
  category: string;
  zone: string;
  booking_id: string | null;
  success: boolean;
  steps: SimStep[];
  events: string[];
  errors: string[];
  run_at?: string;
  validations?: SimValidations;
}

const SCENARIOS = [
  { id: "simulate_normal_booking", label: "Normal Booking Flow", desc: "Full lifecycle: create → dispatch → quote → complete → rate", icon: "🟢", critical: true },
  { id: "simulate_emergency_booking", label: "Emergency Booking", desc: "Emergency dispatch with shortened timeout and priority scoring", icon: "🔴", critical: false },
  { id: "simulate_no_provider_available", label: "No Provider Available", desc: "Booking in zone with no matching technicians", icon: "⚠️", critical: true },
  { id: "simulate_dispatch_timeout", label: "Dispatch Timeout", desc: "Technician doesn't respond within timeout window", icon: "⏱️", critical: true },
  { id: "simulate_partner_cancellation", label: "Partner Cancellation", desc: "Technician cancels after accepting job", icon: "❌", critical: false },
  { id: "simulate_stale_quote", label: "Stale Quote", desc: "Quote pending approval beyond 24h threshold", icon: "📋", critical: true },
  { id: "simulate_low_rating", label: "Low Customer Rating", desc: "Customer rates ≤2 stars, triggering trust recovery", icon: "⭐", critical: true },
  { id: "simulate_payment_failure", label: "Payment Failure", desc: "Payment fails at checkout step", icon: "💳", critical: true },
  { id: "simulate_sla_breach", label: "SLA Breach", desc: "Job exceeds category SLA time threshold", icon: "🕐", critical: false },
  { id: "simulate_out_of_zone_request", label: "Out-of-Zone Request", desc: "Booking attempt from unsupported area (lead capture)", icon: "📍", critical: false },
];

const CRITICAL_SUITE = SCENARIOS.filter(s => s.critical).map(s => s.id);

const VALIDATION_LABELS: Record<string, string> = {
  booking_created: "Booking Created",
  dispatch_triggered: "Dispatch Triggered",
  timeline_logged: "Timeline Logged",
  automation_event_created: "Automation Event",
  notification_created: "Notification Created",
  ops_visibility_confirmed: "Ops Visibility",
};

const PilotSimulationPage = () => {
  const navigate = useNavigate();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SimResult>>({});
  const [cleaning, setCleaning] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  const runScenario = async (scenarioId: string) => {
    setRunning(scenarioId);
    try {
      const { data, error } = await supabase.functions.invoke("pilot-simulation", {
        body: { scenario: scenarioId },
      });
      if (error) {
        setResults(prev => ({
          ...prev,
          [scenarioId]: {
            scenario: scenarioId, category: "?", zone: "?",
            booking_id: null, success: false,
            steps: [{ step: "invoke", ok: false, detail: error.message }],
            events: [], errors: [error.message], run_at: new Date().toISOString(),
          },
        }));
      } else {
        setResults(prev => ({ ...prev, [scenarioId]: data }));
      }
    } catch (e: any) {
      setResults(prev => ({
        ...prev,
        [scenarioId]: {
          scenario: scenarioId, category: "?", zone: "?",
          booking_id: null, success: false,
          steps: [{ step: "error", ok: false, detail: e.message }],
          events: [], errors: [e.message], run_at: new Date().toISOString(),
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const s of SCENARIOS) {
      await runScenario(s.id);
    }
    setRunningAll(false);
  };

  const runCriticalSuite = async () => {
    setRunningAll(true);
    for (const id of CRITICAL_SUITE) {
      await runScenario(id);
    }
    setRunningAll(false);
  };

  const cleanupSimData = async () => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke("pilot-simulation", {
        body: { action: "cleanup" },
      });
      if (error) {
        toast.error("Cleanup failed: " + error.message);
      } else {
        const total = Object.values(data.cleaned as Record<string, number>).reduce((a, b) => a + b, 0);
        toast.success(`Cleaned ${total} simulation records`);
        setResults({});
      }
    } catch (e: any) {
      toast.error("Cleanup error: " + e.message);
    } finally {
      setCleaning(false);
    }
  };

  const passCount = Object.values(results).filter(r => r.success).length;
  const failCount = Object.values(results).filter(r => !r.success).length;
  const totalRun = Object.keys(results).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/launch")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold font-heading flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" />
              Pilot Simulation Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              Run controlled scenarios to validate marketplace readiness
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runCriticalSuite} disabled={!!running || runningAll} size="sm" className="gap-2" variant="default">
            {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Critical Launch Suite
          </Button>
          <Button onClick={runAll} disabled={!!running || runningAll} size="sm" variant="outline" className="gap-2">
            {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run All
          </Button>
          <Button onClick={cleanupSimData} disabled={cleaning || !!running} size="sm" variant="outline" className="gap-2 text-destructive hover:text-destructive">
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clear Simulation Data
          </Button>
        </div>

        {/* Summary */}
        {totalRun > 0 && (
          <div className="flex gap-3 flex-wrap items-center">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
              <CheckCircle2 className="w-3 h-3" /> {passCount} passed
            </Badge>
            {failCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                <XCircle className="w-3 h-3" /> {failCount} failed
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground gap-1">
              {totalRun}/{SCENARIOS.length} run
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setResults({})}>
              <RotateCcw className="w-3 h-3" /> Reset View
            </Button>
          </div>
        )}

        {/* Scenario Cards */}
        <div className="space-y-3">
          {SCENARIOS.map(s => {
            const result = results[s.id];
            const isRunning = running === s.id;

            return (
              <Card key={s.id} className={`transition-all ${result ? (result.success ? "border-emerald-500/30" : "border-red-500/30") : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                          {s.label}
                          {s.critical && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">CRITICAL</Badge>}
                        </CardTitle>
                        <CardDescription className="text-xs">{s.desc}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result && (
                        result.success
                          ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">PASS</Badge>
                          : <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">FAIL</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runScenario(s.id)}
                        disabled={!!running || runningAll}
                        className="h-7 text-xs gap-1"
                      >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Run
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {result && (
                  <CardContent className="pt-0 space-y-3">
                    {/* Meta row */}
                    <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                      <span>Category: <strong>{result.category}</strong></span>
                      <span>Zone: <strong>{result.zone}</strong></span>
                      {result.run_at && <span>Run: <strong>{new Date(result.run_at).toLocaleTimeString()}</strong></span>}
                      {result.booking_id && (
                        <span className="flex items-center gap-1">
                          Booking: <code className="text-[10px]">{result.booking_id.slice(0, 8)}…</code>
                          <button
                            onClick={() => navigate(`/tracker/${result.booking_id}`)}
                            className="text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>

                    {/* Validation Checks */}
                    {result.validations && (
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(result.validations).map(([key, passed]) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className={`text-[10px] gap-0.5 ${
                              passed
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {passed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {VALIDATION_LABELS[key] || key}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Steps */}
                    <ScrollArea className="max-h-40">
                      <div className="space-y-1">
                        {result.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            {step.ok
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                            <span className="font-medium">{step.step}</span>
                            {step.detail && <span className="text-muted-foreground truncate">{step.detail}</span>}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Events */}
                    {result.events.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {result.events.map((e, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-accent/50">{e}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PilotSimulationPage;
