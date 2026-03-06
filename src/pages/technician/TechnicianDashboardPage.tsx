import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useBookingStore } from "@/store/bookingStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { getPlanById } from "@/data/carePlans";
import { getAmcVisitPayout } from "@/engines/subscriptionEngine";
import { PROVIDER_TIER_LABELS, PROVIDER_TIER_COLORS } from "@/types/booking";
import type { ProviderTier } from "@/types/booking";
import { computeTechnicianEarnings } from "@/lib/settlementEngine";
import { track } from "@/lib/analytics";
import {
  Briefcase, CheckCircle2, Wrench, User, Star, Calendar,
  Shield, ClipboardList, DollarSign, MapPin, Wallet, Package,
  GraduationCap, Headphones, AlertTriangle, Zap, Navigation,
  TrendingUp, Clock,
} from "lucide-react";

const CURRENT_TECH = MOCK_TECHNICIANS[0];
const TECH_TIER: ProviderTier = "pro";

type AvailabilityStatus = "online" | "offline" | "emergency_only";

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  online: "Online",
  offline: "Offline",
  emergency_only: "Emergency Only",
};

const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  online: "bg-success/10 text-success border-success/20",
  offline: "bg-muted text-muted-foreground border-border",
  emergency_only: "bg-warning/10 text-warning border-warning/20",
};

export default function TechnicianDashboardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);
  const { subscriptions, devices } = useSubscriptionStore();
  const [availability, setAvailability] = useState<AvailabilityStatus>("online");

  useEffect(() => { track("technician_dashboard_view"); }, []);

  const myJobs = bookings;
  const newJobs = myJobs.filter((b) => ["matching", "awaiting_partner_confirmation", "assigned"].includes(b.status));
  const activeJobs = myJobs.filter((b) => ["tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress"].includes(b.status));
  const completedJobs = myJobs.filter((b) => ["completed", "rated"].includes(b.status));
  const earnings = computeTechnicianEarnings(bookings, "tech-001");

  const formatLKR = (n: number) => `Rs ${n.toLocaleString("en-LK")}`;

  // Smart job batching — group nearby jobs
  const nearbyBatchableJobs = newJobs.filter((j, i) => i < 3 && j.zone);

  // AMC visits
  const allActiveSubs = subscriptions.filter((s) => s.status === "active");
  const upcomingAmcVisits = allActiveSubs.flatMap((sub) => {
    const plan = getPlanById(sub.planId);
    const device = devices.find((d) => d.deviceId === sub.deviceId);
    return sub.amcVisits
      .filter((v) => v.status === "scheduled" && new Date(v.scheduledDate) > new Date())
      .map((v) => ({ ...v, plan, device, sub }));
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const cycleAvailability = () => {
    const order: AvailabilityStatus[] = ["online", "emergency_only", "offline"];
    const idx = order.indexOf(availability);
    setAvailability(order[(idx + 1) % order.length]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Good Morning, {CURRENT_TECH.name.split(" ")[0]} 👋</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Star className="w-3 h-3 text-warning" /> {CURRENT_TECH.rating} • {CURRENT_TECH.jobsCompleted} jobs
              <Badge variant="outline" className={`text-[10px] ${PROVIDER_TIER_COLORS[TECH_TIER]}`}>
                {PROVIDER_TIER_LABELS[TECH_TIER]}
              </Badge>
            </div>
          </div>
          <button
            onClick={cycleAvailability}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${AVAILABILITY_COLORS[availability]}`}
          >
            {AVAILABILITY_LABELS[availability]}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Today's Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Today's Jobs</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{activeJobs.length + newJobs.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Today's Earnings</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatLKR(earnings.today)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Pending Requests</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{newJobs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Wallet Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatLKR(earnings.month)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Job Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-3 text-center">
              <Briefcase className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold">{newJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-3 text-center">
              <Wrench className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{activeJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-xl font-bold">{completedJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Jobs", icon: Briefcase, path: "/technician/jobs", color: "text-primary" },
            { label: "Parts", icon: Package, path: "/technician/parts", color: "text-warning" },
            { label: "Training", icon: GraduationCap, path: "/technician/training", color: "text-success" },
            { label: "Support", icon: Headphones, path: "/technician/support", color: "text-muted-foreground" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-xl border hover:border-primary/20 transition-colors"
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-[10px] font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Smart Job Batching */}
        {nearbyBatchableJobs.length >= 2 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Smart Batch Available</span>
                <Badge className="bg-primary/10 text-primary text-[10px]">{nearbyBatchableJobs.length} nearby</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                These jobs are in nearby areas. Accept them together to maximize your earnings.
              </p>
              <div className="space-y-1.5 mb-3">
                {nearbyBatchableJobs.map((j) => (
                  <div key={j.jobId} className="flex items-center justify-between text-xs bg-card rounded-lg p-2 border">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{j.categoryName}</span>
                      <span className="text-muted-foreground">{j.zone}</span>
                    </div>
                    <span className="text-primary font-medium">{j.jobId}</span>
                  </div>
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={() => navigate("/technician/jobs")}>
                View & Accept Batch
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">My Performance</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Rating", value: `${CURRENT_TECH.rating}`, icon: Star, color: "text-warning" },
                { label: "Completed", value: `${CURRENT_TECH.jobsCompleted}`, icon: CheckCircle2, color: "text-success" },
                { label: "Accept Rate", value: "96%", icon: Zap, color: "text-primary" },
                { label: "Avg Response", value: "8m", icon: Clock, color: "text-muted-foreground" },
              ].map((metric) => (
                <div key={metric.label} className="text-center">
                  <metric.icon className={`w-4 h-4 mx-auto mb-1 ${metric.color}`} />
                  <p className="text-sm font-bold text-foreground">{metric.value}</p>
                  <p className="text-[9px] text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AMC Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">AMC Visits</h2>
            <Badge className="bg-primary/10 text-primary text-[10px]">{upcomingAmcVisits.length} upcoming</Badge>
          </div>
          {upcomingAmcVisits.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming AMC visits</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingAmcVisits.slice(0, 3).map((visit) => {
                const payout = getAmcVisitPayout(visit.plan?.category || "AC");
                return (
                  <Card key={visit.id} className="border-primary/10">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <p className="text-sm font-medium text-foreground">{visit.plan?.name || "AMC Visit"}</p>
                          <p className="text-xs text-muted-foreground">
                            {visit.device?.deviceName} — {visit.device?.brand} {visit.device?.model}
                          </p>
                        </div>
                        <Badge className="bg-primary/10 text-primary text-[10px]">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(visit.scheduledDate).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ClipboardList className="w-3 h-3" />
                          {visit.checklist.length} checklist items
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-success">
                          <DollarSign className="w-3 h-3" />
                          LKR {payout.toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Safety Banner */}
        <Card className="border-destructive/20 bg-destructive/5 cursor-pointer" onClick={() => navigate("/technician/safety")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Safety Tools</p>
              <p className="text-xs text-muted-foreground">SOS button, live tracking & support alerts</p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="w-full" onClick={() => navigate("/technician/jobs")}>
            <Briefcase className="w-4 h-4 mr-2" /> View All Jobs
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/technician/earnings")}>
            <Wallet className="w-4 h-4 mr-2" /> View Earnings
          </Button>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-3">
          <p className="text-xs text-success text-center">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            All payouts are released after completion verification.
          </p>
        </div>
      </div>
    </div>
  );
}
