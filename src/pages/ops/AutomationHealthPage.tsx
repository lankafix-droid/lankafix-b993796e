/**
 * LankaFix Automation Health Dashboard
 * Shows edge function status, cron health, and automation monitoring.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  Zap, Shield, CreditCard, Bell, Bot, Search, Truck,
  Timer, TrendingUp, ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

interface AutomationEntry {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  type: "edge_function" | "trigger" | "cron";
  /** Table to check for recent activity */
  activityTable?: string;
  activityFilter?: Record<string, string>;
}

const AUTOMATIONS: AutomationEntry[] = [
  { id: "dispatch-engine", name: "Dispatch Engine", description: "Routes bookings to best available partners", icon: Truck, type: "edge_function" },
  { id: "dispatch-orchestrator", name: "Dispatch Orchestrator", description: "Multi-round dispatch coordination", icon: Zap, type: "edge_function" },
  { id: "dispatch-accept", name: "Dispatch Accept", description: "Handles partner job acceptance", icon: CheckCircle2, type: "edge_function" },
  { id: "dispatch-offer-timer", name: "Offer Timer", description: "Expires unanswered dispatch offers", icon: Timer, type: "edge_function" },
  { id: "dispatch-expiry-worker", name: "Expiry Worker", description: "Cleans up expired dispatch rounds", icon: Clock, type: "edge_function" },
  { id: "booking-watchdog", name: "Booking Watchdog", description: "Monitors stuck/stale bookings", icon: Shield, type: "edge_function" },
  { id: "smart-dispatch", name: "Smart Dispatch", description: "AI-enhanced partner matching", icon: Bot, type: "edge_function" },
  { id: "technician-match", name: "Technician Match", description: "Skill and proximity-based matching", icon: Search, type: "edge_function" },
  { id: "validate-quote-price", name: "Quote Validator", description: "Validates technician quotes against benchmarks", icon: CreditCard, type: "edge_function" },
  { id: "fraud-detection", name: "Fraud Detection", description: "Detects bypass and platform abuse", icon: AlertTriangle, type: "edge_function" },
  { id: "retention-engine", name: "Retention Engine", description: "Customer re-engagement and reminders", icon: TrendingUp, type: "edge_function" },
  { id: "marketplace-automation", name: "Marketplace Automation", description: "Automated marketplace operations", icon: Activity, type: "edge_function" },
  { id: "settlement-trigger", name: "Settlement Trigger", description: "Auto-creates partner settlements on completion", icon: CreditCard, type: "trigger", activityTable: "partner_settlements" },
  { id: "rating-trigger", name: "Rating Aggregator", description: "Updates partner average rating on new reviews", icon: TrendingUp, type: "trigger" },
];

/** Check recent automation_event_log entries for activity */
function useAutomationActivity() {
  return useQuery({
    queryKey: ["automation-activity"],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [eventLog, recentBookings, recentSettlements, recentDispatches] = await Promise.all([
        supabase.from("automation_event_log").select("event_type, created_at, severity").gte("created_at", oneDayAgo).order("created_at", { ascending: false }).limit(50),
        supabase.from("bookings").select("id").gte("created_at", oneHourAgo).limit(1),
        supabase.from("partner_settlements").select("id").gte("created_at", oneDayAgo).limit(1),
        supabase.from("dispatch_log").select("id").gte("created_at", oneHourAgo).limit(1),
      ]);

      return {
        events: eventLog.data || [],
        hasRecentBookings: (recentBookings.data?.length || 0) > 0,
        hasRecentSettlements: (recentSettlements.data?.length || 0) > 0,
        hasRecentDispatches: (recentDispatches.data?.length || 0) > 0,
        errorCount: (eventLog.data || []).filter(e => e.severity === "error" || e.severity === "critical").length,
      };
    },
    refetchInterval: 30_000,
  });
}

function getHealthStatus(automation: AutomationEntry, activity: ReturnType<typeof useAutomationActivity>["data"]): {
  status: "healthy" | "warning" | "error" | "unknown";
  label: string;
} {
  if (!activity) return { status: "unknown", label: "Checking…" };

  if (automation.type === "trigger") {
    if (automation.id === "settlement-trigger") {
      return activity.hasRecentSettlements
        ? { status: "healthy", label: "Active" }
        : { status: "unknown", label: "Idle — no completions" };
    }
    return { status: "healthy", label: "Active" };
  }

  // Edge functions — infer health from activity
  if (automation.id.includes("dispatch")) {
    return activity.hasRecentDispatches
      ? { status: "healthy", label: "Active" }
      : { status: "unknown", label: "Idle" };
  }

  if (activity.errorCount > 5) {
    return { status: "warning", label: "Errors detected" };
  }

  return { status: "healthy", label: "Ready" };
}

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  healthy: { badge: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  warning: { badge: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  error: { badge: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  unknown: { badge: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export default function AutomationHealthPage() {
  const { data: activity, isLoading, refetch } = useAutomationActivity();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const healthySystems = AUTOMATIONS.filter(a => getHealthStatus(a, activity).status === "healthy").length;
  const totalSystems = AUTOMATIONS.length;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-3xl py-6 px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/ops/control-tower" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Automation Health</h1>
                <p className="text-xs text-muted-foreground">{healthySystems}/{totalSystems} systems healthy</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="rounded-xl gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Edge Functions", value: AUTOMATIONS.filter(a => a.type === "edge_function").length, icon: Zap },
              { label: "DB Triggers", value: AUTOMATIONS.filter(a => a.type === "trigger").length, icon: Activity },
              { label: "Errors (24h)", value: activity?.errorCount || 0, icon: AlertTriangle },
              { label: "Events (24h)", value: activity?.events.length || 0, icon: Bell },
            ].map(item => (
              <div key={item.label} className="bg-card rounded-xl border border-border/60 p-3 text-center shadow-[var(--shadow-xs)]">
                <item.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-[9px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Automation list */}
          <div className="space-y-2">
            {AUTOMATIONS.map(automation => {
              const health = getHealthStatus(automation, activity);
              const styles = STATUS_STYLES[health.status];
              const Icon = automation.icon;

              return (
                <div key={automation.id} className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3 shadow-[var(--shadow-xs)]">
                  <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{automation.name}</p>
                    <p className="text-[11px] text-muted-foreground">{automation.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${styles.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} mr-1`} />
                      {health.label}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      {automation.type === "edge_function" ? "Function" : automation.type === "trigger" ? "Trigger" : "Cron"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent error log */}
          {activity && activity.events.filter(e => e.severity === "error" || e.severity === "critical").length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <h3 className="text-sm font-bold text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Recent Errors
              </h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {activity.events.filter(e => e.severity === "error" || e.severity === "critical").slice(0, 10).map((evt, i) => (
                  <div key={i} className="text-xs text-destructive/80 flex justify-between">
                    <span>{evt.event_type}</span>
                    <span className="text-muted-foreground">{new Date(evt.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
