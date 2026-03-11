import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, TrendingUp, TrendingDown, Minus, MapPin, Users, AlertTriangle,
  BarChart3, Search, ShieldAlert, Package, ArrowLeft, Loader2, RefreshCw,
  Zap, CheckCircle2, XCircle, Target, Lightbulb, Activity,
} from "lucide-react";

// ─── Types ───
interface Summary {
  total_bookings_30d: number;
  total_bookings_prev_30d: number;
  booking_growth_pct: number;
  total_emergencies_30d: number;
  total_completed_30d: number;
  total_cancelled_30d: number;
  completion_rate: number;
  total_quotes: number;
  quote_approval_rate: number;
  quote_rejection_rate: number;
  total_verified_partners: number;
  partners_online: number;
  total_ai_searches: number;
  search_conversion_rate: number;
  active_alerts: number;
  total_zones_active: number;
}

interface DemandCategory {
  category_code: string;
  category_name: string;
  current_period: number;
  previous_period: number;
  growth_pct: number;
  trending: string;
  emergency_count: number;
  completed_count: number;
  completion_rate: number;
}

interface DemandZone {
  zone_code: string;
  zone_name: string;
  booking_count: number;
  emergency_count: number;
  top_category: string;
  demand_level: string;
}

interface NoMatchInsight {
  category_code: string;
  category_name: string;
  total_matches: number;
  no_match_count: number;
  no_match_rate: number;
}

interface QuoteInsight {
  category_code: string;
  category_name: string;
  total_quotes: number;
  rejected_count: number;
  rejection_rate: number;
  avg_quote_lkr: number;
}

interface SupplyItem {
  category_code: string;
  category_name: string;
  verified_partners: number;
  online_now: number;
  zones_covered: number;
  demand_30d: number;
  demand_to_partner_ratio: number;
  supply_status: string;
}

interface ZoneGap {
  zone_code: string;
  zone_name: string;
  category_code: string;
  demand: number;
  partners: number;
  gap_severity: string;
}

interface ServiceGap {
  category_code: string;
  category_name: string;
  unconverted_searches: number;
  sample_queries: string[];
  gap_score: number;
}

interface Alert {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  category?: string;
  zone?: string;
  recommended_action: string;
}

interface IntelligenceData {
  summary: Summary;
  demand_by_category: DemandCategory[];
  demand_by_zone: DemandZone[];
  no_match_insights: NoMatchInsight[];
  no_match_hotspots: { zone_code: string; zone_name: string; no_match_count: number; no_match_rate: number }[];
  quote_insights: QuoteInsight[];
  supply_analysis: SupplyItem[];
  zone_supply_gaps: ZoneGap[];
  service_gaps: ServiceGap[];
  alerts: Alert[];
  generated_at: string;
}

// ─── Helpers ───
const trendIcon = (t: string) =>
  t === "rising" ? <TrendingUp className="w-3.5 h-3.5 text-success" /> :
  t === "declining" ? <TrendingDown className="w-3.5 h-3.5 text-destructive" /> :
  <Minus className="w-3.5 h-3.5 text-muted-foreground" />;

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/10 border-destructive/20 text-destructive",
  warning: "bg-warning/10 border-warning/20 text-warning",
  info: "bg-primary/10 border-primary/20 text-primary",
};

const supplyStatusBadge = (s: string) => {
  const styles: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/30",
    low: "bg-warning/10 text-warning border-warning/30",
    adequate: "bg-success/10 text-success border-success/30",
    none: "bg-destructive text-destructive-foreground",
  };
  return styles[s] || "bg-muted text-muted-foreground";
};

function KPICard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-bold text-foreground">{value}</p>
            {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-success" />}
            {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
          </div>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ───
export default function MarketplaceIntelligencePage() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("marketplace-intelligence");
      if (err) throw new Error(err.message);
      setData(res as IntelligenceData);
    } catch (e: any) {
      setError(e.message || "Failed to load intelligence data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing marketplace data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error || "No data available"}</p>
            <Button onClick={fetchData} variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ops/ai-growth"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <Brain className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Marketplace Intelligence</h1>
              <p className="text-[10px] text-muted-foreground">
                Live data · Updated {new Date(data.generated_at).toLocaleTimeString("en-LK")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.alerts.filter(a => a.severity === "critical").length > 0 && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <ShieldAlert className="w-3 h-3" />
                {data.alerts.filter(a => a.severity === "critical").length} Critical
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 gap-1 text-xs">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            <TabsTrigger value="overview" className="text-[11px]">Overview</TabsTrigger>
            <TabsTrigger value="demand" className="text-[11px]">Demand</TabsTrigger>
            <TabsTrigger value="supply" className="text-[11px]">Supply</TabsTrigger>
            <TabsTrigger value="quotes" className="text-[11px]">Quotes</TabsTrigger>
            <TabsTrigger value="gaps" className="text-[11px]">Gaps</TabsTrigger>
            <TabsTrigger value="alerts" className="text-[11px]">Alerts</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW ═══ */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Bookings (30d)" value={s.total_bookings_30d} sub={`${s.booking_growth_pct > 0 ? "+" : ""}${s.booking_growth_pct}% vs prev period`} icon={BarChart3} trend={s.booking_growth_pct > 0 ? "up" : s.booking_growth_pct < 0 ? "down" : "neutral"} />
              <KPICard label="Completion Rate" value={`${s.completion_rate}%`} sub={`${s.total_completed_30d} completed`} icon={CheckCircle2} />
              <KPICard label="Quote Approval" value={`${s.quote_approval_rate}%`} sub={`${s.total_quotes} quotes total`} icon={Target} />
              <KPICard label="Partners Online" value={s.partners_online} sub={`of ${s.total_verified_partners} verified`} icon={Users} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="AI Searches" value={s.total_ai_searches} sub={`${s.search_conversion_rate}% conversion`} icon={Search} />
              <KPICard label="Emergencies" value={s.total_emergencies_30d} icon={Zap} />
              <KPICard label="Cancellations" value={s.total_cancelled_30d} icon={XCircle} />
              <KPICard label="Active Zones" value={s.total_zones_active} icon={MapPin} />
            </div>

            {/* Top Alerts */}
            {data.alerts.length > 0 && (
              <Card className="border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" /> Priority Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.alerts.slice(0, 5).map((a, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${severityStyles[a.severity]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">{a.severity}</Badge>
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5">{a.description}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium">
                        <Lightbulb className="w-3 h-3" /> {a.recommended_action}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Rising Categories */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Category Demand (30 days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.demand_by_category.slice(0, 8).map(c => (
                  <div key={c.category_code} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate">{c.category_name}</span>
                        <div className="flex items-center gap-1.5">
                          {trendIcon(c.trending)}
                          <span className={`text-xs font-medium ${c.growth_pct > 0 ? "text-success" : c.growth_pct < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {c.growth_pct > 0 ? "+" : ""}{c.growth_pct}%
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{c.current_period} bookings</span>
                        <span>{c.completion_rate}% completed</span>
                        {c.emergency_count > 0 && <span className="text-destructive">{c.emergency_count} emergency</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {data.demand_by_category.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No booking data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ DEMAND ═══ */}
          <TabsContent value="demand" className="space-y-5 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Zone Demand
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.demand_by_zone.map(z => (
                  <div key={z.zone_code} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border">
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${
                      z.demand_level === "high" ? "bg-destructive/10 text-destructive border-destructive/30" :
                      z.demand_level === "medium" ? "bg-warning/10 text-warning border-warning/30" :
                      "bg-muted text-muted-foreground"
                    }`}>{z.demand_level}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate">{z.zone_name}</span>
                        <span className="text-xs text-muted-foreground">{z.booking_count} bookings</span>
                      </div>
                      <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                        <span>Top: {z.top_category}</span>
                        {z.emergency_count > 0 && <span className="text-destructive">{z.emergency_count} emergency</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {data.demand_by_zone.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No zone data yet</p>
                )}
              </CardContent>
            </Card>

            {/* No-Match Hotspots */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> No-Match Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Categories where matching failed to find an eligible technician</p>
                {data.no_match_insights.map(nm => (
                  <div key={nm.category_code} className="p-3 rounded-lg bg-warning/5 border border-warning/15">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{nm.category_name}</span>
                      <span className="text-sm font-bold text-warning">{nm.no_match_rate}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={nm.no_match_rate} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground">{nm.no_match_count}/{nm.total_matches}</span>
                    </div>
                  </div>
                ))}
                {data.no_match_insights.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-3">
                    <CheckCircle2 className="w-4 h-4" /> No significant no-match issues detected
                  </div>
                )}

                {data.no_match_hotspots.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-[11px] font-medium text-foreground">Zone-Level No-Match Hotspots</p>
                    {data.no_match_hotspots.slice(0, 5).map(h => (
                      <div key={h.zone_code} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                        <span className="text-foreground">{h.zone_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{h.no_match_count} missed</span>
                          <Badge variant="outline" className="text-[9px]">{h.no_match_rate}%</Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ SUPPLY ═══ */}
          <TabsContent value="supply" className="space-y-5 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Supply Coverage by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.supply_analysis.map(sa => (
                  <div key={sa.category_code} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{sa.category_name}</span>
                      <Badge variant="outline" className={`text-[9px] ${supplyStatusBadge(sa.supply_status)}`}>
                        {sa.supply_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-foreground">{sa.verified_partners}</p>
                        <p className="text-[9px] text-muted-foreground">Partners</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">{sa.online_now}</p>
                        <p className="text-[9px] text-muted-foreground">Online</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{sa.demand_30d}</p>
                        <p className="text-[9px] text-muted-foreground">Demand</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${sa.demand_to_partner_ratio > 5 ? "text-destructive" : "text-foreground"}`}>
                          {sa.demand_to_partner_ratio}:1
                        </p>
                        <p className="text-[9px] text-muted-foreground">D:P Ratio</p>
                      </div>
                    </div>
                  </div>
                ))}
                {data.supply_analysis.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No partner data</p>
                )}
              </CardContent>
            </Card>

            {/* Zone Supply Gaps */}
            {data.zone_supply_gaps.length > 0 && (
              <Card className="border-warning/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-warning" /> Partner Acquisition Priorities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Zones with demand but insufficient verified partners</p>
                  {data.zone_supply_gaps.map((g, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${g.gap_severity === "critical" ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{g.zone_name}</Badge>
                          <span className="text-sm font-medium text-foreground">{g.category_code}</span>
                        </div>
                        <Badge variant={g.gap_severity === "critical" ? "destructive" : "outline"} className="text-[9px]">
                          {g.gap_severity}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{g.demand} bookings</span>
                        <span>{g.partners} partner{g.partners !== 1 ? "s" : ""}</span>
                        <span className="font-medium text-foreground">Need: {Math.max(2, Math.ceil(g.demand / 3) - g.partners)} more</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ QUOTES ═══ */}
          <TabsContent value="quotes" className="space-y-5 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <KPICard label="Total Quotes" value={s.total_quotes} icon={Package} />
              <KPICard label="Approval Rate" value={`${s.quote_approval_rate}%`} icon={CheckCircle2} />
              <KPICard label="Rejection Rate" value={`${s.quote_rejection_rate}%`} icon={XCircle} />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quote Rejection by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.quote_insights.map(qi => (
                  <div key={qi.category_code} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{qi.category_name}</span>
                      <span className={`text-sm font-bold ${qi.rejection_rate > 40 ? "text-destructive" : qi.rejection_rate > 20 ? "text-warning" : "text-success"}`}>
                        {qi.rejection_rate}% rejected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={100 - qi.rejection_rate} className="h-1.5 flex-1" />
                    </div>
                    <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                      <span>{qi.total_quotes} quotes</span>
                      <span>{qi.rejected_count} rejected</span>
                      {qi.avg_quote_lkr > 0 && <span>Avg: LKR {qi.avg_quote_lkr.toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
                {data.quote_insights.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No quote data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ GAPS ═══ */}
          <TabsContent value="gaps" className="space-y-5 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" /> Service Gap Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Services with high search volume but low booking conversion — potential new opportunities
                </p>
                {data.service_gaps.map(sg => (
                  <div key={sg.category_code} className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{sg.category_name}</span>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium text-primary">{sg.unconverted_searches} missed</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">Gap Score</span>
                        <Progress value={sg.gap_score} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-medium text-foreground">{sg.gap_score}/100</span>
                      </div>
                    </div>
                    {sg.sample_queries.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Sample searches:</p>
                        {sg.sample_queries.slice(0, 3).map((q, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground pl-2 italic">"{q}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {data.service_gaps.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-3">
                    <CheckCircle2 className="w-4 h-4" /> No significant service gaps detected
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ ALERTS ═══ */}
          <TabsContent value="alerts" className="space-y-5 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> All Alerts & Recommendations
                  <Badge variant="outline" className="text-[9px] ml-auto">{data.alerts.length} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.alerts.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${severityStyles[a.severity]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {a.severity === "critical" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                         a.severity === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                         <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <p className="text-[11px] opacity-80 mt-0.5">{a.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{a.type.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 p-2 rounded bg-background/50 text-[10px] font-medium text-foreground">
                      <Target className="w-3 h-3 text-primary shrink-0" />
                      {a.recommended_action}
                    </div>
                  </div>
                ))}
                {data.alerts.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                      <p className="font-medium">All Clear</p>
                      <p className="text-[10px] opacity-80">No alerts — marketplace operating normally.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
