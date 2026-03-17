/**
 * Category Readiness — /ops/readiness-categories
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Target, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { fetchCategoryReadiness } from "@/services/readiness/readinessReadModel";
import { LaunchModeBadge, CheckRow } from "@/components/readiness/ReadinessComponents";

export default function ReadinessCategoriesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["readiness-categories"], queryFn: fetchCategoryReadiness, staleTime: 30_000 });
  const cats = data || [];
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Category Readiness</h1>
          <p className="text-xs text-muted-foreground">
            {cats.filter(c=>c.status==="LAUNCH_READY").length} launch · {cats.filter(c=>c.status==="PILOT_ONLY").length} pilot · {cats.filter(c=>c.status==="NOT_READY").length} not ready
          </p></div>
      </div>
      {isLoading ? <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading…</div> : (
        <div className="space-y-2.5">{cats.map(cat => {
          const checks = [
            { label: "4+ Partners", pass: cat.partnerCount >= 4 },
            { label: "2+ Zones", pass: cat.activeZones >= 2 },
            { label: "5+ Bookings", pass: cat.completedBookings >= 5 },
            { label: "Quote Flow", pass: cat.quoteFlowValidated },
            { label: "Completion", pass: cat.completionFlowValidated },
            { label: "Support Tested", pass: cat.supportEscalationTested },
            { label: "Reminder Flow", pass: cat.reminderFlowValidated },
            { label: "Payment", pass: cat.paymentFlowValidated },
          ];
          const pct = Math.round((checks.filter(c=>c.pass).length / checks.length) * 100);
          return (
            <Card key={cat.code} className="border"><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                <LaunchModeBadge status={cat.status} />
              </div>
              <Progress value={pct} className="h-1.5 mb-3" />
              <div className="grid grid-cols-3 gap-1.5 text-[10px] mb-2">
                <div><span className="text-muted-foreground">Partners</span><br/><span className="font-semibold">{cat.partnerCount}</span></div>
                <div><span className="text-muted-foreground">Zones</span><br/><span className="font-semibold">{cat.activeZones}</span></div>
                <div><span className="text-muted-foreground">Bookings</span><br/><span className="font-semibold">{cat.completedBookings}</span></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {checks.map(c => <CheckRow key={c.label} label={c.label} pass={c.pass} />)}
              </div>
            </CardContent></Card>
          );
        })}</div>
      )}
    </div></main><Footer /></div>
  );
}
