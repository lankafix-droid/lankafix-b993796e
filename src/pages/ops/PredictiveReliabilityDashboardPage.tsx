/**
 * Predictive Reliability Dashboard — V1
 * Advisory-only intelligence layer. No marketplace enforcement.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Shield,
  Users, BarChart3, Activity, MapPin, ArrowUpRight, RefreshCw,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchPredictiveReliabilitySummary, type PredictiveReliabilitySummary } from "@/services/predictiveReliabilityReadModel";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import type { PredictiveRiskLevel, GovernanceRiskLevel } from "@/engines/predictiveReliabilityIntelligenceEngine";

const ZONE_LABEL: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL[z.id] = z.label; });

const RISK_COLOR: Record<PredictiveRiskLevel, string> = {
  low: "text-success", moderate: "text-warning", high: "text-destructive", critical: "text-destructive",
};
const RISK_BG: Record<PredictiveRiskLevel, string> = {
  low: "bg-success/10", moderate: "bg-warning/10", high: "bg-destructive/10", critical: "bg-destructive/15",
};
const GOV_RISK_COLOR: Record<GovernanceRiskLevel, string> = {
  LOW: "text-success", MODERATE: "text-warning", HIGH: "text-destructive", CRITICAL: "text-destructive",
};
const TREND_ICON = { stable: Minus, declining: TrendingDown, improving: TrendingUp };

export default function PredictiveReliabilityDashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["predictive-reliability"],
    queryFn: fetchPredictiveReliabilitySummary,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ops/command-center">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-heading">Predictive Reliability Intelligence</h1>
              <p className="text-xs text-muted-foreground">Advisory forecasts · No marketplace enforcement</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading predictive intelligence…</p>}

        {data && (
          <>
            {/* SECTION A — Status Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={MapPin} label="Zones at Risk" value={data.zonesAtRisk} color={data.zonesAtRisk > 0 ? "text-destructive" : "text-success"} />
              <StatCard icon={TrendingDown} label="Categories Declining" value={data.categoriesDeclining} color={data.categoriesDeclining > 0 ? "text-warning" : "text-success"} />
              <StatCard icon={Users} label="Partners at Risk" value={data.partnersAtRisk} color={data.partnersAtRisk > 0 ? "text-destructive" : "text-success"} />
              <StatCard icon={AlertTriangle} label="Demand Alerts" value={data.demandAlerts} color={data.demandAlerts > 0 ? "text-warning" : "text-success"} />
            </div>

            <Tabs defaultValue="forecast" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="forecast" className="text-xs">Reliability Forecast</TabsTrigger>
                <TabsTrigger value="partners" className="text-xs">Partner Signals</TabsTrigger>
                <TabsTrigger value="demand" className="text-xs">Demand Pressure</TabsTrigger>
                <TabsTrigger value="governance" className="text-xs">Governance Risk</TabsTrigger>
              </TabsList>

              {/* SECTION B — Reliability Forecast */}
              <TabsContent value="forecast">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3">Zone × Category Reliability Forecast</h2>
                    {data.predictions.length === 0 ? (
                      <EmptyState icon={TrendingUp} title="No predictive reliability risks detected" description="All zones and categories are forecasted stable." />
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Zone</TableHead>
                              <TableHead className="text-[10px]">Category</TableHead>
                              <TableHead className="text-[10px]">Current</TableHead>
                              <TableHead className="text-[10px]">3-Day</TableHead>
                              <TableHead className="text-[10px]">7-Day</TableHead>
                              <TableHead className="text-[10px]">Trend</TableHead>
                              <TableHead className="text-[10px]">Risk</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.predictions.slice(0, 30).map((p, i) => {
                              const TrendIcon = TREND_ICON[p.trend];
                              return (
                                <TableRow key={i}>
                                  <TableCell className="text-xs">{ZONE_LABEL[p.zoneId] || p.zoneId}</TableCell>
                                  <TableCell className="text-xs font-mono">{p.categoryCode}</TableCell>
                                  <TableCell className="text-xs font-bold">{p.currentReliability}%</TableCell>
                                  <TableCell className={`text-xs font-bold ${RISK_COLOR[p.riskLevel]}`}>{p.predictedReliability3Days}%</TableCell>
                                  <TableCell className={`text-xs font-bold ${RISK_COLOR[p.riskLevel]}`}>{p.predictedReliability7Days}%</TableCell>
                                  <TableCell><TrendIcon className={`w-3.5 h-3.5 ${p.trend === "declining" ? "text-destructive" : p.trend === "improving" ? "text-success" : "text-muted-foreground"}`} /></TableCell>
                                  <TableCell><Badge className={`text-[9px] ${RISK_BG[p.riskLevel]} ${RISK_COLOR[p.riskLevel]} border-0`}>{p.riskLevel}</Badge></TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION C — Partner Risk Signals */}
              <TabsContent value="partners">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3">Partner Reliability Decay Signals</h2>
                    {data.partnerDecay.length === 0 ? (
                      <EmptyState icon={Users} title="No partner decay signals" description="All partners are maintaining stable reliability." />
                    ) : (
                      <div className="space-y-2">
                        {data.partnerDecay.map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
                            <div>
                              <p className="text-xs font-semibold">{s.partnerName}</p>
                              <p className="text-[10px] text-muted-foreground">{s.categoryCode} · {ZONE_LABEL[s.zoneId] || s.zoneId}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{s.reason}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${RISK_COLOR[s.riskLevel]}`}>↓{s.reliabilityDrop}%</p>
                              <Badge className={`text-[8px] ${RISK_BG[s.riskLevel]} ${RISK_COLOR[s.riskLevel]} border-0`}>{s.riskLevel}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION D — Demand Pressure */}
              <TabsContent value="demand">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3">Demand Pressure Map</h2>
                    {data.demandPressure.length === 0 ? (
                      <EmptyState icon={BarChart3} title="No demand pressure risks" description="Supply is meeting demand across all zones." />
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Zone</TableHead>
                              <TableHead className="text-[10px]">Category</TableHead>
                              <TableHead className="text-[10px]">Pressure</TableHead>
                              <TableHead className="text-[10px]">Supply Ratio</TableHead>
                              <TableHead className="text-[10px]">Predicted Delay</TableHead>
                              <TableHead className="text-[10px]">Risk</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.demandPressure.slice(0, 20).map((d, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{ZONE_LABEL[d.zoneId] || d.zoneId}</TableCell>
                                <TableCell className="text-xs font-mono">{d.categoryCode}</TableCell>
                                <TableCell className={`text-xs font-bold ${RISK_COLOR[d.riskLevel]}`}>{d.demandPressure}%</TableCell>
                                <TableCell className="text-xs">{d.supplyRatio}x</TableCell>
                                <TableCell className="text-xs">{d.predictedServiceDelayMinutes > 0 ? `+${d.predictedServiceDelayMinutes}min` : "—"}</TableCell>
                                <TableCell><Badge className={`text-[9px] ${RISK_BG[d.riskLevel]} ${RISK_COLOR[d.riskLevel]} border-0`}>{d.riskLevel}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION E — Governance Risk Scores */}
              <TabsContent value="governance">
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-bold mb-3">Governance Risk Scores</h2>
                    {data.governanceRisk.length === 0 ? (
                      <EmptyState icon={Shield} title="No governance risk alerts" description="All governance risk scores are within acceptable range." />
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Zone</TableHead>
                              <TableHead className="text-[10px]">Category</TableHead>
                              <TableHead className="text-[10px]">Score</TableHead>
                              <TableHead className="text-[10px]">Level</TableHead>
                              <TableHead className="text-[10px]">Factors</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.governanceRisk.map((g, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{ZONE_LABEL[g.zoneId] || g.zoneId}</TableCell>
                                <TableCell className="text-xs font-mono">{g.categoryCode}</TableCell>
                                <TableCell className={`text-xs font-bold ${GOV_RISK_COLOR[g.level]}`}>{g.governanceRiskScore}</TableCell>
                                <TableCell><Badge className={`text-[9px] border-0 ${g.level === "CRITICAL" || g.level === "HIGH" ? "bg-destructive/10 text-destructive" : g.level === "MODERATE" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{g.level}</Badge></TableCell>
                                <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">{g.factors.join("; ") || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Navigation */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Governance Hub", path: "/ops/reliability-governance-hub" },
                    { label: "Operations Board", path: "/ops/reliability-operations-board" },
                    { label: "Executive Board", path: "/ops/executive-reliability" },
                    { label: "Command Center", path: "/ops/command-center" },
                    { label: "Action Center", path: "/ops/reliability-action-center" },
                    { label: "Scope Planner", path: "/ops/reliability-scope-planner" },
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

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
