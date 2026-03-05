import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useBookingStore } from "@/store/bookingStore";
import {
  BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, SERVICE_MODE_LABELS,
  TECH_REJECTION_LABELS,
} from "@/types/booking";
import type { TechRejectionReason, JobOutcome } from "@/types/booking";
import { JOB_OUTCOME_LABELS } from "@/types/booking";
import TimelineEventLog from "@/components/tracker/TimelineEventLog";
import QuoteBuilder from "@/components/technician/QuoteBuilder";
import { track } from "@/lib/analytics";
import { useState, useEffect } from "react";
import {
  ArrowLeft, MapPin, Camera, Wrench, CheckCircle2,
  XCircle, Navigation, Eye, ClipboardList, ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export default function TechnicianJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const booking = useBookingStore((s) => s.getBooking(jobId || ""));
  const acceptJob = useBookingStore((s) => s.acceptJob);
  const rejectJob = useBookingStore((s) => s.rejectJob);
  const markDispatched = useBookingStore((s) => s.markDispatched);
  const markArrived = useBookingStore((s) => s.markArrived);
  const startInspection = useBookingStore((s) => s.startInspection);
  const startRepair = useBookingStore((s) => s.startRepair);
  const markCompleted = useBookingStore((s) => s.markCompleted);
  const attachTechnicianPhoto = useBookingStore((s) => s.attachTechnicianPhoto);
  const setInternalNote = useBookingStore((s) => s.setInternalNote);
  const updateBookingStatus = useBookingStore((s) => s.updateBookingStatus);
  const addChatMessage = useBookingStore((s) => s.addChatMessage);
  const setJobOutcome = useBookingStore((s) => s.setJobOutcome);
  const startTravel = useBookingStore((s) => s.startTravel);

  const [showRejectReasons, setShowRejectReasons] = useState(false);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [techNote, setTechNote] = useState("");
  const [chatMsg, setChatMsg] = useState("");

  useEffect(() => { if (jobId) track("technician_job_detail_view", { jobId }); }, [jobId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/technician/jobs")}>Back to Jobs</Button>
        </div>
      </div>
    );
  }

  const status = booking.status;

  const handlePhotoUpload = (type: "before" | "after") => {
    const mockUrl = `https://placeholder.co/400x300?text=${type}_photo_${Date.now()}`;
    attachTechnicianPhoto(booking.jobId, type, mockUrl);
    track(type === "before" ? "technician_before_photo" : "technician_after_photo", { jobId: booking.jobId });
  };

  const handleReject = (reason: TechRejectionReason) => {
    rejectJob(booking.jobId, reason);
    setShowRejectReasons(false);
    track("technician_job_reject", { jobId: booking.jobId, reason });
  };

  const canAccept = ["matching", "awaiting_partner_confirmation", "assigned"].includes(status);
  const canDispatch = status === "assigned";
  const canArrive = status === "tech_en_route";
  const canInspect = status === "arrived";
  const canSubmitQuote = ["inspection_started", "in_progress"].includes(status) && booking.pricing.quoteRequired;
  const canStartRepair = ["quote_approved", "inspection_started", "in_progress"].includes(status);
  const canComplete = ["repair_started", "in_progress"].includes(status);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician/jobs")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{booking.jobId}</h1>
          <Badge className={`text-[10px] ${BOOKING_STATUS_COLORS[status]}`}>
            {BOOKING_STATUS_LABELS[status]}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Job Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Job Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{booking.categoryName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{booking.serviceName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{SERVICE_MODE_LABELS[booking.serviceMode]}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className={booking.isEmergency ? "text-destructive font-medium" : ""}>{booking.isEmergency ? "Yes" : "No"}</span></div>
            <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" /> {booking.zone || "Not specified"}</div>
          </CardContent>
        </Card>

        {/* Precheck Answers */}
        {Object.keys(booking.precheckAnswers).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Customer Precheck</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(booking.precheckAnswers).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                  <span className="font-medium">{String(val)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Customer Photos */}
        {booking.photos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Customer Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {booking.photos.map((p, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center text-[10px] text-muted-foreground">
                    {p.type}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trust Note */}
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-success">No work starts without customer approval. Payment only after completion.</p>
        </div>

        {/* Quote Builder */}
        {showQuoteBuilder && (
          <QuoteBuilder
            jobId={booking.jobId}
            categoryCode={booking.categoryCode}
            onClose={() => setShowQuoteBuilder(false)}
          />
        )}

        {/* Pre-Job Chat */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">💬 Customer Chat</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(booking.chatMessages || []).map((m) => (
              <div key={m.id} className={`text-xs p-2 rounded-lg ${m.sender === "technician" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
                <span className="font-medium">{m.sender === "technician" ? "You" : "Customer"}: </span>{m.message}
              </div>
            ))}
            <div className="flex gap-2">
              <Textarea placeholder="Message customer..." value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} rows={1} className="text-sm flex-1" />
              <Button size="sm" variant="outline" disabled={!chatMsg.trim()} onClick={() => {
                addChatMessage(booking.jobId, { id: Date.now().toString(), sender: "technician", message: chatMsg, timestamp: new Date().toISOString() });
                setChatMsg("");
              }}>Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* Internal Note */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">My Notes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {booking.technicianInternalNote && (
              <p className="text-xs bg-muted rounded p-2">{booking.technicianInternalNote}</p>
            )}
            <Textarea placeholder="Add note..." value={techNote} onChange={(e) => setTechNote(e.target.value)} rows={2} className="text-sm" />
            <Button size="sm" variant="outline" disabled={!techNote.trim()}
              onClick={() => { setInternalNote(booking.jobId, "technician", techNote); setTechNote(""); }}>
              Save
            </Button>
          </CardContent>
        </Card>

        {/* Job Outcome (post-completion) */}
        {["completed", "rated"].includes(status) && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Job Outcome</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {booking.jobOutcome ? (
                <Badge variant="outline">{JOB_OUTCOME_LABELS[booking.jobOutcome]}</Badge>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {(Object.entries(JOB_OUTCOME_LABELS) as [JobOutcome, string][]).map(([key, label]) => (
                    <Button key={key} variant="ghost" size="sm" className="text-xs h-7" onClick={() => setJobOutcome(booking.jobId, key)}>
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <TimelineEventLog events={booking.timelineEvents} />

        {/* Reject Reasons */}
        {showRejectReasons && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Reject Reason</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(Object.entries(TECH_REJECTION_LABELS) as [TechRejectionReason, string][]).map(([key, label]) => (
                <Button key={key} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleReject(key)}>
                  {label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowRejectReasons(false)}>Cancel</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 space-y-2 z-50">
        <div className="flex gap-2">
          {canAccept && !showRejectReasons && (
            <>
              <Button className="flex-1" size="sm" onClick={() => { acceptJob(booking.jobId, booking.technician?.technicianId || "T001"); track("technician_job_accept", { jobId: booking.jobId }); }}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowRejectReasons(true)}>
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
            </>
          )}
          {canDispatch && (
            <Button className="flex-1" size="sm" onClick={() => { markDispatched(booking.jobId); track("technician_dispatch", { jobId: booking.jobId }); }}>
              <Navigation className="w-4 h-4 mr-1" /> Mark Dispatched
            </Button>
          )}
          {canArrive && (
            <Button className="flex-1" size="sm" onClick={() => { markArrived(booking.jobId); updateBookingStatus(booking.jobId, "arrived"); track("technician_arrival", { jobId: booking.jobId }); }}>
              <MapPin className="w-4 h-4 mr-1" /> Mark Arrived
            </Button>
          )}
          {canInspect && (
            <Button className="flex-1" size="sm" onClick={() => { startInspection(booking.jobId); track("technician_inspection_start", { jobId: booking.jobId }); }}>
              <Eye className="w-4 h-4 mr-1" /> Start Inspection
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {["arrived", "inspection_started", "repair_started"].includes(status) && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePhotoUpload("before")}>
              <Camera className="w-4 h-4 mr-1" /> Before Photo
            </Button>
          )}
          {canSubmitQuote && !showQuoteBuilder && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowQuoteBuilder(true); track("technician_quote_start", { jobId: booking.jobId }); }}>
              <ClipboardList className="w-4 h-4 mr-1" /> Submit Quote
            </Button>
          )}
          {canStartRepair && (
            <Button size="sm" className="flex-1" onClick={() => { startRepair(booking.jobId); track("technician_repair_start", { jobId: booking.jobId }); }}>
              <Wrench className="w-4 h-4 mr-1" /> Start Repair
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {["repair_started", "in_progress"].includes(status) && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePhotoUpload("after")}>
              <Camera className="w-4 h-4 mr-1" /> After Photo
            </Button>
          )}
          {canComplete && (
            <Button size="sm" variant="default" className="flex-1 bg-success hover:bg-success/90" onClick={() => { markCompleted(booking.jobId); track("technician_complete_job", { jobId: booking.jobId }); }}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
