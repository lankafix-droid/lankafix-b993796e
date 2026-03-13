import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, MapPin, Users, Clock, TrendingUp, AlertTriangle, BarChart3, RefreshCw, Loader2, CheckCircle2, XCircle, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DISPATCH_DEFAULTS } from "@/lib/locationUtils";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";

const catLabel = (code: string) => CATEGORY_LABELS[code as CategoryCode] || code;

interface DispatchData {
  totalDispatches: number;
  accepted: number;
  declined: number;
  timedOut: number;
  escalated: number;
  successRate: number;
  avgResponseSec: number;
  avgScore: number;
  dispatchByCategory: { code: string; count: number; pct: number }[];
  topPartners: { id: string; name: string; score: number; accepted: number; zone: string }[];
  lowAcceptance: { id: string; name: string; rate: number; declined: number }[];
  roundDistribution: { round: number; count: number }[];
  escalationReasons: { reason: string; count: number }[];
}

const EMPTY: DispatchData = {
  totalDispatches: 0, accepted: 0, declined: 0, timedOut: 0, escalated: 0,
  successRate: 0, avgResponseSec: 0, avgScore: 0,
  dispatchByCategory: [], topPartners: [], lowAcceptance: [],
  roundDistribution: [], escalationReasons: [],
};

export default function DispatchAnalyticsPage() {
  const [data, setData] = useState<DispatchData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      // Parallel queries
      const [dispatchRes, escalationRes, partnerRes, bookingsRes] = await Promise.all([
        supabase.from("dispatch_log").select("*").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }).limit(1000),
        supabase.from("dispatch_escalations").select("*").gte("created_at", thirtyDaysAgo).limit(500),
        supabase.from("partners").select("id, full_name, acceptance_rate, service_zones, performance_score, completed_jobs_count").eq("verification_status", "verified"),
        supabase.from("bookings").select("id, category_code, dispatch_status").gte("created_at", thirtyDaysAgo).limit(1000),
      ]);

      const logs = dispatchRes.data || [];
      const escalations = escalationRes.data || [];
      const partners = partnerRes.data || [];
      const bookings = bookingsRes.data || [];

      // Status counts
      const accepted = logs.filter(l => l.status === "accepted" || l.status === "ops_confirmed").length;
      const declined = logs.filter(l => l.status === "declined").length;
      const timedOut = logs.filter(l => l.status === "timed_out").length;
      const total = logs.length;
      const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

      // Avg response time (only for responded entries)
      const responded = logs.filter(l => l.response_time_seconds && l.response_time_seconds > 0);
      const avgResponseSec = responded.length > 0
        ? Math.round(responded.reduce((s, l) => s + (l.response_time_seconds || 0), 0) / responded.length)
        : 0;

      // Avg score
      const scored = logs.filter(l => l.score && Number(l.score) > 0);
      const avgScore = scored.length > 0
        ? Math.round(scored.reduce((s, l) => s + Number(l.score || 0), 0) / scored.length)
        : 0;

      // Category distribution from bookings
      const catCounts: Record<string, number> = {};
      bookings.forEach(b => { catCounts[b.category_code] = (catCounts[b.category_code] || 0) + 1; });
      const totalBookings = bookings.length || 1;
      const dispatchByCategory = Object.entries(catCounts)
        .map(([code, count]) => ({ code, count, pct: Math.round((count / totalBookings) * 100) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Top partners by dispatch score (accepted dispatches)
      const partnerAccepts: Record<string, { score: number; count: number }> = {};
      logs.filter(l => l.status === "accepted").forEach(l => {
        if (!partnerAccepts[l.partner_id]) partnerAccepts[l.partner_id] = { score: 0, count: 0 };
        partnerAccepts[l.partner_id].score += Number(l.score || 0);
        partnerAccepts[l.partner_id].count += 1;
      });
      const topPartners = Object.entries(partnerAccepts)
        .map(([id, { score, count }]) => {
          const p = partners.find(pp => pp.id === id);
          return {
            id, name: p?.full_name || "Unknown",
            score: count > 0 ? Math.round(score / count) : 0,
            accepted: count,
            zone: p?.service_zones?.[0]?.replace(/_/g, " ") || "—",
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      // Low acceptance partners
      const lowAcceptance = partners
        .filter(p => p.acceptance_rate !== null && Number(p.acceptance_rate) < 60 && (p.completed_jobs_count || 0) > 3)
        .map(p => {
          const declines = logs.filter(l => l.partner_id === p.id && l.status === "declined").length;
          return { id: p.id, name: p.full_name, rate: Number(p.acceptance_rate || 0), declined: declines };
        })
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 5);

      // Round distribution
      const roundCounts: Record<number, number> = {};
      logs.forEach(l => {
        const r = l.dispatch_round || 1;
        roundCounts[r] = (roundCounts[r] || 0) + 1;
      });
      const roundDistribution = Object.entries(roundCounts)
        .map(([round, count]) => ({ round: Number(round), count }))
        .sort((a, b) => a.round - b.round);

      // Escalation reasons
      const reasonCounts: Record<string, number> = {};
      escalations.forEach(e => {
        const r = e.reason || "unknown";
        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
      });
      const escalationReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      setData({
        totalDispatches: total, accepted, declined, timedOut,
        escalated: escalations.length, successRate, avgResponseSec, avgScore,
        dispatchByCategory, topPartners, lowAcceptance,
        roundDistribution, escalationReasons,
      });
    } catch (e) {
      console.error("Dispatch analytics load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const healthColor = (rate: number) =>
    rate >= 80 ? "text-success" : rate >= 60 ? "text-warning" : "text-destructive";
  const healthLabel = (rate: number) =>
    rate >= 80 ? "Healthy" : rate >= 60 ? "Watch" : "Risk";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-5xl">
          <Link to="/ops/dispatch" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dispatch Board
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Dispatch Intelligence</h1>
                <p className="text-xs text-muted-foreground">Last 30 days · Live data</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Total Dispatches</p>
                    <p className="text-2xl font-bold text-foreground">{data.totalDispatches.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Success Rate</p>
                    <p className={`text-2xl font-bold ${healthColor(data.successRate)}`}>{data.successRate}%</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{healthLabel(data.successRate)}</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Avg Response</p>
                    <p className="text-2xl font-bold text-foreground">{data.avgResponseSec}s</p>
                    <p className="text-[10px] text-muted-foreground">{data.avgResponseSec <= 120 ? "✓ Healthy" : "⚠ Slow"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-primary">{data.avgScore}/100</p>
                  </CardContent>
                </Card>
              </div>

              {/* Acceptance breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                    <p className="text-lg font-bold text-foreground">{data.accepted.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <XCircle className="w-4 h-4 text-warning" />
                  <div>
                    <p className="text-xs text-muted-foreground">Declined</p>
                    <p className="text-lg font-bold text-foreground">{data.declined}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <Timer className="w-4 h-4 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Timed Out</p>
                    <p className="text-lg font-bold text-foreground">{data.timedOut}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Escalated</p>
                    <p className="text-lg font-bold text-foreground">{data.escalated}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Top Partners */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Most Responsive Partners
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.topPartners.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">No dispatch data yet</p>
                    )}
                    {data.topPartners.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-foreground">{p.name}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">{p.zone}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.accepted} jobs</span>
                          <Badge className="text-[10px]">{p.score}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Low Acceptance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Low Acceptance Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.lowAcceptance.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">All partners healthy</p>
                    )}
                    {data.lowAcceptance.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.declined} declined</span>
                          <Badge variant="destructive" className="text-[10px]">{p.rate}%</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Dispatch by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.dispatchByCategory.map((c) => (
                      <div key={c.code} className="space-y-0.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{catLabel(c.code)}</span>
                          <span className="text-xs text-muted-foreground">{c.count} ({c.pct}%)</span>
                        </div>
                        <Progress value={c.pct} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Round Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Dispatch Round Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.roundDistribution.map((r) => {
                      const maxCount = Math.max(...data.roundDistribution.map(rr => rr.count), 1);
                      return (
                        <div key={r.round} className="space-y-0.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">Round {r.round}</span>
                            <span className="text-xs text-muted-foreground">{r.count} dispatches</span>
                          </div>
                          <Progress value={(r.count / maxCount) * 100} className="h-1.5" />
                        </div>
                      );
                    })}
                    {data.roundDistribution.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">No dispatch rounds recorded</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Escalation Reasons */}
              {data.escalationReasons.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Escalation Reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {data.escalationReasons.map((e) => (
                        <Badge key={e.reason} variant="outline" className="text-xs">
                          {e.reason.replace(/_/g, " ")} · {e.count}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Score Model Reference */}
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Dispatch Score Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: "Proximity", weight: "30%" },
                      { label: "Specialization", weight: "20%" },
                      { label: "Rating", weight: "15%" },
                      { label: "Response Speed", weight: "10%" },
                      { label: "Workload", weight: "10%" },
                      { label: "Completion Rate", weight: "10%" },
                      { label: "Emergency", weight: "5%" },
                      { label: "Perf + Tier", weight: "5%" },
                    ].map((w) => (
                      <div key={w.label} className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{w.label}</p>
                        <p className="text-sm font-bold text-primary">{w.weight}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    + Zone preference · New partner boost · Vehicle bonus · Penalty deductions (strikes, late arrivals, high cancellation)
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
