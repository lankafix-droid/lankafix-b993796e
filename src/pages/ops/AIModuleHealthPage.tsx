import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, Shield, TrendingUp, BarChart3, Users, Bell, Zap, Eye, FlaskConical, Mic, MessageCircle } from "lucide-react";
import AIStatusStrip from "@/components/ai/AIStatusStrip";
import { getAIFlags, type AIFeatureFlags } from "@/lib/aiFeatureFlags";

const MODULE_META: Record<keyof AIFeatureFlags, { label: string; icon: any; description: string; category: string }> = {
  ai_photo_triage: { label: "Photo Triage", icon: Eye, description: "AI-powered issue detection from photos", category: "Consumer" },
  ai_issue_triage: { label: "Issue Triage", icon: Brain, description: "Free-text issue analysis and categorization", category: "Consumer" },
  ai_estimate_assist: { label: "Price Estimation", icon: TrendingUp, description: "Advisory price range estimation", category: "Consumer" },
  ai_partner_ranking: { label: "Partner Matching", icon: Users, description: "AI-assisted technician ranking", category: "Consumer" },
  ai_review_summary: { label: "Review Summary", icon: BarChart3, description: "Automated review summarization", category: "Consumer" },
  ai_retention_nudges: { label: "Retention Nudges", icon: Bell, description: "Behavioral retention triggers", category: "Growth" },
  ai_fraud_watch: { label: "Fraud Watch", icon: Shield, description: "Advisory fraud pattern detection", category: "Internal" },
  ai_operator_copilot: { label: "Operator Copilot", icon: Brain, description: "AI suggestions for operators", category: "Internal" },
  ai_demand_heatmap: { label: "Demand Heatmap", icon: Activity, description: "Zone demand intelligence", category: "Internal" },
  ai_quality_monitor: { label: "Quality Monitor", icon: Zap, description: "Service quality issue detection", category: "Internal" },
  ai_experiments: { label: "Experiments", icon: FlaskConical, description: "A/B testing infrastructure", category: "Infrastructure" },
  ai_voice_booking: { label: "Voice Booking", icon: Mic, description: "Voice-assisted booking (scaffold)", category: "Future" },
  ai_whatsapp_assist: { label: "WhatsApp Assist", icon: MessageCircle, description: "WhatsApp booking continuity", category: "Future" },
};

const CATEGORY_ORDER = ["Consumer", "Internal", "Growth", "Infrastructure", "Future"];

const AIModuleHealthPage = () => {
  const flags = getAIFlags();
  const navigate = useNavigate();
  const entries = Object.entries(MODULE_META) as [keyof AIFeatureFlags, typeof MODULE_META[keyof AIFeatureFlags]][];

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    modules: entries.filter(([, m]) => m.category === cat),
  })).filter((g) => g.modules.length > 0);

  const totalModules = entries.length;
  const activeModules = entries.filter(([key]) => flags[key]).length;

  const stripModules = entries.map(([key, meta]) => ({
    name: meta.label,
    enabled: flags[key],
    health: "healthy" as const,
  }));

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-6 px-4 space-y-6">
        {/* Hero */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Module Health</h1>
              <p className="text-sm text-muted-foreground">System status and configuration</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">Advisory Only</Badge>
        </div>

        {/* Status strip */}
        <AIStatusStrip modules={stripModules} />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
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
              <p className="text-2xl font-bold text-green-600">100%</p>
              <p className="text-[11px] text-muted-foreground">Healthy</p>
            </CardContent>
          </Card>
        </div>

        {/* Module groups */}
        {grouped.map((group) => (
          <div key={group.category} className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">{group.category} AI Modules</h2>
            <div className="space-y-2">
              {group.modules.map(([key, meta]) => {
                const Icon = meta.icon;
                const enabled = flags[key];
                return (
                  <Card key={key} className={`${!enabled ? "opacity-50" : ""}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{meta.description}</p>
                      </div>
                      <Badge
                        variant={enabled ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {enabled ? "Active" : "Off"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[
              { label: "AI Control Center", route: "/ops/ai-control-center" },
              { label: "AI Audit Log", route: "/ops/ai-audit-log" },
              { label: "Governance Hub", route: "/ops/governance-hub" },
              { label: "Operations Board", route: "/ops/operations-board" },
              { label: "Predictive Reliability", route: "/ops/predictive-reliability" },
              { label: "Command Center", route: "/ops/launch-command" },
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

export default AIModuleHealthPage;
