/**
 * Customer Trust Experience Audit — /ops/customer-trust-audit
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Eye, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { fetchTrustAudit, type TrustAuditItem } from "@/services/launchReadinessReadModel";

const STATUS_STYLES: Record<string, { text: string; bg: string; icon: React.ElementType }> = {
  STRONG: { text: "text-success", bg: "bg-success/10 border-success/20", icon: CheckCircle2 },
  ACCEPTABLE: { text: "text-primary", bg: "bg-primary/10 border-primary/20", icon: AlertTriangle },
  NEEDS_IMPROVEMENT: { text: "text-warning", bg: "bg-warning/10 border-warning/20", icon: XCircle },
};

export default function CustomerTrustAuditPage() {
  const items = fetchTrustAudit();
  const strong = items.filter(i => i.status === "STRONG").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Eye className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Customer Trust Experience Audit</h1>
              <p className="text-xs text-muted-foreground">{strong}/{items.length} customer journey screens rated Strong</p>
            </div>
          </div>

          <div className="space-y-3">
            {items.map(item => {
              const ss = STATUS_STYLES[item.status];
              const Icon = ss.icon;
              return (
                <Card key={item.screen} className={`border ${ss.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${ss.text}`} />
                        <span className="text-sm font-semibold text-foreground">{item.screen}</span>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${ss.text}`}>{item.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.signals.map(signal => (
                        <Badge key={signal} variant="outline" className="text-[9px] text-muted-foreground">{signal}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-6 border-primary/15 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Trust Design Principles</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• No hidden charges — all costs shown before approval</p>
                <p>• Approval checkpoints at every price change</p>
                <p>• Human support always accessible</p>
                <p>• Transparent progress tracking</p>
                <p>• Human-controlled dispute resolution</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
