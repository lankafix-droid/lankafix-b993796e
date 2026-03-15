import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentPartner, usePartnerBookings } from "@/hooks/useCurrentPartner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, Clock, CheckCircle2, Loader2, UserPlus, Briefcase, Bell, Timer } from "lucide-react";
import { BOOKING_STATUS_LABELS, CATEGORY_LABELS } from "@/types/booking";

// Partner-specific overrides
const STATUS_LABELS: Record<string, string> = {
  ...BOOKING_STATUS_LABELS,
  requested: "Submitted", matching: "Finding Provider",
  awaiting_partner_confirmation: "Awaiting Confirmation",
  tech_en_route: "En Route", repair_started: "Repair In Progress",
};

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

/** Countdown timer for offer expiry */
function OfferCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
      setUrgent(diff < 60);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold ${urgent ? "text-destructive" : "text-warning"}`}>
      <Timer className="w-3 h-3" /> {remaining}
    </span>
  );
}

function OfferCard({ offer, booking: b, onClick }: { offer: any; booking: any; onClick: () => void }) {
  return (
    <div
      className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{b.category_code} — {b.service_type || "General"}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary" />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{b.zone_code || "No zone"}{b.is_emergency ? " · 🔴 Emergency" : ""}</span>
        {b.estimated_price_lkr && <span className="font-medium text-foreground">LKR {b.estimated_price_lkr.toLocaleString()}</span>}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-primary font-medium">Tap to accept or decline</p>
        {offer.expires_at && <OfferCountdown expiresAt={offer.expires_at} />}
      </div>
    </div>
  );
}

export default function PartnerJobsPage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();
  const { data: bookings = [] } = usePartnerBookings(partner?.id);

  const queryClient = useQueryClient();

  // Pending job offers from dispatch_offers (preferred) with expiry filtering
  const { data: pendingOffers = [] } = useQuery({
    queryKey: ["partner-pending-offers", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("dispatch_offers")
        .select("*, bookings(id, category_code, service_type, zone_code, is_emergency, estimated_price_lkr, created_at, status)")
        .eq("partner_id", partner.id)
        .eq("status", "pending")
        .gte("expires_at", now)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Exclude offers for terminal bookings
      return (data || []).filter((o: any) =>
        o.bookings && !["completed", "cancelled", "no_show"].includes(o.bookings.status)
      );
    },
    enabled: !!partner?.id,
    refetchInterval: 5_000, // Poll frequently for time-sensitive offers
  });

  // Realtime subscription for dispatch_offers changes
  useEffect(() => {
    if (!partner?.id) return;
    const channel = supabase
      .channel(`partner-offers-${partner.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "dispatch_offers",
        filter: `partner_id=eq.${partner.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["partner-pending-offers", partner.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partner?.id, queryClient]);

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
        {/* Pending Offers */}
        {pendingOffers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">New Job Offers</h2>
              <Badge className="bg-primary text-primary-foreground text-[10px]">{pendingOffers.length}</Badge>
            </div>
            {pendingOffers.map((offer: any) => {
              const b = offer.bookings;
              if (!b) return null;
              return (
                <OfferCard key={offer.id} offer={offer} booking={b} onClick={() => { track("partner_offer_open", { bookingId: b.id }); navigate(`/partner/job/${b.id}`); }} />
              );
            })}
          </div>
        )}

        {bookings.length === 0 && pendingOffers.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7 text-primary/40" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No Jobs Yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Jobs assigned to you will appear here once you start receiving bookings through LankaFix.</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/partner")}>
              Back to Dashboard
            </Button>
          </div>
        )}
        {bookings.map((b: any) => {
          const statusLabel = STATUS_LABELS[b.status] || (b.status || "").replace(/_/g, " ");
          const colorClass = STATUS_COLORS[b.status] || "bg-muted text-muted-foreground";
          return (
            <div
              key={b.id}
              className="bg-card border border-border/60 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-primary/30 transition-all shadow-sm"
              onClick={() => { track("partner_job_open", { jobId: b.id }); navigate(`/partner/job/${b.id}`); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{b.id.slice(0, 8).toUpperCase()}</p>
                  <Badge className={`text-[10px] ${colorClass}`}>{statusLabel}</Badge>
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
