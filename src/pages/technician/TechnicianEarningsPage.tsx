import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { computeSettlementForBooking, computeTechnicianEarnings } from "@/lib/settlementEngine";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import {
  ArrowLeft, Wallet, Banknote, TrendingUp, ShieldCheck,
  DollarSign, Clock, CheckCircle2, Zap,
} from "lucide-react";

const TECH_ID = "tech-001";

export default function TechnicianEarningsPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => { track("wallet_viewed", { actor: "technician" }); }, []);

  const earnings = computeTechnicianEarnings(bookings, TECH_ID);
  const techBookings = bookings.filter(
    (b) => b.technician?.technicianId === TECH_ID &&
      (b.status === "completed" || b.status === "rated")
  );

  const formatLKR = (n: number) => `Rs ${n.toLocaleString("en-LK")}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> Wallet & Earnings
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Wallet Balance */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Wallet Balance</p>
            <p className="text-3xl font-bold text-foreground">{formatLKR(earnings.month)}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-warning/10 text-warning text-xs">
                <Clock className="w-3 h-3 mr-1" /> Pending: {formatLKR(earnings.pending)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatLKR(earnings.today)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">This Week</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatLKR(earnings.week)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Premium Info */}
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Zap className="w-5 h-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Emergency Job Premium</p>
              <p className="text-xs text-muted-foreground">Emergency jobs pay 50% more than standard rates</p>
            </div>
          </CardContent>
        </Card>

        {/* Completed Jobs */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Completed Jobs</h2>
          {techBookings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Banknote className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No completed jobs yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {techBookings.map((b) => {
                const s = computeSettlementForBooking(b);
                return (
                  <Card key={b.jobId}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{b.jobId}</p>
                        <p className="text-xs text-muted-foreground">{b.serviceName}</p>
                        {b.isEmergency && (
                          <Badge className="bg-warning/10 text-warning text-[9px] mt-1">
                            <Zap className="w-3 h-3 mr-0.5" /> Emergency
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-success">{formatLKR(s.technicianShare)}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>Fee: {formatLKR(s.lankafixCommission)}</span>
                        </div>
                        <Badge className={`text-[9px] mt-1 ${s.settlementStatus === "settled" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {s.settlementStatus === "settled" ? "Released" : "Pending"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-3">
          <p className="text-xs text-success text-center">
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
            Payouts are released after completion verification and payment confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
