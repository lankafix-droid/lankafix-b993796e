/**
 * Payment Readiness — /ops/readiness-payments
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, CreditCard } from "lucide-react";
import { fetchPaymentReadiness } from "@/services/readiness/readinessReadModel";
import { LaunchModeBadge, CheckRow } from "@/components/readiness/ReadinessComponents";

export default function ReadinessPaymentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["readiness-payments"], queryFn: fetchPaymentReadiness, staleTime: 30_000 });
  const p = data;
  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Payment Readiness</h1>
          <p className="text-xs text-muted-foreground">End-to-end payment infrastructure audit</p></div>
      </div>
      {isLoading || !p ? <div className="animate-pulse text-sm text-muted-foreground text-center py-12">Loading…</div> : (
        <Card className="border"><CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Payment System</span>
            <LaunchModeBadge status={p.verdict === "PRODUCTION_READY" ? "PRODUCTION_READY" : p.verdict === "PARTIAL" ? "SANDBOX_READY" : "NOT_READY"} />
          </div>
          <Progress value={p.readinessScore} className="h-2 mb-4" />
          <p className="text-xs text-muted-foreground mb-4">Gateway: <span className="font-semibold text-foreground">{p.gatewayName}</span></p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <CheckRow label="Gateway Selected" pass={p.gatewaySelected} />
            <CheckRow label="Sandbox Tested" pass={p.sandboxTested} />
            <CheckRow label="Production Keys" pass={p.productionKeysConfigured} />
            <CheckRow label="Customer Collection" pass={p.customerCollectionValidated} />
            <CheckRow label="Partner Payout" pass={p.partnerPayoutValidated} />
            <CheckRow label="Settlement Tested" pass={p.settlementTested} />
            <CheckRow label="Refund Path" pass={p.refundPathTested} />
            <CheckRow label="Dispute Exception" pass={p.disputePaymentExceptionTested} />
            <CheckRow label="Receipt Flow" pass={p.receiptFlowReady} />
          </div>
          <Card className="border-warning/20 bg-warning/5"><CardContent className="p-3">
            <p className="text-[10px] text-warning font-semibold">Cash-first launch recommended for Colombo pilot</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Digital payment gateway (PayHere/Stripe) integration recommended before public launch.</p>
          </CardContent></Card>
        </CardContent></Card>
      )}
    </div></main><Footer /></div>
  );
}
