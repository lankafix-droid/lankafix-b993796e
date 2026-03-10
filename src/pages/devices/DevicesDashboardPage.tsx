import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Smartphone, Shield, AlertTriangle, Plus, ChevronRight } from "lucide-react";
import { getHealthLabel } from "@/store/devicePassportStore";
import { useDevicePassportsDB } from "@/hooks/useDevicePassportsDB";

const CATEGORY_ICONS: Record<string, string> = {
  AC: "❄️", CCTV: "📹", IT: "💻", MOBILE: "📱", SOLAR: "☀️",
  COPIER: "🖨️", SMART_HOME_OFFICE: "🏠", CONSUMER_ELEC: "📺",
  PRINT_SUPPLIES: "🖨️", ROUTER: "📡",
};

export default function DevicesDashboardPage() {
  const { passports, getAlerts } = useDevicePassportStore();

  // Gather all alerts
  const allAlerts = passports.flatMap((p) => getAlerts(p.devicePassportId));
  const activeAlerts = allAlerts.filter((a) => !a.dismissed);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Devices</h1>
              <p className="text-sm text-muted-foreground">{passports.length} registered devices</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="w-4 h-4" /> Add Device
            </Button>
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <Card className="mb-4 border-warning/30 bg-warning/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Alerts ({activeAlerts.length})
                </p>
                {activeAlerts.slice(0, 3).map((a) => (
                  <p key={a.id} className="text-xs text-muted-foreground">{a.message}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Device Cards */}
          <div className="space-y-3">
            {passports.map((p) => {
              const health = getHealthLabel(p.healthScore);
              return (
                <Link key={p.devicePassportId} to={`/device/${p.devicePassportId}`}>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{CATEGORY_ICONS[p.deviceCategory] || "📦"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-foreground truncate">{p.deviceNickname}</p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground">{p.brand} {p.model}</p>
                          <p className="text-xs text-muted-foreground">{p.installationLocation}</p>

                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] text-muted-foreground">Health</span>
                                <span className={`text-[10px] font-semibold ${health.color}`}>{p.healthScore}/100</span>
                              </div>
                              <Progress value={p.healthScore} className="h-1.5" />
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {p.totalServicesPerformed} services
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {passports.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No devices registered yet</p>
                <p className="text-xs text-muted-foreground mt-1">Devices are automatically registered when you book services</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
