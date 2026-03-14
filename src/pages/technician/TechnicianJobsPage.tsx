import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTechnicianJobs } from "@/hooks/useTechnicianJobs";
import { BOOKING_STATUS_LABELS, CATEGORY_LABELS } from "@/types/booking";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, MapPin, Clock, AlertTriangle, CheckCircle2, Loader2, Bell, Briefcase } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-muted text-muted-foreground",
  matching: "bg-primary/10 text-primary",
  awaiting_partner_confirmation: "bg-warning/10 text-warning",
  assigned: "bg-primary/10 text-primary",
  tech_en_route: "bg-warning/10 text-warning",
  arrived: "bg-success/10 text-success",
  inspection_started: "bg-primary/10 text-primary",
  quote_submitted: "bg-warning/10 text-warning",
  quote_approved: "bg-success/10 text-success",
  repair_started: "bg-primary/10 text-primary",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function getSlaHealth(createdAt: string, status: string): "on_time" | "at_risk" | "delayed" {
  if (["completed", "rated", "cancelled"].includes(status)) return "on_time";
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (mins > 120) return "delayed";
  if (mins > 60) return "at_risk";
  return "on_time";
}

const SLA_CONFIG = {
  on_time: { icon: CheckCircle2, color: "text-success", label: "On Time" },
  at_risk: { icon: AlertTriangle, color: "text-warning", label: "At Risk" },
  delayed: { icon: AlertTriangle, color: "text-destructive", label: "Delayed" },
};

export default function TechnicianJobsPage() {
  const navigate = useNavigate();
  const { bookings, offers, isLoading, partner } = useTechnicianJobs();

  useEffect(() => { track("technician_jobs_view"); }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No technician profile found</p>
          <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
        </div>
      </div>
    );
  }

  const activeJobs = bookings.filter((b: any) => !["completed", "cancelled", "no_show"].includes(b.status));
  const completedJobs = bookings.filter((b: any) => b.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">My Jobs</h1>
          <p className="text-xs text-muted-foreground">{activeJobs.length} active • {completedJobs.length} completed</p>
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Pending Offers */}
        {offers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">New Job Offers</h2>
              <Badge className="bg-primary text-primary-foreground text-[10px]">{offers.length}</Badge>
            </div>
            {offers.map((offer: any) => {
              const b = offer.bookings;
              if (!b) return null;
              return (
                <div
                  key={offer.id}
                  className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/technician/job/${b.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS[b.category_code as keyof typeof CATEGORY_LABELS] || b.category_code} — {b.service_type || "General"}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{b.zone_code || "No zone"}{b.is_emergency ? " · 🔴 Emergency" : ""}</span>
                    {b.estimated_price_lkr && <span className="font-medium text-foreground">LKR {b.estimated_price_lkr.toLocaleString()}</span>}
                  </div>
                  <p className="text-[10px] text-primary font-medium">Tap to accept or decline</p>
                </div>
              );
            })}
          </div>
        )}

        {bookings.length === 0 && offers.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7 text-primary/40" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Jobs Yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Jobs assigned to you will appear here once you start receiving bookings.</p>
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-foreground">Active</h2>
            {activeJobs.map((b: any) => {
              const sla = getSlaHealth(b.created_at, b.status);
              const slaConfig = SLA_CONFIG[sla];
              const SlaIcon = slaConfig.icon;
              return (
                <div
                  key={b.id}
                  className="bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/technician/job/${b.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{b.id.slice(0, 8).toUpperCase()}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}`}>
                        {BOOKING_STATUS_LABELS[b.status as keyof typeof BOOKING_STATUS_LABELS] || b.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[b.category_code as keyof typeof CATEGORY_LABELS] || b.category_code} • {b.service_type || "General"}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {b.zone_code || "N/A"}</span>
                    <span>{(b.service_mode || "on_site").replace(/_/g, " ")}</span>
                    {b.is_emergency && <span className="text-destructive font-medium">Emergency</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <SlaIcon className={`w-3 h-3 ${slaConfig.color}`} />
                    <span className={`text-[10px] ${slaConfig.color}`}>{slaConfig.label}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-foreground mt-4">Completed</h2>
            {completedJobs.slice(0, 10).map((b: any) => (
              <div
                key={b.id}
                className="bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/technician/job/${b.id}`)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{b.id.slice(0, 8).toUpperCase()}</span>
                    <Badge className="text-[10px] bg-success/10 text-success">Completed</Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[b.category_code as keyof typeof CATEGORY_LABELS] || b.category_code} • {b.service_type || "General"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(b.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
