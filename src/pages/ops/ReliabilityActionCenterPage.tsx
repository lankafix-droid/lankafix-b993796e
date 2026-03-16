/**
 * Reliability Action Center — Final operator-facing decision console.
 * Read-only, advisory-only. Does not affect live marketplace behavior.
 */
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Shield, AlertTriangle, Target, Activity, MapPin,
  Clock, RefreshCw, Zap, FileText, Heart, AlertOctagon, Archive,
  CheckCircle2, XCircle, Info, Radio,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import {
  fetchLiveEnterpriseSummary, fetchReliabilityRolloutSummary,
  fetchPerZoneReliabilitySummary, fetchWorstCategoriesByZone,
  fetch30DaySnapshots, computeSnapshotFreshness, FRESHNESS_COLORS,
  verdictColor, slaColor, dispatchRiskColor, rolloutReadinessColor,
  type EnterpriseReliabilitySummary, type ReliabilityRolloutSummary,
  type ZoneReliabilitySummary,
} from "@/services/reliabilityReadModel";
import type { CategoryReliabilitySummary } from "@/engines/categoryReliabilityEngine";
import { computeActionCenter, type ActionCenterResult } from "@/engines/reliabilityActionCenterEngine";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import GovernanceSnapshotStrip from "@/components/ops/GovernanceSnapshotStrip";

const ZONE_LABEL_MAP: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL_MAP[z.id] = z.label; });

const VERDICT_BG: Record<string, string> = {
  STABLE: "bg-success/10 text-success border-success/20",
  GUARDED: "bg-warning/10 text-warning border-warning/20",
  RISK: "bg-destructive/10 text-destructive border-destructive/20",
  CRITICAL: "bg-destructive/15 text-destructive border-destructive/30",
};

const SAMPLE_BADGE: Record<string, string> = {
  HIGH: "bg-success/10 text-success",
  MEDIUM: "bg-warning/10 text-warning",
  LOW: "bg-destructive/10 text-destructive",
  PILOT_ESTIMATE: "bg-muted text-muted-foreground",
};

function useActionCenterData() {
  return useQuery({
    queryKey: ["reliability-action-center"],
    queryFn: async () => {
      const [enterprise, rollout, zones, worstCategories, snapshots] = await Promise.all([
        fetchLiveEnterpriseSummary(),
        fetchReliabilityRolloutSummary(),
        fetchPerZoneReliabilitySummary(),
        fetchWorstCategoriesByZone(15),
        fetch30DaySnapshots(),
      ]);

      const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const freshness = computeSnapshotFreshness(latest?.created_at || null);

      const result = computeActionCenter({
        reliabilityScore: enterprise.score,
        verdict: enterprise.verdict,
        slaTier: enterprise.slaTier,
        breachRisk: enterprise.breachRisk,
        dispatchRiskLevel: enterprise.riskLevel,
        rolloutReadiness: rollout.rolloutReadiness,
        emergencyKillSwitch: rollout.flags.emergencyKillSwitch,
        snapshotFreshness: freshness.freshness,
        snapshotAgeHours: freshness.ageHours,
        allCategorySummaries: worstCategories,
        zoneReliability: zones,
      });

      return { enterprise, rollout, zones, freshness, result };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

const NAV_LINKS = [
  { label: "Operations Board", path: "/ops/reliability-operations-board", icon: Activity },
  { label: "Governance Hub", path: "/ops/reliability-governance-hub", icon: Shield },
  { label: "Command Center", path: "/ops/command-center", icon: Radio },
  { label: "Executive Board", path: "/ops/executive-reliability", icon: Shield },
  { label: "Scope Planner", path: "/ops/reliability-scope-planner", icon: Target },
  { label: "Reliability Archive", path: "/ops/reliability-archive", icon: Archive },
  { label: "Chaos Control", path: "/ops/chaos-control", icon: AlertOctagon },
  { label: "Self-Healing", path: "/ops/self-healing", icon: Heart },
  { label: "Incident Playbooks", path: "/ops/incident-playbooks", icon: FileText },
];

export default function ReliabilityActionCenterPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useActionCenterData();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl safe-area-top">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Reliability Action Center</h1>
          <Badge variant="outline" className="text-[10px]">Advisory Only</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-6">
          Read-only decision console — no live marketplace behavior is changed
        </p>

        {isLoading || !data ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading reliability intelligence…</div>
        ) : (
          <div className="space-y-5">

            {/* ── Governance Snapshot ── */}
            <GovernanceSnapshotStrip />

            {/* ── Prescriptive Queue ── */}
            <Link to="/ops/prescriptive-reliability">
              <Card className="cursor-pointer hover:border-primary/30 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">Prescriptive Recommendations</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">View →</Badge>
                </CardContent>
              </Card>
            </Link>
            <Link to="/ops/prescriptive-interventions">
              <Card className="cursor-pointer hover:border-primary/30 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-warning" />
                    <span className="text-xs font-semibold">Intervention Workbench</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">Open →</Badge>
                </CardContent>
              </Card>
            </Link>

            {/* ═══ SECTION A — Executive Status Strip ═══ */}
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Executive Status
                </h2>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
                  <KpiCell label="Score" value={String(data.enterprise.score)} color={verdictColor(data.enterprise.verdict)} />
                  <KpiCell label="Verdict" value={data.enterprise.verdict} color={verdictColor(data.enterprise.verdict)} />
                  <KpiCell label="SLA Tier" value={data.enterprise.slaTier} color={slaColor(data.enterprise.slaTier)} />
                  <KpiCell label="Breach Risk" value={`${data.enterprise.breachRisk}%`} color={data.enterprise.breachRisk > 20 ? "text-destructive" : "text-foreground"} />
                  <KpiCell label="Dispatch Risk" value={data.enterprise.riskLevel} color={dispatchRiskColor(data.enterprise.riskLevel)} />
                  <KpiCell label="Rollout" value={data.rollout.rolloutReadiness} color={rolloutReadinessColor(data.rollout.rolloutReadiness)} />
                  <KpiCell label="Snapshot" value={data.freshness.label} color={FRESHNESS_COLORS[data.freshness.freshness]} />
                </div>
              </CardContent>
            </Card>

            {/* ═══ SECTION B — Top 5 Hotspots ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Top 5 Reliability Hotspots
                </h2>
                {data.result.topHotspots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No category-level activity in the last 24h</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.result.topHotspots.map((h, i) => (
                      <HotspotRow key={`${h.zoneId}-${h.categoryCode}-${i}`} item={h} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION C — Best Rollout Candidates ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-success" /> Best Controlled Rollout Candidates
                </h2>
                {data.result.rolloutCandidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No category combinations currently meet controlled rollout criteria</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.result.rolloutCandidates.map((c, i) => (
                      <CandidateRow key={`${c.zoneId}-${c.categoryCode}-${i}`} item={c} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION D — Blocked / Unsafe ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-destructive" /> Blocked / Unsafe Items
                </h2>
                {data.result.blockedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No blocked items detected</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.result.blockedItems.slice(0, 8).map((b, i) => (
                      <HotspotRow key={`blocked-${b.zoneId}-${b.categoryCode}-${i}`} item={b} />
                    ))}
                    {data.result.blockedItems.length > 8 && (
                      <p className="text-[10px] text-muted-foreground">+{data.result.blockedItems.length - 8} more blocked items</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION E — Operator Recommendations ═══ */}
            <Card className="border-primary/15">
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Operator Recommendations
                </h2>
                <ul className="space-y-1.5">
                  {data.result.operatorSummary.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* ═══ SECTION F — Snapshot Trust ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Snapshot Trust
                </h2>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] ${FRESHNESS_COLORS[data.result.trustStatus.freshness]}`} variant="outline">
                    {data.result.trustStatus.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{data.freshness.label}</span>
                  {data.result.trustStatus.trustworthy ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{data.result.trustStatus.recommendation}</p>
              </CardContent>
            </Card>

            {/* ═══ SECTION G — Quick Navigation ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Quick Navigation
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NAV_LINKS.map(link => (
                    <Link key={link.path} to={link.path}>
                      <div className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                        <link.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{link.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ── Sub-components ── */

function KpiCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
}

function HotspotRow({ item }: { item: CategoryReliabilitySummary }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-muted-foreground shrink-0">{ZONE_LABEL_MAP[item.zoneId] || item.zoneId}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.categoryCode}</Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-bold ${verdictColor(item.verdict)}`}>{item.reliabilityScore}</span>
        <Badge className={`text-[8px] px-1.5 py-0 ${VERDICT_BG[item.verdict] || ""}`}>{item.verdict}</Badge>
        <Badge className={`text-[8px] px-1.5 py-0 ${SAMPLE_BADGE[item.sampleQuality] || ""}`}>{item.sampleQuality}</Badge>
      </div>
    </div>
  );
}

function CandidateRow({ item }: { item: CategoryReliabilitySummary }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-success/5 border border-success/10 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-muted-foreground shrink-0">{ZONE_LABEL_MAP[item.zoneId] || item.zoneId}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.categoryCode}</Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-success">{item.reliabilityScore}</span>
        <Badge className={`text-[8px] px-1.5 py-0 ${rolloutReadinessColor(item.rolloutReadiness)} bg-success/10`}>{item.rolloutReadiness}</Badge>
        <Badge className={`text-[8px] px-1.5 py-0 ${SAMPLE_BADGE[item.sampleQuality] || ""}`}>{item.sampleQuality}</Badge>
      </div>
    </div>
  );
}
