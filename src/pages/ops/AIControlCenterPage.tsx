/**
 * AIControlCenterPage — Operator AI control center.
 * Shows module status, usage metrics, degraded state, and feedback summary.
 * Advisory only — never modifies marketplace state.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Activity, Shield, TrendingUp, BarChart3, Users, Bell, Zap,
  Eye, FlaskConical, Mic, MessageCircle, ArrowLeft, RefreshCw, Trash2,
} from "lucide-react";
import AIStatusStrip from "@/components/ai/AIStatusStrip";
import AIFeedbackAnalytics from "@/components/ai/AIFeedbackAnalytics";
import AILaunchReadinessCard from "@/components/ai/AILaunchReadinessCard";
import AICacheDebugPanel from "@/components/ai/AICacheDebugPanel";
import AIDegradationMonitor from "@/components/ai/AIDegradationMonitor";
import { getAIFlags, type AIFeatureFlags } from "@/lib/aiFeatureFlags";
import { getUsageSummary, clearUsageData } from "@/services/aiUsageMeter";
import { toast } from "@/hooks/use-toast";

const MODULE_META: Record<keyof AIFeatureFlags, {
  label: string; icon: any; description: string; category: "Consumer" | "Internal" | "Growth" | "Infrastructure" | "Future";
}> = {
  ai_photo_triage: { label: "Photo Triage", icon: Eye, description: "Photo-based issue detection", category: "Consumer" },
  ai_issue_triage: { label: "Issue Triage", icon: Brain, description: "Text issue analysis", category: "Consumer" },
  ai_estimate_assist: { label: "Price Estimation", icon: TrendingUp, description: "Advisory price ranges", category: "Consumer" },
  ai_partner_ranking: { label: "Partner Matching", icon: Users, description: "Technician ranking", category: "Consumer" },
  ai_review_summary: { label: "Review Summary", icon: BarChart3, description: "Review summarization", category: "Consumer" },
  ai_retention_nudges: { label: "Retention Nudges", icon: Bell, description: "Behavioral triggers", category: "Growth" },
  ai_fraud_watch: { label: "Fraud Watch", icon: Shield, description: "Fraud pattern detection", category: "Internal" },
  ai_operator_copilot: { label: "Operator Copilot", icon: Brain, description: "Operator AI suggestions", category: "Internal" },
  ai_demand_heatmap: { label: "Demand Heatmap", icon: Activity, description: "Zone demand intel", category: "Internal" },
  ai_quality_monitor: { label: "Quality Monitor", icon: Zap, description: "Service quality detection", category: "Internal" },
  ai_experiments: { label: "Experiments", icon: FlaskConical, description: "A/B testing infra", category: "Infrastructure" },
  ai_voice_booking: { label: "Voice Booking", icon: Mic, description: "Voice-assisted booking", category: "Future" },
  ai_whatsapp_assist: { label: "WhatsApp Assist", icon: MessageCircle, description: "WhatsApp continuity", category: "Future" },
};

const CATEGORY_ORDER = ["Consumer", "Internal", "Growth", "Infrastructure", "Future"] as const;

const AIControlCenterPage = () => {
  const flags = getAIFlags();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const usage = getUsageSummary();

  const entries = Object.entries(MODULE_META) as [keyof AIFeatureFlags, (typeof MODULE_META)[keyof AIFeatureFlags]][];
  const totalModules = entries.length;
  const activeModules = entries.filter(([key]) => flags[key]).length;
  const degradedModules = 0; // Future: track from health checks

  const stripModules = entries.map(([key, meta]) => ({
    name: meta.label,
    enabled: flags[key],
    health: "healthy" as const,
  }));

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    modules: entries.filter(([, m]) => m.category === cat),
  })).filter((g) => g.modules.length > 0);

  const handleClearCache = () => {
    clearUsageData();
    setRefreshKey((k) => k + 1);
    toast({ title: "AI cache cleared", description: "Session usage data has been reset." });
  };

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-6 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link to="/ops/control-tower" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Control Tower
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Control Center</h1>
                <p className="text-sm text-muted-foreground">Module status & operational readiness</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">Advisory Only</Badge>
          </div>
        </div>

        {/* Status strip */}
        <AIStatusStrip modules={stripModules} />

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{activeModules}</p>
              <p className="text-[11px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalModules - activeModules}</p>
              <p className="text-[11px] text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{usage.totalCalls}</p>
              <p className="text-[11px] text-muted-foreground">Session Calls</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {usage.fallbackRate > 0 ? `${(usage.fallbackRate * 100).toFixed(0)}%` : "0%"}
              </p>
              <p className="text-[11px] text-muted-foreground">Fallback Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage details */}
        {usage.totalCalls > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Session Usage</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{usage.callsLastMinute}</p>
                  <p className="text-[10px] text-muted-foreground">Last minute</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{usage.callsLastHour}</p>
                  <p className="text-[10px] text-muted-foreground">Last hour</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{usage.avgLatencyMs}ms</p>
                  <p className="text-[10px] text-muted-foreground">Avg latency</p>
                </div>
              </div>
              {Object.keys(usage.byModule).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
                  {Object.entries(usage.byModule).map(([mod, count]) => (
                    <Badge key={mod} variant="secondary" className="text-[10px]">
                      {mod}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Module groups */}
        {grouped.map((group) => (
          <div key={group.category} className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">{group.category} Modules</h2>
            <div className="space-y-2">
              {group.modules.map(([key, meta]) => {
                const Icon = meta.icon;
                const enabled = flags[key];
                const moduleUsage = usage.byModule[key] || 0;
                return (
                  <Card key={key} className={!enabled ? "opacity-50" : ""}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                          <Badge variant="outline" className="text-[8px] text-muted-foreground">
                            {meta.category === "Consumer" ? "Consumer-facing" : meta.category === "Internal" ? "Operator-only" : meta.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{meta.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {moduleUsage > 0 && (
                          <span className="text-[10px] text-muted-foreground">{moduleUsage} calls</span>
                        )}
                        <Badge variant={enabled ? "default" : "secondary"} className="text-[10px]">
                          {enabled ? "Active" : "Off"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Degradation Monitor */}
        <AIDegradationMonitor />

        {/* Analytics + Cache + Readiness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AIFeedbackAnalytics />
          <AICacheDebugPanel />
        </div>

        <AILaunchReadinessCard />

        {/* Launch Readiness Summary */}
        <Card className="border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/ops/ai-launch-readiness")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">AI Launch Readiness Dashboard</p>
              <p className="text-[11px] text-muted-foreground">Per-module rollout eligibility, blockers & recommendations</p>
            </div>
            <Badge variant="outline" className="text-[10px]">View →</Badge>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleClearCache}>
            <Trash2 className="w-3 h-3" /> Clear AI Cache
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/ops/ai-module-health")}>
            Module Health →
          </Button>
        </div>

        {/* Navigation */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {[
              { label: "Launch Readiness", route: "/ops/ai-launch-readiness" },
              { label: "Module Health", route: "/ops/ai-module-health" },
              { label: "AI Audit Log", route: "/ops/ai-audit-log" },
              { label: "AI Intelligence", route: "/ops/ai-intelligence" },
              { label: "Governance Hub", route: "/ops/governance-hub" },
              { label: "Operations Board", route: "/ops/operations-board" },
            ].map((link) => (
              <Badge
                key={link.route}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-[11px]"
                onClick={() => navigate(link.route)}
              >
                {link.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AIControlCenterPage;
