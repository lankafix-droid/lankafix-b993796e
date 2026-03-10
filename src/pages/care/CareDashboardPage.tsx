import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Calendar, CreditCard, Clock, Plus, History,
  CheckCircle2, Sparkles,
} from "lucide-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { getPlanById } from "@/data/carePlans";
import { DEVICE_CATEGORY_LABELS, PLAN_TIER_LABELS, PLAN_TIER_COLORS } from "@/types/subscription";
import { getAvailableCredits, isNearRenewal } from "@/engines/subscriptionEngine";
import { track } from "@/lib/analytics";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion } from "framer-motion";

const CareDashboardPage = () => {
  const { devices, subscriptions, getAllActiveSubscriptions, getDeviceHistory } = useSubscriptionStore();
  const activeSubs = getAllActiveSubscriptions();

  track("subscription_dashboard_viewed", {});

  const totalCredits = activeSubs.reduce((sum, s) => sum + getAvailableCredits(s).length, 0);
  const upcomingVisits = activeSubs.flatMap((s) =>
    s.amcVisits.filter((v) => v.status === "scheduled" && new Date(v.scheduledDate) > new Date())
  ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  return (
    <PageTransition className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 px-4 max-w-2xl pb-28">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Device Care</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage devices, plans & maintenance</p>
            </div>
            <Button asChild size="sm" className="rounded-xl h-10 gap-1.5">
              <Link to="/care"><Plus className="w-4 h-4" /> Add Plan</Link>
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: Shield, value: activeSubs.length, label: "Active Plans", color: "text-primary" },
              { icon: CreditCard, value: devices.length, label: "Devices", color: "text-primary" },
              { icon: Sparkles, value: totalCredits, label: "Credits Left", color: "text-warning" },
              { icon: Calendar, value: upcomingVisits.length, label: "Upcoming", color: "text-success" },
            ].map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-border/60 shadow-[var(--shadow-card)]">
                  <CardContent className="p-4 text-center">
                    <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1.5`} />
                    <div className="text-2xl font-bold text-foreground">{item.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="plans">
            <TabsList className="w-full">
              <TabsTrigger value="plans" className="flex-1">Plans</TabsTrigger>
              <TabsTrigger value="devices" className="flex-1">Devices</TabsTrigger>
              <TabsTrigger value="visits" className="flex-1">Visits</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="mt-4 space-y-3">
              {activeSubs.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No Active Plans"
                  description="Protect your devices with a LankaFix Care plan for scheduled maintenance and priority support."
                  actionLabel="Browse Plans"
                  onAction={() => window.location.href = "/care"}
                />
              ) : (
                activeSubs.map((sub) => {
                  const plan = getPlanById(sub.planId);
                  const device = devices.find((d) => d.deviceId === sub.deviceId);
                  const nearRenewal = isNearRenewal(sub);
                  const credits = getAvailableCredits(sub);
                  return (
                    <Card key={sub.id} className={`border-border/60 shadow-[var(--shadow-card)] ${nearRenewal ? "border-warning/40" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Badge className={PLAN_TIER_COLORS[plan?.tier || "basic"]}>{plan ? PLAN_TIER_LABELS[plan.tier] : "Care"}</Badge>
                              {nearRenewal && <Badge className="bg-warning/10 text-warning text-[10px]">Renewal Due</Badge>}
                            </div>
                            <h3 className="font-semibold text-foreground text-sm">{plan?.name || sub.planId}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{device?.deviceName} — {device?.brand} {device?.model}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0 ml-3">
                            <div>Exp: {new Date(sub.expiryDate).toLocaleDateString()}</div>
                            <div className="font-medium text-foreground mt-0.5">{credits.length} credits</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {device && (
                            <Button variant="outline" size="sm" className="rounded-xl h-9" asChild>
                              <Link to={`/care/device/${device.deviceId}`}><History className="w-3.5 h-3.5 mr-1" /> History</Link>
                            </Button>
                          )}
                          {nearRenewal && (
                            <Button variant="hero" size="sm" className="rounded-xl h-9" onClick={() => {
                              useSubscriptionStore.getState().renewSubscription(sub.id);
                            }}>Renew Now</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="devices" className="mt-4 space-y-3">
              {devices.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No Devices"
                  description="Register a device to start tracking its health and service history."
                  actionLabel="Register Device"
                  onAction={() => window.location.href = "/care"}
                />
              ) : (
                devices.map((device) => {
                  const sub = subscriptions.find((s) => s.deviceId === device.deviceId && s.status === "active");
                  return (
                    <Card key={device.deviceId} className="border-border/60 shadow-[var(--shadow-card)]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-sm">{device.deviceName}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{device.brand} {device.model} • {device.installationLocation}</p>
                            <p className="text-xs text-muted-foreground">{DEVICE_CATEGORY_LABELS[device.category]} • {device.purchaseYear}</p>
                          </div>
                          <Badge className={sub ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                            {sub ? "Protected" : "Unprotected"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl h-9" asChild>
                            <Link to={`/care/device/${device.deviceId}`}><History className="w-3.5 h-3.5 mr-1" /> Timeline</Link>
                          </Button>
                          {!sub && (
                            <Button size="sm" className="rounded-xl h-9" asChild>
                              <Link to="/care"><Shield className="w-3.5 h-3.5 mr-1" /> Add Plan</Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="visits" className="mt-4 space-y-3">
              {upcomingVisits.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No Upcoming Visits"
                  description="Scheduled maintenance visits will appear here once you have an active care plan."
                />
              ) : (
                upcomingVisits.map((visit) => {
                  const sub = activeSubs.find((s) => s.amcVisits.some((v) => v.id === visit.id));
                  const device = devices.find((d) => d.deviceId === sub?.deviceId);
                  const plan = sub ? getPlanById(sub.planId) : null;
                  return (
                    <Card key={visit.id} className="border-border/60 shadow-[var(--shadow-card)]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-foreground">{plan?.name || "AMC Visit"}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{device?.deviceName} — {device?.brand} {device?.model}</p>
                          </div>
                          <Badge className="bg-primary/10 text-primary shrink-0">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(visit.scheduledDate).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{visit.checklist.length} checklist items</p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default CareDashboardPage;
