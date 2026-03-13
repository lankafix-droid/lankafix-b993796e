import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, TrendingUp, Users, MapPin, Zap, Shield, DollarSign, BarChart3,
  AlertTriangle, Clock, Star, ArrowUp, ArrowDown, ArrowLeft,
  Activity, ChevronRight, Flame, Gauge, Target, Loader2, RefreshCw,
  CheckCircle2, XCircle, Truck, PieChart,
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";
import { MARKET_PRICE_RANGES, formatLKR } from "@/engines/pricingIntelligenceEngine";
import { computeReliabilityTier } from "@/engines/partnerTieringEngine";

// ─── Helpers ─────────────────────────────────────────────────────
const catLabel = (code: string) => CATEGORY_LABELS[code as CategoryCode] || code;
const PHASE1_CATS = ["AC", "MOBILE", "CONSUMER_ELEC", "IT"];

function Metric({ label, value, sub, icon: Icon, alert }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Data types ──────────────────────────────────────────────────
interface IntelData {
  todayBookings: number;
  monthBookings: number;
  revenue30d: number;
  verifiedPartners: number;
  onlinePartners: number;
  avgRating: string;
  completionRate: number;
  categoryDemand: { code: string; count: number; pct: number }[];
  zonePerformance: { zone: string; bookings: number; partners: number; health: string }[];
  gaps: { zone: string; category: string; demand: number; partners: number; severity: string; recruit: number }[];
  dispatchSuccess: number;
  avgResponseMin: number;
  escalationCount: number;
  tiers: Record<string, number>;
  flaggedPartners: { id: string; name: string; rating: number | null; acceptRate: number | null; tier: string; reason: string }[];
}

// ─── Main Page ───────────────────────────────────────────────────
export default function AIIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<IntelData | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const month = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [
        { count: todayCount },
        { data: monthRows },
        { data: partners },
        { data: escalations },
        { data: dispatches },
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("bookings").select("category_code, zone_code, status, final_price_lkr").gte("created_at", month),
        supabase.from("partners").select("id, full_name, rating_average, acceptance_rate, performance_score, completed_jobs_count, cancellation_rate, strike_count, on_time_rate, quote_approval_rate, verification_status, availability_status, categories_supported, service_zones"),
        supabase.from("dispatch_escalations").select("id").gte("created_at", month).is("resolved_at", null),
        supabase.from("dispatch_log").select("response, response_time_seconds").gte("created_at", month),
      ]);

      const bookings = monthRows || [];
      const allPartners = partners || [];
      const verified = allPartners.filter(p => p.verification_status === "verified");
      const online = allPartners.filter(p => p.availability_status === "online");
      const completed = bookings.filter(b => b.status === "completed");

      // Category demand
      const catMap: Record<string, number> = {};
      bookings.forEach(b => { catMap[b.category_code] = (catMap[b.category_code] || 0) + 1; });
      const total = bookings.length || 1;
      const categoryDemand = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ code, count, pct: Math.round(count / total * 100) }));

      // Zone performance
      const zoneMap: Record<string, number> = {};
      bookings.forEach(b => { if (b.zone_code) zoneMap[b.zone_code] = (zoneMap[b.zone_code] || 0) + 1; });
      const zonePartners: Record<string, number> = {};
      allPartners.forEach(p => (p.service_zones || []).forEach((z: string) => { zonePartners[z] = (zonePartners[z] || 0) + 1; }));
      const zonePerformance = Object.entries(zoneMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([zone, bookings]) => ({
          zone, bookings, partners: zonePartners[zone] || 0,
          health: (zonePartners[zone] || 0) >= 3 ? "healthy" : (zonePartners[zone] || 0) >= 1 ? "watch" : "risk",
        }));

      // Supply gaps — only Phase 1 categories
      const gaps: IntelData["gaps"] = [];
      Object.keys(zoneMap).forEach(zone => {
        PHASE1_CATS.forEach(cat => {
          const demand = bookings.filter(b => b.zone_code === zone && b.category_code === cat).length;
          const supply = verified.filter(p =>
            (p.service_zones || []).includes(zone) && (p.categories_supported || []).includes(cat)
          ).length;
          if (demand >= 2 && supply < 2) {
            gaps.push({ zone, category: cat, demand, partners: supply, severity: supply === 0 ? "critical" : "warning", recruit: Math.max(3 - supply, 1) });
          }
        });
      });

      // Dispatch
      const allD = dispatches || [];
      const accepted = allD.filter(d => d.response === "accepted");
      const times = allD.filter(d => d.response_time_seconds).map(d => d.response_time_seconds!);

      // Tiers
      const tiers: Record<string, number> = { elite: 0, pro: 0, verified: 0, under_review: 0 };
      const flagged: IntelData["flaggedPartners"] = [];
      verified.forEach(p => {
        const r = computeReliabilityTier({
          performance_score: p.performance_score, rating_average: p.rating_average,
          completed_jobs_count: p.completed_jobs_count, cancellation_rate: p.cancellation_rate,
          strike_count: p.strike_count, on_time_rate: p.on_time_rate,
          acceptance_rate: p.acceptance_rate, quote_approval_rate: p.quote_approval_rate,
        });
        tiers[r.tier]++;
        if (r.tier === "under_review" || (p.rating_average != null && p.rating_average < 3.5) || (p.acceptance_rate != null && p.acceptance_rate < 60)) {
          flagged.push({ id: p.id, name: p.full_name, rating: p.rating_average, acceptRate: p.acceptance_rate, tier: r.tier, reason: r.reason });
        }
      });

      // Rating
      const rated = verified.filter(p => p.rating_average && p.rating_average > 0);
      const avgRating = rated.length > 0 ? (rated.reduce((s, p) => s + (p.rating_average || 0), 0) / rated.length).toFixed(1) : "—";

      setD({
        todayBookings: todayCount || 0,
        monthBookings: bookings.length,
        revenue30d: bookings.reduce((s, b) => s + (b.final_price_lkr || 0), 0),
        verifiedPartners: verified.length,
        onlinePartners: online.length,
        avgRating,
        completionRate: bookings.length > 0 ? Math.round(completed.length / bookings.length * 100) : 0,
        categoryDemand,
        zonePerformance,
        gaps: gaps.sort((a, b) => (a.severity === "critical" ? -1 : 1)).slice(0, 8),
        dispatchSuccess: allD.length > 0 ? Math.round(accepted.length / allD.length * 100) : 0,
        avgResponseMin: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : 0,
        escalationCount: escalations?.length || 0,
        tiers,
        flaggedPartners: flagged.slice(0, 6),
      });
    } catch (err) {
      console.error("AI Intelligence load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !d) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Intelligence…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link to="/ops/control-tower">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> AI Intelligence
            </h1>
            <p className="text-[11px] text-muted-foreground">Pilot operations dashboard</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="executive" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 mb-4">
            <TabsList className="inline-flex w-auto gap-0.5 h-auto p-1">
              <TabsTrigger value="executive" className="text-[10px] px-2.5 py-1.5"><PieChart className="w-3 h-3 mr-1" />Overview</TabsTrigger>
              <TabsTrigger value="demand" className="text-[10px] px-2.5 py-1.5"><Flame className="w-3 h-3 mr-1" />Demand</TabsTrigger>
              <TabsTrigger value="supply" className="text-[10px] px-2.5 py-1.5"><Users className="w-3 h-3 mr-1" />Supply</TabsTrigger>
              <TabsTrigger value="dispatch" className="text-[10px] px-2.5 py-1.5"><Zap className="w-3 h-3 mr-1" />Dispatch</TabsTrigger>
              <TabsTrigger value="partners" className="text-[10px] px-2.5 py-1.5"><Gauge className="w-3 h-3 mr-1" />Partners</TabsTrigger>
              <TabsTrigger value="pricing" className="text-[10px] px-2.5 py-1.5"><DollarSign className="w-3 h-3 mr-1" />Pricing</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Executive Overview ── */}
          <TabsContent value="executive" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label="Bookings Today" value={d.todayBookings} icon={BarChart3} />
              <Metric label="Bookings (30d)" value={d.monthBookings} icon={TrendingUp} />
              <Metric label="Revenue (30d)" value={d.revenue30d > 0 ? `LKR ${(d.revenue30d / 1000).toFixed(0)}K` : "—"} icon={DollarSign} sub="Platform total" />
              <Metric label="Completion Rate" value={`${d.completionRate}%`} icon={CheckCircle2} />
              <Metric label="Verified Partners" value={d.verifiedPartners} icon={Shield} />
              <Metric label="Online Now" value={d.onlinePartners} icon={Activity} alert={d.onlinePartners === 0} />
              <Metric label="Avg Rating" value={d.avgRating} icon={Star} />
              <Metric label="Escalations" value={d.escalationCount} icon={AlertTriangle} alert={d.escalationCount > 0} />
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Top Categories (30d)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {d.categoryDemand.slice(0, 6).map(c => (
                  <div key={c.code}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium">{catLabel(c.code)}</span>
                      <span className="text-muted-foreground">{c.count} ({c.pct}%)</span>
                    </div>
                    <Progress value={c.pct} className="h-1" />
                  </div>
                ))}
                {d.categoryDemand.length === 0 && <p className="text-xs text-muted-foreground">No bookings yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Zone Health</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {d.zonePerformance.map(z => (
                  <div key={z.zone} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span>{z.zone}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{z.bookings} jobs · {z.partners} partners</span>
                      <Badge variant={z.health === "healthy" ? "default" : z.health === "watch" ? "secondary" : "destructive"} className="text-[9px]">{z.health}</Badge>
                    </div>
                  </div>
                ))}
                {d.zonePerformance.length === 0 && <p className="text-xs text-muted-foreground">No zone data</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Demand Intelligence ── */}
          <TabsContent value="demand" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label="Today" value={d.todayBookings} icon={Flame} />
              <Metric label="30-Day Total" value={d.monthBookings} icon={BarChart3} />
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Category Demand Ranking</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {d.categoryDemand.map((c, i) => (
                  <div key={c.code}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium">{i + 1}. {catLabel(c.code)}</span>
                      <span>{c.count} requests</span>
                    </div>
                    <Progress value={c.pct} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Under-Served Zones</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {d.zonePerformance.filter(z => z.health !== "healthy").length === 0 ? (
                  <p className="text-xs text-muted-foreground">All active zones are healthy</p>
                ) : d.zonePerformance.filter(z => z.health !== "healthy").map(z => (
                  <div key={z.zone} className="flex items-center justify-between text-xs border-l-2 border-destructive pl-3 py-1">
                    <div>
                      <span className="font-medium">{z.zone}</span>
                      <p className="text-[10px] text-muted-foreground">{z.bookings} bookings · {z.partners} partners</p>
                    </div>
                    <Badge variant="destructive" className="text-[9px]">{z.health}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Link to="/ops/ai-growth">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                Full Demand Dashboard <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </Link>
          </TabsContent>

          {/* ── Supply Gap ── */}
          <TabsContent value="supply" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label="Verified Partners" value={d.verifiedPartners} icon={Users} />
              <Metric label="Online Now" value={d.onlinePartners} icon={Activity} alert={d.onlinePartners === 0} />
              <Metric label="Supply Gaps" value={d.gaps.length} icon={AlertTriangle} alert={d.gaps.length > 0} />
              <Metric label="Coverage" value={d.verifiedPartners > 0 ? `${Math.round(d.onlinePartners / d.verifiedPartners * 100)}%` : "—"} icon={Shield} sub="Online / verified" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Supply Gap Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.gaps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No critical supply gaps in Phase-1 categories</p>
                ) : d.gaps.map((g, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${g.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold">{catLabel(g.category)}</span>
                      <Badge variant={g.severity === "critical" ? "destructive" : "secondary"} className="text-[9px]">{g.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Zone: {g.zone}</p>
                    <div className="flex gap-4 text-xs mt-1">
                      <span>Demand: <strong>{g.demand}</strong></span>
                      <span>Partners: <strong>{g.partners}</strong></span>
                    </div>
                    <p className="text-xs text-primary mt-1 font-medium">→ Recruit {g.recruit} new partner{g.recruit > 1 ? "s" : ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Link to="/ops/intelligence">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                Marketplace Intelligence <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </Link>
          </TabsContent>

          {/* ── Dispatch Intelligence ── */}
          <TabsContent value="dispatch" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label="Dispatch Success" value={`${d.dispatchSuccess}%`} icon={CheckCircle2} />
              <Metric label="Avg Response" value={d.avgResponseMin > 0 ? `${d.avgResponseMin}m` : "—"} icon={Clock} />
              <Metric label="Escalations" value={d.escalationCount} icon={AlertTriangle} alert={d.escalationCount > 0} />
              <Metric label="Online Partners" value={d.onlinePartners} icon={Activity} alert={d.onlinePartners === 0} />
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">AI Dispatch Score Weights</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Proximity (zone match)", weight: 30 },
                  { label: "Specialization", weight: 20 },
                  { label: "Customer Rating", weight: 15 },
                  { label: "Response Speed", weight: 10 },
                  { label: "Workload Balance", weight: 10 },
                  { label: "Completion Rate", weight: 10 },
                  { label: "Emergency Priority", weight: 5 },
                ].map(w => (
                  <div key={w.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{w.label}</span><span className="font-medium">{w.weight}%</span>
                    </div>
                    <Progress value={w.weight} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Link to="/ops/dispatch">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1"><MapPin className="w-3 h-3" />Dispatch Board</Button>
              </Link>
              <Link to="/ops/dispatch-analytics">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1"><BarChart3 className="w-3 h-3" />Analytics</Button>
              </Link>
            </div>
          </TabsContent>

          {/* ── Partner Performance ── */}
          <TabsContent value="partners" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label="Elite" value={d.tiers.elite} icon={Star} />
              <Metric label="Pro" value={d.tiers.pro} icon={CheckCircle2} />
              <Metric label="Verified" value={d.tiers.verified} icon={Shield} />
              <Metric label="Under Review" value={d.tiers.under_review} icon={AlertTriangle} alert={d.tiers.under_review > 0} />
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Partners Needing Attention</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {d.flaggedPartners.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No partners currently flagged for review</p>
                ) : d.flaggedPartners.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs border-l-2 border-destructive pl-3 py-1.5">
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <p className="text-[10px] text-muted-foreground">
                        Rating: {p.rating?.toFixed(1) ?? "—"} · Accept: {p.acceptRate ?? "—"}%
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">{p.reason}</p>
                    </div>
                    <Badge variant="destructive" className="text-[9px] shrink-0 ml-2">{p.tier}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Link to="/ops/provider-readiness">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                Partner Readiness Dashboard <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </Link>
          </TabsContent>

          {/* ── Pricing Intelligence (lightweight) ── */}
          <TabsContent value="pricing" className="space-y-4 mt-0">
            <p className="text-xs text-muted-foreground">
              Reference price ranges for Phase-1 categories. Based on market research — actual quote data will refine these over time.
            </p>
            {PHASE1_CATS.map(cat => {
              const items = MARKET_PRICE_RANGES.filter(r => r.category === cat);
              if (items.length === 0) return null;
              return (
                <Card key={cat}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{catLabel(cat)}</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {items.slice(0, 5).map(item => (
                      <div key={item.serviceKey} className="flex items-center justify-between text-xs border-b border-border/30 pb-1 last:border-0">
                        <span>{item.label}</span>
                        <div className="text-right">
                          <span className="font-semibold">{formatLKR(item.typicalLKR)}</span>
                          <span className="text-muted-foreground ml-1 text-[10px]">({formatLKR(item.minLKR)}–{formatLKR(item.maxLKR)})</span>
                        </div>
                      </div>
                    ))}
                    {items.length > 5 && <p className="text-[10px] text-muted-foreground text-center pt-1">+{items.length - 5} more services</p>}
                  </CardContent>
                </Card>
              );
            })}

            <Link to="/ops/pricing">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                Full Pricing Editor <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </Link>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
