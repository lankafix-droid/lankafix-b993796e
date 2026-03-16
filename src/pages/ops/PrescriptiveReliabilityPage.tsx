/**
 * Prescriptive Reliability Orchestrator — V1
 * Advisory-only decision support. No marketplace enforcement.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Target, AlertTriangle, Shield, Zap, TrendingDown,
  CheckCircle2, ArrowUpRight, RefreshCw, Clock, ShieldAlert,
  Lightbulb, Ban, Layers, Activity,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchPrescriptiveReliabilitySummary, type PrescriptiveReliabilityFullSummary } from "@/services/prescriptiveReliabilityReadModel";
import type { PrescriptiveIntervention, InterventionUrgency, ImpactLevel, EffortLevel } from "@/engines/prescriptiveReliabilityOrchestrator";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

const ZONE_LABEL: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL[z.id] = z.label; });

const URGENCY_STYLE: Record<InterventionUrgency, string> = {
  low: "bg-muted text-muted-foreground",
  moderate: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/15 text-destructive",
};
const IMPACT_STYLE: Record<ImpactLevel, string> = {
  low: "text-muted-foreground", medium: "text-warning", high: "text-destructive",
};
const EFFORT_STYLE: Record<EffortLevel, string> = {
  low: "text-success", medium: "text-warning", high: "text-destructive",
};

export default function PrescriptiveReliabilityPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["prescriptive-reliability"],
    queryFn: fetchPrescriptiveReliabilitySummary,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ops/command-center">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-heading">Prescriptive Reliability Orchestrator</h1>
              <p className="text-xs text-muted-foreground">What to do first, next, and avoid · Advisory only</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Computing prescriptive intelligence…</p>}

        {data && (
          <>
            {/* SECTION A — Executive Hero */}
            <Card className="border-primary/20">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-bold">{data.summary.headline}</p>
                    {data.summary.summaryLines.map((line, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {line}</p>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <MiniSignal icon={Zap} label="Strongest Signal" value={data.summary.strongestSignal} />
                  <MiniSignal icon={Ban} label="Biggest Blocker" value={data.summary.biggestBlocker || "None"} />
                  <MiniSignal icon={CheckCircle2} label="Safest Next Move" value={data.summary.safestNextMove || "No action needed"} />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="priority" className="space-y-4">
              <TabsList className="w-full justify-start flex-wrap">
                <TabsTrigger value="priority" className="text-xs">Priority</TabsTrigger>
                <TabsTrigger value="sequence" className="text-xs">Sequence</TabsTrigger>
                <TabsTrigger value="avoid" className="text-xs">Avoid Now</TabsTrigger>
                <TabsTrigger value="quickwins" className="text-xs">Quick Wins</TabsTrigger>
                <TabsTrigger value="rollout" className="text-xs">Rollout Guard</TabsTrigger>
              </TabsList>

              {/* SECTION B — Top Priority */}
              <TabsContent value="priority">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3">Top Priority Interventions</h2>
                    {data.interventions.topInterventions.length === 0 ? (
                      <EmptyState icon={Target} title="No priority interventions" description="System is stable. No prescriptive actions needed." />
                    ) : (
                      <div className="space-y-2">
                        {data.interventions.topInterventions.map((item, i) => (
                          <InterventionCard key={item.id} item={item} rank={i + 1} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION C — Sequence */}
              <TabsContent value="sequence">
                <div className="space-y-4">
                  <SequenceSection title="Immediate" icon={AlertTriangle} items={data.sequence.immediate} emptyText="No immediate actions required." />
                  <SequenceSection title="This Shift" icon={Clock} items={data.sequence.thisShift} emptyText="No same-shift actions identified." />
                  <SequenceSection title="This Week" icon={Layers} items={data.sequence.thisWeek} emptyText="No weekly review items." />
                </div>
              </TabsContent>

              {/* SECTION D — Avoid Now */}
              <TabsContent value="avoid">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Ban className="w-4 h-4 text-destructive" /> Do Not Proceed</h2>
                    {data.interventions.avoidNow.length === 0 ? (
                      <EmptyState icon={CheckCircle2} title="No items to defer" description="All rollout/expansion contexts are currently safe." />
                    ) : (
                      <div className="space-y-2">
                        {data.interventions.avoidNow.map(item => (
                          <InterventionCard key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION E — Quick Wins */}
              <TabsContent value="quickwins">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-warning" /> Quick Wins</h2>
                    {data.interventions.quickWins.length === 0 ? (
                      <EmptyState icon={Lightbulb} title="No quick wins available" description="No low-effort, high-impact actions identified right now." />
                    ) : (
                      <div className="space-y-2">
                        {data.interventions.quickWins.map(item => (
                          <InterventionCard key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION F — Rollout Guard */}
              <TabsContent value="rollout">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h2 className="text-sm font-bold flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Rollout Guard Advice</h2>
                    <div className="flex items-center gap-3">
                      {data.rolloutGuard.rolloutAllowed ? (
                        <Badge className="bg-success/10 text-success border-0 text-xs">ROLLOUT ALLOWED</Badge>
                      ) : (
                        <Badge className="bg-destructive/10 text-destructive border-0 text-xs">ROLLOUT BLOCKED</Badge>
                      )}
                      <span className="text-xs font-mono">Ceiling: {data.rolloutGuard.recommendedCeilingPercent}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{data.rolloutGuard.advice}</p>
                    {data.rolloutGuard.blockers.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Blockers</p>
                        {data.rolloutGuard.blockers.map((b, i) => (
                          <p key={i} className="text-xs text-destructive/80">• {b}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* SECTION H — Quick Navigation */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Predictive Dashboard", path: "/ops/predictive-reliability" },
                    { label: "Governance Hub", path: "/ops/reliability-governance-hub" },
                    { label: "Operations Board", path: "/ops/reliability-operations-board" },
                    { label: "Action Center", path: "/ops/reliability-action-center" },
                    { label: "Executive Board", path: "/ops/executive-reliability" },
                    { label: "Scope Planner", path: "/ops/reliability-scope-planner" },
                    { label: "Archive", path: "/ops/reliability-archive" },
                    { label: "Command Center", path: "/ops/command-center" },
                    { label: "Scenario Simulator", path: "/ops/reliability-scenario-simulator" },
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

function MiniSignal({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg border border-border/50 bg-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xs font-medium truncate">{value}</p>
    </div>
  );
}

function InterventionCard({ item, rank }: { item: PrescriptiveIntervention; rank?: number }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {rank && <span className="text-[10px] font-bold text-muted-foreground mt-0.5 shrink-0">#{rank}</span>}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{item.title}</p>
            {(item.zoneId || item.categoryCode) && (
              <p className="text-[10px] text-muted-foreground">
                {item.zoneId && (ZONE_LABEL[item.zoneId] || item.zoneId)}
                {item.zoneId && item.categoryCode && " · "}
                {item.categoryCode}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={`text-[8px] border-0 ${URGENCY_STYLE[item.urgency]}`}>{item.urgency}</Badge>
          <span className="text-[10px] font-mono font-bold">{item.priorityScore}</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{item.recommendation}</p>
      <div className="flex items-center gap-3 text-[9px]">
        <span className={IMPACT_STYLE[item.estimatedImpact]}>Impact: {item.estimatedImpact}</span>
        <span className={EFFORT_STYLE[item.estimatedEffort]}>Effort: {item.estimatedEffort}</span>
        <span className="text-muted-foreground">Confidence: {item.confidence}%</span>
      </div>
      {item.reason.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.reason.slice(0, 3).map((r, i) => (
            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SequenceSection({ title, icon: Icon, items, emptyText }: { title: string; icon: React.ElementType; items: PrescriptiveIntervention[]; emptyText: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Icon className="w-4 h-4" /> {title}</h2>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <InterventionCard key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
