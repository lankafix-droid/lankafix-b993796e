import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTechnicianJobDetail } from "@/hooks/useTechnicianJobs";
import { acceptJob, declineJob, updateJobStatus, startRepair, completeRepair, recordPayment } from "@/services/dispatchService";
import { notifyTechnicianAssigned, notifyTechnicianEnRoute, notifyJobCompleted } from "@/services/notificationService";
import { BOOKING_STATUS_LABELS, CATEGORY_LABELS, SERVICE_MODE_LABELS } from "@/types/booking";
import QuoteForm from "@/components/quotes/QuoteForm";
import ServiceEvidencePanel from "@/components/proof/ServiceEvidencePanel";
import ReportIssueModal from "@/components/support/ReportIssueModal";
import { track } from "@/lib/analytics";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Wrench, CheckCircle2,
  ShieldCheck, AlertTriangle, Loader2,
  FileText, Navigation, Play, XCircle,
  ThumbsUp, ThumbsDown, Banknote, CircleCheck, Clock,
} from "lucide-react";

const DECLINE_REASONS = [
  "Too far away",
  "Currently busy",
  "Outside my expertise",
  "Schedule conflict",
  "Other",
];

const STATUS_LABELS: Record<string, string> = {
  ...BOOKING_STATUS_LABELS,
  tech_en_route: "On the Way",
  arrived: "Arrived",
  inspection_started: "Inspecting",
  repair_started: "Repair In Progress",
};

export default function TechnicianJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { booking, partner, timeline, quotes, isLoading, refetchAll } = useTechnicianJobDetail(jobId);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [evidenceBlocked, setEvidenceBlocked] = useState(false);

  useEffect(() => { if (jobId) track("technician_job_detail_view", { jobId }); }, [jobId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
  const isMyJob = booking.partner_id === partner?.id;
  const latestQuote = quotes[0];

  // Action availability
  const canAccept = !isMyJob && ["matching", "awaiting_partner_confirmation", "requested"].includes(status);
  const canStartTravel = isMyJob && status === "assigned";
  const canMarkArrived = isMyJob && status === "tech_en_route";
  const canStartWork = isMyJob && status === "arrived";
  const canCreateQuote = isMyJob && ["arrived", "inspection_started", "quote_rejected"].includes(status);
  const canStartRepair = isMyJob && status === "quote_approved";
  const canCompleteRepair = isMyJob && status === "repair_started" && !evidenceBlocked;
  const canRecordPayment = isMyJob && status === "completed" && latestQuote?.status === "approved";

  const handleAccept = async () => {
    if (!jobId || !partner?.id) return;
    setActionLoading("accept");
    const result = await acceptJob(jobId, partner.id);
    setActionLoading(null);
    if (result.success) {
      toast.success("Job accepted!");
      if (booking.customer_id) notifyTechnicianAssigned(booking.customer_id, jobId, partner.full_name || "Your technician").catch(() => {});
      refetchAll();
    } else toast.error(result.error || "Failed to accept");
  };

  const handleDecline = async (reason: string) => {
    if (!jobId || !partner?.id) return;
    setActionLoading("decline");
    const result = await declineJob(jobId, partner.id, reason);
    setActionLoading(null);
    setShowDeclineReasons(false);
    if (result.success) { toast.info("Job declined."); refetchAll(); }
    else toast.error(result.error || "Failed to decline");
  };

  const handleStatusUpdate = async (action: "start_travel" | "arrived" | "start_work") => {
    if (!jobId || !partner?.id) return;
    setActionLoading(action);
    const result = await updateJobStatus(jobId, partner.id, action);
    setActionLoading(null);
    if (result.success) {
      const msgs = { start_travel: "Travel started!", arrived: "Arrival confirmed.", start_work: "Work started!" };
      toast.success(msgs[action]);
      if (action === "start_travel" && booking.customer_id) {
        notifyTechnicianEnRoute(booking.customer_id, jobId, partner.full_name || "Your technician", booking.promised_eta_minutes || 30).catch(() => {});
      }
      refetchAll();
    } else toast.error(result.error || "Failed");
  };

  const handleStartRepair = async () => {
    if (!jobId || !partner?.id) return;
    setActionLoading("start_repair");
    const result = await startRepair(jobId, partner.id);
    setActionLoading(null);
    if (result.success) { toast.success("Repair started!"); refetchAll(); }
    else toast.error(result.error || "Failed");
  };

  const handleCompleteRepair = async () => {
    if (!jobId || !partner?.id) return;
    setActionLoading("complete_repair");
    const result = await completeRepair(jobId, partner.id);
    setActionLoading(null);
    if (result.success) {
      toast.success("Job completed!");
      if (booking.customer_id) notifyJobCompleted(booking.customer_id, jobId).catch(() => {});
      refetchAll();
    } else toast.error(result.error || "Failed");
  };

  const handleRecordPayment = async () => {
    if (!jobId || !latestQuote) return;
    setActionLoading("record_payment");
    const result = await recordPayment(jobId, latestQuote.id, latestQuote.total_lkr || 0, "cash");
    setActionLoading(null);
    if (result.success) { toast.success("Payment recorded!"); refetchAll(); }
    else toast.error(result.error || "Failed");
  };

  const catLabel = CATEGORY_LABELS[booking.category_code as keyof typeof CATEGORY_LABELS] || booking.category_code;
  const modeLabel = SERVICE_MODE_LABELS[booking.service_mode as keyof typeof SERVICE_MODE_LABELS] || (booking.service_mode || "on_site").replace(/_/g, " ");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician/jobs")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Job {booking.id.slice(0, 8).toUpperCase()}</h1>
          <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[status] || status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Accept / Decline */}
        {canAccept && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-bold text-sm text-foreground">New Job Offer</p>
                  <p className="text-xs text-muted-foreground">Accept or decline within 5 minutes</p>
                </div>
              </div>
              {!showDeclineReasons ? (
                <div className="flex gap-3">
                  <Button className="flex-1 h-11 rounded-xl" onClick={handleAccept} disabled={!!actionLoading}>
                    {actionLoading === "accept" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                    Accept Job
                  </Button>
                  <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowDeclineReasons(true)} disabled={!!actionLoading}>
                    <ThumbsDown className="w-4 h-4 mr-2" /> Decline
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Why are you declining?</p>
                  {DECLINE_REASONS.map((reason) => (
                    <Button key={reason} variant="outline" size="sm" className="w-full justify-start text-xs h-9" onClick={() => handleDecline(reason)} disabled={!!actionLoading}>
                      {reason}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowDeclineReasons(false)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Update Actions */}
        {(canStartTravel || canMarkArrived || canStartWork) && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 space-y-3">
              {canStartTravel && (
                <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90" onClick={() => handleStatusUpdate("start_travel")} disabled={!!actionLoading}>
                  {actionLoading === "start_travel" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
                  Start Travel
                </Button>
              )}
              {canMarkArrived && (
                <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90" onClick={() => handleStatusUpdate("arrived")} disabled={!!actionLoading}>
                  {actionLoading === "arrived" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Mark Arrived
                </Button>
              )}
              {canStartWork && (
                <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90" onClick={() => handleStatusUpdate("start_work")} disabled={!!actionLoading}>
                  {actionLoading === "start_work" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Start Work
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Repair / Complete / Payment */}
        {(canStartRepair || canCompleteRepair || canRecordPayment) && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 space-y-3">
              {canStartRepair && (
                <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90" onClick={handleStartRepair} disabled={!!actionLoading}>
                  {actionLoading === "start_repair" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wrench className="w-4 h-4 mr-2" />}
                  Start Repair
                </Button>
              )}
              {canCompleteRepair && (
                <Button className="w-full h-11 rounded-xl bg-success hover:bg-success/90 text-success-foreground" onClick={handleCompleteRepair} disabled={!!actionLoading}>
                  {actionLoading === "complete_repair" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CircleCheck className="w-4 h-4 mr-2" />}
                  Mark Job Complete
                </Button>
              )}
              {canRecordPayment && (
                <Button className="w-full h-11 rounded-xl" variant="outline" onClick={handleRecordPayment} disabled={!!actionLoading}>
                  {actionLoading === "record_payment" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
                  Record Payment (Cash)
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quote Form */}
        {canCreateQuote && !showQuoteForm && (
          <Button className="w-full h-11 rounded-xl" variant="outline" onClick={() => setShowQuoteForm(true)}>
            <FileText className="w-4 h-4 mr-2" /> Create Quote
          </Button>
        )}
        {showQuoteForm && jobId && partner?.id && (
          <QuoteForm bookingId={jobId} partnerId={partner.id} onSubmitted={() => { setShowQuoteForm(false); refetchAll(); }} />
        )}

        {/* Job Summary */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{catLabel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{booking.service_type || "General"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{modeLabel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className={booking.is_emergency ? "text-destructive font-medium" : ""}>{booking.is_emergency ? "Yes" : "No"}</span></div>
            <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" /> {booking.zone_code || "Not specified"}</div>
            {booking.estimated_price_lkr && (
              <div className="flex justify-between"><span className="text-muted-foreground">Estimate</span><span className="font-medium">LKR {booking.estimated_price_lkr.toLocaleString()}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Trust Badge */}
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-success">No work starts without customer approval. Payment only after completion.</p>
        </div>

        {/* Latest Quote Status */}
        {latestQuote && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Latest Quote</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-[10px]">{latestQuote.status}</Badge>
              </div>
              {latestQuote.total_lkr && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">LKR {latestQuote.total_lkr.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeline.map((evt: any) => (
                  <div key={evt.id} className="flex gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{evt.status.replace(/_/g, " ")}</p>
                      {evt.note && <p className="text-muted-foreground">{evt.note}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(evt.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Evidence */}
        {isMyJob && ["assigned", "tech_en_route", "arrived", "inspection_started", "in_progress", "repair_started"].includes(status) && (
          <ServiceEvidencePanel
            bookingId={booking.id}
            categoryCode={booking.category_code}
            bookingStatus={status}
            serviceType={booking.service_type || undefined}
            role="technician"
            onCompletionBlocked={setEvidenceBlocked}
          />
        )}

        {/* Report Issue */}
        <Button variant="outline" className="w-full text-xs" onClick={() => setShowReportIssue(true)}>
          <AlertTriangle className="w-3 h-3 mr-1" /> Report Issue
        </Button>
        {showReportIssue && <ReportIssueModal bookingId={booking.id} role="technician" onClose={() => setShowReportIssue(false)} />}
      </div>
    </div>
  );
}
