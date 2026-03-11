import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentPartner, usePartnerBookings } from "@/hooks/useCurrentPartner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, Clock, CheckCircle2, Loader2, UserPlus, Briefcase, Bell } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-muted text-muted-foreground",
  awaiting_partner_confirmation: "bg-warning/10 text-warning",
  assigned: "bg-primary/10 text-primary",
  en_route: "bg-primary/10 text-primary",
  inspection_started: "bg-primary/10 text-primary",
  repair_started: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function PartnerJobsPage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();
  const { data: bookings = [] } = usePartnerBookings(partner?.id);

  useEffect(() => { track("partner_jobs_view"); }, []);

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
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold text-foreground">No Partner Profile</h2>
            <Button onClick={() => navigate("/join")}>Join as Provider</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeBookings = bookings.filter((b: any) => !["completed", "cancelled", "no_show"].includes(b.status));
  const completedBookings = bookings.filter((b: any) => b.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Job Inbox</h1>
          <p className="text-xs text-muted-foreground">{activeBookings.length} active • {completedBookings.length} completed</p>
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {bookings.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No jobs yet</p>
            <p className="text-xs text-muted-foreground">Jobs assigned to you will appear here once you start receiving bookings through LankaFix.</p>
          </div>
        )}
        {bookings.map((b: any) => {
          const statusLabel = (b.status || "").replace(/_/g, " ");
          const colorClass = STATUS_COLORS[b.status] || "bg-muted text-muted-foreground";
          return (
            <div
              key={b.id}
              className="bg-card border rounded-xl p-4 space-y-2 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => { track("partner_job_open", { jobId: b.id }); navigate(`/partner/job/${b.id}`); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{b.id.slice(0, 8)}...</p>
                  <Badge className={`text-[10px] capitalize ${colorClass}`}>{statusLabel}</Badge>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{b.category_code} • {b.service_type || "General"}</p>
                <p>{b.zone_code || "No zone"} • {b.is_emergency ? "🔴 Emergency" : (b.service_mode || "on_site").replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(b.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short" })}
                </span>
                {b.estimated_price_lkr && (
                  <span className="text-xs font-medium text-foreground">LKR {b.estimated_price_lkr.toLocaleString()}</span>
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
