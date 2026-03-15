import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentPartner } from "@/hooks/useCurrentPartner";
import { acceptJob, declineJob, updateJobStatus, startRepair, completeRepair, recordPayment } from "@/services/dispatchService";
import { track } from "@/lib/analytics";
import { notifyTechnicianAssigned, notifyTechnicianEnRoute, notifyJobCompleted } from "@/services/notificationService";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Wrench, CheckCircle2,
  ShieldCheck, Clock, AlertTriangle, Loader2,
  FileText, XCircle, Info, Navigation, Play,
  ThumbsDown, ThumbsUp, Banknote, CircleCheck, Sparkles, Zap,
} from "lucide-react";
import QuoteForm from "@/components/quotes/QuoteForm";
import { usePartnerLocationPush } from "@/hooks/usePartnerLocationPush";
import ReportIssueModal from "@/components/support/ReportIssueModal";
import PartnerRatingBadge from "@/components/ratings/PartnerRatingBadge";
import { CATEGORY_LABELS, BOOKING_STATUS_LABELS, SERVICE_MODE_LABELS } from "@/types/booking";

const DECLINE_REASONS = [
  "Too far away",
  "Currently busy",
  "Outside my expertise",
  "Schedule conflict",
  "Other",
];

// Partner-specific status labels (slightly different wording for partner context)
const STATUS_LABELS: Record<string, string> = {
  ...BOOKING_STATUS_LABELS,
  requested: "Submitted", matching: "Finding Provider",
  awaiting_partner_confirmation: "Awaiting Confirmation",
  tech_en_route: "On the Way", arrived: "Provider Arrived",
  inspection_started: "Inspecting", quote_submitted: "Quote Ready",
  repair_started: "Repair In Progress",
};

const MODE_LABELS = SERVICE_MODE_LABELS as Record<string, string>;

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", submitted: "Awaiting Approval",
  approved: "Approved", rejected: "Rejected", expired: "Expired",
};

export default function PartnerJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: partner } = useCurrentPartner();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["partner-booking-detail", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    refetchInterval: 10_000,
  });

  const { data: dispatchOffer } = useQuery({
    queryKey: ["partner-dispatch-offer", jobId, partner?.id],
    queryFn: async () => {
      if (!jobId || !partner?.id) return null;
      // Check dispatch_offers first (preferred), fall back to dispatch_log
      const { data: offerData } = await supabase
        .from("dispatch_offers")
        .select("*")
        .eq("booking_id", jobId)
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (offerData) return { ...offerData, source: "dispatch_offers" };

      const { data, error } = await supabase
        .from("dispatch_log")
        .select("*")
        .eq("booking_id", jobId)
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, source: "dispatch_log" } : null;
    },
    enabled: !!jobId && !!partner?.id,
    refetchInterval: 5_000,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["partner-job-quotes", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("booking_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["partner-job-timeline", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("job_timeline")
        .select("*")
        .eq("booking_id", jobId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // Auto-push GPS location when partner is en-route or working on-site
  const isEnRouteOrOnSite = booking?.status === "tech_en_route" || booking?.status === "arrived" || booking?.status === "inspection_started" || booking?.status === "repair_started";
  usePartnerLocationPush(partner?.id, jobId, isEnRouteOrOnSite);

  useEffect(() => { if (jobId) track("partner_job_detail_view", { jobId }); }, [jobId]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["partner-booking-detail", jobId] });
    queryClient.invalidateQueries({ queryKey: ["partner-dispatch-offer", jobId] });
    queryClient.invalidateQueries({ queryKey: ["partner-job-timeline", jobId] });
    queryClient.invalidateQueries({ queryKey: ["partner-job-quotes", jobId] });
    queryClient.invalidateQueries({ queryKey: ["partner-bookings"] });
  };

  const handleAccept = async () => {
    if (!jobId || !partner?.id) return;
    setActionLoading("accept");
    track("partner_job_accept", { jobId });
    const result = await acceptJob(jobId, partner.id);
    setActionLoading(null);
    if (result.success) {
      toast.success("Job accepted! Prepare to head out.");
      // Notify customer that technician was assigned
      if (booking?.customer_id) {
        notifyTechnicianAssigned(booking.customer_id, jobId, partner.full_name || "Your technician").catch(() => {});
      }
      refreshAll();
    } else {
      toast.error(result.error || "Failed to accept job");
    }
  };

  const handleDecline = async (reason: string) => {
    if (!jobId || !partner?.id) return;
    setActionLoading("decline");
    track("partner_job_decline", { jobId, reason });
    const result = await declineJob(jobId, partner.id, reason);
    setActionLoading(null);
    setShowDeclineReasons(false);
    if (result.success) {
      toast.info("Job declined. It will be offered to another provider.");
      refreshAll();
    } else {
      toast.error(result.error || "Failed to decline job");
    }
  };

  const handleStatusUpdate = async (action: "start_travel" | "arrived" | "start_work") => {
    if (!jobId || !partner?.id) return;
    setActionLoading(action);
    track(`partner_job_${action}`, { jobId });
    const result = await updateJobStatus(jobId, partner.id, action);
    setActionLoading(null);
    if (result.success) {
      const messages = {
        start_travel: "Travel started! Drive safely.",
        arrived: "Arrival confirmed. You can begin inspection.",
        start_work: "Work started. Good luck!",
      };
      toast.success(messages[action]);
      // Notify customer when technician is en route
      if (action === "start_travel" && booking?.customer_id) {
        notifyTechnicianEnRoute(booking.customer_id, jobId, partner.full_name || "Your technician", booking.promised_eta_minutes || 30).catch(() => {});
      }
      refreshAll();
    } else {
      toast.error(result.error || "Failed to update status");
    }
  };

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
          <Button variant="outline" className="mt-4" onClick={() => navigate("/partner/jobs")}>Back to Jobs</Button>
        </div>
      </div>
    );
  }

  // Determine what actions are available
  const isMyJob = booking.partner_id === partner?.id;
  const isPendingOffer = dispatchOffer?.status === "pending_acceptance" && !isMyJob;
  const canAccept = isPendingOffer || (booking.selected_partner_id === partner?.id && booking.dispatch_status === "pending_acceptance");
  const canStartTravel = isMyJob && booking.status === "assigned";
  const canMarkArrived = isMyJob && booking.status === "tech_en_route";
  const canStartWork = isMyJob && booking.status === "arrived";
  const canCreateQuote = isMyJob && (booking.status === "arrived" || booking.status === "inspection_started" || booking.status === "quote_rejected");
  const latestQuote = quotes[0];
  const canStartRepair = isMyJob && booking.status === "quote_approved";
  const canCompleteRepair = isMyJob && booking.status === "repair_started";
  const canRecordPayment = isMyJob && booking.status === "completed" && latestQuote?.status === "approved";

  const handleStartRepair = async () => {
    if (!jobId || !partner?.id) return;
    setActionLoading("start_repair");
    track("repair_started", { jobId });
    const result = await startRepair(jobId, partner.id);
    setActionLoading(null);
    if (result.success) { toast.success("Repair started!"); refreshAll(); }
    else toast.error(result.error || "Failed");
  };

  const handleCompleteRepair = async () => {
    if (!jobId || !partner?.id) return;
    setActionLoading("complete_repair");
    track("repair_completed", { jobId });
    const result = await completeRepair(jobId, partner.id);
    setActionLoading(null);
    if (result.success) {
      toast.success("Job completed!");
      // Notify customer that job is done
      if (booking?.customer_id) {
        notifyJobCompleted(booking.customer_id, jobId).catch(() => {});
      }
      refreshAll();
    }
    else toast.error(result.error || "Failed");
  };

  const handleRecordPayment = async () => {
    if (!jobId || !latestQuote) return;
    setActionLoading("record_payment");
    const result = await recordPayment(jobId, latestQuote.id, latestQuote.total_lkr || 0, "cash");
    setActionLoading(null);
    if (result.success) { toast.success("Payment recorded!"); track("payment_recorded", { jobId }); refreshAll(); }
    else toast.error(result.error || "Failed");
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner/jobs")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Job {booking.id.slice(0, 8).toUpperCase()}</h1>
          <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[booking.status] || booking.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Accept / Decline Actions */}
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
                  <Button
                    className="flex-1 h-11 rounded-xl"
                    onClick={handleAccept}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "accept" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ThumbsUp className="w-4 h-4 mr-2" />
                    )}
                    Accept Job
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={() => setShowDeclineReasons(true)}
                    disabled={!!actionLoading}
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Why are you declining?</p>
                  {DECLINE_REASONS.map((reason) => (
                    <Button
                      key={reason}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-9"
                      onClick={() => handleDecline(reason)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === "decline" ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                      ) : null}
                      {reason}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowDeclineReasons(false)}
                  >
                    Cancel
                  </Button>
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
                <Button
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
                  onClick={() => handleStatusUpdate("start_travel")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "start_travel" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-2" />
                  )}
                  Start Travel
                </Button>
              )}
              {canMarkArrived && (
                <Button
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
                  onClick={() => handleStatusUpdate("arrived")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "arrived" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  Mark Arrived
                </Button>
              )}
              {canStartWork && (
                <Button
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
                  onClick={() => handleStatusUpdate("start_work")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "start_work" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Start Work
                </Button>
         )}
           </CardContent>
          </Card>
        )}

        {/* Repair / Complete / Payment Actions */}
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
          <QuoteForm bookingId={jobId} partnerId={partner.id} onSubmitted={() => { setShowQuoteForm(false); refreshAll(); }} />
        )}

        {/* Booking Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {/* Instant Pricing Badge */}
            {(booking.device_details as any)?.instant_pricing && (
              <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-xl px-3 py-2 mb-1">
                <Sparkles className="w-4 h-4 text-success shrink-0" />
                <div>
                  <span className="text-xs font-bold text-foreground">Instant Price Booking</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    Est. LKR {((booking.device_details as any).instant_pricing.min_price_lkr || 0).toLocaleString()}
                    –{((booking.device_details as any).instant_pricing.max_price_lkr || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {/* Priority Service Badge */}
            {(booking.device_details as any)?.priority_service?.is_priority && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 mb-1">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-xs font-bold text-foreground">⚡ Priority Service</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    Fee: LKR {((booking.device_details as any).priority_service.priority_fee_lkr || 0).toLocaleString()}
                    · {(booking.device_details as any).priority_service.priority_eta_text}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium text-foreground">{CATEGORY_LABELS[booking.category_code] || booking.category_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium text-foreground">{booking.service_type || "General"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium text-foreground">{MODE_LABELS[booking.service_mode || "on_site"] || "On-Site"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className="font-medium text-foreground">{booking.is_emergency ? "Yes" : "No"}</span></div>
            <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" /> {booking.zone_code || "Not specified"}</div>
            {booking.estimated_price_lkr && (
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated</span><span className="font-medium text-foreground">LKR {booking.estimated_price_lkr.toLocaleString()}</span></div>
            )}
            {booking.notes && (
              <div className="border-t border-border/20 pt-2">
                <p className="text-xs text-muted-foreground">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation */}
        {booking.status === "cancelled" && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">Job Cancelled</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {booking.cancellation_reason || "No cancellation reason provided"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quotes */}
        {quotes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Quotes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotes.map((q: any) => (
                <div key={q.id} className="p-3 border rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">
                      {q.total_lkr ? `LKR ${q.total_lkr.toLocaleString()}` : "—"}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${
                      q.status === "approved" ? "text-success bg-success/10 border-success/20" :
                      q.status === "rejected" ? "text-destructive bg-destructive/10 border-destructive/20" :
                      q.status === "submitted" ? "text-warning bg-warning/10 border-warning/20" :
                      "text-muted-foreground"
                    }`}>
                      {QUOTE_STATUS_LABELS[q.status] || q.status}
                    </Badge>
                  </div>
                  {q.customer_note && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="w-3 h-3 inline mr-1" />
                      Customer note: {q.customer_note}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeline.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{STATUS_LABELS[e.status] || e.status.replace(/_/g, " ")}</p>
                      {e.note && <p className="text-muted-foreground">{e.note}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Issue */}
        {isMyJob && (
          <Button variant="outline" className="w-full rounded-xl h-10 text-sm" onClick={() => setShowReportIssue(true)}>
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Report an Issue
          </Button>
        )}

        {/* Partner Rating */}
        {partner && (
          <div className="flex items-center justify-between bg-card border border-border/60 rounded-lg p-3">
            <span className="text-xs text-muted-foreground">Your Rating</span>
            <PartnerRatingBadge ratingAverage={partner.rating_average} completedJobsCount={partner.completed_jobs_count} size="md" />
          </div>
        )}

        {/* Trust */}
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-success">No work starts without customer approval. Payment only after completion.</p>
        </div>
      </div>

      {/* Report Issue Modal */}
      {partner && (
        <ReportIssueModal
          open={showReportIssue}
          onClose={() => setShowReportIssue(false)}
          bookingId={jobId || ""}
          userId={partner.user_id || ""}
          role="partner"
        />
      )}
    </div>
  );
}
