/**
 * Executive Reliability Board — Board-grade reliability posture overview.
 * Display-only. Does not affect marketplace behavior or launch verdicts.
 * Uses reliabilityReadModel as the single source of truth for display composition.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Shield, TrendingUp, Activity, DollarSign, MapPin,
  BarChart3, Target, AlertTriangle, FileText, RefreshCw, Archive,
  Camera, Clock, CheckCircle2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import ZoneReliabilityHeatmap from "@/components/ops/ZoneReliabilityHeatmap";
import ZoneReliabilityTable from "@/components/ops/ZoneReliabilityTable";
import ZoneDispatchPolicyMatrix from "@/components/ops/ZoneDispatchPolicyMatrix";
import {
  fetchLiveEnterpriseSummary, fetch30DaySnapshots, fetchDispatchReliabilitySignal,
  fetchDispatchPolicySimulation, fetchReliabilityRolloutSummary, fetchPerZoneReliabilitySummary,
  fetchPerZoneCategoryReliabilitySummary,
  computeSnapshotFreshness, FRESHNESS_COLORS,
  slaColor, impactLevelColor, costSeverityColor, verdictColor, dispatchRiskColor, shadowPolicyColor,
  rolloutReadinessColor, recommendedModeColor,
  PILOT_ASSUMPTIONS,
  type SnapshotRow, type EnterpriseReliabilitySummary, type DispatchRiskSummary, type DispatchPolicyAdvisory,
  type ReliabilityRolloutSummary, type ZoneReliabilitySummary, type CategoryReliabilitySummary,
} from "@/services/reliabilityReadModel";
import ZoneCategoryReliabilityMatrix from "@/components/ops/ZoneCategoryReliabilityMatrix";
import { writeReliabilitySnapshot, type SnapshotResult } from "@/services/reliabilitySnapshotWriter";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import type { ReliabilityVerdict } from "@/engines/reliabilityGovernanceEngine";
import GovernanceSnapshotStrip from "@/components/ops/GovernanceSnapshotStrip";
import { fetchPredictiveReliabilitySummary } from "@/services/predictiveReliabilityReadModel";

const PILOT_ZONE_IDS = [
  "col_01","col_02","col_03","col_04","col_05","col_06","col_07",
  "col_08","col_09","col_10","col_11","col_12","col_13","col_14","col_15",
  "rajagiriya","battaramulla","nawala","nugegoda","dehiwala","mt_lavinia",
  "thalawathugoda","negombo","wattala","moratuwa",
];

const ZONE_LABEL_MAP: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL_MAP[z.id] = z.label; });

function useSnapshots() {
  return useQuery({
    queryKey: ["exec-reliability-snapshots"],
    queryFn: fetch30DaySnapshots,
    staleTime: 5 * 60 * 1000,
  });
}

function useLiveMetrics() {
  return useQuery({
    queryKey: ["exec-reliability-live"],
    queryFn: fetchLiveEnterpriseSummary,
    staleTime: 60_000,
  });
}

function useDispatchRisk() {
  return useQuery({
    queryKey: ["exec-dispatch-risk"],
    queryFn: fetchDispatchReliabilitySignal,
    staleTime: 60_000,
  });
}

function useShadowPolicy() {
  return useQuery({
    queryKey: ["exec-shadow-policy"],
    queryFn: fetchDispatchPolicySimulation,
    staleTime: 60_000,
  });
}

function useRolloutSummary() {
  return useQuery({
    queryKey: ["exec-rollout-summary"],
    queryFn: fetchReliabilityRolloutSummary,
    staleTime: 60_000,
  });
}

function usePerZoneReliability() {
  return useQuery({
    queryKey: ["exec-per-zone-reliability"],
    queryFn: fetchPerZoneReliabilitySummary,
    staleTime: 60_000,
  });
}

function usePerZoneCategoryReliability() {
  return useQuery({
    queryKey: ["exec-per-zone-category-reliability"],
    queryFn: fetchPerZoneCategoryReliabilitySummary,
    staleTime: 60_000,
  });
}

export default function ExecutiveReliabilityBoardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: snapshots = [], isLoading: loadingSnaps, refetch: refetchSnaps } = useSnapshots();
  const { data: live, isLoading: loadingLive, refetch: refetchLive } = useLiveMetrics();
  const { data: dispatchRisk } = useDispatchRisk();
  const { data: shadowPolicy } = useShadowPolicy();
  const { data: rolloutSummary } = useRolloutSummary();
  const { data: zoneReliability } = usePerZoneReliability();
  const { data: zoneCategoryData } = usePerZoneCategoryReliability();

  const [snapshotAction, setSnapshotAction] = useState<{ loading: boolean; result: SnapshotResult | null }>({ loading: false, result: null });

  const isLoading = loadingSnaps || loadingLive;
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const freshness = computeSnapshotFreshness(latest?.created_at || null);

  const handleRefresh = useCallback(() => {
    refetchSnaps();
    refetchLive();
  }, [refetchSnaps, refetchLive]);

  const handleWriteSnapshot = useCallback(async () => {
    setSnapshotAction({ loading: true, result: null });
    const result = await writeReliabilitySnapshot();
    setSnapshotAction({ loading: false, result });
    if (result.success && !result.skipped) {
      // Refresh snapshot list
      queryClient.invalidateQueries({ queryKey: ["exec-reliability-snapshots"] });
    }
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl safe-area-top">

        {/* ── Top Actions Row ── */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/ops/reliability-governance-hub")}>
              <Shield className="w-3 h-3" /> Governance Hub
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/ops/reliability-action-center")}>
              <Activity className="w-3 h-3" /> Action Center
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/ops/reliability-operations-board")}>
              <Target className="w-3 h-3" /> Ops Board
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/ops/reliability-scope-planner")}>
              <Target className="w-3 h-3" /> Scope Planner
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/ops/reliability-archive")}>
              <Archive className="w-3 h-3" /> Archive
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Executive Reliability Board</h1>
          <Badge variant="outline" className="text-[10px]">Display Only</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-6">
          Advisory pilot assumptions · Does not affect GO / HOLD / NO-GO verdict
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading reliability intelligence…</div>
        ) : (
          <div className="space-y-6">

            {/* ── Governance Snapshot ── */}
            <GovernanceSnapshotStrip />

            {/* ── Snapshot Freshness ── */}
            <Card>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Last snapshot:</span>
                  <span className={`text-xs font-semibold ${FRESHNESS_COLORS[freshness.freshness]}`}>
                    {freshness.label}
                  </span>
                  <Badge variant="outline" className={`text-[8px] px-1 py-0 ${FRESHNESS_COLORS[freshness.freshness]}`}>
                    {freshness.freshness === "none" ? "No data" : freshness.freshness}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[10px] h-7"
                  onClick={handleWriteSnapshot}
                  disabled={snapshotAction.loading}
                >
                  <Camera className="w-3 h-3" />
                  {snapshotAction.loading ? "Writing…" : "Write Snapshot Now"}
                </Button>
              </CardContent>
            </Card>

            {/* ── Snapshot write result ── */}
            {snapshotAction.result && (
              <div className={`rounded-lg border p-2.5 text-xs flex items-center gap-2 ${
                snapshotAction.result.success
                  ? snapshotAction.result.skipped
                    ? "bg-warning/5 border-warning/20 text-warning"
                    : "bg-success/5 border-success/20 text-success"
                  : "bg-destructive/5 border-destructive/20 text-destructive"
              }`}>
                {snapshotAction.result.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{snapshotAction.result.reason || snapshotAction.result.error || "Unknown"}</span>
              </div>
            )}

            {/* ── Section 1: Executive Hero ── */}
            {live ? (
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
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No live self-healing data available. Enterprise metrics require active system events.
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
                      <p className={`text-sm font-bold ${impactLevelColor(live.impactLevel)}`}>{live.impactLevel}</p>
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
                      <p className={`text-sm font-bold ${costSeverityColor(live.costSeverity)}`}>{live.costSeverity}</p>
                      <p className="text-[9px] text-muted-foreground">Cost Severity</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center mt-2">
                    Advisory estimate based on pilot assumptions
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Section 5.5: Operational Routing Advisory ── */}
            {dispatchRisk && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Operational Routing Advisory
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className={`text-sm font-bold ${dispatchRiskColor(dispatchRisk.dispatchRiskLevel)}`}>{dispatchRisk.dispatchRiskLevel}</p>
                      <p className="text-[9px] text-muted-foreground">Dispatch Risk</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{dispatchRisk.routingRecommendation}</p>
                      <p className="text-[9px] text-muted-foreground">Routing</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{dispatchRisk.technicianLoadRecommendation}</p>
                      <p className="text-[9px] text-muted-foreground">Tech Load</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{dispatchRisk.dispatchConfidence}%</p>
                      <p className="text-[9px] text-muted-foreground">Confidence</p>
                    </div>
                  </div>
                  {dispatchRisk.reliabilityWarning && (
                    <p className="text-[10px] text-warning text-center mt-2">{dispatchRisk.reliabilityWarning}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground text-center mt-2">
                    Advisory signal — does not alter dispatch behavior · Dispatch advisory signals currently system-wide (zone signals coming in Phase-2)
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Section 6: Per-Zone Reliability View ── */}
            {live && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Zone Reliability Intelligence
                </h2>
                {zoneReliability && zoneReliability.length > 0 ? (
                  <>
                    <ZoneReliabilityHeatmap zones={zoneReliability.map(z => ({
                      zoneId: z.zoneId,
                      label: ZONE_LABEL_MAP[z.zoneId] || z.zoneId,
                      reliabilityScore: z.reliabilityScore,
                      verdict: z.verdict as ReliabilityVerdict,
                    }))} />
                    <ZoneReliabilityTable zones={zoneReliability} zoneLabels={ZONE_LABEL_MAP} />
                    <ZoneDispatchPolicyMatrix zones={zoneReliability} zoneLabels={ZONE_LABEL_MAP} />
                    <p className="text-[9px] text-muted-foreground text-center">
                      Per-zone intelligence — advisory only, does not alter live dispatch
                    </p>
                  </>
                ) : (
                  <ZoneReliabilityHeatmap zones={PILOT_ZONE_IDS.map(zoneId => ({
                    zoneId,
                    label: ZONE_LABEL_MAP[zoneId] || zoneId,
                    reliabilityScore: live.score,
                    verdict: live.verdict as ReliabilityVerdict,
                  }))} />
                )}
              </div>
            )}

            {/* ── Section 6.5: Zone × Category Reliability Breakdown ── */}
            {zoneCategoryData && Object.keys(zoneCategoryData).length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Zone × Category Reliability Breakdown
                </h2>
                {/* Worst category in each zone summary */}
                <Card>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Worst Category per Zone</p>
                    {Object.entries(zoneCategoryData)
                      .map(([zoneId, cats]) => {
                        const worst = [...cats].sort((a, b) => a.reliabilityScore - b.reliabilityScore)[0];
                        return worst ? { zoneId, worst } : null;
                      })
                      .filter(Boolean)
                      .sort((a, b) => a!.worst.reliabilityScore - b!.worst.reliabilityScore)
                      .slice(0, 10)
                      .map(item => (
                        <div key={item!.zoneId} className="flex items-center justify-between text-[10px] py-0.5 border-b border-border/30 last:border-0">
                          <span className="text-foreground">{ZONE_LABEL_MAP[item!.zoneId] || item!.zoneId}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item!.worst.categoryCode}</span>
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${verdictColor(item!.worst.verdict)}`}>
                              {item!.worst.reliabilityScore} — {item!.worst.verdict}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
                <ZoneCategoryReliabilityMatrix
                  categories={Object.values(zoneCategoryData).flat()}
                  zoneLabels={ZONE_LABEL_MAP}
                />
                <p className="text-[9px] text-muted-foreground text-center">
                  Per-zone category scores are advisory and do not trigger live enforcement
                </p>
              </div>
            )}

            {/* ── Shadow Dispatch Governance ── */}
            {shadowPolicy && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Shadow Dispatch Governance
                  </h2>
                  <p className="text-[9px] text-muted-foreground">
                    If LankaFix were to enforce reliability-aware dispatch controls, this is what would apply now.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div>
                      <p className={`text-sm font-bold ${shadowPolicyColor(shadowPolicy.shadowPolicyMode)}`}>{shadowPolicy.shadowPolicyMode}</p>
                      <p className="text-[9px] text-muted-foreground">Policy Mode</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{shadowPolicy.simulatedRoutingAction.replace(/_/g, " ")}</p>
                      <p className="text-[9px] text-muted-foreground">Routing Action</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{shadowPolicy.simulatedCapacityAction.replace(/_/g, " ")}</p>
                      <p className="text-[9px] text-muted-foreground">Capacity Action</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{shadowPolicy.simulatedPartnerLoadCapPercent}%</p>
                      <p className="text-[9px] text-muted-foreground">Partner Load Cap</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${shadowPolicy.simulatedBookingIntakeAdvisory === "OPEN" ? "text-success" : shadowPolicy.simulatedBookingIntakeAdvisory === "RESTRICT" ? "text-destructive" : "text-warning"}`}>
                        {shadowPolicy.simulatedBookingIntakeAdvisory}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Booking Intake</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${shadowPolicy.simulatedZoneProtection ? "text-destructive" : "text-success"}`}>
                        {shadowPolicy.simulatedZoneProtection ? "ON" : "OFF"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Zone Protection</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center italic">
                    Board-grade simulation only — does not affect live dispatch
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Guardrails Rollout Governance ── */}
            {rolloutSummary && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Guardrails Rollout Governance
                  </h2>

                  {/* Kill switch override */}
                  {rolloutSummary.flags.emergencyKillSwitch && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                      <p className="text-[10px] text-destructive font-medium text-center">
                        Emergency kill switch currently overrides any rollout progression
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div>
                      <p className={`text-sm font-bold ${rolloutReadinessColor(rolloutSummary.rolloutReadiness)}`}>
                        {rolloutSummary.rolloutReadiness.replace(/_/g, " ")}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Rollout Readiness</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${recommendedModeColor(rolloutSummary.recommendedMode)}`}>
                        {rolloutSummary.recommendedMode.replace(/_/g, " ")}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Recommended Mode</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{rolloutSummary.recommendedRolloutPercent}%</p>
                      <p className="text-[9px] text-muted-foreground">Recommended %</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${rolloutSummary.flags.guardrailsEnabled ? "text-success" : "text-muted-foreground"}`}>
                        {rolloutSummary.flags.guardrailsEnabled ? "ON" : "OFF"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Guardrails</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${rolloutSummary.flags.emergencyKillSwitch ? "text-destructive" : "text-muted-foreground"}`}>
                        {rolloutSummary.flags.emergencyKillSwitch ? "ACTIVE" : "INACTIVE"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Kill Switch</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${shadowPolicyColor(rolloutSummary.shadowPolicyMode)}`}>
                        {rolloutSummary.shadowPolicyMode}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Shadow Policy</p>
                    </div>
                  </div>
                  {/* Eligible controls */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className={`text-[9px] ${rolloutSummary.enforceZoneProtectionEligible ? "text-success border-success/30" : "text-muted-foreground"}`}>
                      Zone Protection: {rolloutSummary.enforceZoneProtectionEligible ? "Eligible" : "—"}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] ${rolloutSummary.enforceCapacityCapEligible ? "text-success border-success/30" : "text-muted-foreground"}`}>
                      Capacity Cap: {rolloutSummary.enforceCapacityCapEligible ? "Eligible" : "—"}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] ${rolloutSummary.enforceBookingGuardEligible ? "text-success border-success/30" : "text-muted-foreground"}`}>
                      Booking Guard: {rolloutSummary.enforceBookingGuardEligible ? "Eligible" : "—"}
                    </Badge>
                  </div>
                  {/* Executive interpretation */}
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-foreground">
                      {rolloutSummary.rolloutReadiness === "NOT_READY" && "System not ready for live enforcement."}
                      {rolloutSummary.rolloutReadiness === "LIMITED" && "Continue shadow-mode observation only."}
                      {rolloutSummary.rolloutReadiness === "CONTROLLED" && "Eligible for tightly scoped pilot enforcement."}
                      {rolloutSummary.rolloutReadiness === "READY" && rolloutSummary.recommendedMode === "BROAD_ENFORCEMENT" && "Candidate for broader staged rollout under strict controls."}
                      {rolloutSummary.rolloutReadiness === "READY" && rolloutSummary.recommendedMode !== "BROAD_ENFORCEMENT" && "Safe for controlled pilot under kill-switch supervision."}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{rolloutSummary.rolloutReason}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center italic">
                    Board-grade governance visibility only — no automatic enforcement active
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Section 7: Historical Archive Table ── */}
            {snapshots.length > 0 ? (
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
                          const slaTierVal = meta.sla_tier ? String(meta.sla_tier).toUpperCase() : "—";
                          const exposureVal = meta.projected_30day_exposure != null
                            ? `LKR ${Number(meta.projected_30day_exposure).toLocaleString()}`
                            : "—";
                          const impactVal = meta.impact_level ? String(meta.impact_level).toUpperCase() : "—";
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
                              <TableCell className="text-[10px] py-1.5 text-center">{slaTierVal}</TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">{exposureVal}</TableCell>
                              <TableCell className="text-[10px] py-1.5 text-center">{impactVal}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
                  No historical snapshots yet. Use "Write Snapshot Now" to record the first one.
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
