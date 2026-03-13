import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, CheckCircle2, XCircle, AlertTriangle, Loader2, Beaker, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SimStep {
  step: string;
  ok: boolean;
  detail: string;
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
}

const SCENARIOS = [
  { id: "simulate_normal_booking", label: "Normal Booking Flow", desc: "Full lifecycle: create → dispatch → quote → complete → rate", icon: "🟢" },
  { id: "simulate_emergency_booking", label: "Emergency Booking", desc: "Emergency dispatch with shortened timeout and priority scoring", icon: "🔴" },
  { id: "simulate_no_provider_available", label: "No Provider Available", desc: "Booking in zone with no matching technicians", icon: "⚠️" },
  { id: "simulate_dispatch_timeout", label: "Dispatch Timeout", desc: "Technician doesn't respond within timeout window", icon: "⏱️" },
  { id: "simulate_partner_cancellation", label: "Partner Cancellation", desc: "Technician cancels after accepting job", icon: "❌" },
  { id: "simulate_stale_quote", label: "Stale Quote", desc: "Quote pending approval beyond 24h threshold", icon: "📋" },
  { id: "simulate_low_rating", label: "Low Customer Rating", desc: "Customer rates ≤2 stars, triggering trust recovery", icon: "⭐" },
  { id: "simulate_payment_failure", label: "Payment Failure", desc: "Payment fails at checkout step", icon: "💳" },
  { id: "simulate_sla_breach", label: "SLA Breach", desc: "Job exceeds category SLA time threshold", icon: "🕐" },
  { id: "simulate_out_of_zone_request", label: "Out-of-Zone Request", desc: "Booking attempt from unsupported area (lead capture)", icon: "📍" },
];

const PilotSimulationPage = () => {
  const navigate = useNavigate();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SimResult>>({});

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
            booking_id: null, success: false, steps: [{ step: "invoke", ok: false, detail: error.message }],
            events: [], errors: [error.message],
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
          booking_id: null, success: false, steps: [{ step: "error", ok: false, detail: e.message }],
          events: [], errors: [e.message],
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    for (const s of SCENARIOS) {
      await runScenario(s.id);
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
          <Button onClick={runAll} disabled={!!running} size="sm" className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run All
          </Button>
        </div>

        {/* Summary */}
        {totalRun > 0 && (
          <div className="flex gap-3">
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
              <RotateCcw className="w-3 h-3" /> Reset
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
                        <CardTitle className="text-sm font-semibold">{s.label}</CardTitle>
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
                        disabled={!!running}
                        className="h-7 text-xs gap-1"
                      >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Run
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {result && (
                  <CardContent className="pt-0">
                    <div className="text-[11px] text-muted-foreground mb-2 flex gap-3 flex-wrap">
                      <span>Category: <strong>{result.category}</strong></span>
                      <span>Zone: <strong>{result.zone}</strong></span>
                      {result.booking_id && <span>Booking: <code className="text-[10px]">{result.booking_id.slice(0, 8)}…</code></span>}
                    </div>

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

                    {result.events.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
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
