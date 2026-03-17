/**
 * Pilot Test Tracker — /ops/pilot-test-tracker
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Beaker, CheckCircle2, XCircle, Clock } from "lucide-react";
import { fetchPilotTests, type PilotTest } from "@/services/launchReadinessReadModel";

const STATUS_STYLES: Record<string, { text: string; icon: React.ElementType }> = {
  PASS: { text: "text-success", icon: CheckCircle2 },
  FAIL: { text: "text-destructive", icon: XCircle },
  PENDING: { text: "text-muted-foreground", icon: Clock },
};

export default function PilotTestTrackerPage() {
  const [tests] = useState<PilotTest[]>(() => fetchPilotTests());
  const passed = tests.filter(t => t.status === "PASS").length;
  const failed = tests.filter(t => t.status === "FAIL").length;
  const pending = tests.filter(t => t.status === "PENDING").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Beaker className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Pilot Test Tracker</h1>
              <p className="text-xs text-muted-foreground">{passed} pass · {failed} fail · {pending} pending</p>
            </div>
          </div>

          <div className="space-y-2">
            {tests.map(test => {
              const ss = STATUS_STYLES[test.status];
              const Icon = ss.icon;
              return (
                <Card key={test.id}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${ss.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{test.name}</span>
                        <div className="flex items-center gap-1.5">
                          {test.isBlocker && <Badge variant="outline" className="text-[8px] text-destructive border-destructive/30">BLOCKER</Badge>}
                          <Badge variant="outline" className={`text-[9px] ${ss.text}`}>{test.status}</Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{test.notes}</p>
                      <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground">
                        <span>{test.category}</span>·<span>Owner: {test.owner}</span>
                        {test.lastTestDate && <span>· Last: {test.lastTestDate}</span>}
                      </div>
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
