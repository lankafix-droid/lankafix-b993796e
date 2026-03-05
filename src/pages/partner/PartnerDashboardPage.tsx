import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { useProviderERPStore } from "@/store/providerERPStore";
import { MOCK_PARTNERS, getTechniciansByPartner } from "@/data/mockPartnerData";
import { getTechPerformanceMetrics } from "@/lib/dispatchEngine";
import { track } from "@/lib/analytics";
import { VERIFICATION_STATUS_STYLES } from "@/types/provider";
import { useEffect } from "react";
import {
  Briefcase, Clock, CheckCircle2, AlertTriangle, Users,
  MapPin, ArrowRight, Wrench, BarChart3, Wallet,
  TrendingUp, Shield, Settings,
} from "lucide-react";

const CURRENT_PARTNER = MOCK_PARTNERS[0];

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);
  const techs = getTechniciansByPartner(CURRENT_PARTNER.id);
  const { getFleetSummary, getProviderPerformance, getProvider } = useProviderERPStore();

  useEffect(() => { track("partner_dashboard_view"); }, []);

  const provider = getProvider(CURRENT_PARTNER.id);
  const fleet = getFleetSummary(CURRENT_PARTNER.id);
  const performance = getProviderPerformance(CURRENT_PARTNER.id);
  const verificationStyle = provider ? VERIFICATION_STATUS_STYLES[provider.verificationStatus] : VERIFICATION_STATUS_STYLES.verified;

  const activeJobs = bookings.filter((b) => !["completed", "rated", "cancelled"].includes(b.status));
  const awaitingConfirmation = bookings.filter((b) => b.status === "awaiting_partner_confirmation");
  const inProgress = bookings.filter((b) => ["repair_started", "inspection_started", "in_progress"].includes(b.status));
  const completedToday = bookings.filter((b) => {
    if (b.status !== "completed" && b.status !== "rated") return false;
    const today = new Date().toDateString();
    return b.timelineEvents.some((e) => e.title.includes("Completed") && new Date(e.timestamp).toDateString() === today);
  });

  const topCategories = Object.entries(performance.jobsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Partner Dashboard</h1>
            <p className="text-xs text-muted-foreground">{CURRENT_PARTNER.companyName}</p>
          </div>
          <Badge className={verificationStyle.color + " text-xs"}>{verificationStyle.label}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Job Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, color: "text-primary" },
            { label: "Awaiting Confirm", value: awaitingConfirmation.length, icon: AlertTriangle, color: "text-warning" },
            { label: "In Progress", value: inProgress.length, icon: Wrench, color: "text-primary" },
            { label: "Completed Today", value: completedToday.length, icon: CheckCircle2, color: "text-success" },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fleet Management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Fleet Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div>
                <p className="text-xl font-bold text-foreground">{fleet.totalTechnicians}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-xl font-bold text-success">{fleet.online}</p>
                <p className="text-[10px] text-muted-foreground">Online</p>
              </div>
              <div>
                <p className="text-xl font-bold text-warning">{fleet.busy}</p>
                <p className="text-[10px] text-muted-foreground">Busy</p>
              </div>
              <div>
                <p className="text-xl font-bold text-muted-foreground">{fleet.offline}</p>
                <p className="text-[10px] text-muted-foreground">Offline</p>
              </div>
            </div>
            {/* Capacity bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Daily Capacity</span>
                <span>{fleet.usedCapacityToday}/{fleet.totalCapacityToday} jobs</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((fleet.usedCapacityToday / Math.max(fleet.totalCapacityToday, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">⭐ {performance.customerRating}</p>
                <p className="text-[10px] text-muted-foreground">Avg Rating</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{performance.completionRate}%</p>
                <p className="text-[10px] text-muted-foreground">Completion Rate</p>
              </div>
            </div>
            {/* Category breakdown */}
            {topCategories.length > 0 && (
              <div className="space-y-1.5 border-t pt-2">
                <p className="text-xs text-muted-foreground font-medium">Jobs by Category</p>
                {topCategories.map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-muted rounded-full w-20 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((count / topCategories[0][1]) * 100, 100)}%` }} />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" /> Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">LKR {performance.weeklyRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">This Week</p>
              </div>
              <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">LKR {performance.monthlyRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeJobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active jobs</p>}
            {activeJobs.slice(0, 5).map((b) => (
              <div key={b.jobId} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/partner/job/${b.jobId}`)}>
                <div>
                  <p className="text-sm font-medium text-foreground">{b.jobId}</p>
                  <p className="text-xs text-muted-foreground">{b.categoryName} • {b.serviceName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{b.status.replace(/_/g, " ")}</Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/jobs")}>
            <Briefcase className="w-4 h-4 mr-2" /> All Jobs
          </Button>
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/technicians")}>
            <Users className="w-4 h-4 mr-2" /> Technicians
          </Button>
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/wallet")}>
            <Wallet className="w-4 h-4 mr-2" /> Wallet
          </Button>
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/profile")}>
            <Settings className="w-4 h-4 mr-2" /> Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
