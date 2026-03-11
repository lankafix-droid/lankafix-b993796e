import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import {
  ArrowLeft, MapPin, User, Wrench, CheckCircle2,
  ShieldCheck, Clock, CreditCard, AlertTriangle, Loader2,
  FileText, XCircle, Info,
} from "lucide-react";

export default function PartnerJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

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

  useEffect(() => { if (jobId) track("partner_job_detail_view", { jobId }); }, [jobId]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner/jobs")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{booking.id.slice(0, 8)}...</h1>
          <Badge variant="outline" className="text-[10px]">{booking.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Booking Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium text-foreground">{booking.category_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium text-foreground">{booking.service_type || "General"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium text-foreground">{(booking.service_mode || "on_site").replace(/_/g, " ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className="font-medium text-foreground">{booking.is_emergency ? "Yes" : "No"}</span></div>
            <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" /> {booking.zone_code || "Not specified"}</div>
            {booking.estimated_price_lkr && (
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated</span><span className="font-medium text-foreground">LKR {booking.estimated_price_lkr.toLocaleString()}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation / Outcome Visibility */}
        {booking.status === "cancelled" && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">Job Cancelled</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {booking.cancellation_reason || "No cancellation reason provided"}
                </p>
                {booking.cancelled_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Cancelled at: {new Date(booking.cancelled_at).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Info */}
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
                      q.status === "approved" ? "text-success" :
                      q.status === "rejected" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {q.status}
                    </Badge>
                  </div>
                  {q.customer_note && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="w-3 h-3 inline mr-1" />
                      Customer note: {q.customer_note}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Created: {new Date(q.created_at).toLocaleDateString()}
                  </p>
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
                      <p className="font-medium text-foreground">{e.status.replace(/_/g, " ")}</p>
                      {e.note && <p className="text-muted-foreground">{e.note}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trust */}
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-success">No work starts without customer approval. Payment only after completion.</p>
        </div>
      </div>
    </div>
  );
}
