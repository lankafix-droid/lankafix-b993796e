/**
 * Launch Blocker Register — /ops/launch-blockers
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Shield, XCircle, AlertTriangle, Info } from "lucide-react";
import { fetchLaunchBlockers, type LaunchBlocker } from "@/services/launchReadinessReadModel";

const SEV_STYLES: Record<string, { text: string; bg: string; icon: React.ElementType }> = {
  CRITICAL: { text: "text-destructive", bg: "bg-destructive/5 border-destructive/20", icon: XCircle },
  HIGH: { text: "text-warning", bg: "bg-warning/5 border-warning/20", icon: AlertTriangle },
  MEDIUM: { text: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: Info },
};

export default function LaunchBlockersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["launch-blockers"], queryFn: fetchLaunchBlockers, staleTime: 30_000 });

  const blockers = data || [];
  const critical = blockers.filter(b => b.severity === "CRITICAL").length;
  const high = blockers.filter(b => b.severity === "HIGH").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Shield className="w-5 h-5 text-destructive" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Launch Blocker Register</h1>
              <p className="text-xs text-muted-foreground">{critical} critical · {high} high · {blockers.length} total</p>
            </div>
          </div>

          {isLoading ? (
            <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading blockers…</div>
          ) : blockers.length === 0 ? (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-8 text-center">
                <p className="text-success font-semibold">No launch blockers detected</p>
                <p className="text-xs text-muted-foreground mt-1">All critical checks passing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {blockers.map(b => {
                const ss = SEV_STYLES[b.severity];
                const Icon = ss.icon;
                return (
                  <Card key={b.id} className={`border ${ss.bg}`}>
                    <CardContent className="p-3 flex items-start gap-2.5">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${ss.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{b.title}</span>
                          <Badge variant="outline" className={`text-[9px] ${ss.text}`}>{b.severity}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{b.notes}</p>
                        <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground">
                          <span>{b.module}</span>·<span>{b.owner}</span>·<span>{b.dueDate}</span>
                          <Badge variant="outline" className="text-[8px]">{b.status}</Badge>
                        </div>
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
