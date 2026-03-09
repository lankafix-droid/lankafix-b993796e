import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { useBookingStore } from "@/store/bookingStore";
import { computeSettlementForBooking, computePartnerWallet } from "@/lib/settlementEngine";
import { calculateCommission, CATEGORY_TIER_MAP, TIER_LABELS, TIER_COMMISSION_RATES } from "@/engines/commissionEngine";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, AlertTriangle, ArrowLeft, CheckCircle2, Clock, ShieldAlert, Percent, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import type { SettlementStatus } from "@/types/booking";

const PARTNER_ID = "partner-001";

const STATUS_STYLES: Record<SettlementStatus, { label: string; className: string }> = {
  not_ready: { label: "Not Ready", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  processing: { label: "Processing", className: "bg-primary/10 text-primary" },
  settled: { label: "Settled", className: "bg-success/10 text-success" },
  held: { label: "Held", className: "bg-destructive/10 text-destructive" },
};

const PartnerWalletPage = () => {
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => {
    track("wallet_viewed", { actor: "partner" });
  }, []);

  const wallet = computePartnerWallet(bookings, PARTNER_ID);
  const relevantBookings = bookings.filter(
    (b) => b.technician?.partnerId === PARTNER_ID && b.finance &&
      (b.status === "completed" || b.status === "rated" || b.finance.collectedAmount > 0)
  );

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  // Compute commission breakdown per booking
  const commissionDetails = relevantBookings.map((b) => {
    const jobValue = b.finance?.totalApprovedAmount || b.pricing.estimatedMin || 0;
    const commission = calculateCommission(b.categoryCode, jobValue);
    return { booking: b, commission };
  });

  const totalCommissionDeducted = commissionDetails.reduce((s, d) => s + d.commission.commissionAmount, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/partner" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Partner Wallet
          </h1>

          {/* Commission Tier Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">LankaFix Commission Rates</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TIER_COMMISSION_RATES) as [string, number][]).map(([tier, rate]) => (
                <div key={tier} className="bg-background rounded-lg p-2 text-center border">
                  <p className="text-xs text-muted-foreground">{TIER_LABELS[tier as keyof typeof TIER_LABELS]}</p>
                  <p className="text-lg font-bold text-primary">{rate}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Pending Settlement</p>
              <p className="text-lg font-bold text-warning">{formatLKR(wallet.pendingSettlement)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Released</p>
              <p className="text-lg font-bold text-success">{formatLKR(wallet.releasedSettlement)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Commission Deducted</p>
              <p className="text-lg font-bold text-primary">{formatLKR(totalCommissionDeducted)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Held / Refunds</p>
              <p className="text-lg font-bold text-destructive">{formatLKR(wallet.heldAmount + wallet.refundAdjustments)}</p>
            </div>
          </div>

          {/* Booking Settlements with Commission */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Settlement & Commission Breakdown
          </h2>
          {commissionDetails.length === 0 ? (
            <div className="bg-card rounded-xl border p-6 text-center text-sm text-muted-foreground">
              No settled bookings yet
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {commissionDetails.map(({ booking: b, commission: c }) => {
                const s = computeSettlementForBooking(b);
                const style = STATUS_STYLES[s.settlementStatus];
                return (
                  <div key={b.jobId} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{b.jobId}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.tierLabel} • {c.commissionPercent}%</Badge>
                        <Badge className={style.className}>{style.label}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{b.categoryName} • {b.serviceName}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Job Value:</span> <span className="font-medium text-foreground">{formatLKR(c.jobValue)}</span></div>
                      <div><span className="text-muted-foreground">Commission ({c.commissionPercent}%):</span> <span className="font-medium text-primary">{formatLKR(c.commissionAmount)}</span></div>
                      <div><span className="text-muted-foreground">Partner Payout:</span> <span className="font-medium text-success">{formatLKR(c.partnerPayout)}</span></div>
                      <div><span className="text-muted-foreground">Tech Share:</span> <span className="font-medium text-foreground">{formatLKR(s.technicianShare)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ledger */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Wallet Ledger</h2>
          <div className="space-y-2 mb-6">
            {relevantBookings.flatMap((b) =>
              (b.finance?.ledgerEntries || [])
                .filter((e) => e.type === "provider_settlement" || e.type === "commission" || e.type === "refund" || e.type === "manual_adjustment")
                .map((e) => (
                  <div key={e.id} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground capitalize">{e.type.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{b.jobId} • {new Date(e.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-bold ${e.direction === "in" ? "text-success" : "text-destructive"}`}>
                      {e.direction === "in" ? "+" : "−"}{formatLKR(e.amount)}
                    </span>
                  </div>
                ))
            )}
            {relevantBookings.every((b) => !b.finance?.ledgerEntries?.length) && (
              <div className="bg-card rounded-xl border p-4 text-center text-xs text-muted-foreground">No ledger entries yet</div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PartnerWalletPage;
