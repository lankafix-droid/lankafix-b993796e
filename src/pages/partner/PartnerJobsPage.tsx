import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBookingStore } from "@/store/bookingStore";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/types/booking";
import type { SlaHealth } from "@/types/booking";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

const SLA_CONFIG: Record<SlaHealth, { label: string; icon: typeof Clock; color: string }> = {
  on_time: { label: "On Time", icon: CheckCircle2, color: "text-success" },
  at_risk: { label: "At Risk", icon: AlertTriangle, color: "text-warning" },
  delayed: { label: "Delayed", icon: AlertTriangle, color: "text-destructive" },
};

function computeSlaHealth(createdAt: string, status: string): SlaHealth {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (["completed", "rated", "cancelled"].includes(status)) return "on_time";
  if (elapsed > 120) return "delayed";
  if (elapsed > 60) return "at_risk";
  return "on_time";
}

export default function PartnerJobsPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => { track("partner_jobs_view"); }, []);

  const activeBookings = bookings.filter((b) => !["completed", "rated", "cancelled"].includes(b.status));
  const awaitingFirst = [...activeBookings].sort((a, b) => {
    if (a.status === "awaiting_partner_confirmation" && b.status !== "awaiting_partner_confirmation") return -1;
    if (b.status === "awaiting_partner_confirmation" && a.status !== "awaiting_partner_confirmation") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Job Inbox</h1>
          <p className="text-xs text-muted-foreground">{activeBookings.length} active jobs</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {awaitingFirst.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No active jobs</p>
          </div>
        )}
        {awaitingFirst.map((b) => {
          const sla = b.slaHealth || computeSlaHealth(b.createdAt, b.status);
          const slaCfg = SLA_CONFIG[sla];
          return (
            <div
              key={b.jobId}
              className="bg-card border rounded-xl p-4 space-y-2 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => { track("partner_job_open", { jobId: b.jobId }); navigate(`/partner/job/${b.jobId}`); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{b.jobId}</p>
                  <Badge className={`text-[10px] ${BOOKING_STATUS_COLORS[b.status]}`}>
                    {BOOKING_STATUS_LABELS[b.status]}
                  </Badge>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{b.categoryName} • {b.serviceName}</p>
                <p>{b.zone || "No area specified"} • {b.isEmergency ? "🔴 Emergency" : b.serviceMode.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <slaCfg.icon className={`w-3 h-3 ${slaCfg.color}`} />
                  <span className={`text-[10px] font-medium ${slaCfg.color}`}>{slaCfg.label}</span>
                </div>
                {b.technician && (
                  <span className="text-[10px] text-muted-foreground">Tech: {b.technician.name}</span>
                )}
              </div>
              {b.status === "awaiting_partner_confirmation" && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                  <p className="text-[11px] text-warning">Requires your confirmation</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
