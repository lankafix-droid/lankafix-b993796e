/**
 * Zone Readiness — /ops/readiness-zones
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, MapPin } from "lucide-react";
import { fetchZoneReadiness } from "@/services/readiness/readinessReadModel";
import { LaunchModeBadge } from "@/components/readiness/ReadinessComponents";

export default function ReadinessZonesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["readiness-zones"], queryFn: fetchZoneReadiness, staleTime: 30_000 });
  const zones = data || [];
  const pub = zones.filter(z => z.status === "PUBLIC_LIVE").length;
  const pilot = zones.filter(z => z.status === "PILOT_LIVE").length;
  const disabled = zones.filter(z => z.status === "DISABLED").length;
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Zone Readiness</h1>
          <p className="text-xs text-muted-foreground">{pub} public · {pilot} pilot · {disabled} disabled</p></div>
      </div>
      {isLoading ? <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading…</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {zones.sort((a,b) => b.activePartners - a.activePartners).map(z => (
            <Card key={z.id} className="border"><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{z.label}</span>
                <LaunchModeBadge status={z.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-center mb-2">
                <div><p className="font-bold text-foreground">{z.activePartners}</p><p className="text-muted-foreground">Partners</p></div>
                <div><p className="font-bold text-foreground">{z.categoriesSupported.length}</p><p className="text-muted-foreground">Categories</p></div>
                <div><p className="font-bold text-foreground">{z.liveBookingCount}</p><p className="text-muted-foreground">Bookings</p></div>
              </div>
              {z.noProviderRisk && <p className="text-[10px] text-destructive font-medium">⚠ No-provider risk</p>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div></main><Footer /></div>
  );
}
