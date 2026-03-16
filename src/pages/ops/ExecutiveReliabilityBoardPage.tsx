/**
 * Executive Reliability Board — Board-grade reliability posture overview.
 * Display-only. Does not affect marketplace behavior or launch verdicts.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Shield, TrendingUp, Activity, DollarSign, MapPin,
  BarChart3, Target, AlertTriangle, FileText,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import ZoneReliabilityHeatmap from "@/components/ops/ZoneReliabilityHeatmap";
import { computeReliabilityScore, computeVerdict } from "@/engines/reliabilityGovernanceEngine";
import { computeSLATier, computeSLACompliance, computeBreachRisk, computeRecommendedAction } from "@/engines/reliabilitySLAEngine";
import { computeIncidentImpact } from "@/engines/incidentImpactModel";
import { computeCostOfFailure } from "@/engines/reliabilityCostEngine";
import { computeRiskForecast } from "@/engines/predictiveReliabilityEngine";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import type { ReliabilityVerdict } from "@/engines/reliabilityGovernanceEngine";

interface Snapshot {
  id: string;
  created_at: string;
  reliability_score: number;
  success_rate: number;
  escalation_rate: number;
  circuit_break_count: number;
  confidence_score: number;
  executive_verdict: string;
  risk_probability: number;
  zone_summary_json: any;
  metadata: any;
}

const PILOT_ZONE_IDS = [
  "col_01","col_02","col_03","col_04","col_05","col_06","col_07",
  "col_08","col_09","col_10","col_11","col_12","col_13","col_14","col_15",
  "rajagiriya","battaramulla","nawala","nugegoda","dehiwala","mt_lavinia",
  "thalawathugoda","negombo","wattala","moratuwa",
];

const ZONE_LABEL_MAP: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL_MAP[z.id] = z.label; });

const VERDICT_COLORS: Record<string, string> = {
  STABLE: "text-success", GUARDED: "text-warning", RISK: "text-destructive", CRITICAL: "text-destructive",
};

// Advisory pilot assumptions
const PILOT_DAILY_VOLUME = 15;
const PILOT_AVG_VALUE = 5000;
const PILOT_CONFIDENCE = 80;
const PILOT_CB_24H = 0;

function useSnapshots() {
  return useQuery({
    queryKey: ["exec-reliability-snapshots"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("reliability_snapshots")
        .select("*")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(30);
      return (data as Snapshot[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useLiveMetrics() {
  return useQuery({
    queryKey: ["exec-reliability-live"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await (supabase as any)
        .from("self_healing_events")
        .select("status, created_at")
        .gte("created_at", cutoff)
        .limit(200);
      const evts = events || [];
      const total = evts.length;
      const success = evts.filter((e: any) => e.status === "success").length;
      const escalated = evts.filter((e: any) => e.status === "escalated").length;
      const successRate = total > 0 ? Math.round((success / total) * 100) : 100;
      const escalationRate = total > 0 ? Math.round((escalated / total) * 100) : 0;

      const healingStats = {
        successRate, escalationRate, totalEvents: total,
        lastEventAt: new Date().toISOString(),
        successCount: success, failedCount: total - success - escalated,
        escalatedCount: escalated, totalActions: total,
      };

      const score = computeReliabilityScore(healingStats, PILOT_CB_24H, PILOT_CONFIDENCE, false);
      const verdict = computeVerdict(score);
      const forecast = computeRiskForecast([], healingStats, PILOT_CONFIDENCE);
      const slaTier = computeSLATier(score);
      const slaCompliance = computeSLACompliance(successRate, escalationRate);
      const breachRisk = computeBreachRisk(score, PILOT_CB_24H, PILOT_CONFIDENCE);
      const slaAction = computeRecommendedAction(slaTier, breachRisk);
      const impact = computeIncidentImpact(escalationRate, 0, breachRisk, 30);
      const cost = computeCostOfFailure(PILOT_DAILY_VOLUME, PILOT_AVG_VALUE, escalationRate, forecast.projectedEscalationRate);

      return {
        score, verdict, riskProbability: forecast.riskProbability,
        slaTier: slaTier.toUpperCase(), slaCompliance, breachRisk, slaAction,
        impactLevel: impact.impactLevel.toUpperCase(),
        operationalImpact: impact.operationalImpactScore,
        reputationalRisk: impact.reputationalRiskScore,
        compositeImpact: impact.compositeImpactScore,
        dailyRevenueAtRisk: cost.estimatedDailyRevenueAtRisk,
        projected30Day: cost.projected30DayExposure,
        costSeverity: cost.costSeverityLevel.toUpperCase(),
      };
    },
    staleTime: 60_000,
  });
}

export default function ExecutiveReliabilityBoardPage() {
  const navigate = useNavigate();
  const { data: snapshots = [], isLoading: loadingSnaps } = useSnapshots();
  const { data: live, isLoading: loadingLive } = useLiveMetrics();

  const isLoading = loadingSnaps || loadingLive;
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const slaColor = (t: string) => ({ PLATINUM: "text-primary", GOLD: "text-warning", STANDARD: "text-muted-foreground", "AT_RISK": "text-destructive", "AT RISK": "text-destructive" }[t] || "text-foreground");
  const impactColor = (l: string) => ({ LOW: "text-success", MODERATE: "text-warning", HIGH: "text-destructive", CRITICAL: "text-destructive" }[l] || "text-foreground");
  const costColor = (s: string) => ({ MINIMAL: "text-success", MATERIAL: "text-warning", SEVERE: "text-destructive" }[s] || "text-foreground");
  const verdictColor = (v: string) => VERDICT_COLORS[v] || "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl safe-area-top">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Executive Reliability Board</h1>
          <Badge variant="outline" className="text-[10px]">Display Only</Badge>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading reliability intelligence…</div>
        ) : (
          <div className="space-y-6">

            {/* ── Section 1: Executive Hero ── */}
            {live && (
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Current Posture
                  </h2>
                  <div className="grid grid-cols-5 gap-3 text-center">
                    <div>
                      <p className={`text-2xl font-bold ${verdictColor(live.verdict)}`}>{live.score}</p>
                      <p className="text-[9px] text-muted-foreground">Score</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${verdictColor(live.verdict)}`}>{live.verdict}</p>
                      <p className="text-[9px] text-muted-foreground">Verdict</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{live.riskProbability}%</p>
                      <p className="text-[9px] text-muted-foreground">Risk</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${slaColor(live.slaTier)}`}>{live.slaTier}</p>
                      <p className="text-[9px] text-muted-foreground">SLA Tier</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">LKR {live.projected30Day.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">30-Day Exp.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section 2: Reliability Trend ── */}
            {snapshots.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> 30-Day Trend
                  </h2>
                  <div className="flex items-end gap-[2px] h-20">
                    {snapshots.map((s) => {
                      const maxS = Math.max(...snapshots.map(x => x.reliability_score), 1);
                      const minS = Math.min(...snapshots.map(x => x.reliability_score), 0);
                      const range = maxS - minS || 1;
                      const pct = ((s.reliability_score - minS) / range) * 100;
                      const bg = s.reliability_score >= 85 ? "bg-success" :
                        s.reliability_score >= 65 ? "bg-warning" :
                        s.reliability_score >= 40 ? "bg-destructive/70" : "bg-destructive";
                      return (
                        <div
                          key={s.id}
                          className={`flex-1 rounded-t ${bg} min-h-[3px]`}
                          style={{ height: `${Math.max(5, pct)}%` }}
                          title={`${new Date(s.created_at).toLocaleDateString()}: ${s.reliability_score} — ${s.executive_verdict}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">{new Date(snapshots[0].created_at).toLocaleDateString()}</span>
                    <span className="text-[9px] text-muted-foreground">{latest && new Date(latest.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section 3: SLA Contract View ── */}
            {live && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> SLA Contract
                  </h2>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <p className={`text-sm font-bold ${slaColor(live.slaTier)}`}>{live.slaTier}</p>
                      <p className="text-[9px] text-muted-foreground">SLA Tier</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{live.slaCompliance}%</p>
                      <p className="text-[9px] text-muted-foreground">Compliance</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{live.breachRisk}%</p>
                      <p className="text-[9px] text-muted-foreground">Breach Risk</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-foreground">{live.slaAction}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Recommended Action</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section 4: Operational Impact View ── */}
            {live && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Operational Impact
                  </h2>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-sm font-bold text-foreground">{live.operationalImpact}</p>
                      <p className="text-[9px] text-muted-foreground">Ops Impact</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{live.reputationalRisk}</p>
                      <p className="text-[9px] text-muted-foreground">Rep. Risk</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{live.compositeImpact}</p>
                      <p className="text-[9px] text-muted-foreground">Composite</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${impactColor(live.impactLevel)}`}>{live.impactLevel}</p>
                      <p className="text-[9px] text-muted-foreground">Level</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section 5: Financial Exposure View ── */}
            {live && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Financial Exposure
                  </h2>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-sm font-bold text-foreground">LKR {live.dailyRevenueAtRisk.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Daily at Risk</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">LKR {live.projected30Day.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">30-Day Exposure</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${costColor(live.costSeverity)}`}>{live.costSeverity}</p>
                      <p className="text-[9px] text-muted-foreground">Cost Severity</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center mt-2">
                    Advisory estimate based on pilot assumptions
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Section 6: Zone Reliability View ── */}
            {live && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Zone Reliability
                </h2>
                <ZoneReliabilityHeatmap zones={PILOT_ZONE_IDS.map(zoneId => ({
                  zoneId,
                  label: ZONE_LABEL_MAP[zoneId] || zoneId,
                  reliabilityScore: live.score,
                  verdict: live.verdict as ReliabilityVerdict,
                }))} />
                <p className="text-[9px] text-muted-foreground text-center mt-1">
                  Pilot baseline view — per-zone scoring not yet individualized
                </p>
              </div>
            )}

            {/* ── Section 7: Historical Archive Table ── */}
            {snapshots.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Historical Archive
                  </h2>
                  <div className="overflow-auto max-h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] h-8">Date</TableHead>
                          <TableHead className="text-[10px] h-8 text-center">Score</TableHead>
                          <TableHead className="text-[10px] h-8 text-center">Verdict</TableHead>
                          <TableHead className="text-[10px] h-8 text-center">Risk %</TableHead>
                          <TableHead className="text-[10px] h-8 text-center">SLA</TableHead>
                          <TableHead className="text-[10px] h-8 text-center">Exposure</TableHead>
                          <TableHead className="text-[10px] h-8 text-center">Impact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...snapshots].reverse().map(s => {
                          const meta = s.metadata || {};
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="text-[10px] py-1.5">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center font-semibold">{s.reliability_score}</TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">
                                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${verdictColor(s.executive_verdict)}`}>
                                  {s.executive_verdict}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">{s.risk_probability}%</TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">
                                {meta.sla_tier ? String(meta.sla_tier).toUpperCase() : "—"}
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">
                                {meta.projected_30day_exposure != null ? `LKR ${Number(meta.projected_30day_exposure).toLocaleString()}` : "—"}
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">
                                {meta.impact_level ? String(meta.impact_level).toUpperCase() : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {snapshots.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
                  No historical snapshots yet. Snapshots are generated daily for trend visibility.
                </CardContent>
              </Card>
            )}

            <p className="text-[9px] text-muted-foreground text-center pb-4">
              Informational only — does not affect GO/HOLD/NO-GO verdict or marketplace behavior
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
