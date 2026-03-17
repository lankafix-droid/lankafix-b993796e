/**
 * Partner Readiness — /ops/readiness-partners
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Users } from "lucide-react";
import { fetchPartnerReadiness } from "@/services/readiness/readinessReadModel";
import { LaunchModeBadge, CheckRow } from "@/components/readiness/ReadinessComponents";

export default function ReadinessPartnersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["readiness-partners"], queryFn: fetchPartnerReadiness, staleTime: 30_000 });
  const partners = data || [];
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Partner Readiness</h1>
          <p className="text-xs text-muted-foreground">{partners.filter(p=>p.status==="READY").length} ready · {partners.length} total</p></div>
      </div>
      {isLoading ? <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading…</div> :
      partners.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No partners found.</CardContent></Card> : (
        <div className="space-y-2.5">{partners.map(p => (
          <Card key={p.id} className="border"><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                {p.isSeeded && <Badge variant="outline" className="text-[8px] text-warning border-warning/30">Seeded</Badge>}
              </div>
              <LaunchModeBadge status={p.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-2">
              <div><span className="text-muted-foreground">Zones</span><br/><span className="font-semibold">{p.serviceZones.length}</span></div>
              <div><span className="text-muted-foreground">Categories</span><br/><span className="font-semibold">{p.categories.length}</span></div>
              <div><span className="text-muted-foreground">Response</span><br/><span className="font-semibold">{p.responseReadiness}%</span></div>
              <div><span className="text-muted-foreground">Real Jobs</span><br/><span className="font-semibold">{p.realCompletedJobs}</span></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <CheckRow label="Profile" pass={p.profileComplete} />
              <CheckRow label="KYC" pass={p.kycComplete} />
              <CheckRow label="Payout" pass={p.payoutReady} />
              <CheckRow label="Low Cancel Risk" pass={!p.cancellationRisk} />
            </div>
          </CardContent></Card>
        ))}</div>
      )}
    </div></main><Footer /></div>
  );
}
