import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { useBookingStore } from "@/store/bookingStore";
import { computeSettlementForBooking, computePartnerWallet } from "@/lib/settlementEngine";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, AlertTriangle, ArrowLeft, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
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
              <p className="text-xs text-muted-foreground mb-1">Held Amount</p>
              <p className="text-lg font-bold text-destructive">{formatLKR(wallet.heldAmount)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Refund Adjustments</p>
              <p className="text-lg font-bold text-muted-foreground">{formatLKR(wallet.refundAdjustments)}</p>
            </div>
          </div>

          {/* Booking Settlements */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Settlement Breakdown</h2>
          {relevantBookings.length === 0 ? (
            <div className="bg-card rounded-xl border p-6 text-center text-sm text-muted-foreground">
              No settled bookings yet
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {relevantBookings.map((b) => {
                const s = computeSettlementForBooking(b);
                const style = STATUS_STYLES[s.settlementStatus];
                return (
                  <div key={b.jobId} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{b.jobId}</span>
                      <Badge className={style.className}>{style.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{b.categoryName} • {b.serviceName}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Gross:</span> <span className="font-medium text-foreground">{formatLKR(s.grossAmount)}</span></div>
                      <div><span className="text-muted-foreground">Commission:</span> <span className="font-medium text-foreground">{formatLKR(s.lankafixCommission)}</span></div>
                      <div><span className="text-muted-foreground">Partner Share:</span> <span className="font-medium text-success">{formatLKR(s.partnerShare)}</span></div>
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
                .filter((e) => e.type === "provider_settlement" || e.type === "refund" || e.type === "manual_adjustment")
                .map((e) => (
                  <div key={e.id} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{e.type.replace(/_/g, " ")}</p>
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
