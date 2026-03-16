/**
 * Reliability Scenario Simulator — V1
 * What-if simulation console. Advisory-only. No marketplace enforcement.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Beaker, RefreshCw, ArrowUpRight, AlertTriangle, Shield,
  TrendingUp, TrendingDown, Minus, CheckCircle2, Ban, Users, Activity, Zap,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchScenarioSimulatorBaseline, runReliabilityScenarioSimulation,
  type ScenarioBaseline, type ScenarioSimulationResult,
} from "@/services/reliabilityScenarioSimulatorReadModel";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

const ZONES = COLOMBO_ZONES_DATA.map(z => ({ id: z.id, label: z.label }));
const CATEGORIES = ["AC", "plumbing", "electrical", "appliance", "painting", "cleaning"];

interface SimInputs {
  zoneId: string;
  categoryCode: string;
  demandIncreasePercent: number;
  partnerLossCount: number;
  overdueIncrease: number;
  unownedCriticalIncrease: number;
  snapshotAgeOverride: number;
  proposedRolloutPercent: number;
  addedActions: number;
  resolvedActions: number;
}

const PRESETS: { label: string; icon: React.ElementType; apply: Partial<SimInputs> }[] = [
  { label: "Demand Spike", icon: TrendingUp, apply: { demandIncreasePercent: 50, partnerLossCount: 0 } },
  { label: "Partner Dropout", icon: Users, apply: { partnerLossCount: 3, demandIncreasePercent: 0 } },
  { label: "Governance Backlog", icon: Shield, apply: { overdueIncrease: 6, unownedCriticalIncrease: 3 } },
  { label: "Stale Snapshot", icon: AlertTriangle, apply: { snapshotAgeOverride: 36 } },
  { label: "Aggressive Rollout", icon: Zap, apply: { proposedRolloutPercent: 40 } },
  { label: "Shift Overload", icon: Activity, apply: { addedActions: 8, resolvedActions: 0, overdueIncrease: 4 } },
];

export default function ReliabilityScenarioSimulatorPage() {
  const { data: baseline, isLoading } = useQuery({
    queryKey: ["scenario-simulator-baseline"],
    queryFn: fetchScenarioSimulatorBaseline,
    staleTime: 60_000,
  });

  const [inputs, setInputs] = useState<SimInputs>({
    zoneId: "", categoryCode: "", demandIncreasePercent: 0, partnerLossCount: 0,
    overdueIncrease: 0, unownedCriticalIncrease: 0, snapshotAgeOverride: 0,
    proposedRolloutPercent: 10, addedActions: 0, resolvedActions: 0,
  });

  const effectiveInputs = useMemo(() => ({
    ...inputs,
    zoneId: inputs.zoneId || baseline?.defaultZoneId || "col_01",
    categoryCode: inputs.categoryCode || baseline?.defaultCategoryCode || "AC",
    snapshotAgeHoursOverride: inputs.snapshotAgeOverride > 0 ? inputs.snapshotAgeOverride : undefined,
    proposedRolloutPercent: inputs.proposedRolloutPercent || baseline?.currentRolloutPercent || 10,
  }), [inputs, baseline]);

  const result: ScenarioSimulationResult | null = useMemo(() => {
    if (!baseline) return null;
    return runReliabilityScenarioSimulation(baseline, effectiveInputs);
  }, [baseline, effectiveInputs]);

  const update = (patch: Partial<SimInputs>) => setInputs(prev => ({ ...prev, ...patch }));

  const applyPreset = (preset: Partial<SimInputs>) => {
    setInputs(prev => ({
      ...prev, demandIncreasePercent: 0, partnerLossCount: 0, overdueIncrease: 0,
      unownedCriticalIncrease: 0, snapshotAgeOverride: 0, addedActions: 0, resolvedActions: 0,
      ...preset,
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ops/command-center">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-heading">Reliability Scenario Simulator</h1>
              <p className="text-xs text-muted-foreground">What-if analysis · Advisory only · No live changes</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px]">SIMULATION MODE</Badge>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading baseline…</p>}

        {!isLoading && !baseline && (
          <EmptyState icon={Beaker} title="Baseline unavailable" description="Unable to load current system state. Simulation disabled." />
        )}

        {baseline && (
          <>
            {/* Presets */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Scenario Presets</h2>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(p => (
                    <Button key={p.label} variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => applyPreset(p.apply)}>
                      <p.icon className="w-3 h-3" /> {p.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scenario Controls</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-[10px]">Zone</Label>
                    <Select value={inputs.zoneId || baseline.defaultZoneId} onValueChange={v => update({ zoneId: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ZONES.map(z => <SelectItem key={z.id} value={z.id} className="text-xs">{z.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Category</Label>
                    <Select value={inputs.categoryCode || baseline.defaultCategoryCode} onValueChange={v => update({ categoryCode: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <SliderControl label="Demand Increase %" value={inputs.demandIncreasePercent} max={200} onChange={v => update({ demandIncreasePercent: v })} />
                  <SliderControl label="Partner Loss" value={inputs.partnerLossCount} max={20} onChange={v => update({ partnerLossCount: v })} />
                  <SliderControl label="Overdue Increase" value={inputs.overdueIncrease} max={20} onChange={v => update({ overdueIncrease: v })} />
                  <SliderControl label="Unowned Critical +" value={inputs.unownedCriticalIncrease} max={10} onChange={v => update({ unownedCriticalIncrease: v })} />
                  <SliderControl label="Snapshot Age (h)" value={inputs.snapshotAgeOverride} max={72} onChange={v => update({ snapshotAgeOverride: v })} />
                  <SliderControl label="Proposed Rollout %" value={inputs.proposedRolloutPercent} max={50} onChange={v => update({ proposedRolloutPercent: v })} />
                  <SliderControl label="Added Actions" value={inputs.addedActions} max={20} onChange={v => update({ addedActions: v })} />
                  <SliderControl label="Resolved Actions" value={inputs.resolvedActions} max={20} onChange={v => update({ resolvedActions: v })} />
                </div>
              </CardContent>
            </Card>

            {result && (
              <>
                {/* Summary */}
                <Card className="border-primary/20">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Beaker className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-bold">{result.summary.outcomeHeadline}</p>
                        {result.summary.outcomeLines.map((line, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {line}</p>
                        ))}
                        <p className="text-xs font-semibold mt-2">{result.summary.recommendedAction}</p>
                      </div>
                      <Badge className={`shrink-0 text-[9px] border-0 ${result.summary.netRiskDelta >= 40 ? "bg-destructive/10 text-destructive" : result.summary.netRiskDelta >= 20 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                        Risk Δ {result.summary.netRiskDelta > 0 ? "+" : ""}{result.summary.netRiskDelta}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <DeltaCard label="Demand" delta={result.comparison.demandDelta} />
                  <DeltaCard label="Governance" delta={result.comparison.governanceDelta} />
                  <DeltaCard label="Workload" delta={result.comparison.workloadDelta} />
                  <DeltaCard label="Rollout" delta={result.comparison.rolloutDelta} />
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-[9px] text-muted-foreground mb-1">Status</p>
                      <Badge className={`text-[9px] border-0 ${result.comparison.status === "worsened" ? "bg-destructive/10 text-destructive" : result.comparison.status === "improved" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {result.comparison.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Baseline vs Simulated */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current Baseline</h3>
                      <MetricRow label="Demand Pressure" value={`${baseline.currentDemandPressure}%`} />
                      <MetricRow label="Available Partners" value={`${baseline.currentAvailablePartners}`} />
                      <MetricRow label="Governance Risk" value={`${baseline.currentGovernanceRisk}`} />
                      <MetricRow label="Operator Workload" value={`${baseline.operatorWorkloadScore}`} />
                      <MetricRow label="Rollout" value={`${baseline.currentRolloutPercent}%`} />
                      <MetricRow label="Snapshot Age" value={`${Math.round(baseline.snapshotAgeHours)}h`} />
                    </CardContent>
                  </Card>
                  <Card className="border-primary/10">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider">Simulated</h3>
                      <MetricRow label="Demand Pressure" value={`${result.demandShock.newDemandPressure}%`} risk={result.demandShock.riskLevel} />
                      <MetricRow label="Available Partners" value={`${result.partnerLoss.newAvailablePartners}`} risk={result.partnerLoss.riskLevel} />
                      <MetricRow label="Governance Stress" value={`${result.governanceStress.governanceStressScore}`} attention={result.governanceStress.attentionLevel} />
                      <MetricRow label="Operator Workload" value={`${result.operatorShift.projectedWorkloadScore}`} load={result.operatorShift.loadLevel} />
                      <MetricRow label="Rollout" value={`${inputs.proposedRolloutPercent}%`} allowed={result.rolloutExpansion.expansionAllowed} />
                      <MetricRow label="Safe Ceiling" value={`${result.rolloutExpansion.safeCeilingPercent}%`} />
                    </CardContent>
                  </Card>
                </div>

                {/* Rollout Safety */}
                {result.rolloutExpansion.warnings.length > 0 && (
                  <Card className="border-warning/20">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="text-xs font-semibold flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> Rollout Warnings</h3>
                      {result.rolloutExpansion.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-warning">• {w}</p>
                      ))}
                      <p className="text-[10px] text-muted-foreground">Projected governance risk: {result.rolloutExpansion.projectedGovernanceRisk}/100</p>
                    </CardContent>
                  </Card>
                )}

                {/* Governance Blockers */}
                {result.governanceStress.blockers.length > 0 && (
                  <Card className="border-destructive/20">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="text-xs font-semibold flex items-center gap-2"><Ban className="w-3.5 h-3.5 text-destructive" /> Governance Blockers</h3>
                      {result.governanceStress.blockers.map((b, i) => (
                        <p key={i} className="text-xs text-destructive/80">• {b}</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Quick Navigation */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Prescriptive", path: "/ops/prescriptive-reliability" },
                    { label: "Predictive", path: "/ops/predictive-reliability" },
                    { label: "Governance Hub", path: "/ops/reliability-governance-hub" },
                    { label: "Operations Board", path: "/ops/reliability-operations-board" },
                    { label: "Action Center", path: "/ops/reliability-action-center" },
                    { label: "Executive Board", path: "/ops/executive-reliability" },
                    { label: "Scope Planner", path: "/ops/reliability-scope-planner" },
                    { label: "Archive", path: "/ops/reliability-archive" },
                    { label: "Command Center", path: "/ops/command-center" },
                  ].map(l => (
                    <Link key={l.path} to={l.path}>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"><ArrowUpRight className="w-2.5 h-2.5" />{l.label}</Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SliderControl({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px]">{label}: {value}</Label>
      <Slider value={[value]} max={max} step={1} onValueChange={([v]) => onChange(v)} className="mt-1" />
    </div>
  );
}

function DeltaCard({ label, delta }: { label: string; delta: number }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta > 5 ? "text-destructive" : delta < -5 ? "text-success" : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-[9px] text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center justify-center gap-1">
          <Icon className={`w-3 h-3 ${color}`} />
          <span className={`text-sm font-bold ${color}`}>{delta > 0 ? "+" : ""}{delta}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, risk, attention, load, allowed }: {
  label: string; value: string; risk?: string; attention?: string; load?: string; allowed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-semibold">{value}</span>
        {risk && <Badge className={`text-[7px] border-0 px-1 ${risk === "critical" || risk === "high" ? "bg-destructive/10 text-destructive" : risk === "moderate" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{risk}</Badge>}
        {attention && <Badge className={`text-[7px] border-0 px-1 ${attention === "CRITICAL" || attention === "HIGH" ? "bg-destructive/10 text-destructive" : attention === "MODERATE" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{attention}</Badge>}
        {load && <Badge className={`text-[7px] border-0 px-1 ${load === "overloaded" ? "bg-destructive/10 text-destructive" : load === "high" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{load}</Badge>}
        {allowed !== undefined && <Badge className={`text-[7px] border-0 px-1 ${allowed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{allowed ? "OK" : "BLOCKED"}</Badge>}
      </div>
    </div>
  );
}
