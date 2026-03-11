import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentPartner, usePartnerSettlements } from "@/hooks/useCurrentPartner";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, Wallet, BarChart3, Loader2, UserPlus, Info, Receipt } from "lucide-react";

export default function PartnerWalletPage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();
  const { data: settlements = [] } = usePartnerSettlements(partner?.id);

  useEffect(() => { track("wallet_viewed", { actor: "partner" }); }, []);

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold text-foreground">No Partner Profile</h2>
            <Button onClick={() => navigate("/join")}>Join as Provider</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalGross = settlements.reduce((s: number, r: any) => s + (r.gross_amount_lkr || 0), 0);
  const totalCommission = settlements.reduce((s: number, r: any) => s + (r.platform_commission_lkr || 0), 0);
  const totalPayout = settlements.reduce((s: number, r: any) => s + (r.net_payout_lkr || 0), 0);
  const pendingSettlements = settlements.filter((s: any) => s.settlement_status === "pending");
  const settledSettlements = settlements.filter((s: any) => s.settlement_status === "settled");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> Partner Wallet
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Trust Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Payout transparency is important for provider trust. All settlements are tracked in real-time through the platform.
          </p>
        </div>

        {settlements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No Settlements Yet</h3>
              <p className="text-sm text-muted-foreground">
                Settlement tracking will appear here once you complete jobs through LankaFix. Each completed booking generates a transparent settlement record.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Gross</p>
                  <p className="text-lg font-bold text-foreground">{formatLKR(totalGross)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Net Payout</p>
                  <p className="text-lg font-bold text-success">{formatLKR(totalPayout)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Commission Paid</p>
                  <p className="text-lg font-bold text-primary">{formatLKR(totalCommission)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Pending</p>
                  <p className="text-lg font-bold text-warning">{pendingSettlements.length} jobs</p>
                </CardContent>
              </Card>
            </div>

            {/* Settlement History */}
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Settlement History
            </h2>
            <div className="space-y-2">
              {settlements.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Booking {s.booking_id.slice(0, 8)}...
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()} • Gross: {formatLKR(s.gross_amount_lkr)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{formatLKR(s.net_payout_lkr)}</p>
                      <Badge variant="outline" className={`text-[9px] ${
                        s.settlement_status === "settled" ? "text-success" :
                        s.settlement_status === "pending" ? "text-warning" : "text-muted-foreground"
                      }`}>
                        {s.settlement_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
