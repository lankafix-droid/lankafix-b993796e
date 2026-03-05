import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { getPlanById } from "@/data/carePlans";
import { computeSubscriptionAnalytics } from "@/engines/subscriptionEngine";
import { DEVICE_CATEGORY_LABELS } from "@/types/subscription";
import type { DeviceCategoryCode } from "@/types/subscription";
import { track } from "@/lib/analytics";
import {
  Shield, TrendingUp, Users, RefreshCw, AlertTriangle,
  BarChart3, Activity,
} from "lucide-react";

export default function SubscriptionAnalyticsPage() {
  const { subscriptions, devices } = useSubscriptionStore();

  useEffect(() => { track("wallet_viewed", { actor: "ops" }); }, []);

  const analytics = computeSubscriptionAnalytics(subscriptions);
  const activeSubs = subscriptions.filter((s) => s.status === "active");

  const totalAnnualRevenue = activeSubs.reduce((sum, s) => {
    const plan = getPlanById(s.planId);
    return sum + (plan?.annualPrice || 0);
  }, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Subscription Analytics</h1>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{analytics.activeSubscriptions}</div>
                <div className="text-xs text-muted-foreground">Active Subs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground">LKR {analytics.monthlyRecurringRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Monthly MRR</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground">LKR {totalAnnualRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Annual Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <RefreshCw className="w-5 h-5 text-success mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{analytics.renewalRate}%</div>
                <div className="text-xs text-muted-foreground">Renewal Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{analytics.churnRate}%</div>
                <div className="text-xs text-muted-foreground">Churn Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Demand */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Category Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(analytics.categoryDemand).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No subscription data yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(analytics.categoryDemand)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{DEVICE_CATEGORY_LABELS[cat as DeviceCategoryCode] || cat}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 bg-primary/20 rounded-full w-32 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min((count / Math.max(...Object.values(analytics.categoryDemand))) * 100, 100)}%` }}
                            />
                          </div>
                          <Badge variant="outline" className="text-xs">{count}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Subscriptions List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Subscriptions ({activeSubs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active subscriptions</p>
              ) : (
                <div className="space-y-2">
                  {activeSubs.map((sub) => {
                    const plan = getPlanById(sub.planId);
                    const device = devices.find((d) => d.deviceId === sub.deviceId);
                    const completedVisits = sub.amcVisits.filter((v) => v.status === "completed").length;
                    const totalVisits = sub.amcVisits.length;
                    return (
                      <div key={sub.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{plan?.name || sub.planId}</p>
                          <p className="text-xs text-muted-foreground">{device?.deviceName} — {device?.brand} {device?.model}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-muted-foreground">Visits: {completedVisits}/{totalVisits}</p>
                          <p className="text-muted-foreground">Expires: {new Date(sub.expiryDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
