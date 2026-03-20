import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, AlertTriangle, TrendingUp, TrendingDown, Shield, Wrench, DollarSign,
  RefreshCw, Users, ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight, Minus,
  Bell, CheckCircle2, Eye, Brain
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useAssetHealthScores, usePredictiveMaintenance, useContractProfitability,
  useContractSignals, useSPSAlerts, useDismissAlert,
} from "@/hooks/useSPSIntelligence";

// ── Status Config ──
const HEALTH_STATUS = {
  excellent: { label: "Excellent", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  stable: { label: "Stable", color: "text-primary", bg: "bg-primary/10", icon: Shield },
  watchlist: { label: "Watchlist", color: "text-warning", bg: "bg-warning/10", icon: Eye },
  at_risk: { label: "At Risk", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
  replace_soon: { label: "Replace Soon", color: "text-destructive", bg: "bg-destructive/15", icon: Wrench },
};

const PROFIT_STATUS = {
  strong: { label: "Strong", color: "text-success", bg: "bg-success/10" },
  healthy: { label: "Healthy", color: "text-primary", bg: "bg-primary/10" },
  tight_margin: { label: "Tight Margin", color: "text-warning", bg: "bg-warning/10" },
  at_risk: { label: "At Risk", color: "text-destructive", bg: "bg-destructive/10" },
  loss_making: { label: "Loss-making", color: "text-destructive", bg: "bg-destructive/15" },
};

const RISK_LEVEL = {
  low: { label: "Low Risk", color: "text-success", bg: "bg-success/10" },
  moderate: { label: "Moderate", color: "text-warning", bg: "bg-warning/10" },
  high: { label: "High Risk", color: "text-destructive", bg: "bg-destructive/10" },
  immediate_review: { label: "Immediate", color: "text-destructive", bg: "bg-destructive/15" },
};

const ALERT_PRIORITY = {
  info: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  watch: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  high: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  immediate: { color: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/30" },
};

const TrendIcon = ({ dir }: { dir: string }) => {
  if (dir === "improving") return <ArrowUpRight className="w-3.5 h-3.5 text-success" />;
  if (dir === "worsening") return <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

function StatCard({ label, value, sub, icon: Icon, color = "text-primary" }: { label: string; value: string | number; sub?: string; icon: any; color?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function SPSIntelligenceDashboard() {
  const { data: healthScores = [] } = useAssetHealthScores();
  const { data: predictions = [] } = usePredictiveMaintenance();
  const { data: profitability = [] } = useContractProfitability();
  const { data: signals = [] } = useContractSignals();
  const { data: alerts = [] } = useSPSAlerts();
  const dismissAlert = useDismissAlert();

  // Aggregate stats
  const latestHealth = healthScores.reduce((acc: Record<string, any>, h: any) => {
    if (!acc[h.asset_id] || h.score_date > acc[h.asset_id].score_date) acc[h.asset_id] = h;
    return acc;
  }, {});
  const healthList = Object.values(latestHealth) as any[];
  const avgHealth = healthList.length > 0 ? Math.round(healthList.reduce((s: number, h: any) => s + (h.health_score || 0), 0) / healthList.length) : 0;

  const statusCounts = { excellent: 0, stable: 0, watchlist: 0, at_risk: 0, replace_soon: 0 };
  healthList.forEach((h: any) => { if (h.health_status in statusCounts) statusCounts[h.health_status as keyof typeof statusCounts]++; });

  const riskCounts = { low: 0, moderate: 0, high: 0, immediate_review: 0 };
  predictions.forEach((p: any) => { if (p.maintenance_risk_level in riskCounts) riskCounts[p.maintenance_risk_level as keyof typeof riskCounts]++; });

  const profitCounts = { strong: 0, healthy: 0, tight_margin: 0, at_risk: 0, loss_making: 0 };
  profitability.forEach((p: any) => { if (p.profitability_status in profitCounts) profitCounts[p.profitability_status as keyof typeof profitCounts]++; });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border/50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SPS Intelligence</h1>
              <p className="text-xs text-muted-foreground">Fleet health · Profitability · Renewal signals</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bell className="w-4 h-4 text-destructive" />
              Active Alerts ({alerts.length})
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 5).map((alert: any) => {
                const pri = ALERT_PRIORITY[alert.priority as keyof typeof ALERT_PRIORITY] || ALERT_PRIORITY.info;
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl ${pri.bg} border ${pri.border}`}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${pri.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => dismissAlert.mutate(alert.id)}>
                      Dismiss
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Avg Fleet Health" value={avgHealth || "—"} sub={`${healthList.length} assets scored`} icon={Activity} color="text-primary" />
          <StatCard label="At-Risk Assets" value={statusCounts.at_risk + statusCounts.replace_soon} sub="Needs attention" icon={AlertTriangle} color="text-destructive" />
          <StatCard label="High Maintenance Risk" value={riskCounts.high + riskCounts.immediate_review} sub="Predictive signals" icon={Wrench} color="text-warning" />
          <StatCard label="Loss-Making Contracts" value={profitCounts.at_risk + profitCounts.loss_making} sub="Review needed" icon={DollarSign} color="text-destructive" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fleet" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="fleet" className="rounded-lg text-xs">Fleet Health</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-lg text-xs">Maintenance</TabsTrigger>
            <TabsTrigger value="profitability" className="rounded-lg text-xs">Profitability</TabsTrigger>
            <TabsTrigger value="signals" className="rounded-lg text-xs">Renewal Signals</TabsTrigger>
          </TabsList>

          {/* Fleet Health Tab */}
          <TabsContent value="fleet" className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {(["excellent", "stable", "watchlist", "at_risk", "replace_soon"] as const).map((key) => {
                const cfg = HEALTH_STATUS[key];
                const Icon = cfg.icon;
                return (
                  <div key={key} className={`rounded-xl p-3 text-center ${cfg.bg} border border-border/30`}>
                    <Icon className={`w-4 h-4 mx-auto ${cfg.color}`} />
                    <p className={`text-lg font-bold ${cfg.color} mt-1`}>{statusCounts[key]}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Asset Health Scores</span>
                <span className="text-[10px] text-muted-foreground">{healthList.length} assets</span>
              </div>
              <div className="divide-y divide-border/30">
                {healthList.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No asset health data yet. Run intelligence scoring to populate.</div>
                )}
                {healthList.slice(0, 20).map((h: any, i: number) => {
                  const cfg = HEALTH_STATUS[h.health_status as keyof typeof HEALTH_STATUS] || HEALTH_STATUS.stable;
                  return (
                    <div key={h.id || i} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                        <span className={`text-sm font-bold ${cfg.color}`}>{h.health_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{h.asset_id?.slice(0, 8)}...</p>
                        <p className="text-[10px] text-muted-foreground">{h.suggested_action}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon dir={h.trend_direction} />
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Predictive Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {(["low", "moderate", "high", "immediate_review"] as const).map((key) => {
                const cfg = RISK_LEVEL[key];
                return (
                  <div key={key} className={`rounded-xl p-3 text-center ${cfg.bg} border border-border/30`}>
                    <p className={`text-lg font-bold ${cfg.color}`}>{riskCounts[key]}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <span className="text-sm font-semibold text-foreground">Predictive Maintenance Queue</span>
              </div>
              <div className="divide-y divide-border/30">
                {predictions.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No predictions yet.</div>
                )}
                {predictions.slice(0, 20).map((p: any, i: number) => {
                  const cfg = RISK_LEVEL[p.maintenance_risk_level as keyof typeof RISK_LEVEL] || RISK_LEVEL.low;
                  return (
                    <div key={p.id || i} className="px-4 py-3 flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] ${cfg.color} shrink-0`}>{cfg.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">Asset {p.asset_id?.slice(0, 8)}...</p>
                        <p className="text-[10px] text-muted-foreground">{p.suggested_action}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendIcon dir={p.trend_direction} />
                        {p.predicted_issue_category && (
                          <Badge variant="secondary" className="text-[9px]">{p.predicted_issue_category}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Profitability Tab */}
          <TabsContent value="profitability" className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {(["strong", "healthy", "tight_margin", "at_risk", "loss_making"] as const).map((key) => {
                const cfg = PROFIT_STATUS[key];
                return (
                  <div key={key} className={`rounded-xl p-3 text-center ${cfg.bg} border border-border/30`}>
                    <p className={`text-lg font-bold ${cfg.color}`}>{profitCounts[key]}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <span className="text-sm font-semibold text-foreground">Contract Profitability</span>
              </div>
              <div className="divide-y divide-border/30">
                {profitability.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No profitability data yet.</div>
                )}
                {profitability.slice(0, 20).map((p: any, i: number) => {
                  const cfg = PROFIT_STATUS[p.profitability_status as keyof typeof PROFIT_STATUS] || PROFIT_STATUS.healthy;
                  return (
                    <div key={p.id || i} className="px-4 py-3 flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] ${cfg.color} shrink-0`}>{cfg.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">Contract {p.contract_id?.slice(0, 8)}...</p>
                        <p className="text-[10px] text-muted-foreground">
                          Revenue: LKR {Number(p.revenue_collected).toLocaleString()} · Margin: LKR {Number(p.margin_estimate).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground">{p.payback_progress}%</p>
                        <p className="text-[9px] text-muted-foreground">payback</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Renewal Signals Tab */}
          <TabsContent value="signals" className="space-y-3">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <span className="text-sm font-semibold text-foreground">Renewal & Churn Signals</span>
              </div>
              <div className="divide-y divide-border/30">
                {signals.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No signal data yet.</div>
                )}
                {signals.slice(0, 20).map((s: any, i: number) => {
                  const churnColor = s.churn_risk === "critical" || s.churn_risk === "high" ? "text-destructive" : s.churn_risk === "moderate" ? "text-warning" : "text-success";
                  return (
                    <div key={s.id || i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">Contract {s.contract_id?.slice(0, 8)}...</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${churnColor}`}>
                            Churn: {s.churn_risk}
                          </Badge>
                          {s.upgrade_opportunity !== "none" && (
                            <Badge className="text-[10px] bg-success/10 text-success border-success/20">
                              <TrendingUp className="w-3 h-3 mr-0.5" /> Upgrade
                            </Badge>
                          )}
                          {s.downgrade_opportunity !== "none" && (
                            <Badge className="text-[10px] bg-warning/10 text-warning border-warning/20">
                              <TrendingDown className="w-3 h-3 mr-0.5" /> Downgrade
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        <span>Usage Fit: {s.usage_fit_score}%</span>
                        <span>Billing: {s.billing_stability_score}%</span>
                        <span>Satisfaction: {s.satisfaction_proxy_score}%</span>
                      </div>
                      {(s.reasons as any[])?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground italic">
                          {(s.reasons as string[]).slice(0, 2).join(" · ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
