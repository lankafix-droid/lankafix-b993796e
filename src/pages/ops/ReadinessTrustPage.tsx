/**
 * Trust & Support Audit — /ops/readiness-trust
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Eye, CheckCircle2, XCircle } from "lucide-react";
import { fetchTrustAudit } from "@/services/readiness/readinessReadModel";
import { LaunchModeBadge } from "@/components/readiness/ReadinessComponents";

export default function ReadinessTrustPage() {
  const items = fetchTrustAudit();
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Eye className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Trust & Support Audit</h1>
          <p className="text-xs text-muted-foreground">{items.filter(i=>i.status==="STRONG").length}/{items.length} screens rated Strong</p></div>
      </div>
      <div className="space-y-2.5">{items.map(item => (
        <Card key={item.screen} className="border"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{item.screen}</span>
            <LaunchModeBadge status={item.status} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
            <div className="flex items-center gap-1">{item.trustPresent ? <CheckCircle2 className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}<span>Trust Signals</span></div>
            <div className="flex items-center gap-1">{item.transparencyPresent ? <CheckCircle2 className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}<span>Transparency</span></div>
            <div className="flex items-center gap-1">{item.humanSupportVisible ? <CheckCircle2 className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}<span>Human Support</span></div>
          </div>
          <div className="flex flex-wrap gap-1">{item.signals.map(s => <Badge key={s} variant="outline" className="text-[9px] text-muted-foreground">{s}</Badge>)}</div>
        </CardContent></Card>
      ))}</div>
    </div></main><Footer /></div>
  );
}
