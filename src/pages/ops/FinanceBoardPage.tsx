import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, DollarSign, Clock, ShieldAlert, CheckCircle2,
  XCircle, ArrowUpRight, ArrowDownRight, Pause, TrendingUp, BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { toast } from "sonner";
import { useOpsMetrics } from "@/services/opsMetricsService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import QuoteBenchmarkCard from "@/components/ops/QuoteBenchmarkCard";
import OpsReliabilityAlerts from "@/components/ops/OpsReliabilityAlerts";
import { CATEGORY_LABELS } from "@/types/booking";

const FinanceBoardPage = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    track("wallet_viewed", { actor: "ops" });
  }, []);

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  const { data: metrics } = useOpsMetrics();

  // Real DB: pending settlements
  const { data: pendingSettlementsDB = [] } = useQuery({
    queryKey: ["ops-pending-settlements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_settlements")
        .select("id, booking_id, partner_id, gross_amount_lkr, platform_commission_lkr, net_payout_lkr, settlement_status, created_at")
        .eq("settlement_status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    staleTime: 30_000,
  });

  // Real DB: recent payments
  const { data: recentPaymentsDB = [] } = useQuery({
    queryKey: ["ops-recent-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, booking_id, amount_lkr, payment_status, payment_type, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    staleTime: 30_000,
  });

  // Real DB: recent quotes for benchmark
  const { data: recentQuotesDB = [] } = useQuery({
    queryKey: ["ops-recent-quotes-benchmark"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, booking_id, total_lkr, status, created_at, partner_id")
        .in("status", ["submitted", "approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (!data || data.length === 0) return [];
      const bookingIds = [...new Set(data.map((q) => q.booking_id))];
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id, category_code, service_type")
        .in("id", bookingIds);
      const bookingMap = Object.fromEntries((bookingsData || []).map((b) => [b.id, b]));
      return data.map((q) => ({ ...q, booking: bookingMap[q.booking_id] || null }));
    },
    staleTime: 30_000,
  });

  // DB: Revenue by category
  const { data: categoryRevenue = [] } = useQuery({
    queryKey: ["ops-category-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_settlements")
        .select("booking_id, gross_amount_lkr, platform_commission_lkr, net_payout_lkr")
        .in("settlement_status", ["pending", "settled"]);
      if (!data || data.length === 0) return [];
      const bookingIds = [...new Set(data.map((s) => s.booking_id))];
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id, category_code")
        .in("id", bookingIds);
      const bookingMap = Object.fromEntries((bookingsData || []).map((b) => [b.id, b]));

      const catMap: Record<string, { jobs: number; revenue: number; commission: number }> = {};
      for (const s of data) {
        const cat = bookingMap[s.booking_id]?.category_code || "UNKNOWN";
        if (!catMap[cat]) catMap[cat] = { jobs: 0, revenue: 0, commission: 0 };
        catMap[cat].jobs++;
        catMap[cat].revenue += s.gross_amount_lkr || 0;
        catMap[cat].commission += s.platform_commission_lkr || 0;
      }
      return Object.entries(catMap).map(([code, d]) => ({ code, ...d })).sort((a, b) => b.revenue - a.revenue);
    },
    staleTime: 60_000,
  });

  const latestBenchmarkInput = (() => {
    const q = recentQuotesDB[0];
    if (!q || !q.booking || !q.total_lkr) return null;
    return { category_code: q.booking.category_code, service_type: q.booking.service_type || undefined, total_lkr: q.total_lkr };
  })();

  const handleReleaseSettlement = async (settlementId: string) => {
    const { error } = await supabase
      .from("partner_settlements")
      .update({ settlement_status: "settled", settled_at: new Date().toISOString() })
      .eq("id", settlementId);
    if (error) { toast.error("Failed to release"); return; }
    toast.success("Settlement released");
    queryClient.invalidateQueries({ queryKey: ["ops-pending-settlements"] });
  };

  const handleHoldSettlement = async (settlementId: string) => {
    const { error } = await supabase
      .from("partner_settlements")
      .update({ settlement_status: "held" })
      .eq("id", settlementId);
    if (error) { toast.error("Failed to hold"); return; }
    toast.info("Settlement held");
    queryClient.invalidateQueries({ queryKey: ["ops-pending-settlements"] });
  };

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

          <OpsReliabilityAlerts detailed />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Payments Today</p>
              <p className="text-lg font-bold text-foreground">{formatLKR(metrics?.payments_today_lkr ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">{metrics?.payments_today_count ?? 0} transactions</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Pending Settlements</p>
              <p className="text-lg font-bold text-warning">{pendingSettlementsDB.length}</p>
              <p className="text-[10px] text-muted-foreground">{formatLKR(pendingSettlementsDB.reduce((s, r) => s + (r.net_payout_lkr || 0), 0))}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Completed Today</p>
              <p className="text-lg font-bold text-success">{metrics?.completed_today ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Fraud Alerts</p>
              <p className="text-lg font-bold text-destructive">{metrics?.fraud_alerts_today ?? 0}</p>
            </div>
          </div>

          {/* Category Revenue — DB-backed */}
          {categoryRevenue.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Revenue by Category
              </h2>
              <div className="space-y-2">
                {categoryRevenue.map((cat) => (
                  <div key={cat.code} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{CATEGORY_LABELS[cat.code as keyof typeof CATEGORY_LABELS] || cat.code}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.jobs} jobs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatLKR(cat.commission)}</p>
                      <p className="text-[10px] text-muted-foreground">Revenue: {formatLKR(cat.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlement Queue — DB-backed */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" /> Settlement Queue ({pendingSettlementsDB.length})
          </h2>
          {pendingSettlementsDB.length === 0 ? (
            <div className="bg-card rounded-xl border p-4 text-center text-xs text-muted-foreground mb-6">No pending settlements</div>
          ) : (
            <div className="space-y-3 mb-6">
              {pendingSettlementsDB.map((s: any) => (
                <div key={s.id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{s.booking_id.slice(0, 8).toUpperCase()}</span>
                    <Badge className="bg-warning/10 text-warning">Pending Release</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div><span className="text-muted-foreground">Gross:</span> <span className="font-medium">{formatLKR(s.gross_amount_lkr)}</span></div>
                    <div><span className="text-muted-foreground">Commission:</span> <span className="font-medium">{formatLKR(s.platform_commission_lkr)}</span></div>
                    <div><span className="text-muted-foreground">Net:</span> <span className="font-medium text-success">{formatLKR(s.net_payout_lkr)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleReleaseSettlement(s.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Release
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleHoldSettlement(s.id)}>
                      <Pause className="w-3.5 h-3.5 mr-1" /> Hold
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Payments — DB-backed */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Payments</h2>
          {recentPaymentsDB.length === 0 ? (
            <div className="bg-card rounded-xl border p-4 text-center text-xs text-muted-foreground mb-6">No payment records</div>
          ) : (
            <div className="space-y-2 mb-6">
              {recentPaymentsDB.slice(0, 20).map((p: any) => (
                <div key={p.id} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {["paid", "cash_collected", "payment_verified"].includes(p.payment_status) ? (
                      <ArrowDownRight className="w-4 h-4 text-success shrink-0" />
                    ) : p.payment_status === "failed" ? (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    ) : ["refunded", "partial_refund"].includes(p.payment_status) ? (
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-warning shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-foreground capitalize">{(p.payment_type || "service").replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{p.booking_id.slice(0, 8).toUpperCase()} • {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${p.payment_status === "paid" ? "text-success" : "text-warning"}`}>
                      {formatLKR(p.amount_lkr || 0)}
                    </span>
                    <p className="text-[10px] text-muted-foreground">{p.payment_status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {latestBenchmarkInput && (
          <div className="container max-w-3xl pb-8">
            <h2 className="text-sm font-semibold text-foreground mb-2">Latest Quote Benchmark</h2>
            <QuoteBenchmarkCard input={latestBenchmarkInput} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FinanceBoardPage;
