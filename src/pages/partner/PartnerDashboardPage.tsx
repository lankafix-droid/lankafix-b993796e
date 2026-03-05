import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { MOCK_PARTNERS, getTechniciansByPartner } from "@/data/mockPartnerData";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import {
  Briefcase, Clock, CheckCircle2, AlertTriangle, Users,
  MapPin, ArrowRight, Wrench,
} from "lucide-react";

const CURRENT_PARTNER = MOCK_PARTNERS[0]; // Mock: logged in as P001

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);
  const techs = getTechniciansByPartner(CURRENT_PARTNER.id);

  useEffect(() => { track("partner_dashboard_view"); }, []);

  const activeJobs = bookings.filter((b) => !["completed", "rated", "cancelled"].includes(b.status));
  const awaitingConfirmation = bookings.filter((b) => b.status === "awaiting_partner_confirmation");
  const inProgress = bookings.filter((b) => ["repair_started", "inspection_started", "in_progress"].includes(b.status));
  const completedToday = bookings.filter((b) => {
    if (b.status !== "completed" && b.status !== "rated") return false;
    const today = new Date().toDateString();
    return b.timelineEvents.some((e) => e.title.includes("Completed") && new Date(e.timestamp).toDateString() === today);
  });

  const availableTechs = techs.filter((t) => t.availabilityStatus === "available");
  const busyTechs = techs.filter((t) => t.availabilityStatus === "busy");
  const offlineTechs = techs.filter((t) => t.availabilityStatus === "offline");

  const summaryCards = [
    { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, color: "text-primary" },
    { label: "Awaiting Confirmation", value: awaitingConfirmation.length, icon: AlertTriangle, color: "text-warning" },
    { label: "In Progress", value: inProgress.length, icon: Wrench, color: "text-primary" },
    { label: "Completed Today", value: completedToday.length, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Partner Dashboard</h1>
            <p className="text-xs text-muted-foreground">{CURRENT_PARTNER.companyName}</p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Verified</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border">
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

        {/* Coverage Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Coverage & Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {CURRENT_PARTNER.categories.map((cat) => (
                <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{CURRENT_PARTNER.coverageZones.length} zones covered</p>
          </CardContent>
        </Card>

        {/* Technician Availability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Technician Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-success">{availableTechs.length}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div>
                <p className="text-xl font-bold text-warning">{busyTechs.length}</p>
                <p className="text-xs text-muted-foreground">Busy</p>
              </div>
              <div>
                <p className="text-xl font-bold text-muted-foreground">{offlineTechs.length}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
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
            {activeJobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active jobs</p>
            )}
            {activeJobs.slice(0, 5).map((b) => (
              <div
                key={b.jobId}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/partner/job/${b.jobId}`)}
              >
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
        </div>
      </div>
    </div>
  );
}
