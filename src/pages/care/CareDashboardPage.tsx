import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Calendar, CreditCard, Clock, ArrowRight, Plus, History,
  CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { getPlanById } from "@/data/carePlans";
import { DEVICE_CATEGORY_LABELS, PLAN_TIER_LABELS, PLAN_TIER_COLORS } from "@/types/subscription";
import type { DeviceCategoryCode } from "@/types/subscription";
import { getAvailableCredits, isNearRenewal } from "@/engines/subscriptionEngine";
import { track } from "@/lib/analytics";

const CareDashboardPage = () => {
  const { devices, subscriptions, getAllActiveSubscriptions, getDeviceHistory } = useSubscriptionStore();
  const activeSubs = getAllActiveSubscriptions();

  track("subscription_dashboard_viewed", {});

  const totalCredits = activeSubs.reduce((sum, s) => sum + getAvailableCredits(s).length, 0);
  const upcomingVisits = activeSubs.flatMap((s) =>
    s.amcVisits.filter((v) => v.status === "scheduled" && new Date(v.scheduledDate) > new Date())
  ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Device Care</h1>
              <p className="text-sm text-muted-foreground">Manage your devices, plans, and maintenance</p>
            </div>
            <Button asChild><Link to="/care"><Plus className="w-4 h-4 mr-1" /> Add Plan</Link></Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{activeSubs.length}</div>
                <div className="text-xs text-muted-foreground">Active Plans</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{devices.length}</div>
                <div className="text-xs text-muted-foreground">Devices</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Sparkles className="w-5 h-5 text-warning mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{totalCredits}</div>
                <div className="text-xs text-muted-foreground">Credits Left</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-5 h-5 text-success mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{upcomingVisits.length}</div>
                <div className="text-xs text-muted-foreground">Upcoming Visits</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="plans">
            <TabsList>
              <TabsTrigger value="plans">Active Plans</TabsTrigger>
              <TabsTrigger value="devices">My Devices</TabsTrigger>
              <TabsTrigger value="visits">Upcoming Visits</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="mt-4 space-y-3">
              {activeSubs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-3">No active subscriptions yet</p>
                    <Button asChild><Link to="/care">Browse Care Plans</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                activeSubs.map((sub) => {
                  const plan = getPlanById(sub.planId);
                  const device = devices.find((d) => d.deviceId === sub.deviceId);
                  const nearRenewal = isNearRenewal(sub);
                  const credits = getAvailableCredits(sub);
                  return (
                    <Card key={sub.id} className={nearRenewal ? "border-warning/40" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={PLAN_TIER_COLORS[plan?.tier || "basic"]}>{plan ? PLAN_TIER_LABELS[plan.tier] : "Care"}</Badge>
                              {nearRenewal && <Badge className="bg-warning/10 text-warning text-[10px]">Renewal Due</Badge>}
                            </div>
                            <h3 className="font-semibold text-foreground">{plan?.name || sub.planId}</h3>
                            <p className="text-xs text-muted-foreground">{device?.deviceName} — {device?.brand} {device?.model}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div>Expires: {new Date(sub.expiryDate).toLocaleDateString()}</div>
                            <div>{credits.length} credits left</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {device && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/care/device/${device.deviceId}`}><History className="w-3.5 h-3.5 mr-1" /> History</Link>
                            </Button>
                          )}
                          {nearRenewal && (
                            <Button variant="hero" size="sm" onClick={() => {
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
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-3">No devices registered</p>
                    <Button asChild><Link to="/care">Register a Device</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                devices.map((device) => {
                  const sub = subscriptions.find((s) => s.deviceId === device.deviceId && s.status === "active");
                  return (
                    <Card key={device.deviceId}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{device.deviceName}</h3>
                            <p className="text-xs text-muted-foreground">{device.brand} {device.model} • {device.installationLocation}</p>
                            <p className="text-xs text-muted-foreground">{DEVICE_CATEGORY_LABELS[device.category]} • Purchased {device.purchaseYear}</p>
                          </div>
                          <div>
                            {sub ? (
                              <Badge className="bg-success/10 text-success">Protected</Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Unprotected</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/care/device/${device.deviceId}`}><History className="w-3.5 h-3.5 mr-1" /> Timeline</Link>
                          </Button>
                          {!sub && (
                            <Button size="sm" asChild>
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
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No upcoming maintenance visits</p>
                  </CardContent>
                </Card>
              ) : (
                upcomingVisits.map((visit) => {
                  const sub = activeSubs.find((s) => s.amcVisits.some((v) => v.id === visit.id));
                  const device = devices.find((d) => d.deviceId === sub?.deviceId);
                  const plan = sub ? getPlanById(sub.planId) : null;
                  return (
                    <Card key={visit.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-sm text-foreground">{plan?.name || "AMC Visit"}</h3>
                            <p className="text-xs text-muted-foreground">{device?.deviceName} — {device?.brand} {device?.model}</p>
                          </div>
                          <Badge className="bg-primary/10 text-primary">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(visit.scheduledDate).toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Checklist: {visit.checklist.length} items</p>
                        </div>
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
    </div>
  );
};

export default CareDashboardPage;
