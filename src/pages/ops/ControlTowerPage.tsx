import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Activity, MapPin, TrendingUp, BarChart3, Users, AlertTriangle,
  Target, Zap, CheckCircle2, Clock, FileText, Shield, ChevronRight,
  Headphones, CreditCard, XCircle, Search, Briefcase, UserX, Timer, Ban,
} from "lucide-react";
import OpsReliabilityAlerts from "@/components/ops/OpsReliabilityAlerts";
import { useOpsMetrics } from "@/services/opsMetricsService";
import { useZoneIntelligence, type ZoneHealthStatus } from "@/services/zoneIntelligenceService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

function KPICard({ label, value, icon: Icon, color, alert, onClick }: {
  label: string; value: number | string; icon: typeof Activity; color: string; alert?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-card rounded-xl border p-3 text-center transition-all ${alert ? "border-destructive/30 bg-destructive/5" : "border-border/60"} ${onClick ? "hover:border-primary/30 cursor-pointer" : ""}`}
    >
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <p className={`text-lg font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
    </button>
  );
}

function ActionCard({ title, description, count, icon: Icon, color, variant, onClick }: {
  title: string; description: string; count: number; icon: typeof AlertTriangle; color: string;
  variant: "urgent" | "warning" | "info"; onClick?: () => void;
}) {
  const borderClass = variant === "urgent" ? "border-destructive/30 bg-destructive/5" :
    variant === "warning" ? "border-warning/30 bg-warning/5" : "border-border/60";

  if (count === 0) return null;

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left bg-card rounded-2xl border ${borderClass} p-4 flex items-center gap-3 transition-all hover:shadow-sm`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        variant === "urgent" ? "bg-destructive/10" : variant === "warning" ? "bg-warning/10" : "bg-primary/10"
      }`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg font-bold ${variant === "urgent" ? "text-destructive" : variant === "warning" ? "text-warning" : "text-primary"}`}>
          {count}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.button>
  );
}

export default function ControlTowerPage() {
  const navigate = useNavigate();
  const { data: metrics } = useOpsMetrics();
  const { data: zoneHealth = [] } = useZoneIntelligence();

  const healthColor = (h: ZoneHealthStatus) =>
    h === "risk" ? "bg-destructive/15 text-destructive" : h === "watch" ? "bg-warning/15 text-warning" : "bg-success/15 text-success";

  const riskZones = zoneHealth.filter(z => z.health === "risk");
  const watchZones = zoneHealth.filter(z => z.health === "watch");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border/60 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Link to="/ops/dispatch"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
        <Activity className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground">Control Tower</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">Live</Badge>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Priority Actions — items needing intervention */}
        {metrics && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Needs Attention</p>
            <ActionCard
              title="Dispatch Escalations"
              description="Bookings where no technician was found — operations intervention required"
              count={metrics.dispatch_escalations}
              icon={AlertTriangle}
              color="text-destructive"
              variant="urgent"
              onClick={() => navigate("/ops/dispatch")}
            />
            <ActionCard
              title="Jobs Awaiting Partner"
              description="Bookings waiting for a technician to accept the job offer"
              count={metrics.jobs_awaiting_partner}
              icon={Users}
              color="text-warning"
              variant="warning"
              onClick={() => navigate("/ops/dispatch")}
            />
            <ActionCard
              title="Quotes Pending Approval"
              description="Customer quotes waiting for review and approval"
              count={metrics.quotes_pending_approval}
              icon={FileText}
              color="text-warning"
              variant="warning"
            />
            <ActionCard
              title="Consultation Queue"
              description="Manual-dispatch bookings requiring specialist assignment"
              count={metrics.consultation_queue}
              icon={Headphones}
              color="text-primary"
              variant="info"
              onClick={() => navigate("/ops/dispatch")}
            />
            <ActionCard
              title="Dispatch Failures Today"
              description="Bookings where auto-dispatch failed to find a match"
              count={metrics.dispatch_failures}
              icon={XCircle}
              color="text-destructive"
              variant={metrics.dispatch_failures > 3 ? "urgent" : "warning"}
              onClick={() => navigate("/ops/dispatch")}
            />
          </div>
        )}

        {/* Core KPIs */}
        {metrics && (
          <>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Today's Overview</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <KPICard label="Bookings Today" value={metrics.bookings_today} icon={Briefcase} color="text-foreground" />
              <KPICard label="Active" value={metrics.active_bookings} icon={Zap} color="text-primary" />
              <KPICard label="In Progress" value={metrics.jobs_in_progress} icon={Clock} color="text-warning" />
              <KPICard label="Completed" value={metrics.completed_today} icon={CheckCircle2} color="text-success" />
              <KPICard label="Dispatch Rate" value={metrics.dispatch_success_rate != null ? `${metrics.dispatch_success_rate}%` : "—"} icon={Target} color={metrics.dispatch_success_rate != null && metrics.dispatch_success_rate < 80 ? "text-destructive" : "text-success"} alert={metrics.dispatch_success_rate != null && metrics.dispatch_success_rate < 70} />
              <KPICard label="Avg Response" value={metrics.avg_partner_response_sec != null ? `${metrics.avg_partner_response_sec}s` : "—"} icon={Clock} color="text-muted-foreground" />
              <KPICard label="Payments" value={metrics.payments_today_count} icon={CreditCard} color="text-success" />
              <KPICard label="Fraud Alerts" value={metrics.fraud_alerts_today} icon={Shield} color={metrics.fraud_alerts_today > 0 ? "text-destructive" : "text-muted-foreground"} alert={metrics.fraud_alerts_today > 0} />
            </div>
          </>
        )}

        {/* Reliability Alerts */}
        <OpsReliabilityAlerts detailed />

        {/* Zone Health — compact summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Zone Health</p>
            <div className="flex gap-1 text-[10px]">
              <Badge className="bg-destructive/15 text-destructive border-0">{riskZones.length} risk</Badge>
              <Badge className="bg-warning/15 text-warning border-0">{watchZones.length} watch</Badge>
              <Badge className="bg-success/15 text-success border-0">{zoneHealth.filter(z => z.health === "healthy").length} ok</Badge>
            </div>
          </div>

          {/* Show risk/watch zones prominently */}
          {riskZones.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> At-Risk Zones
              </p>
              {riskZones.map(z => (
                <div key={z.zone_code} className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{z.zone_label}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{z.verified_partner_count} partners</span>
                    <span>·</span>
                    <span>{z.failed_dispatch_count} fails</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full zone table */}
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Zone</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground">Jobs</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground">Partners</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground">Fails</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneHealth.map((z) => (
                    <tr key={z.zone_code} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <span className="font-medium text-foreground">{z.zone_label}</span>
                      </td>
                      <td className="text-center py-2 px-2 text-foreground">{z.bookings_count}</td>
                      <td className={`text-center py-2 px-2 font-medium ${z.verified_partner_count < 2 ? "text-destructive" : "text-foreground"}`}>
                        {z.verified_partner_count}
                      </td>
                      <td className={`text-center py-2 px-2 ${z.failed_dispatch_count > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {z.failed_dispatch_count}
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge className={`border-0 text-[9px] ${healthColor(z.health)}`}>{z.health}</Badge>
                      </td>
                    </tr>
                  ))}
                  {zoneHealth.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No zone data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dashboards</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Dispatch Board", icon: MapPin, path: "/ops/dispatch" },
              { label: "Finance Board", icon: CreditCard, path: "/ops/finance" },
              { label: "Support Cases", icon: Headphones, path: "/ops/support" },
              { label: "Pricing Editor", icon: TrendingUp, path: "/ops/pricing" },
              { label: "Dispatch Analytics", icon: BarChart3, path: "/ops/dispatch-analytics" },
              { label: "Launch Readiness", icon: Target, path: "/ops/launch-readiness" },
            ].map(item => (
              <Button
                key={item.path}
                variant="outline"
                className="h-auto py-3 rounded-xl justify-start gap-2 text-xs"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Trust Footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-4">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>LankaFix Operations Console</span>
        </div>
      </div>
    </div>
  );
}
