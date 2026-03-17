/**
 * Launch Command Center V2 — /ops/launch-command-center-v2
 * Executive readiness dashboard with verdict, scorecards, proof, and blockers.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, RefreshCw, ChevronRight, MapPin, Users, Target, Radio, Beaker, Eye, Shield, BookOpen, CreditCard, AlertTriangle } from "lucide-react";
import { fetchCommandCenterData } from "@/services/readiness/readinessReadModel";
import { DataTruthBadge, LaunchVerdictBanner, ReadinessScoreCard, RealTransactionProofPanel, BlockerCard, LaunchRiskPanel } from "@/components/readiness/ReadinessComponents";

const NAV = [
  { label: "Categories", path: "/ops/readiness-categories", icon: Target },
  { label: "Zones", path: "/ops/readiness-zones", icon: MapPin },
  { label: "Partners", path: "/ops/readiness-partners", icon: Users },
  { label: "Communications", path: "/ops/readiness-communications", icon: Radio },
  { label: "Payments", path: "/ops/readiness-payments", icon: CreditCard },
  { label: "Trust Audit", path: "/ops/readiness-trust", icon: Eye },
  { label: "Training Hub", path: "/ops/training-hub", icon: BookOpen },
  { label: "Pilot Validation", path: "/ops/pilot-validation", icon: Beaker },
  { label: "Launch Blockers", path: "/ops/launch-blockers", icon: Shield },
];

export default function LaunchCommandCenterV2Page() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["command-center-v2"], queryFn: fetchCommandCenterData, staleTime: 30_000, refetchInterval: 60_000,
  });

  if (isLoading || !data) return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground text-sm">Loading launch readiness…</div></main></div>
  );

  const criticalBlockers = data.blockers.filter(b => b.severity === "CRITICAL" && b.status !== "RESOLVED");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-5">
            <Link to="/ops/war-room" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> War Room</Link>
            <div className="flex items-center gap-2">
              <DataTruthBadge source={data.dataSource} />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
            </div>
          </div>

          <LaunchVerdictBanner verdict={data.verdict} proof={data.proof} />

          {/* Next Actions */}
          {data.verdict.nextActions.length > 0 && (
            <Card className="mt-4 border-primary/15 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Next Priority Actions</p>
                <ol className="space-y-1">{data.verdict.nextActions.map((a, i) => <li key={i} className="text-xs text-foreground">{i + 1}. {a}</li>)}</ol>
              </CardContent>
            </Card>
          )}

          {/* Real Transaction Proof */}
          <div className="mt-6"><RealTransactionProofPanel proof={data.proof} /></div>

          {/* Scorecards */}
          <h2 className="text-xs font-semibold text-foreground mt-6 mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Readiness Scorecards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
            {data.scorecards.map(sc => <ReadinessScoreCard key={sc.key} sc={sc} />)}
          </div>

          {/* Critical Blockers */}
          {criticalBlockers.length > 0 && (<>
            <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Critical Blockers ({criticalBlockers.length})</h2>
            <div className="space-y-2 mb-5">{criticalBlockers.slice(0, 6).map(b => <BlockerCard key={b.id} b={b} />)}</div>
          </>)}

          {/* Risk Signals */}
          <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-primary" /> Risk Signals</h2>
          <LaunchRiskPanel risks={[
            { label: "Escalations", value: data.riskSignals.escalations, warn: 1 },
            { label: "Stale Bookings", value: data.riskSignals.staleBookings, warn: 1 },
            { label: "Disputes", value: data.riskSignals.disputes, warn: 1 },
            { label: "Critical Blockers", value: criticalBlockers.length, warn: 1 },
          ]} />

          {/* Navigation */}
          <Separator className="my-5" />
          <h2 className="text-xs font-semibold text-foreground mb-3">Readiness Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NAV.map(n => <Button key={n.path} variant="outline" size="sm" className="justify-start gap-2 h-9 text-xs" onClick={() => navigate(n.path)}><n.icon className="w-3.5 h-3.5" /> {n.label} <ChevronRight className="w-3 h-3 ml-auto" /></Button>)}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
