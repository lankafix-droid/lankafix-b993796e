/**
 * Launch Blockers V2 — /ops/launch-blockers (updated to use V2 services)
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Shield } from "lucide-react";
import { fetchLaunchBlockers } from "@/services/readiness/readinessReadModel";
import { BlockerCard } from "@/components/readiness/ReadinessComponents";

export default function LaunchBlockersV2Page() {
  const { data, isLoading } = useQuery({ queryKey: ["launch-blockers-v2"], queryFn: fetchLaunchBlockers, staleTime: 30_000 });
  const blockers = data || [];
  const critical = blockers.filter(b => b.severity === "CRITICAL").length;
  const high = blockers.filter(b => b.severity === "HIGH").length;
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Shield className="w-5 h-5 text-destructive" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Launch Blocker Register</h1>
          <p className="text-xs text-muted-foreground">{critical} critical · {high} high · {blockers.length} total</p></div>
      </div>
      {isLoading ? <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading…</div> :
      blockers.length === 0 ? (
        <Card className="border-success/20 bg-success/5"><CardContent className="p-8 text-center">
          <p className="text-success font-semibold">No launch blockers detected</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">{blockers.map(b => <BlockerCard key={b.id} b={b} />)}</div>
      )}
    </div></main><Footer /></div>
  );
}
