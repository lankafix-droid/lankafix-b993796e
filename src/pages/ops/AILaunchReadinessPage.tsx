/**
 * AILaunchReadinessPage — Operator AI rollout readiness dashboard.
 * Advisory only — never modifies marketplace state.
 */
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Brain, RefreshCw } from "lucide-react";
import AIReadinessHero from "@/components/ai/AIReadinessHero";
import AILaunchBlockersPanel from "@/components/ai/AILaunchBlockersPanel";
import AIModuleReadinessTable from "@/components/ai/AIModuleReadinessTable";
import AIDegradationMonitor from "@/components/ai/AIDegradationMonitor";
import AIFeedbackAnalytics from "@/components/ai/AIFeedbackAnalytics";
import AICacheDebugPanel from "@/components/ai/AICacheDebugPanel";
import { useAIRolloutReadiness } from "@/hooks/useAIRolloutReadiness";

const AILaunchReadinessPage = () => {
  const { moduleReadiness, overallReadiness, lastRefreshed, refresh } = useAIRolloutReadiness();
  const navigate = useNavigate();

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-6 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link to="/ops/ai-control-center" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> AI Control Center
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Launch Readiness</h1>
                <p className="text-sm text-muted-foreground">Operational advisory dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">Advisory Only</Badge>
              <Button variant="ghost" size="sm" onClick={refresh} className="h-8 w-8 p-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>

        {/* Hero */}
        <AIReadinessHero readiness={overallReadiness} />

        {/* Blockers & Warnings */}
        <AILaunchBlockersPanel
          blockers={overallReadiness.blockers}
          warnings={overallReadiness.warnings}
        />

        {/* Module Table */}
        <AIModuleReadinessTable modules={moduleReadiness} />

        {/* Degradation Monitor */}
        <AIDegradationMonitor />

        {/* Analytics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AIFeedbackAnalytics />
          <AICacheDebugPanel />
        </div>

        {/* Navigation */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {[
              { label: "AI Control Center", route: "/ops/ai-control-center" },
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

export default AILaunchReadinessPage;
