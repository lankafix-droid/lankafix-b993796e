import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { getPlanById } from "@/data/carePlans";
import { getAmcVisitPayout } from "@/engines/subscriptionEngine";
import { DEVICE_CATEGORY_LABELS } from "@/types/subscription";
import type { DeviceCategoryCode } from "@/types/subscription";
import { track } from "@/lib/analytics";
import {
  Briefcase, CheckCircle2, Wrench, User, Star, Calendar,
  Shield, ClipboardList, DollarSign,
} from "lucide-react";

const CURRENT_TECH = MOCK_TECHNICIANS[0];

export default function TechnicianDashboardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);
  const { subscriptions, devices } = useSubscriptionStore();

  useEffect(() => { track("technician_dashboard_view"); }, []);

  const myJobs = bookings;
  const newJobs = myJobs.filter((b) => ["matching", "awaiting_partner_confirmation", "assigned"].includes(b.status));
  const activeJobs = myJobs.filter((b) => ["tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress"].includes(b.status));
  const completedJobs = myJobs.filter((b) => ["completed", "rated"].includes(b.status));

  // AMC visits assigned to this technician (mock: show all scheduled)
  const allActiveSubs = subscriptions.filter((s) => s.status === "active");
  const upcomingAmcVisits = allActiveSubs.flatMap((sub) => {
    const plan = getPlanById(sub.planId);
    const device = devices.find((d) => d.deviceId === sub.deviceId);
    return sub.amcVisits
      .filter((v) => v.status === "scheduled" && new Date(v.scheduledDate) > new Date())
      .map((v) => ({ ...v, plan, device, sub }));
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{CURRENT_TECH.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-3 h-3" /> {CURRENT_TECH.rating} • {CURRENT_TECH.jobsCompleted} jobs
            </div>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Online</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Job Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 text-center">
              <Briefcase className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold">{newJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 text-center">
              <Wrench className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{activeJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold">{completedJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        <Button className="w-full" onClick={() => navigate("/technician/jobs")}>
          View All Jobs
        </Button>

        {/* AMC Section */}
        <div className="mt-2">
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
              {upcomingAmcVisits.slice(0, 5).map((visit) => {
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

          {/* Technician trust note */}
          <div className="bg-success/5 border border-success/20 rounded-lg p-3 mt-3">
            <p className="text-xs text-success text-center">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              AMC payouts are released after completion verification. Max 2 rejections allowed.
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate("/technician/earnings")}>
          View Earnings
        </Button>
      </div>
    </div>
  );
}
