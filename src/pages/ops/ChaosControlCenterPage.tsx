/**
 * LankaFix Chaos Control Center — Controlled Reliability Simulation
 * Memory-only chaos scenarios. Never mutates production DB.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Zap, Shield, AlertTriangle, Activity,
  Clock, CheckCircle2, XCircle, FlaskConical, Ban,
  TrendingDown, CreditCard, Radio, Users, BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import {
  computeHealingStats, computeHealingConfidence, computeSystemStatus,
  checkCircuitBreaker, shouldAutoModeHalt,
  type HealingEventData, type HealingStats,
} from "@/engines/selfHealingEngine";
import {
  type ChaosScenario, type ChaosState,
  ALL_CHAOS_SCENARIOS, CHAOS_SCENARIO_LABELS, CHAOS_SCENARIO_DESCRIPTIONS,
  createChaosState, isChaosExpired, getScenarioInflation, inflateStats,
  getRemainingSeconds,
} from "@/engines/chaosEngine";
import ReliabilityTimeline from "@/components/ops/ReliabilityTimeline";

// ── SLO Targets ──
const SLO = {
  successRate: { target: 95, watchMin: 85 },
  escalationRate: { target: 10, watchMax: 20 },
  circuitBreaksPerDay: { target: 1, watchMax: 3 },
};

function sloColor(value: number, target: number, isLower: boolean): string {
  if (isLower ? value <= target : value >= target) return "text-green-600";
  const watch = isLower ? target * 2 : target * 0.85;
  if (isLower ? value <= watch : value >= watch) return "text-yellow-600";
  return "text-destructive";
}

function sloBadge(value: number, target: number, isLower: boolean): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (isLower ? value <= target : value >= target) return { label: "Within SLO", variant: "default" };
  const watch = isLower ? target * 2 : target * 0.85;
  if (isLower ? value <= watch : value >= watch) return { label: "Watch", variant: "secondary" };
  return { label: "Breach", variant: "destructive" };
}

export default function ChaosControlCenterPage() {
  const navigate = useNavigate();
  const [chaosStates, setChaosStates] = useState<ChaosState[]>([]);
  const [tick, setTick] = useState(0);

  // Auto-expire timer
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Clean expired
  useEffect(() => {
    setChaosStates(prev => prev.filter(s => !isChaosExpired(s)));
  }, [tick]);

  const activeScenarios = chaosStates.filter(s => s.active && !isChaosExpired(s));
  const isSimulationActive = activeScenarios.length > 0;

  // ── Fetch real healing events ──
  const { data: rawEvents = [] } = useQuery({
    queryKey: ["chaos-healing-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("self_healing_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data || []) as unknown as HealingEventData[];
    },
    refetchInterval: 30000,
  });

  // ── Compute real stats ──
  const realStats = useMemo(() => computeHealingStats(rawEvents), [rawEvents]);
  const realCircuitBroken = useMemo(() => checkCircuitBreaker(rawEvents), [rawEvents]);

  // ── Apply chaos inflation (memory only) ──
  const displayStats = useMemo(() => {
    if (!isSimulationActive) return realStats;
    let inflated = { ...realStats };
    for (const s of activeScenarios) {
      inflated = inflateStats(inflated, getScenarioInflation(s.scenario));
    }
    return inflated;
  }, [realStats, activeScenarios, isSimulationActive]);

  const displayCircuitBroken = useMemo(() => {
    if (!isSimulationActive) return realCircuitBroken;
    return realCircuitBroken || activeScenarios.some(s => getScenarioInflation(s.scenario).forceCircuitBreaker);
  }, [realCircuitBroken, activeScenarios, isSimulationActive]);

  const displayStatus = computeSystemStatus(displayStats, displayCircuitBroken);
  const displayConfidence = computeHealingConfidence(displayStats, displayStatus);
  const autoModeHalted = shouldAutoModeHalt(displayStats.escalationRate, displayCircuitBroken);

  // ── Scenario toggles ──
  const toggleScenario = useCallback((scenario: ChaosScenario) => {
    setChaosStates(prev => {
      const existing = prev.find(s => s.scenario === scenario && !isChaosExpired(s));
      if (existing) return prev.filter(s => s !== existing);
      return [...prev, createChaosState(scenario)];
    });
  }, []);

  const resetAll = useCallback(() => setChaosStates([]), []);

  const isActive = (scenario: ChaosScenario) =>
    activeScenarios.some(s => s.scenario === scenario);

  // ── SLO metrics ──
  const circuitBreaks24h = rawEvents.filter(e => {
    const age = Date.now() - new Date(e.created_at).getTime();
    return age < 24 * 60 * 60 * 1000 && e.status === "escalated";
  }).length >= 5 ? 1 : 0;

  const scenarioIcons: Record<ChaosScenario, React.ReactNode> = {
    payment_gateway_failure: <CreditCard className="h-4 w-4" />,
    dispatch_blackout: <Radio className="h-4 w-4" />,
    partner_dropout: <Users className="h-4 w-4" />,
    booking_surge: <TrendingDown className="h-4 w-4" />,
    escalation_storm: <Zap className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Simulation Banner */}
      {isSimulationActive && (
        <div className="bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <FlaskConical className="h-4 w-4" />
          SIMULATION MODE ACTIVE — Metrics Inflated
          <Button variant="ghost" size="sm" className="ml-2 h-6 text-xs" onClick={resetAll}>
            Reset All
          </Button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/command-center")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Chaos Control Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Controlled reliability simulation — memory only, no DB mutations
            </p>
          </div>
        </div>

        {/* System Status Card */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {isSimulationActive ? "Simulated System Status" : "Live System Status"}
              </h3>
              <Badge variant={
                displayStatus === "healthy" ? "default" :
                displayStatus === "active_recovery" ? "secondary" :
                "destructive"
              }>
                {displayStatus.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{displayConfidence}%</p>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${sloColor(displayStats.successRate, SLO.successRate.target, false)}`}>
                  {displayStats.successRate}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${sloColor(displayStats.escalationRate, SLO.escalationRate.target, true)}`}>
                  {displayStats.escalationRate}%
                </p>
                <p className="text-xs text-muted-foreground">Escalation Rate</p>
              </div>
            </div>
            {autoModeHalted && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                <Ban className="h-3.5 w-3.5" /> Auto-mode halted
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chaos Scenarios */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" /> Chaos Scenarios
            </h3>
            <div className="space-y-2">
              {ALL_CHAOS_SCENARIOS.map(scenario => {
                const active = isActive(scenario);
                const state = activeScenarios.find(s => s.scenario === scenario);
                return (
                  <div key={scenario} className={`flex items-center justify-between p-3 rounded-lg border ${active ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      {scenarioIcons[scenario]}
                      <div>
                        <p className="text-sm font-medium">{CHAOS_SCENARIO_LABELS[scenario]}</p>
                        <p className="text-xs text-muted-foreground">{CHAOS_SCENARIO_DESCRIPTIONS[scenario]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {active && state && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {Math.floor(getRemainingSeconds(state) / 60)}:{String(getRemainingSeconds(state) % 60).padStart(2, "0")}
                        </span>
                      )}
                      <Switch checked={active} onCheckedChange={() => toggleScenario(scenario)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* SLO Dashboard */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Reliability SLO Dashboard
            </h3>
            <div className="space-y-3">
              {/* Success Rate SLO */}
              {(() => {
                const slo = sloBadge(displayStats.successRate, SLO.successRate.target, false);
                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Healing Success Rate
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{displayStats.successRate}%</span>
                        <Badge variant={slo.variant} className="text-[10px]">{slo.label}</Badge>
                      </div>
                    </div>
                    <Progress value={displayStats.successRate} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">Target: ≥ {SLO.successRate.target}%</p>
                  </div>
                );
              })()}

              {/* Escalation Rate SLO */}
              {(() => {
                const slo = sloBadge(displayStats.escalationRate, SLO.escalationRate.target, true);
                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Escalation Rate
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{displayStats.escalationRate}%</span>
                        <Badge variant={slo.variant} className="text-[10px]">{slo.label}</Badge>
                      </div>
                    </div>
                    <Progress value={Math.min(100, displayStats.escalationRate * 2)} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">Target: ≤ {SLO.escalationRate.target}%</p>
                  </div>
                );
              })()}

              {/* Circuit Breaks SLO */}
              {(() => {
                const slo = sloBadge(circuitBreaks24h, SLO.circuitBreaksPerDay.target, true);
                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" /> Circuit Breaks (24h)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{displayCircuitBroken ? circuitBreaks24h + 1 : circuitBreaks24h}</span>
                        <Badge variant={slo.variant} className="text-[10px]">{slo.label}</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Target: ≤ {SLO.circuitBreaksPerDay.target} per 24h</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Reliability Timeline */}
        <ReliabilityTimeline events={rawEvents} />
      </div>

      <Footer />
    </div>
  );
}
