import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useBookingStore } from "@/store/bookingStore";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/types/booking";
import { MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import TimelineEventLog from "@/components/tracker/TimelineEventLog";
import { track } from "@/lib/analytics";
import { useState, useEffect } from "react";
import {
  ArrowLeft, MapPin, User, Wrench, CheckCircle2,
  ShieldCheck, Clock, CreditCard, AlertTriangle,
} from "lucide-react";

export default function PartnerJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const booking = useBookingStore((s) => s.getBooking(jobId || ""));
  const confirmPartnerAssignment = useBookingStore((s) => s.confirmPartnerAssignment);
  const reassignTechnician = useBookingStore((s) => s.reassignTechnician);
  const markDispatched = useBookingStore((s) => s.markDispatched);
  const setInternalNote = useBookingStore((s) => s.setInternalNote);
  const [note, setNote] = useState("");

  useEffect(() => { if (jobId) track("partner_job_detail_view", { jobId }); }, [jobId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/partner/jobs")}>Back to Jobs</Button>
        </div>
      </div>
    );
  }

  const availableTechs = MOCK_TECHNICIANS.filter(
    (t) => t.technicianId !== booking.technician?.technicianId && t.availabilityStatus === "available"
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner/jobs")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{booking.jobId}</h1>
          <Badge className={`text-[10px] ${BOOKING_STATUS_COLORS[booking.status]}`}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Booking Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{booking.categoryName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{booking.serviceName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{booking.serviceMode.replace(/_/g, " ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className="font-medium">{booking.isEmergency ? "Yes" : "No"}</span></div>
            <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" /> {booking.zone || "Not specified"}</div>
            {booking.pricing.quoteRequired && (
              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">Quote Required</Badge>
            )}
          </CardContent>
        </Card>

        {/* Technician Assignment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Technician</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.technician ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{booking.technician.name}</p>
                  <p className="text-xs text-muted-foreground">{booking.technician.partnerName}</p>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>⭐ {booking.technician.rating}</span>
                    <span>{booking.technician.jobsCompleted} jobs</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No technician assigned</p>
            )}

            {/* Partner Actions */}
            <div className="space-y-2 pt-2">
              {booking.status === "awaiting_partner_confirmation" && (
                <Button className="w-full" size="sm" onClick={() => confirmPartnerAssignment(booking.jobId)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Assignment
                </Button>
              )}
              {booking.status === "assigned" && (
                <Button className="w-full" variant="outline" size="sm" onClick={() => markDispatched(booking.jobId)}>
                  Dispatch Technician
                </Button>
              )}
              {availableTechs.length > 0 && !["completed", "rated", "cancelled"].includes(booking.status) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Reassign to:</p>
                  {availableTechs.slice(0, 3).map((t) => (
                    <Button key={t.technicianId} variant="ghost" size="sm" className="w-full justify-start text-xs h-8"
                      onClick={() => reassignTechnician(booking.jobId, t)}>
                      {t.name} — ⭐ {t.rating} — {t.availabilityStatus}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Payment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated</span>
              <span>LKR {booking.pricing.estimatedMin.toLocaleString()} – {booking.pricing.estimatedMax.toLocaleString()}</span>
            </div>
            {booking.payments.deposit && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <Badge variant="outline" className="text-[10px]">{booking.payments.deposit.status}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Internal Note */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {booking.partnerInternalNote && (
              <p className="text-xs bg-muted rounded p-2">{booking.partnerInternalNote}</p>
            )}
            <Textarea placeholder="Add internal note..." value={note} onChange={(e) => setNote(e.target.value)} className="text-sm" rows={2} />
            <Button size="sm" variant="outline" disabled={!note.trim()}
              onClick={() => { setInternalNote(booking.jobId, "partner", note); setNote(""); }}>
              Save Note
            </Button>
          </CardContent>
        </Card>

        {/* Trust */}
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-success">No work starts without customer approval. Payment only after completion.</p>
        </div>

        {/* Timeline */}
        <TimelineEventLog events={booking.timelineEvents} />
      </div>
    </div>
  );
}
