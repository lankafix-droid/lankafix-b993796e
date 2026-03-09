import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { useBookingStore } from "@/store/bookingStore";
import { computeSettlementForBooking } from "@/lib/settlementEngine";
import { computePlatformAnalytics } from "@/engines/analyticsEngine";
import { TIER_LABELS, TIER_COMMISSION_RATES, type CategoryTier } from "@/engines/commissionEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, DollarSign, Clock, ShieldAlert, CheckCircle2,
  XCircle, ArrowUpRight, ArrowDownRight, Pause, TrendingUp, BarChart3, Percent,
} from "lucide-react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { toast } from "sonner";

const FinanceBoardPage = () => {
  const bookings = useBookingStore((s) => s.bookings);
  const approveRefund = useBookingStore((s) => s.approveRefund);
  const rejectRefund = useBookingStore((s) => s.rejectRefund);
  const releaseSettlement = useBookingStore((s) => s.releaseSettlement);
  const holdSettlement = useBookingStore((s) => s.holdSettlement);

  useEffect(() => {
    track("wallet_viewed", { actor: "ops" });
  }, []);

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  // Platform analytics
  const analytics = computePlatformAnalytics(bookings);

  // Compute aggregates
  let totalCollected = 0, pendingSettlements = 0, heldSettlements = 0, releasedSettlements = 0;
  const refundQueue: { bookingId: string; request: any }[] = [];
  const settlementQueue: { booking: any; settlement: any }[] = [];
  const ledgerFeed: { id: string; bookingId: string; type: string; amount: number; direction: string; date: string }[] = [];

  for (const b of bookings) {
    if (!b.finance) continue;
    totalCollected += b.finance.collectedAmount;
    const s = computeSettlementForBooking(b);

    if (s.settlementStatus === "pending") {
      pendingSettlements += s.partnerShare + s.technicianShare;
      settlementQueue.push({ booking: b, settlement: s });
    }
    if (s.settlementStatus === "held") heldSettlements += s.partnerShare + s.technicianShare;
    if (s.settlementStatus === "settled") releasedSettlements += s.partnerShare + s.technicianShare;

    for (const r of b.refundRequests || []) {
      if (r.status === "requested") {
        refundQueue.push({ bookingId: b.jobId, request: r });
      }
    }

    for (const e of b.finance.ledgerEntries) {
      ledgerFeed.push({
        id: e.id, bookingId: b.jobId, type: e.type.replace(/_/g, " "),
        amount: e.amount, direction: e.direction, date: e.createdAt,
      });
    }
  }

  ledgerFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-3xl">
          <Link to="/ops/dispatch" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Dispatch Board
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" /> Finance Board
          </h1>

          {/* Commission Revenue Overview */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Platform Revenue</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-background rounded-lg p-3 border text-center">
                <p className="text-[10px] text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-primary">{formatLKR(analytics.totalRevenue)}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border text-center">
                <p className="text-[10px] text-muted-foreground">Commission</p>
                <p className="text-lg font-bold text-foreground">{formatLKR(analytics.totalCommission)}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border text-center">
                <p className="text-[10px] text-muted-foreground">Diagnostic Fees</p>
                <p className="text-lg font-bold text-foreground">{formatLKR(analytics.totalDiagnosticFees)}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border text-center">
                <p className="text-[10px] text-muted-foreground">Avg Commission</p>
                <p className="text-lg font-bold text-foreground">{analytics.avgCommissionRate}%</p>
              </div>
            </div>

            {/* Tier Breakdown */}
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Commission by Tier</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(analytics.tierBreakdown) as [CategoryTier, { revenue: number; jobs: number; avgValue: number }][]).map(([tier, data]) => (
                <div key={tier} className="bg-background rounded-lg p-2 border">
                  <p className="text-[10px] text-muted-foreground">{TIER_LABELS[tier]} ({TIER_COMMISSION_RATES[tier]}%)</p>
                  <p className="text-sm font-bold text-foreground">{formatLKR(data.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{data.jobs} jobs • Avg {formatLKR(data.avgValue)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Category Revenue */}
          {analytics.categoryBreakdown.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Revenue by Category
              </h2>
              <div className="space-y-2">
                {analytics.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryCode} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{cat.categoryCode}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.tierLabel} • {cat.commissionRate}% • {cat.jobCount} jobs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatLKR(cat.totalPlatformRevenue)}</p>
                      <p className="text-[10px] text-muted-foreground">Job Value: {formatLKR(cat.totalJobValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Total Collected</p>
              <p className="text-lg font-bold text-foreground">{formatLKR(totalCollected)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Pending</p>
              <p className="text-lg font-bold text-warning">{formatLKR(pendingSettlements)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Held</p>
              <p className="text-lg font-bold text-destructive">{formatLKR(heldSettlements)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Released</p>
              <p className="text-lg font-bold text-success">{formatLKR(releasedSettlements)}</p>
            </div>
          </div>

          {/* Refund Queue */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" /> Refund Review ({refundQueue.length})
          </h2>
          {refundQueue.length === 0 ? (
            <div className="bg-card rounded-xl border p-4 text-center text-xs text-muted-foreground mb-6">No pending refund requests</div>
          ) : (
            <div className="space-y-3 mb-6">
              {refundQueue.map(({ bookingId, request }) => (
                <div key={request.id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{bookingId}</span>
                    <Badge className="bg-warning/10 text-warning">Pending Review</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Reason: {request.reason}</p>
                  <p className="text-xs text-muted-foreground mb-3">Requested: {formatLKR(request.requestedAmount)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => {
                      approveRefund(bookingId, request.id, request.requestedAmount);
                      toast.success("Refund approved");
                    }}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      rejectRefund(bookingId, request.id, "Ops review: not eligible");
                      toast.info("Refund rejected");
                    }}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settlement Queue */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" /> Settlement Queue ({settlementQueue.length})
          </h2>
          {settlementQueue.length === 0 ? (
            <div className="bg-card rounded-xl border p-4 text-center text-xs text-muted-foreground mb-6">No pending settlements</div>
          ) : (
            <div className="space-y-3 mb-6">
              {settlementQueue.map(({ booking: b, settlement: s }) => (
                <div key={b.jobId} className="bg-card rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{b.jobId}</span>
                    <Badge className="bg-warning/10 text-warning">Pending Release</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><span className="text-muted-foreground">Collected:</span> <span className="font-medium">{formatLKR(s.netCollected)}</span></div>
                    <div><span className="text-muted-foreground">Commission:</span> <span className="font-medium">{formatLKR(s.lankafixCommission)}</span></div>
                    <div><span className="text-muted-foreground">Partner:</span> <span className="font-medium text-success">{formatLKR(s.partnerShare)}</span></div>
                    <div><span className="text-muted-foreground">Technician:</span> <span className="font-medium">{formatLKR(s.technicianShare)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => {
                      releaseSettlement(b.jobId);
                      toast.success("Settlement released");
                    }}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Release
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      holdSettlement(b.jobId, "Ops review required");
                      toast.info("Settlement held");
                    }}>
                      <Pause className="w-3.5 h-3.5 mr-1" /> Hold
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ledger Feed */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Ledger Feed</h2>
          {ledgerFeed.length === 0 ? (
            <div className="bg-card rounded-xl border p-4 text-center text-xs text-muted-foreground">No ledger entries</div>
          ) : (
            <div className="space-y-2 mb-6">
              {ledgerFeed.slice(0, 30).map((e) => (
                <div key={e.id} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {e.direction === "in" ? (
                      <ArrowDownRight className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-foreground capitalize">{e.type}</p>
                      <p className="text-[10px] text-muted-foreground">{e.bookingId} • {new Date(e.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${e.direction === "in" ? "text-success" : "text-destructive"}`}>
                    {e.direction === "in" ? "+" : "−"}{formatLKR(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FinanceBoardPage;
