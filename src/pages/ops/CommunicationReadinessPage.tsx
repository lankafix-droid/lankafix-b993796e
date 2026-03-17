/**
 * Communication Infrastructure Readiness — /ops/communication-readiness
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Radio, CheckCircle2, XCircle } from "lucide-react";
import { fetchCommunicationReadiness, type ChannelReadiness } from "@/services/launchReadinessReadModel";

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  PRODUCTION_READY: { text: "text-success", bg: "bg-success/10 border-success/20" },
  TEST_MODE: { text: "text-primary", bg: "bg-primary/10 border-primary/20" },
  STUB_ONLY: { text: "text-warning", bg: "bg-warning/10 border-warning/20" },
};

export default function CommunicationReadinessPage() {
  const channels = fetchCommunicationReadiness();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Radio className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Communication Infrastructure Readiness</h1>
              <p className="text-xs text-muted-foreground">{channels.filter(c => c.status !== "STUB_ONLY").length}/{channels.length} channels operational</p>
            </div>
          </div>

          <div className="space-y-3">
            {channels.map(ch => {
              const ss = STATUS_STYLES[ch.status];
              const checks = [
                { label: "UI Ready", pass: ch.uiReady },
                { label: "Backend Ready", pass: ch.backendReady },
                { label: "Provider Configured", pass: ch.providerConfigured },
                { label: "Sandbox Tested", pass: ch.sandboxTested },
                { label: "Production Tested", pass: ch.productionTested },
                { label: "Currently Active", pass: ch.currentlyActive },
                { label: "Fallback Configured", pass: ch.fallbackConfigured },
              ];
              return (
                <Card key={ch.channel} className={`border ${ss.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">{ch.displayName}</span>
                      <Badge variant="outline" className={`text-[9px] ${ss.text}`}>{ch.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {checks.map(c => (
                        <div key={c.label} className="flex items-center gap-1.5 text-[10px]">
                          {c.pass ? <CheckCircle2 className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}
                          <span className={c.pass ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
