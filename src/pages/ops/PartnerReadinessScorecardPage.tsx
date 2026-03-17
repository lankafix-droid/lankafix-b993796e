/**
 * Partner Readiness Scorecard — /ops/partner-readiness-scorecard
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Users, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { fetchPartnerReadiness, type PartnerReadiness } from "@/services/launchReadinessReadModel";

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  READY: { text: "text-success", bg: "bg-success/10 border-success/20" },
  PILOT_ONLY: { text: "text-primary", bg: "bg-primary/10 border-primary/20" },
  ONBOARDING_REQUIRED: { text: "text-warning", bg: "bg-warning/10 border-warning/20" },
  HOLD: { text: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
};

export default function PartnerReadinessScorecardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["partner-readiness-scorecard"], queryFn: fetchPartnerReadiness, staleTime: 30_000 });

  const partners = data || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Partner Readiness Scorecard</h1>
              <p className="text-xs text-muted-foreground">{partners.length} partners · {partners.filter(p => p.status === "READY").length} ready for launch</p>
            </div>
          </div>

          {isLoading ? (
            <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading partners…</div>
          ) : partners.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No partners found. Onboarding required.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {partners.map(p => {
                const ss = STATUS_STYLES[p.status];
                return (
                  <Card key={p.id} className={`border ${ss.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        <Badge variant="outline" className={`text-[9px] ${ss.text}`}>{p.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-2">
                        <div><span className="text-muted-foreground">Verification</span><br /><span className="font-semibold capitalize">{p.verificationStatus}</span></div>
                        <div><span className="text-muted-foreground">Zones</span><br /><span className="font-semibold">{p.serviceZones.length}</span></div>
                        <div><span className="text-muted-foreground">Categories</span><br /><span className="font-semibold">{p.categories.length}</span></div>
                        <div><span className="text-muted-foreground">Response</span><br /><span className="font-semibold">{p.responseReadiness}%</span></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={`text-[9px] ${p.profileComplete ? "text-success border-success/30" : "text-muted-foreground"}`}>
                          {p.profileComplete ? "✓" : "○"} Profile
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] ${p.verificationStatus === "verified" ? "text-success border-success/30" : "text-muted-foreground"}`}>
                          {p.verificationStatus === "verified" ? "✓" : "○"} KYC
                        </Badge>
                      </div>
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
