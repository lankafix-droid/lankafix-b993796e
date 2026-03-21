/**
 * Ops Marketplace Overview — Stalled bookings, lifecycle distribution, key metrics
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle, Clock, CheckCircle2, XCircle, TrendingUp,
  BarChart3, Users, Wrench, Activity, RefreshCw,
} from "lucide-react";
import { LIFECYCLE_STAGES, mapBookingStatusToStage, type BookingLifecycleStage } from "@/lib/bookingLifecycleModel";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

const STALE_HOURS = 4;

export default function MarketplaceOverviewPage() {
  useEffect(() => { track("ops_marketplace_overview_view"); }, []);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["ops-marketplace-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, dispatch_status, category_code, created_at, updated_at, partner_id, is_emergency, customer_rating, final_price_lkr, estimated_price_lkr, cancelled_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const all = bookings ?? [];
  const now = Date.now();

  // Lifecycle distribution
  const stageCounts: Record<string, number> = {};
  const stalled: typeof all = [];
  const active: typeof all = [];

  for (const b of all) {
    const stage = mapBookingStatusToStage(b.status, b.dispatch_status);
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    if (!["completed", "cancelled"].includes(stage)) {
      active.push(b);
      const ageHours = (now - new Date(b.updated_at).getTime()) / 3_600_000;
      if (ageHours > STALE_HOURS) stalled.push(b);
    }
  }

  const completed = all.filter((b) => b.status === "completed" || b.customer_rating);
  const cancelled = all.filter((b) => b.status === "cancelled");
  const rated = all.filter((b) => b.customer_rating != null);
  const revenue = completed.reduce((s, b) => s + (b.final_price_lkr ?? b.estimated_price_lkr ?? 0), 0);
  const completionRate = all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0;
  const cancellationRate = all.length > 0 ? Math.round((cancelled.length / all.length) * 100) : 0;

  const topStages = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Marketplace Overview</h1>
            <p className="text-sm text-muted-foreground">{all.length} bookings · {active.length} active · {stalled.length} stalled</p>
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active", value: active.length, icon: Activity, color: "text-primary" },
            { label: "Completed", value: `${completionRate}%`, icon: CheckCircle2, color: "text-success" },
            { label: "Cancelled", value: `${cancellationRate}%`, icon: XCircle, color: "text-destructive" },
            { label: "Revenue", value: `Rs ${(revenue / 1000).toFixed(0)}k`, icon: TrendingUp, color: "text-primary" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/60 ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lifecycle distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" /> Lifecycle Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {topStages.map(([stage, count]) => {
                const info = LIFECYCLE_STAGES[stage as BookingLifecycleStage];
                if (!info) return null;
                return (
                  <div key={stage} className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={`text-[9px] ${info.badgeBg}`}>{info.label}</Badge>
                      <span className="text-sm font-bold text-foreground">{count}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Actor: {info.actorLabel}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stalled bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-warning" /> Stalled Bookings ({stalled.length})
              <span className="text-[10px] text-muted-foreground font-normal ml-1">No update in {STALE_HOURS}h+</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stalled.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No stalled bookings — all clear ✓</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stalled.slice(0, 20).map((b) => {
                  const stage = mapBookingStatusToStage(b.status, b.dispatch_status);
                  const info = LIFECYCLE_STAGES[stage];
                  const ageH = Math.round((now - new Date(b.updated_at).getTime()) / 3_600_000);
                  return (
                    <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{b.id.slice(0, 8)}</span>
                          <Badge variant="outline" className={`text-[9px] ${info?.badgeBg}`}>{info?.label}</Badge>
                          {b.is_emergency && <Badge variant="destructive" className="text-[8px]">SOS</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{b.category_code} · Stalled {ageH}h · Actor: {info?.actorLabel}</p>
                      </div>
                      <Clock className="w-4 h-4 text-warning shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{rated.length}</p>
              <p className="text-xs text-muted-foreground">Rated Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Wrench className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{new Set(all.filter((b) => b.partner_id).map((b) => b.partner_id)).size}</p>
              <p className="text-xs text-muted-foreground">Active Partners</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {rated.length > 0 ? (rated.reduce((s, b) => s + (b.customer_rating ?? 0), 0) / rated.length).toFixed(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
