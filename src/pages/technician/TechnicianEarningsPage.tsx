/**
 * LankaFix Technician Earnings — DB-backed via partner_settlements.
 * Replaces Zustand bookingStore dependency entirely.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentPartner, usePartnerSettlements } from "@/hooks/useCurrentPartner";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { Loader2, ArrowLeft, Wallet, TrendingUp, DollarSign, Clock, CheckCircle2, Zap } from "lucide-react";

export default function TechnicianEarningsPage() {
  const navigate = useNavigate();
  const { data: partner, isLoading: partnerLoading } = useCurrentPartner();
  const { data: settlements = [], isLoading: settLoading } = usePartnerSettlements(partner?.id);

  useEffect(() => { track("wallet_viewed", { actor: "technician" }); }, []);

  if (partnerLoading || settLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const formatLKR = (n: number) => `Rs ${n.toLocaleString("en-LK")}`;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const todayEarnings = settlements
    .filter((s: any) => new Date(s.created_at) >= todayStart && s.settlement_status !== "cancelled")
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const weekEarnings = settlements
    .filter((s: any) => new Date(s.created_at) >= weekStart && s.settlement_status !== "cancelled")
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const monthEarnings = settlements
    .filter((s: any) => new Date(s.created_at) >= monthStart && s.settlement_status !== "cancelled")
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const totalEarnings = settlements
    .filter((s: any) => s.settlement_status !== "cancelled")
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const pendingPayouts = settlements
    .filter((s: any) => s.settlement_status === "pending")
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const completedPayouts = settlements
    .filter((s: any) => ["released", "paid"].includes(s.settlement_status))
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const recentSettlements = settlements.slice(0, 20);

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    released: "bg-success/10 text-success border-success/20",
    paid: "bg-success/10 text-success border-success/20",
    held: "bg-destructive/10 text-destructive border-destructive/20",
  };

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
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatLKR(todayEarnings)}</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">This Week</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatLKR(weekEarnings)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatLKR(monthEarnings)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">All Time</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatLKR(totalEarnings)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payout Status */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Payout Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending Release</span>
              <span className="font-bold text-warning">{formatLKR(pendingPayouts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Released / Paid</span>
              <span className="font-bold text-success">{formatLKR(completedPayouts)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Settlements */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Settlements</h2>
          {recentSettlements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No settlements yet</p>
                <p className="text-xs text-muted-foreground mt-1">Complete jobs to start earning</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentSettlements.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Job #{(s.booking_id || "").slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()} •
                        Gross {formatLKR(s.gross_amount_lkr || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatLKR(s.net_payout_lkr || 0)}</p>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[s.settlement_status] || "bg-muted"}`}>
                        {s.settlement_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-3">
          <p className="text-xs text-success text-center">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            Payouts are released after customer confirmation and quality check.
          </p>
        </div>
      </div>
    </div>
  );
}
