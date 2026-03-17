/**
 * Zone Readiness Control — /ops/zone-readiness
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, MapPin, Users, Zap } from "lucide-react";
import { fetchZoneReadiness, type ZoneReadiness } from "@/services/launchReadinessReadModel";

const REC_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  STRONG_FOR_LAUNCH: { bg: "bg-success/10 border-success/20", text: "text-success", label: "Strong for Launch" },
  PILOT_ZONE: { bg: "bg-primary/10 border-primary/20", text: "text-primary", label: "Pilot Zone" },
  NEEDS_MORE_SUPPLY: { bg: "bg-warning/10 border-warning/20", text: "text-warning", label: "Needs More Supply" },
  HIGH_RISK: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", label: "High Risk" },
};

export default function ZoneReadinessPage() {
  const { data, isLoading } = useQuery({ queryKey: ["zone-readiness-control"], queryFn: fetchZoneReadiness, staleTime: 30_000 });

  const zones = data || [];
  const strong = zones.filter(z => z.recommendation === "STRONG_FOR_LAUNCH").length;
  const pilot = zones.filter(z => z.recommendation === "PILOT_ZONE").length;
  const risk = zones.filter(z => z.recommendation === "HIGH_RISK").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Zone Readiness Control</h1>
              <p className="text-xs text-muted-foreground">Evaluate which Greater Colombo zones can be safely activated</p>
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
            <span className="text-success font-medium">{strong} strong</span>
            <span className="text-primary font-medium">{pilot} pilot</span>
            <span className="text-destructive font-medium">{risk} high risk</span>
          </div>

          {isLoading ? (
            <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading zones…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zones.sort((a, b) => a.activePartners - b.activePartners).map(zone => {
                const rs = REC_STYLES[zone.recommendation];
                return (
                  <Card key={zone.id} className={`border ${rs.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{zone.label}</span>
                        <Badge variant="outline" className={`text-[9px] ${rs.text}`}>{rs.label}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-center mb-2">
                        <div>
                          <p className="font-bold text-foreground">{zone.activePartners}</p>
                          <p className="text-muted-foreground">Partners</p>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{zone.categoriesSupported.length}</p>
                          <p className="text-muted-foreground">Categories</p>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{zone.dispatchReliability}%</p>
                          <p className="text-muted-foreground">Dispatch Est.</p>
                        </div>
                      </div>
                      {zone.noProviderRisk && (
                        <p className="text-[10px] text-destructive font-medium">⚠ No-provider risk — bookings may fail dispatch</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
