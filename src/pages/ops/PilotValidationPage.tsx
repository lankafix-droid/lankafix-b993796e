/**
 * Pilot Validation — /ops/pilot-validation
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Beaker, CheckCircle2, XCircle, Clock } from "lucide-react";
import { fetchPilotTests, type PilotTest } from "@/services/readiness/readinessReadModel";

const STATUS_ICONS = { PASS: CheckCircle2, FAIL: XCircle, PENDING: Clock };
const STATUS_COLORS = { PASS: "text-success", FAIL: "text-destructive", PENDING: "text-muted-foreground" };

export default function PilotValidationPage() {
  const [tests] = useState<PilotTest[]>(() => fetchPilotTests());
  const passed = tests.filter(t => t.status === "PASS").length;
  const blockers = tests.filter(t => t.isBlocker && t.status !== "PASS").length;
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Beaker className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Pilot Validation</h1>
          <p className="text-xs text-muted-foreground">{passed}/{tests.length} pass · {blockers} blocking</p></div>
      </div>
      <div className="space-y-2">{tests.map(t => {
        const Icon = STATUS_ICONS[t.status];
        const color = STATUS_COLORS[t.status];
        return (
          <Card key={t.id}><CardContent className="p-3 flex items-start gap-2.5">
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{t.name}</span>
                <div className="flex items-center gap-1">
                  {t.isBlocker && <Badge variant="outline" className="text-[8px] text-destructive border-destructive/30">BLOCKER</Badge>}
                  <Badge variant="outline" className={`text-[9px] ${color}`}>{t.status}</Badge>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{t.notes}</p>
              <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground">
                <span>{t.category}</span>·<span>Owner: {t.owner}</span>
                {t.lastTestDate && <span>· Last: {t.lastTestDate}</span>}
              </div>
            </div>
          </CardContent></Card>
        );
      })}</div>
    </div></main><Footer /></div>
  );
}
