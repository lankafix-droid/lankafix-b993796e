import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Activity, MapPin, TrendingUp, BarChart3, Users, AlertTriangle, Rocket, Target, Megaphone, Layers, Zap, CheckCircle2, Clock, FileText, Shield } from "lucide-react";
import { useOpsMetrics } from "@/services/opsMetricsService";
import { useZoneIntelligence, type ZoneHealthStatus } from "@/services/zoneIntelligenceService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateMockHeatmap,
  generateMockSupplyAnalysis,
  generateMockShortageAlerts,
  generateMockFunnels,
  generateMockCancellationTrends,
  generateMockRepeatMetrics,
  generateMockZonePerformances,
  generateMockForecasts,
  generateMockExpansionScores,
  generateMockRecruitmentTargets,
  generateMockMarketingInsights,
  generateMockScenarios,
  generateMockCategoryTrends,
  computeConversionRates,
  CANCELLATION_LABELS,
  SEASONAL_PATTERNS,
  type ForecastHorizon,
} from "@/engines/demandIntelligenceEngine";

const heatmap = generateMockHeatmap();
const supply = generateMockSupplyAnalysis();
const alerts = generateMockShortageAlerts();
const funnels = generateMockFunnels();
const cancellations = generateMockCancellationTrends();
const repeatMetrics = generateMockRepeatMetrics();
const zonePerf = generateMockZonePerformances();
const forecasts = generateMockForecasts();
const expansion = generateMockExpansionScores();
const recruitment = generateMockRecruitmentTargets();
const marketing = generateMockMarketingInsights();
const categoryTrends = generateMockCategoryTrends();

const demandColor = (level: string) =>
  level === "high" ? "bg-destructive/15 text-destructive" : level === "medium" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";

const gradeColor = (g: string) =>
  g === "A" ? "text-success" : g === "B" ? "text-primary" : g === "C" ? "text-warning" : "text-destructive";

export default function ControlTowerPage() {
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>("30d");
  const scenarios = generateMockScenarios("AC");
  const filteredForecasts = forecasts.filter((f) => f.horizon === forecastHorizon);
  const { data: metrics } = useOpsMetrics();
  const { data: zoneHealth = [] } = useZoneIntelligence();

  const healthColor = (h: ZoneHealthStatus) =>
    h === "risk" ? "bg-destructive/15 text-destructive" : h === "watch" ? "bg-warning/15 text-warning" : "bg-success/15 text-success";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Link to="/ops/dispatch"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
        <Activity className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground">Control Tower</h1>
        <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
      </header>

      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        {/* Core KPIs — real DB metrics */}
        {metrics && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { label: "Active", value: metrics.active_bookings, icon: Zap, color: "text-primary" },
              { label: "Today", value: metrics.bookings_today, icon: Activity, color: "text-foreground" },
              { label: "In Progress", value: metrics.jobs_in_progress, icon: Clock, color: "text-warning" },
              { label: "Completed", value: metrics.completed_today, icon: CheckCircle2, color: "text-success" },
              { label: "Escalations", value: metrics.dispatch_escalations, icon: AlertTriangle, color: "text-destructive" },
              { label: "Quotes Pending", value: metrics.quotes_pending_approval, icon: FileText, color: "text-warning" },
              { label: "Dispatch Fails", value: metrics.dispatch_failures, icon: AlertTriangle, color: "text-destructive" },
              { label: "Avg Dispatch", value: metrics.avg_dispatch_time_min != null ? `${metrics.avg_dispatch_time_min}m` : "—", icon: Clock, color: "text-muted-foreground" },
              { label: "Payments", value: metrics.payments_today_count, icon: TrendingUp, color: "text-success" },
              { label: "Fraud Alerts", value: metrics.fraud_alerts_today, icon: Shield, color: metrics.fraud_alerts_today > 0 ? "text-destructive" : "text-muted-foreground" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-2 text-center">
                  <s.icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-0.5`} />
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Shortage Alerts */}
        {alerts.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Shortage Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-xs shrink-0">{a.severity}</Badge>
                  <span className="text-foreground">{a.reason}</span>
                  <span className="ml-auto text-muted-foreground text-xs whitespace-nowrap">{a.coverageRatio}% coverage</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="zone_health" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="zone_health" className="text-xs gap-1"><MapPin className="w-3 h-3" />Zone Health</TabsTrigger>
            <TabsTrigger value="demand" className="text-xs gap-1"><MapPin className="w-3 h-3" />Heatmap</TabsTrigger>
            <TabsTrigger value="supply" className="text-xs gap-1"><Users className="w-3 h-3" />Supply</TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />Funnel</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs gap-1"><TrendingUp className="w-3 h-3" />Trends</TabsTrigger>
            <TabsTrigger value="forecast" className="text-xs gap-1"><Layers className="w-3 h-3" />Forecast</TabsTrigger>
            <TabsTrigger value="expansion" className="text-xs gap-1"><Rocket className="w-3 h-3" />Expansion</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs gap-1"><Megaphone className="w-3 h-3" />Marketing</TabsTrigger>
          </TabsList>

          {/* ─── Zone Health (Real DB) ──────────────── */}
          <TabsContent value="zone_health" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Zone Health — Last 30 Days</h2>
              <div className="flex gap-1 text-[10px]">
                <Badge className="bg-destructive/15 text-destructive border-0">{zoneHealth.filter(z => z.health === "risk").length} risk</Badge>
                <Badge className="bg-warning/15 text-warning border-0">{zoneHealth.filter(z => z.health === "watch").length} watch</Badge>
                <Badge className="bg-success/15 text-success border-0">{zoneHealth.filter(z => z.health === "healthy").length} healthy</Badge>
              </div>
            </div>

            {/* Compact table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-1 font-medium">Zone</th>
                    <th className="text-center py-2 px-1 font-medium">Bookings</th>
                    <th className="text-center py-2 px-1 font-medium">Partners</th>
                    <th className="text-center py-2 px-1 font-medium">Fails</th>
                    <th className="text-center py-2 px-1 font-medium">Cancel</th>
                    <th className="text-center py-2 px-1 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneHealth.map((z) => (
                    <tr key={z.zone_code} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-1">
                        <span className="font-medium text-foreground">{z.zone_label}</span>
                        {z.flags.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {z.flags.map((f) => (
                              <span key={f} className="text-[9px] text-destructive">{f}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-2 px-1 text-foreground">{z.bookings_count}</td>
                      <td className={`text-center py-2 px-1 font-medium ${z.verified_partner_count < 2 ? "text-destructive" : "text-foreground"}`}>{z.verified_partner_count}</td>
                      <td className={`text-center py-2 px-1 ${z.failed_dispatch_count > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>{z.failed_dispatch_count}</td>
                      <td className={`text-center py-2 px-1 ${z.cancellation_count > 0 ? "text-warning" : "text-muted-foreground"}`}>{z.cancellation_count}</td>
                      <td className="text-center py-2 px-1">
                        <Badge className={`border-0 text-[9px] ${healthColor(z.health)}`}>{z.health}</Badge>
                      </td>
                    </tr>
                  ))}
                  {zoneHealth.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No zone data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ─── Demand Heatmap (mock — retained) ──── */}
          <TabsContent value="demand" className="space-y-3">
            <h2 className="font-semibold text-foreground">Zone Demand Heatmap</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {heatmap.map((z) => (
                <Card key={z.zoneId}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{z.zoneLabel}</span>
                      <Badge className={`text-xs ${demandColor(z.demandLevel)}`}>{z.demandLevel}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>Signals: <span className="font-semibold text-foreground">{z.totalSignals}</span></div>
                      <div>Bookings: <span className="font-semibold text-foreground">{z.bookings}</span></div>
                      <div>🚨 {z.emergencies}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Top: <span className="font-medium text-foreground">{z.topCategory}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── Supply Analysis ────────────────────── */}
          <TabsContent value="supply" className="space-y-3">
            <h2 className="font-semibold text-foreground">Technician Supply vs. Demand</h2>
            <div className="space-y-2">
              {supply.map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.zoneLabel} — {s.categoryCode}</p>
                      <p className="text-xs text-muted-foreground">{s.dailyBookings} daily bookings · {s.availableTechnicians} techs</p>
                    </div>
                    <div className="w-24">
                      <Progress value={s.coverageRatio} className="h-2" />
                    </div>
                    <Badge variant={s.status === "critical" ? "destructive" : s.status === "warning" ? "secondary" : "outline"} className="text-xs">{s.coverageRatio}%</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recruitment */}
            <h3 className="font-semibold text-foreground mt-4 flex items-center gap-2"><Target className="w-4 h-4" /> Recruitment Targets</h3>
            <div className="space-y-2">
              {recruitment.map((r, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{r.zoneLabel} — {r.categoryCode}</p>
                      <p className="text-xs text-muted-foreground">Current: {r.currentTechnicians} · Need: {r.requiredTechnicians} · Deficit: <span className="font-semibold text-destructive">{r.deficit}</span></p>
                    </div>
                    <Badge variant={r.priority === "urgent" ? "destructive" : "secondary"} className="text-xs">{r.priority}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── Conversion Funnel ──────────────────── */}
          <TabsContent value="funnel" className="space-y-4">
            <h2 className="font-semibold text-foreground">Booking Conversion Funnel</h2>
            {funnels.map((f) => {
              const rates = computeConversionRates(f);
              return (
                <Card key={f.categoryCode}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{f.categoryCode}</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {([
                      ["Category Viewed", f.categoryViewed],
                      ["Diagnosis Started", f.diagnosisStarted],
                      ["Diagnosis Completed", f.diagnosisCompleted],
                      ["Booking Initiated", f.bookingInitiated],
                      ["Booking Confirmed", f.bookingConfirmed],
                      ["Job Completed", f.jobCompleted],
                    ] as [string, number][]).map(([label, val], idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-36 text-muted-foreground">{label}</span>
                        <Progress value={(val / f.categoryViewed) * 100} className="flex-1 h-2" />
                        <span className="text-foreground font-medium w-12 text-right">{val}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-1">Overall: <span className="font-semibold text-foreground">{rates.overallConversion}%</span></p>
                  </CardContent>
                </Card>
              );
            })}

            {/* Cancellations */}
            <h3 className="font-semibold text-foreground">Cancellation Reasons</h3>
            <Card>
              <CardContent className="p-4 space-y-2">
                {cancellations.map((c) => (
                  <div key={c.reason} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-foreground">{CANCELLATION_LABELS[c.reason]}</span>
                    <Progress value={c.percentage} className="w-24 h-2" />
                    <span className="text-muted-foreground text-xs w-10 text-right">{c.percentage}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Repeat Customers */}
            <h3 className="font-semibold text-foreground">Repeat Customer Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ["Repeat Rate", `${repeatMetrics.repeatRate}%`],
                ["Repeat Customers", repeatMetrics.repeatCustomers.toLocaleString()],
                ["Avg LTV", `LKR ${repeatMetrics.avgLifetimeValue.toLocaleString()}`],
                ["AMC Adoption", `${repeatMetrics.amcAdoptionRate}%`],
              ] as [string, string][]).map(([label, val]) => (
                <Card key={label}><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold text-foreground">{val}</p></CardContent></Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── Trends ────────────────────────────── */}
          <TabsContent value="trends" className="space-y-4">
            <h2 className="font-semibold text-foreground">Category Trends</h2>
            <div className="space-y-2">
              {categoryTrends.map((t) => (
                <Card key={t.categoryCode}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{t.categoryName}</p>
                      <p className="text-xs text-muted-foreground">This month: {t.currentMonthBookings} · Last: {t.previousMonthBookings}</p>
                    </div>
                    <Badge variant={t.trending === "up" ? "default" : t.trending === "down" ? "destructive" : "secondary"} className="text-xs">
                      {t.trending === "up" ? "↑" : t.trending === "down" ? "↓" : "→"} {t.growthRate}%
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Zone Performance */}
            <h3 className="font-semibold text-foreground">Zone Performance Scores</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zonePerf.map((z) => (
                <Card key={z.zoneId}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{z.zoneLabel}</span>
                      <span className={`text-xl font-bold ${gradeColor(z.grade)}`}>{z.grade}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Satisfaction: {z.customerSatisfaction}%</span>
                      <span>Dispatch: {z.dispatchSpeed}%</span>
                      <span>Availability: {z.technicianAvailability}%</span>
                      <span>Completion: {z.completionRate}%</span>
                    </div>
                    <Progress value={z.overallScore} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Seasonal */}
            <h3 className="font-semibold text-foreground">Seasonal Demand Patterns</h3>
            {SEASONAL_PATTERNS.map((s) => (
              <Card key={s.season}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground">{s.season} <span className="text-muted-foreground font-normal">({s.months})</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                  <div className="flex gap-1 mt-1.5">{s.affectedCategories.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Demand multiplier: <span className="font-semibold text-foreground">×{s.demandMultiplier}</span></p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Forecast ──────────────────────────── */}
          <TabsContent value="forecast" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Demand Forecast</h2>
              <div className="flex gap-1">
                {(["7d", "30d", "90d"] as ForecastHorizon[]).map((h) => (
                  <Button key={h} size="sm" variant={forecastHorizon === h ? "default" : "outline"} className="text-xs" onClick={() => setForecastHorizon(h)}>{h}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {filteredForecasts.map((f, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{f.categoryCode} — {f.zoneId}</p>
                      <p className="text-xs text-muted-foreground">Volume: {f.predictedVolume} · Techs needed: {f.requiredTechnicians}</p>
                    </div>
                    <Badge variant={f.slaRiskLevel === "high" ? "destructive" : f.slaRiskLevel === "medium" ? "secondary" : "outline"} className="text-xs">{f.slaRiskLevel} risk</Badge>
                    <span className="text-xs text-muted-foreground">{f.confidence}% conf</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Scenarios */}
            <h3 className="font-semibold text-foreground">Scenario Planning (AC)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {scenarios.map((s) => (
                <Card key={s.type} className={s.type === "technician_shortage" ? "border-destructive/30" : ""}>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">Volume: {s.predictedVolume}</p>
                    <p className="text-xs text-muted-foreground">Technicians: {s.requiredTechnicians}</p>
                    <p className="text-xs text-muted-foreground">Revenue: LKR {s.estimatedRevenue.toLocaleString()}</p>
                    <Badge variant={s.slaRisk === "high" ? "destructive" : "outline"} className="text-xs">{s.slaRisk} SLA risk</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── Expansion ─────────────────────────── */}
          <TabsContent value="expansion" className="space-y-4">
            <h2 className="font-semibold text-foreground">District Expansion Readiness</h2>
            <div className="space-y-2">
              {expansion.map((d) => (
                <Card key={d.districtId}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{d.districtName}</span>
                      <Badge variant={d.readiness === "launch_ready" ? "default" : d.readiness === "pilot_ready" ? "secondary" : "outline"} className="text-xs">
                        {d.readiness === "launch_ready" ? "🟢 Launch Ready" : d.readiness === "pilot_ready" ? "🟡 Pilot Ready" : "⚪ Waitlist"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <span>Diag: {d.diagnosisVolume}</span>
                      <span>Conv: {d.bookingConversion}%</span>
                      <span>Techs: {d.technicianAvailability}</span>
                      <span>Density: {d.demandDensity}</span>
                      <span>Rev: LKR {d.avgServiceRevenue.toLocaleString()}</span>
                    </div>
                    <Progress value={d.readinessScore} className="h-2" />
                    <p className="text-xs text-right text-muted-foreground">Score: {d.readinessScore}/100</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── Marketing ─────────────────────────── */}
          <TabsContent value="marketing" className="space-y-4">
            <h2 className="font-semibold text-foreground">Marketing Intelligence</h2>
            {marketing.map((m, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">{m.zoneLabel} — {m.categoryCode}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Diagnosis activity: <span className="font-semibold text-foreground">{m.diagnosisActivity}</span></span>
                    <span>Booking conversion: <span className="font-semibold text-foreground">{m.bookingConversion}%</span></span>
                  </div>
                  <p className="text-sm text-foreground bg-primary/5 rounded-md p-2">💡 {m.recommendation}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
