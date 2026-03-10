import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Smartphone, AlertTriangle, Plus, ChevronRight } from "lucide-react";
import { getHealthLabel } from "@/store/devicePassportStore";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion } from "framer-motion";

const CATEGORY_ICONS: Record<string, string> = {
  AC: "❄️", CCTV: "📹", IT: "💻", MOBILE: "📱", SOLAR: "☀️",
  COPIER: "🖨️", SMART_HOME_OFFICE: "🏠", CONSUMER_ELEC: "📺",
  PRINT_SUPPLIES: "🖨️", ROUTER: "📡",
};

export default function DevicesDashboardPage() {
  const { passports, getAlerts } = useDevicePassportsDB();

  const allAlerts = passports.flatMap((p) => getAlerts(p.devicePassportId));
  const activeAlerts = allAlerts.filter((a) => !a.dismissed);

  return (
    <PageTransition className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 px-4 max-w-lg pb-28">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Devices</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{passports.length} registered device{passports.length !== 1 ? "s" : ""}</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-10">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <Card className="border-warning/30 bg-warning/5 shadow-[var(--shadow-card)]">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" /> {activeAlerts.length} Alert{activeAlerts.length > 1 ? "s" : ""}
                  </p>
                  {activeAlerts.slice(0, 3).map((a) => (
                    <p key={a.id} className="text-xs text-muted-foreground leading-relaxed">{a.message}</p>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Device Cards */}
          <div className="space-y-3">
            {passports.map((p, i) => {
              const health = getHealthLabel(p.healthScore);
              return (
                <motion.div
                  key={p.devicePassportId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link to={`/device/${p.devicePassportId}`}>
                    <Card className="hover:border-primary/30 transition-all active:scale-[0.98] shadow-[var(--shadow-card)] border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center text-2xl shrink-0">
                            {CATEGORY_ICONS[p.deviceCategory] || "📦"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm text-foreground truncate">{p.deviceNickname}</p>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.brand} {p.model}</p>
                            <p className="text-xs text-muted-foreground">{p.installationLocation}</p>

                            <div className="flex items-center gap-3 mt-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-muted-foreground">Health</span>
                                  <span className={`text-[10px] font-bold ${health.color}`}>{p.healthScore}/100</span>
                                </div>
                                <Progress value={p.healthScore} className="h-2" />
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {p.totalServicesPerformed} services
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {passports.length === 0 && (
            <EmptyState
              icon={Smartphone}
              title="No Devices Yet"
              description="Devices are automatically registered when you book services through LankaFix."
              actionLabel="Book a Service"
              onAction={() => window.location.href = "/"}
            />
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
