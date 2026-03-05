import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { useBookingStore } from "@/store/bookingStore";
import { computeSettlementForBooking, computeTechnicianEarnings } from "@/lib/settlementEngine";
import { Badge } from "@/components/ui/badge";
import { Banknote, ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

const TECH_ID = "tech-001";

const TechnicianEarningsPage = () => {
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => {
    track("wallet_viewed", { actor: "technician" });
  }, []);

  const earnings = computeTechnicianEarnings(bookings, TECH_ID);
  const techBookings = bookings.filter(
    (b) => b.technician?.technicianId === TECH_ID &&
      (b.status === "completed" || b.status === "rated")
  );

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/technician" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-success" /> My Earnings
          </h1>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Today</p>
              <p className="text-lg font-bold text-foreground">{formatLKR(earnings.today)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">This Week</p>
              <p className="text-lg font-bold text-foreground">{formatLKR(earnings.week)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-lg font-bold text-primary">{formatLKR(earnings.month)}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Pending Release</p>
              <p className="text-lg font-bold text-warning">{formatLKR(earnings.pending)}</p>
            </div>
          </div>

          {/* Job List */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Completed Jobs</h2>
          {techBookings.length === 0 ? (
            <div className="bg-card rounded-xl border p-6 text-center text-sm text-muted-foreground">
              No completed jobs yet
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {techBookings.map((b) => {
                const s = computeSettlementForBooking(b);
                return (
                  <div key={b.jobId} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{b.jobId}</p>
                      <p className="text-xs text-muted-foreground">{b.serviceName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{formatLKR(s.technicianShare)}</p>
                      <Badge className={s.settlementStatus === "settled" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                        {s.settlementStatus === "settled" ? "Released" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trust note */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-success">
              Payouts are released after completion verification and payment confirmation.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TechnicianEarningsPage;
