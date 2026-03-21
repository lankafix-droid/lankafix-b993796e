/**
 * Full Booking Detail Page — /booking/:bookingId
 * Premium view with service summary, lifecycle tracker, pricing, technician, notes, and actions.
 * Uses deriveBookingDisplayState for DB-aligned state derivation.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Calendar, MapPin, CreditCard, Wrench, Shield,
  MessageCircle, ChevronRight, Star, AlertTriangle, Clock, FileText,
} from "lucide-react";
import { LIFECYCLE_STAGES, mapBookingStatusToStage, getProgressStages } from "@/lib/bookingLifecycleModel";
import { deriveBookingDisplayState } from "@/lib/stateAlignment";
import { CONSUMER_CATEGORIES } from "@/data/consumerBookingCategories";
import { SUPPORT_WHATSAPP } from "@/config/contact";
import { trackLifecycleStageView } from "@/lib/marketplaceAnalytics";
import { useEffect, useState } from "react";
import RatingModal from "@/components/ratings/RatingModal";
import { useAuth } from "@/hooks/useAuth";

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["booking-detail", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
    retry: 1,
  });

  const { data: partner } = useQuery({
    queryKey: ["booking-partner", booking?.partner_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, business_name, rating_average")
        .eq("id", booking!.partner_id!)
        .single();
      return data;
    },
    enabled: !!booking?.partner_id,
  });

  const { data: timeline } = useQuery({
    queryKey: ["booking-detail-timeline", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_timeline" as any)
        .select("*")
        .eq("booking_id", bookingId!)
        .order("created_at", { ascending: true })
        .limit(50);
      return (data as any[]) ?? [];
    },
    enabled: !!bookingId,
  });

  const [showRating, setShowRating] = useState(false);

  // Track lifecycle view
  useEffect(() => {
    if (booking) {
      const stage = mapBookingStatusToStage(booking.status, booking.dispatch_status);
      trackLifecycleStageView(stage, booking.id);
    }
  }, [booking?.status]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !booking) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted/60 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {error ? "Unable to load booking" : "Booking not found"}
            </p>
            <p className="text-xs text-muted-foreground">
              {error ? "Please check your connection and try again." : "This booking may have been removed or the link is incorrect."}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/service-history")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Bookings
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Use centralized state derivation
  const display = deriveBookingDisplayState(booking);
  const { stage, stageInfo } = display;
  const category = CONSUMER_CATEGORIES.find((c) => c.code === booking.category_code);
  const progress = getProgressStages(stage);
  const isActive = !["completed", "cancelled"].includes(stage);
  const isCompleted = stage === "completed";

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 space-y-5">
          {/* Back */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {/* Status hero */}
          <div className={`rounded-2xl p-5 ${stageInfo.badgeBg}`}>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className={`text-xs font-bold ${stageInfo.badgeBg} border-0`}>
                {stageInfo.label}
              </Badge>
              {isActive && (
                <span className="text-[10px] font-medium opacity-70">Next: {stageInfo.actorLabel}</span>
              )}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{stageInfo.description}</p>
          </div>

          {/* Service summary */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">{category?.icon ?? "🔧"}</span>
              <div className="flex-1">
                <h1 className="text-base font-bold text-foreground">{category?.label ?? booking.category_code}</h1>
                {booking.service_type && (
                  <p className="text-xs text-muted-foreground mt-0.5">{booking.service_type}</p>
                )}
                {booking.is_emergency && (
                  <Badge variant="destructive" className="text-[9px] mt-1">
                    <AlertTriangle className="w-3 h-3 mr-0.5" /> Emergency
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(booking.scheduled_at ?? booking.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {booking.zone_code && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{booking.zone_code}</span>
                </div>
              )}
              {display.displayPrice != null && display.displayPrice > 0 && (
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    LKR {display.displayPrice.toLocaleString()}
                    {display.priceIsEstimate && <span className="text-[10px] font-normal text-muted-foreground ml-1">(estimate)</span>}
                  </span>
                </div>
              )}
              {booking.payment_status && (
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${display.isPaid ? "text-success" : "text-warning"}`}>
                    {booking.payment_status.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>

            {booking.notes && (
              <div className="mt-3 p-3 bg-muted/40 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Progress timeline */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Progress
            </h2>
            <div className="space-y-3">
              {[...progress.completed, progress.current, ...progress.pending].map((s) => {
                const info = LIFECYCLE_STAGES[s];
                const isCurrent = s === progress.current;
                const isDone = progress.completed.includes(s);
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                      isDone ? "bg-success/10 text-success" :
                      isCurrent ? "bg-primary/10 text-primary ring-2 ring-primary/30" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? "✓" : info.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isCurrent ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                        {info.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{info.trustNote}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technician */}
          {display.hasTechnician && partner && (
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> Assigned Technician
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{partner.business_name}</p>
                  {partner.rating_average && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-xs text-muted-foreground">{partner.rating_average}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10">
                  <Shield className="w-3 h-3 text-success" />
                  <span className="text-[10px] text-success font-medium">Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline events */}
          {timeline && timeline.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Activity Log
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {timeline.map((e: any, i: number) => (
                  <div key={i} className="flex gap-2.5 text-xs">
                    <span className="text-muted-foreground/60 shrink-0 w-14 text-[10px]">
                      {new Date(e.created_at).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-muted-foreground">{e.event_type?.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust note */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/30">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <Shield className="w-3.5 h-3.5 inline mr-1 text-primary" />
              {stageInfo.trustNote}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isActive && (
              <Button className="flex-1 h-10" onClick={() => navigate(`/tracker/${booking.id}`)}>
                Track Live <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {display.canRate && !booking.customer_rating && (
              <Button className="flex-1 h-10" onClick={() => setShowRating(true)}>
                <Star className="w-4 h-4 mr-1" /> Rate Experience
              </Button>
            )}
            {isCompleted && booking.customer_rating && (
              <div className="flex items-center gap-1 px-4 py-2 bg-success/10 rounded-xl">
                <Star className="w-4 h-4 text-success fill-success" />
                <span className="text-sm font-bold text-success">{booking.customer_rating}/5 Rated</span>
              </div>
            )}
            {display.canRebook && (
              <Button variant="outline" className="h-10" onClick={() => navigate(`/book/${booking.category_code}`)}>
                Rebook
              </Button>
            )}
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I need help with booking ${booking.id.slice(0, 8)}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </main>
        <Footer />

        {showRating && user && (
          <RatingModal
            open={showRating}
            onClose={() => setShowRating(false)}
            bookingId={booking.id}
            partnerId={booking.partner_id ?? ""}
            customerId={user.id}
            onSubmitted={() => setShowRating(false)}
          />
        )}
      </div>
    </PageTransition>
  );
}
