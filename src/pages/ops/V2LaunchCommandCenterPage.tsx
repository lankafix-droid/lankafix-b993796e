/**
 * V2 Launch Command Center — /ops/launch-command-center
 * Enhanced single source of truth with readiness scorecards, blockers, and risk signals.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import {
  ArrowLeft, Rocket, Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ChevronRight, MapPin, Users, Zap, CreditCard, Activity, Clock, Radio,
  MessageSquare, Eye, FileText, Target, Beaker,
} from "lucide-react";
import {
  fetchReadinessScorecards, fetchLaunchBlockers, detectDataSource,
  type ReadinessScorecard, type LaunchBlocker, type DataSource,
} from "@/services/launchReadinessReadModel";
import { supabase } from "@/integrations/supabase/client";

type Verdict = "READY_FOR_PILOT" | "READY_WITH_WARNINGS" | "PILOT_ONLY" | "NOT_READY";

function DataSourceBadge({ source }: { source: DataSource }) {
  const cfg: Record<DataSource, { label: string; cls: string }> = {
    SEEDED_DATA: { label: "Seeded Data", cls: "text-muted-foreground border-muted" },
    SIMULATED_DATA: { label: "Simulated Data", cls: "text-warning border-warning/30" },
    LIVE_DATA: { label: "Live Data", cls: "text-primary border-primary/30" },
    VERIFIED_LIVE_DATA: { label: "Verified Live", cls: "text-success border-success/30" },
  };
  const c = cfg[source];
  return <Badge variant="outline" className={`text-[9px] ${c.cls}`}>{c.label}</Badge>;
}

function useCommandCenterData() {
  return useQuery({
    queryKey: ["v2-launch-command-center"],
    queryFn: async () => {
      const [scorecards, blockers, bookingsRes, partnersRes] = await Promise.all([
        fetchReadinessScorecards(),
        fetchLaunchBlockers(),
        supabase.from("bookings").select("id, status, customer_id", { count: "exact" }).limit(5),
        supabase.from("partners").select("id, availability_status, verification_status").limit(100),
      ]);

      const bookingCount = bookingsRes.count ?? 0;
      const hasRealUsers = (bookingsRes.data || []).some((b: any) => !!b.customer_id);
      const dataSource = detectDataSource(bookingCount, hasRealUsers);

      const partners = partnersRes.data || [];
      const activePartners = partners.filter((p: any) => p.verification_status === "verified" && p.availability_status !== "offline").length;

      // Risk signals
      const [escalRes, staleRes, disputeRes] = await Promise.all([
        supabase.from("dispatch_escalations").select("id", { count: "exact", head: true }).is("resolved_at", null),
        supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["requested", "matching"]).lt("created_at", new Date(Date.now() - 30 * 60000).toISOString()),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("under_mediation", true),
      ]);

      return {
        scorecards, blockers, dataSource,
        activePartners,
        openBookings: bookingCount,
        escalations: escalRes.count ?? 0,
        staleBookings: staleRes.count ?? 0,
        disputes: disputeRes.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

function computeVerdict(scorecards: ReadinessScorecard[], blockers: LaunchBlocker[]): Verdict {
  const criticalBlockers = blockers.filter(b => b.severity === "CRITICAL" && b.status !== "RESOLVED").length;
  const avgScore = scorecards.reduce((s, c) => s + c.score, 0) / Math.max(1, scorecards.length);
  if (criticalBlockers >= 3 || avgScore < 30) return "NOT_READY";
  if (criticalBlockers >= 1 || avgScore < 50) return "PILOT_ONLY";
  if (avgScore < 75) return "READY_WITH_WARNINGS";
  return "READY_FOR_PILOT";
}

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; label: string }> = {
  READY_FOR_PILOT: { bg: "bg-success/10 border-success/30", text: "text-success", label: "READY FOR PILOT" },
  READY_WITH_WARNINGS: { bg: "bg-warning/10 border-warning/30", text: "text-warning", label: "READY WITH WARNINGS" },
  PILOT_ONLY: { bg: "bg-primary/10 border-primary/30", text: "text-primary", label: "PILOT ONLY" },
  NOT_READY: { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "NOT READY" },
};

const NAV_LINKS = [
  { label: "Category Gating", path: "/ops/category-launch-gating", icon: Target },
  { label: "Zone Readiness", path: "/ops/zone-readiness", icon: MapPin },
  { label: "Partner Readiness", path: "/ops/partner-readiness-scorecard", icon: Users },
  { label: "Training Hub", path: "/ops/training-hub", icon: FileText },
  { label: "Pilot Tests", path: "/ops/pilot-test-tracker", icon: Beaker },
  { label: "Comms Readiness", path: "/ops/communication-readiness", icon: Radio },
  { label: "Trust Audit", path: "/ops/customer-trust-audit", icon: Eye },
  { label: "Launch Blockers", path: "/ops/launch-blockers", icon: Shield },
  { label: "Command Center (Live)", path: "/ops/command-center", icon: Rocket },
];

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "text-destructive bg-destructive/5 border-destructive/20",
  HIGH: "text-warning bg-warning/5 border-warning/20",
  MEDIUM: "text-muted-foreground bg-muted/50 border-border",
};

export default function V2LaunchCommandCenterPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useCommandCenterData();

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading launch readiness…</div>
        </main>
      </div>
    );
  }

  const verdict = computeVerdict(data.scorecards, data.blockers);
  const vs = VERDICT_STYLES[verdict];
  const avgScore = Math.round(data.scorecards.reduce((s, c) => s + c.score, 0) / Math.max(1, data.scorecards.length));
  const criticalBlockers = data.blockers.filter(b => b.severity === "CRITICAL" && b.status !== "RESOLVED");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <Link to="/ops/war-room" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> War Room
            </Link>
            <div className="flex items-center gap-2">
              <DataSourceBadge source={data.dataSource} />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </div>

          {/* Hero Verdict */}
          <Card className={`mb-6 border-2 ${vs.bg}`}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${vs.bg}`}>
                    <Rocket className={`w-8 h-8 ${vs.text}`} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Launch Command Center</h1>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-LK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-base px-4 py-2 font-bold ${vs.bg} ${vs.text} border-none`}>{vs.label}</Badge>
                  <p className="text-2xl font-bold text-foreground mt-1">{avgScore}%</p>
                  <p className="text-[11px] text-muted-foreground">Overall Readiness</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {data.activePartners} active partners</span>
                <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {data.openBookings} total bookings</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {data.escalations} escalations</span>
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {criticalBlockers.length} critical blockers</span>
              </div>
            </CardContent>
          </Card>

          {/* Readiness Scorecards */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Readiness Scorecards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {data.scorecards.map(sc => {
              const isGood = sc.score >= 70;
              const isWarn = sc.score >= 40 && sc.score < 70;
              const colorCls = isGood ? "text-success" : isWarn ? "text-warning" : "text-destructive";
              const bgCls = isGood ? "border-success/15" : isWarn ? "border-warning/15" : "border-destructive/15";
              return (
                <Card key={sc.key} className={`${bgCls} border`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">{sc.label}</span>
                      <span className={`text-sm font-bold ${colorCls}`}>{sc.score}%</span>
                    </div>
                    <Progress value={sc.score} className="h-1.5 mb-3" />
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={`text-[9px] ${sc.built ? "text-success border-success/30" : "text-muted-foreground"}`}>
                        {sc.built ? "✓" : "○"} Built
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] ${sc.integrated ? "text-success border-success/30" : "text-muted-foreground"}`}>
                        {sc.integrated ? "✓" : "○"} Integrated
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] ${sc.validated ? "text-success border-success/30" : "text-muted-foreground"}`}>
                        {sc.validated ? "✓" : "○"} Validated
                      </Badge>
                      {sc.warningCount > 0 && <Badge variant="outline" className="text-[9px] text-warning border-warning/30">{sc.warningCount} warnings</Badge>}
                      {sc.criticalBlockers > 0 && <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">{sc.criticalBlockers} blockers</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Critical Blockers */}
          {criticalBlockers.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" /> Critical Blockers ({criticalBlockers.length})
              </h2>
              <div className="space-y-2 mb-6">
                {criticalBlockers.slice(0, 8).map(b => (
                  <Card key={b.id} className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-3 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{b.title}</p>
                        <p className="text-[10px] text-muted-foreground">{b.notes}</p>
                        <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground">
                          <span>{b.module}</span>·<span>{b.owner}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Operational Risk Signals */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Operational Risk Signals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Open Bookings", value: data.openBookings, warn: 20 },
              { label: "Escalations", value: data.escalations, warn: 1 },
              { label: "Stale Bookings", value: data.staleBookings, warn: 1 },
              { label: "Disputes", value: data.disputes, warn: 1 },
            ].map(m => {
              const isRisk = m.value >= m.warn;
              return (
                <div key={m.label} className={`rounded-lg border p-3 text-center ${isRisk ? "bg-destructive/5 border-destructive/15" : "bg-success/5 border-success/15"}`}>
                  <p className={`text-lg font-bold ${isRisk ? "text-destructive" : "text-success"}`}>{m.value}</p>
                  <p className="text-[9px] text-muted-foreground">{m.label}</p>
                </div>
              );
            })}
          </div>

          {/* AI Advisory */}
          <Card className="mb-6 border-primary/15 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">AI Advisory Recommendation</p>
              <p className="text-sm text-foreground">
                {verdict === "READY_FOR_PILOT"
                  ? "All systems indicate readiness for a controlled pilot launch in covered zones."
                  : verdict === "READY_WITH_WARNINGS"
                  ? "Platform is structurally ready. Address warnings for optimal pilot experience."
                  : verdict === "PILOT_ONLY"
                  ? "Critical blockers remain. Recommend highly controlled pilot with manual ops oversight."
                  : "Multiple critical gaps prevent safe launch. Resolve blockers before proceeding."}
              </p>
              <Separator className="my-2" />
              <p className="text-[10px] text-destructive font-medium">⚠ Human Decision Required — AI recommendation is advisory only</p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Launch Operations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {NAV_LINKS.map(link => (
              <Button key={link.path} variant="outline" size="sm" className="justify-start gap-2 h-9 text-xs" onClick={() => navigate(link.path)}>
                <link.icon className="w-3.5 h-3.5" /> {link.label} <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
