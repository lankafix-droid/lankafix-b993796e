import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Brain, TrendingUp, Users, MapPin, Zap, Shield, DollarSign, BarChart3,
  AlertTriangle, Clock, Star, Target, ArrowUp, ArrowDown, Minus, Bell,
  RefreshCw, Eye, Activity, ChevronRight, Flame, Thermometer, CloudRain
} from "lucide-react";
import {
  generateMockHeatmap, generateMockSupplyAnalysis, generateMockShortageAlerts,
  generateMockFunnels, generateMockCancellationTrends, generateMockRepeatMetrics,
  generateMockZonePerformances, generateMockForecasts, generateMockCategoryTrends,
  generateMockMarketingInsights, generateMockRecruitmentTargets,
  computeConversionRates, SEASONAL_PATTERNS, type ZoneDemandHeatmap,
} from "@/engines/demandIntelligenceEngine";
import { generateMockRetentionMetrics, generateMockReminders, CROSS_SELL_RULES } from "@/engines/retentionEngine";
import { MARKET_PRICE_RANGES, formatLKR } from "@/engines/pricingIntelligenceEngine";
import { Link } from "react-router-dom";

// ─── Data ────────────────────────────────────────────────────────

const heatmap = generateMockHeatmap();
const supply = generateMockSupplyAnalysis();
const shortageAlerts = generateMockShortageAlerts();
const funnels = generateMockFunnels();
const cancellations = generateMockCancellationTrends();
const repeatMetrics = generateMockRepeatMetrics();
const zonePerformances = generateMockZonePerformances();
const forecasts = generateMockForecasts();
const categoryTrends = generateMockCategoryTrends();
const marketingInsights = generateMockMarketingInsights();
const recruitmentTargets = generateMockRecruitmentTargets();
const retentionMetrics = generateMockRetentionMetrics();
const reminders = generateMockReminders();

const DEMAND_COLORS: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-success/20 text-success border-success/30",
};

// ─── Metric Card ─────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="bg-card border">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-foreground">{value}</p>
            {trend === "up" && <ArrowUp className="w-3.5 h-3.5 text-success" />}
            {trend === "down" && <ArrowDown className="w-3.5 h-3.5 text-destructive" />}
            {trend === "neutral" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────

const AIGrowthEnginePage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Growth Engine</h1>
                <p className="text-xs text-muted-foreground">Self-optimizing marketplace intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-success border-success/30 bg-success/10">
                <Activity className="w-3 h-3" /> Live
              </Badge>
              <Link to="/ops/dispatch" className="text-xs text-muted-foreground hover:text-primary">Ops Dashboard →</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="demand" className="text-xs">Demand</TabsTrigger>
            <TabsTrigger value="dispatch" className="text-xs">Dispatch AI</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
            <TabsTrigger value="retention" className="text-xs">Retention</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Platform Revenue (MTD)" value="LKR 2.8M" sub="+18% vs last month" icon={DollarSign} trend="up" />
              <MetricCard label="Active Jobs" value="47" sub="12 en route, 8 in progress" icon={Zap} trend="up" />
              <MetricCard label="Technicians Online" value="34" sub="of 89 registered" icon={Users} trend="neutral" />
              <MetricCard label="Avg Customer Rating" value="4.6" sub="Based on 1,240 reviews" icon={Star} trend="up" />
            </div>

            {/* AI Modules Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> AI Modules Status
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "Demand Heatmap", status: "active", accuracy: 87, icon: MapPin },
                  { name: "Smart Dispatch", status: "active", accuracy: 92, icon: Zap },
                  { name: "Price Intelligence", status: "active", accuracy: 89, icon: DollarSign },
                  { name: "Technician Scoring", status: "active", accuracy: 91, icon: Star },
                  { name: "Customer Trust", status: "active", accuracy: 94, icon: Shield },
                  { name: "Revenue Optimization", status: "active", accuracy: 85, icon: TrendingUp },
                  { name: "Demand Forecasting", status: "learning", accuracy: 76, icon: BarChart3 },
                  { name: "Retention Engine", status: "active", accuracy: 82, icon: RefreshCw },
                  { name: "Fraud Detection", status: "active", accuracy: 96, icon: Eye },
                  { name: "Ops Intelligence", status: "active", accuracy: 88, icon: Activity },
                ].map((mod) => (
                  <div key={mod.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <mod.icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{mod.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${mod.status === "active" ? "text-success border-success/30" : "text-warning border-warning/30"}`}>
                          {mod.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={mod.accuracy} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{mod.accuracy}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Category Trends */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Category Growth Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryTrends.map((t) => (
                  <div key={t.categoryCode} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t.categoryName}</span>
                        <div className="flex items-center gap-1">
                          {t.trending === "up" && <ArrowUp className="w-3 h-3 text-success" />}
                          {t.trending === "down" && <ArrowDown className="w-3 h-3 text-destructive" />}
                          {t.trending === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
                          <span className={`text-xs font-medium ${t.trending === "up" ? "text-success" : t.trending === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                            {t.growthRate > 0 ? "+" : ""}{t.growthRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>This month: {t.currentMonthBookings}</span>
                        <span>Last month: {t.previousMonthBookings}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shortage Alerts */}
            {shortageAlerts.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" /> Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {shortageAlerts.map((a) => (
                    <div key={a.id} className={`p-3 rounded-lg border ${a.severity === "critical" ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{a.zoneLabel} — {a.categoryCode}</span>
                        <Badge variant={a.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.reason}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Coverage: {a.coverageRatio}%</span>
                        <span>Avg dispatch: {a.avgDispatchMinutes}min</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ DEMAND TAB ═══ */}
          <TabsContent value="demand" className="space-y-6 mt-4">
            {/* Demand Heatmap */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Zone Demand Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {heatmap.map((z) => (
                  <div key={z.zoneId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${DEMAND_COLORS[z.demandLevel]}`}>
                      {z.demandLevel}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate">{z.zoneLabel}</span>
                        <span className="text-xs text-muted-foreground">{z.totalSignals} signals</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{z.bookings} bookings</span>
                        <span>{z.emergencies} emergency</span>
                        <span>Top: {z.topCategory}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Seasonal Patterns */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-primary" /> Seasonal Demand Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {SEASONAL_PATTERNS.map((s) => (
                  <div key={s.season} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.season.includes("Hot") && <Flame className="w-4 h-4 text-destructive" />}
                        {s.season.includes("Rainy") && <CloudRain className="w-4 h-4 text-primary" />}
                        {!s.season.includes("Hot") && !s.season.includes("Rainy") && <BarChart3 className="w-4 h-4 text-primary" />}
                        <span className="text-sm font-medium text-foreground">{s.season}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{s.months}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Demand multiplier:</span>
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20" variant="outline">
                        {s.demandMultiplier}x
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">
                        Categories: {s.affectedCategories.join(", ")}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Conversion Funnels */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conversion Funnels by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {funnels.slice(0, 4).map((f) => {
                  const rates = computeConversionRates(f);
                  return (
                    <div key={f.categoryCode} className="p-3 rounded-lg bg-muted/30 border">
                      <span className="text-sm font-medium text-foreground">{f.categoryCode}</span>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{f.categoryViewed}</div>
                          <div className="text-[10px] text-muted-foreground">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{f.diagnosisStarted}</div>
                          <div className="text-[10px] text-muted-foreground">Diagnosed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{f.bookingConfirmed}</div>
                          <div className="text-[10px] text-muted-foreground">Booked</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{rates.overallConversion}%</div>
                          <div className="text-[10px] text-muted-foreground">Conv. Rate</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Marketing Insights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Marketing Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {marketingInsights.map((m, i) => (
                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{m.zoneLabel}</Badge>
                      <Badge variant="outline" className="text-[10px]">{m.categoryCode}</Badge>
                    </div>
                    <p className="text-sm text-foreground mt-1">{m.recommendation}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Activity: {m.diagnosisActivity}</span>
                      <span>Conversion: {m.bookingConversion}%</span>
                      <span>Gap: {m.gap}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ DISPATCH AI TAB ═══ */}
          <TabsContent value="dispatch" className="space-y-6 mt-4">
            {/* Dispatch Scoring Weights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> AI Dispatch Scoring Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Proximity", weight: 30, color: "bg-primary" },
                  { label: "Skill Match", weight: 20, color: "bg-primary" },
                  { label: "Rating", weight: 15, color: "bg-primary" },
                  { label: "Response Speed", weight: 10, color: "bg-primary" },
                  { label: "Workload", weight: 10, color: "bg-primary" },
                  { label: "Completion Rate", weight: 10, color: "bg-primary" },
                  { label: "Emergency Priority", weight: 5, color: "bg-primary" },
                ].map((w) => (
                  <div key={w.label} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-32 shrink-0">{w.label}</span>
                    <Progress value={w.weight} className="h-2 flex-1" />
                    <span className="text-sm font-bold text-foreground w-10 text-right">{w.weight}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Zone Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Zone Performance Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {zonePerformances.map((z) => (
                  <div key={z.zoneId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      z.grade === "A" ? "bg-success/20 text-success" :
                      z.grade === "B" ? "bg-primary/20 text-primary" :
                      z.grade === "C" ? "bg-warning/20 text-warning" :
                      "bg-destructive/20 text-destructive"
                    }`}>{z.grade}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{z.zoneLabel}</span>
                      <div className="grid grid-cols-4 gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>CSAT: {z.customerSatisfaction}%</span>
                        <span>Speed: {z.dispatchSpeed}%</span>
                        <span>Supply: {z.technicianAvailability}%</span>
                        <span>Done: {z.completionRate}%</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-foreground">{z.overallScore}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recruitment Targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Recruitment Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recruitmentTargets.map((r) => (
                  <div key={`${r.zoneId}-${r.categoryCode}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{r.zoneLabel}</span>
                        <Badge variant="outline" className="text-[10px]">{r.categoryCode}</Badge>
                        <Badge variant={r.priority === "urgent" ? "destructive" : "outline"} className="text-[10px]">{r.priority}</Badge>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Current: {r.currentTechnicians}</span>
                        <span>Required: {r.requiredTechnicians}</span>
                        <span className="text-destructive">Deficit: {r.deficit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Supply Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Supply Coverage Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {supply.slice(0, 8).map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${
                      s.status === "healthy" ? "text-success border-success/30" :
                      s.status === "warning" ? "text-warning border-warning/30" :
                      "text-destructive border-destructive/30"
                    }`}>{s.status}</Badge>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-foreground">{s.zoneLabel} — {s.categoryCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={s.coverageRatio} className="h-1.5 w-16" />
                      <span className="text-xs text-muted-foreground w-10 text-right">{s.coverageRatio}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ PRICING TAB ═══ */}
          <TabsContent value="pricing" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Price Ranges Tracked" value={MARKET_PRICE_RANGES.length} icon={DollarSign} />
              <MetricCard label="Quote Validations (MTD)" value="312" sub="96% within range" icon={Shield} trend="up" />
              <MetricCard label="Avg Commission Rate" value="7.8%" icon={TrendingUp} trend="neutral" />
              <MetricCard label="Pricing Accuracy" value="89%" sub="vs market average" icon={Target} trend="up" />
            </div>

            {/* Price Ranges by Category */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" /> Market Price Ranges (LKR)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MARKET_PRICE_RANGES.slice(0, 12).map((r) => (
                  <div key={r.serviceKey} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{r.label}</span>
                        <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatLKR(r.minLKR)} – {formatLKR(r.maxLKR)}
                        </span>
                        <span className="text-xs text-primary">Typical: {formatLKR(r.typicalLKR)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${r.includesParts ? "text-success border-success/30" : ""}`}>
                      {r.includesParts ? "Parts incl." : "Labour only"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Commission Structure */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Commission Tiers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { tier: "Small Repairs", rate: "10%", categories: "Mobile, IT, Network, Copier", color: "bg-success/10 text-success" },
                  { tier: "Medium Repairs", rate: "7%", categories: "AC, Electrical, Plumbing, Electronics", color: "bg-primary/10 text-primary" },
                  { tier: "Project Installations", rate: "5%", categories: "Solar, CCTV, Security, Smart Home", color: "bg-warning/10 text-warning" },
                ].map((t) => (
                  <div key={t.tier} className="p-4 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{t.tier}</span>
                      <Badge className={`text-sm font-bold ${t.color}`} variant="outline">{t.rate}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.categories}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cancellation Reasons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cancellation Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cancellations.map((c) => (
                  <div key={c.reason} className="flex items-center gap-3 p-2">
                    <div className="flex-1">
                      <span className="text-sm text-foreground">{c.reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={c.percentage} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right">{c.percentage}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{c.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ RETENTION TAB ═══ */}
          <TabsContent value="retention" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Repeat Rate" value={`${retentionMetrics.repeatRate}%`} sub={`${retentionMetrics.repeatCustomers} of ${retentionMetrics.totalCustomers}`} icon={RefreshCw} trend="up" />
              <MetricCard label="Avg Lifetime Value" value={formatLKR(retentionMetrics.avgLifetimeValue)} icon={DollarSign} trend="up" />
              <MetricCard label="Churn Risk" value={`${retentionMetrics.churnRisk}%`} icon={AlertTriangle} trend="down" />
              <MetricCard label="Reminder Conversion" value={`${retentionMetrics.conversionRate}%`} sub={`${retentionMetrics.remindersConverted} of ${retentionMetrics.remindersSent}`} icon={Bell} trend="up" />
            </div>

            {/* Active Reminders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Service Reminders Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reminders.map((r) => (
                  <div key={r.id} className={`p-3 rounded-lg border ${
                    r.priority === "urgent" ? "bg-destructive/5 border-destructive/20" :
                    r.priority === "upcoming" ? "bg-warning/5 border-warning/20" :
                    "bg-muted/30"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{r.serviceLabel}</span>
                        <Badge variant="outline" className="text-[10px]">{r.categoryCode}</Badge>
                      </div>
                      <Badge variant={r.priority === "urgent" ? "destructive" : "outline"} className="text-[10px]">
                        {r.priority === "urgent" ? `${Math.abs(r.daysUntilDue)}d overdue` : `${r.daysUntilDue}d`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.message}</p>
                    {r.sent && <Badge variant="outline" className="text-[10px] text-success border-success/30 mt-1">Sent</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Retained Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Retained Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {retentionMetrics.topRetainedCategories.map((c) => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-24 shrink-0">{c.category}</span>
                    <Progress value={c.retentionRate} className="h-2 flex-1" />
                    <span className="text-sm font-bold text-foreground w-10 text-right">{c.retentionRate}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cross-Sell Rules */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-primary" /> Cross-Sell Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {CROSS_SELL_RULES.slice(0, 6).map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{r.triggerCategory}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="text-[10px] bg-primary/5">{r.recommendedService}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                    <span className="text-[10px] text-muted-foreground">Delay: {r.delayDays} days after service</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Repeat Customer Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer Base Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-foreground">{retentionMetrics.totalCustomers.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Customers</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-foreground">{retentionMetrics.activeCustomers30d.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Active (30d)</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-primary">{retentionMetrics.avgBookingsPerCustomer}</div>
                    <div className="text-xs text-muted-foreground">Avg Bookings / Customer</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-foreground">{retentionMetrics.amcAdoptionRate}%</div>
                    <div className="text-xs text-muted-foreground">AMC Adoption</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIGrowthEnginePage;
