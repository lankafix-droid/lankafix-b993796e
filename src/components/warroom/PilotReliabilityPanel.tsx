/**
 * PilotReliabilityPanel — War Room module for pilot-critical monitoring.
 * Shows urgent offers, payment failures, automation health, stale bookings.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CreditCard, Clock, Zap, Shield, Activity,
  Timer, TrendingDown, Bell, CheckCircle2,
} from "lucide-react";

function usePilotReliabilityData() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const thirtyMinAgoAuto = new Date(Date.now() - 30 * 60_000).toISOString();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString();

  return useQuery({
    queryKey: ["pilot-reliability"],
    queryFn: async () => {
      const [
        urgentOffers,
        expiredTodayRes,
        paymentFailures,
        unpaidCompleted,
        staleBookings,
        automationErrors,
        escalationsToday,
        otpFailures,
      ] = await Promise.all([
        // Urgent offers expiring in next 60s
        supabase.from("dispatch_offers")
          .select("id, booking_id, partner_id, category_code, expires_at, is_emergency")
          .eq("status", "pending")
          .lte("expires_at", new Date(Date.now() + 60_000).toISOString())
          .gte("expires_at", new Date().toISOString()),
        // Expired offers today
        supabase.from("dispatch_offers")
          .select("id, partner_id, category_code")
          .in("status", ["expired", "expired_by_accept"])
          .gte("created_at", todayISO),
        // Payment failures today
        supabase.from("payments")
          .select("id, booking_id, amount_lkr")
          .eq("payment_status", "failed")
          .gte("created_at", todayISO),
        // Unpaid completed bookings
        supabase.from("bookings")
          .select("id, category_code, final_price_lkr")
          .eq("status", "completed")
          .eq("payment_status", "pending")
          .gte("created_at", thirtyMinAgo),
        // Stale bookings (active > 30 min without progress)
        supabase.from("bookings")
          .select("id, category_code, status, created_at")
          .in("status", ["assigned", "tech_en_route"])
          .lt("updated_at", thirtyMinAgo)
          .neq("booking_source", "pilot_simulation"),
        // Automation errors (last 1h)
        supabase.from("automation_event_log")
          .select("id, event_type, trigger_reason")
          .in("severity", ["error", "critical"])
          .gte("created_at", fiveMinAgo),
        // Escalations today
        supabase.from("dispatch_escalations")
          .select("id")
          .gte("created_at", todayISO)
          .is("resolved_at", null),
        // OTP verification failures (from timeline)
        supabase.from("job_timeline")
          .select("id")
          .eq("status", "otp_failed")
          .gte("created_at", todayISO),
      ]);

      return {
        urgentOfferCount: urgentOffers.data?.length || 0,
        expiredTodayCount: expiredTodayRes.data?.length || 0,
        expiredByPartner: groupByField(expiredTodayRes.data || [], "partner_id"),
        expiredByCategory: groupByField(expiredTodayRes.data || [], "category_code"),
        paymentFailureCount: paymentFailures.data?.length || 0,
        unpaidCompletedCount: unpaidCompleted.data?.length || 0,
        unpaidCompletedTotal: (unpaidCompleted.data || []).reduce((s, b) => s + (b.final_price_lkr || 0), 0),
        staleBookingCount: staleBookings.data?.length || 0,
        automationErrorCount: automationErrors.data?.length || 0,
        escalationCount: escalationsToday.data?.length || 0,
        otpFailureCount: otpFailures.data?.length || 0,
      };
    },
    refetchInterval: 15_000,
  });
}

function groupByField(arr: any[], field: string): Record<string, number> {
  const map: Record<string, number> = {};
  arr.forEach(item => {
    const key = item[field] || "unknown";
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

export default function PilotReliabilityPanel() {
  const { data, isLoading } = usePilotReliabilityData();

  if (isLoading || !data) return null;

  const totalAlerts = data.urgentOfferCount + data.paymentFailureCount +
    data.staleBookingCount + data.automationErrorCount + data.escalationCount;

  const isHealthy = totalAlerts === 0;

  return (
    <Card className={isHealthy ? "border-success/20" : "border-destructive/20"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Pilot Reliability
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] ${isHealthy ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"}`}
          >
            {isHealthy ? "✓ Healthy" : `⚠ ${totalAlerts} alert${totalAlerts > 1 ? "s" : ""}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Alert Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MetricCard
            icon={Zap}
            label="Urgent Offers"
            value={data.urgentOfferCount}
            severity={data.urgentOfferCount > 0 ? "critical" : "ok"}
          />
          <MetricCard
            icon={CreditCard}
            label="Payment Failures"
            value={data.paymentFailureCount}
            severity={data.paymentFailureCount > 0 ? "warning" : "ok"}
          />
          <MetricCard
            icon={Clock}
            label="Stale Bookings"
            value={data.staleBookingCount}
            severity={data.staleBookingCount > 2 ? "warning" : data.staleBookingCount > 0 ? "info" : "ok"}
          />
          <MetricCard
            icon={Activity}
            label="Auto Errors"
            value={data.automationErrorCount}
            severity={data.automationErrorCount > 0 ? "critical" : "ok"}
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            icon={Timer}
            label="Expired Today"
            value={data.expiredTodayCount}
            severity={data.expiredTodayCount > 5 ? "warning" : "info"}
            small
          />
          <MetricCard
            icon={TrendingDown}
            label="Escalations"
            value={data.escalationCount}
            severity={data.escalationCount > 0 ? "warning" : "ok"}
            small
          />
          <MetricCard
            icon={CreditCard}
            label="Unpaid Jobs"
            value={data.unpaidCompletedCount}
            severity={data.unpaidCompletedCount > 0 ? "warning" : "ok"}
            small
          />
        </div>

        {/* Offer expiry breakdown */}
        {data.expiredTodayCount > 0 && (
          <div className="bg-warning/5 border border-warning/10 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-warning mb-1.5 flex items-center gap-1">
              <Bell className="w-3 h-3" /> Offer Expiry Breakdown
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.expiredByCategory).map(([cat, count]) => (
                <Badge key={cat} variant="outline" className="text-[9px]">
                  {cat}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Unpaid revenue at risk */}
        {data.unpaidCompletedTotal > 0 && (
          <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-destructive flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Unpaid Revenue at Risk: LKR {data.unpaidCompletedTotal.toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value, severity, small }: {
  icon: React.ElementType;
  label: string;
  value: number;
  severity: "ok" | "info" | "warning" | "critical";
  small?: boolean;
}) {
  const colors = {
    ok: "text-success",
    info: "text-muted-foreground",
    warning: "text-warning",
    critical: "text-destructive",
  };
  const bgs = {
    ok: "bg-success/5 border-success/10",
    info: "bg-muted/50 border-border",
    warning: "bg-warning/5 border-warning/10",
    critical: "bg-destructive/5 border-destructive/10",
  };

  return (
    <div className={`rounded-lg border p-2 text-center ${bgs[severity]}`}>
      <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${colors[severity]}`} />
      <p className={`${small ? "text-sm" : "text-lg"} font-bold ${colors[severity]}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
