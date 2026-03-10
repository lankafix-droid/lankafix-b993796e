import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Smartphone, Shield, AlertTriangle, Wrench, CalendarClock,
  ChevronRight, Plus, Package, Repeat, History, ArrowRight,
} from "lucide-react";
import { getHealthLabel } from "@/store/devicePassportStore";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { MAINTENANCE_SCHEDULES } from "@/engines/retentionEngine";
import AIPredictiveMaintenance from "@/components/ai/AIPredictiveMaintenance";

const CATEGORY_ICONS: Record<string, string> = {
  AC: "❄️", CCTV: "📹", IT: "💻", MOBILE: "📱", SOLAR: "☀️",
  COPIER: "🖨️", SMART_HOME_OFFICE: "🏠", CONSUMER_ELEC: "📺",
  ELECTRICAL: "⚡", PLUMBING: "🔧", NETWORK: "📡", SECURITY: "🔒",
  POWER_BACKUP: "🔋", APPLIANCE_INSTALL: "🏗️",
};

const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

export default function HomeHealthPage() {
  const { passports, getAlerts } = useDevicePassportsDB();
  const { subscriptions } = useSubscriptionStore();

  const allAlerts = passports.flatMap((p) => getAlerts(p.devicePassportId));
  const activeAlerts = allAlerts.filter((a) => !a.dismissed);
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const needsMaintenance = passports.filter((p) => p.healthScore < 60);

  // Find matching maintenance schedules for registered devices
  const upcomingMaint = passports
    .map((p) => {
      const matchingSchedule = Object.values(MAINTENANCE_SCHEDULES).find(
        (s) => s.category === p.deviceCategory
      );
      return matchingSchedule ? { device: p, schedule: matchingSchedule } : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  const overallHealth = passports.length > 0
    ? Math.round(passports.reduce((sum, p) => sum + p.healthScore, 0) / passports.length)
    : 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-lg py-6 px-4">
          <div className="flex items-center gap-2 mb-6">
            <Home className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Home Health</h1>
              <p className="text-xs text-muted-foreground">Your complete technology overview</p>
            </div>
          </div>

          {/* AI Predictive Maintenance */}
          <div className="mb-6">
            <AIPredictiveMaintenance
              deviceCategory={passports[0]?.deviceCategory || "AC"}
              deviceAge={passports[0] ? `${Math.round((Date.now() - new Date(passports[0].purchaseDate || passports[0].createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years` : "2 years"}
              location="Colombo, Sri Lanka"
            />
          </div>

          {/* Overall Score */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Overall Home Health</span>
                  <Badge variant={overallHealth >= 70 ? "default" : "destructive"}>
                    {overallHealth}%
                  </Badge>
                </div>
                <Progress value={overallHealth} className="h-2.5 mb-3" />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-foreground">{passports.length}</div>
                    <div className="text-[10px] text-muted-foreground">Devices</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">{activeSubs.length}</div>
                    <div className="text-[10px] text-muted-foreground">Subscriptions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">{needsMaintenance.length}</div>
                    <div className="text-[10px] text-muted-foreground">Need Attention</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alerts */}
          {activeAlerts.length > 0 && (
            <Section title="⚠️ Alerts">
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-4 space-y-2">
                  {activeAlerts.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{a.message}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Quick Actions */}
          <Section title="Quick Actions">
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Wrench, label: "Book Service", to: "/" },
                { icon: Smartphone, label: "My Devices", to: "/devices" },
                { icon: Repeat, label: "Care Plans", to: "/care" },
                { icon: Package, label: "Supplies", to: "/supplies" },
              ].map(({ icon: Icon, label, to }) => (
                <Link key={label} to={to} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-medium text-center text-foreground">{label}</span>
                </Link>
              ))}
            </div>
          </Section>

          {/* Devices Overview */}
          <Section
            title="My Devices"
            action={
              <Link to="/devices" className="text-xs text-primary flex items-center gap-0.5">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {passports.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No devices registered yet</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/devices"><Plus className="w-3.5 h-3.5 mr-1" /> Add Your First Device</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {passports.slice(0, 4).map((p) => {
                  const health = getHealthLabel(p.healthScore);
                  return (
                    <Link key={p.devicePassportId} to={`/device/${p.devicePassportId}`}>
                      <Card className="hover:border-primary/20 transition-colors">
                        <CardContent className="p-3 flex items-center gap-3">
                          <span className="text-xl">{CATEGORY_ICONS[p.deviceCategory] || "🔧"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-foreground">{p.brand} {p.model}</div>
                            <div className="text-xs text-muted-foreground">{p.deviceCategory}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px]" style={{ color: health.color }}>{p.healthScore}%</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Upcoming Maintenance */}
          <Section title="Upcoming Maintenance">
            {upcomingMaint.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintenance scheduled. Add devices to get smart reminders.</p>
            ) : (
              <div className="space-y-2">
                {upcomingMaint.map((item: any) => (
                  <Card key={item.device.devicePassportId}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.device.brand} {item.device.model}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.schedule.label} — every {item.schedule.intervalMonths} months
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/book/${item.device.deviceCategory}`}>Book</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* Active Subscriptions */}
          <Section
            title="Active Subscriptions"
            action={
              <Link to="/care" className="text-xs text-primary flex items-center gap-0.5">
                Browse Plans <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {activeSubs.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No active care plans</p>
                  <Button size="sm" asChild>
                    <Link to="/care">Explore Care Plans <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {activeSubs.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Shield className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{sub.planId}</div>
                        <div className="text-xs text-muted-foreground capitalize">{sub.status}</div>
                      </div>
                      <Badge variant="default" className="text-[10px]">Active</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* Service History */}
          <Section title="Recent Service History">
            <Card>
              <CardContent className="p-4 text-center">
                <History className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">View complete service records</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/devices">View History <ChevronRight className="w-3.5 h-3.5 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
