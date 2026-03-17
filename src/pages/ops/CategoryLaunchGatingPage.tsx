/**
 * Category Launch Gating — /ops/category-launch-gating
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Target, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { fetchCategoryGating, type CategoryGating } from "@/services/launchReadinessReadModel";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  LAUNCH_READY: { bg: "bg-success/10 border-success/20", text: "text-success" },
  PILOT_ONLY: { bg: "bg-warning/10 border-warning/20", text: "text-warning" },
  NOT_READY: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive" },
};

export default function CategoryLaunchGatingPage() {
  const { data, isLoading } = useQuery({ queryKey: ["category-launch-gating"], queryFn: fetchCategoryGating, staleTime: 30_000 });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Category Launch Gating</h1>
              <p className="text-xs text-muted-foreground">Control which service categories can be safely launched</p>
            </div>
          </div>

          {isLoading ? (
            <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading categories…</div>
          ) : (
            <>
              <div className="flex gap-3 mb-4 text-xs">
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> {(data || []).filter(c => c.status === "LAUNCH_READY").length} Ready</span>
                <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3.5 h-3.5" /> {(data || []).filter(c => c.status === "PILOT_ONLY").length} Pilot</span>
                <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" /> {(data || []).filter(c => c.status === "NOT_READY").length} Not Ready</span>
              </div>
              <div className="space-y-3">
                {(data || []).map(cat => {
                  const ss = STATUS_STYLES[cat.status];
                  const checks = [
                    { label: "Partners", pass: cat.partnerCount >= 2 },
                    { label: "Zones", pass: cat.activeZones >= 2 },
                    { label: "Bookings", pass: cat.completedBookings > 0 },
                    { label: "Quote Flow", pass: cat.quoteFlowTested },
                    { label: "Support", pass: cat.supportReady },
                  ];
                  const passCount = checks.filter(c => c.pass).length;
                  return (
                    <Card key={cat.code} className={`border ${ss.bg}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                          <Badge variant="outline" className={`text-[10px] ${ss.text}`}>{cat.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <Progress value={(passCount / checks.length) * 100} className="h-1.5 mb-3" />
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-[10px]">
                          <div><span className="text-muted-foreground">Partners</span><br /><span className="font-semibold">{cat.partnerCount}</span></div>
                          <div><span className="text-muted-foreground">Zones</span><br /><span className="font-semibold">{cat.activeZones}</span></div>
                          <div><span className="text-muted-foreground">Bookings</span><br /><span className="font-semibold">{cat.completedBookings}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {checks.map(c => (
                            <Badge key={c.label} variant="outline" className={`text-[9px] ${c.pass ? "text-success border-success/30" : "text-muted-foreground"}`}>
                              {c.pass ? "✓" : "○"} {c.label}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
