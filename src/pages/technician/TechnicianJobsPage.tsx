import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookingStore } from "@/store/bookingStore";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, SERVICE_MODE_LABELS } from "@/types/booking";
import type { BookingStatus, SlaHealth } from "@/types/booking";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, MapPin, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const TAB_STATUSES: Record<string, BookingStatus[]> = {
  new: ["matching", "awaiting_partner_confirmation", "assigned"],
  accepted: ["assigned", "tech_en_route"],
  onway: ["tech_en_route"],
  inspection: ["arrived", "inspection_started"],
  repair: ["quote_approved", "repair_started", "in_progress"],
  completed: ["completed", "rated"],
};

const SLA_ICON: Record<SlaHealth, { icon: typeof Clock; color: string }> = {
  on_time: { icon: CheckCircle2, color: "text-success" },
  at_risk: { icon: AlertTriangle, color: "text-warning" },
  delayed: { icon: AlertTriangle, color: "text-destructive" },
};

function getSlaHealth(createdAt: string, status: string): SlaHealth {
  if (["completed", "rated", "cancelled"].includes(status)) return "on_time";
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (mins > 120) return "delayed";
  if (mins > 60) return "at_risk";
  return "on_time";
}

export default function TechnicianJobsPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => { track("technician_jobs_view"); }, []);

  const filteredBookings = (tab: string) =>
    bookings.filter((b) => TAB_STATUSES[tab]?.includes(b.status));

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">My Jobs</h1>
      </div>

      <Tabs defaultValue="new" className="p-4">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="new" className="text-xs">New</TabsTrigger>
          <TabsTrigger value="inspection" className="text-xs">Active</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
        </TabsList>

        {["new", "inspection", "completed"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {(tab === "new" ? filteredBookings("new") :
              tab === "inspection" ? bookings.filter((b) => ["tech_en_route", "arrived", "inspection_started", "quote_approved", "repair_started", "in_progress"].includes(b.status)) :
              filteredBookings("completed")
            ).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No jobs</p>
            )}
            {(tab === "new" ? filteredBookings("new") :
              tab === "inspection" ? bookings.filter((b) => ["tech_en_route", "arrived", "inspection_started", "quote_approved", "repair_started", "in_progress"].includes(b.status)) :
              filteredBookings("completed")
            ).map((b) => {
              const sla = getSlaHealth(b.createdAt, b.status);
              const slaStyle = SLA_ICON[sla];
              return (
                <div
                  key={b.jobId}
                  className="bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/technician/job/${b.jobId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{b.jobId}</span>
                      <Badge className={`text-[10px] ${BOOKING_STATUS_COLORS[b.status]}`}>
                        {BOOKING_STATUS_LABELS[b.status]}
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{b.categoryName} • {b.serviceName}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {b.zone || "N/A"}</span>
                    <span>{SERVICE_MODE_LABELS[b.serviceMode]}</span>
                    {b.isEmergency && <span className="text-destructive font-medium">Emergency</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <slaStyle.icon className={`w-3 h-3 ${slaStyle.color}`} />
                    <span className={`text-[10px] ${slaStyle.color}`}>{sla === "on_time" ? "On Time" : sla === "at_risk" ? "At Risk" : "Delayed"}</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
