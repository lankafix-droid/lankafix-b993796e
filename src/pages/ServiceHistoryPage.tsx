/**
 * My Bookings — Premium consumer dashboard for booking history.
 * Shows active and past requests with lifecycle awareness, next actions, and trust-first design.
 * Uses centralized lifecycle model and state alignment for consistency.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeft, Calendar, Wrench, History, Star,
  ChevronRight, CreditCard, Clock, CheckCircle2, XCircle, AlertTriangle,
  Shield, ArrowRight, FileText, Phone, Loader2,
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";
import { mapBookingStatusToStage, LIFECYCLE_STAGES } from "@/lib/bookingLifecycleModel";
import { motion } from "framer-motion";

/* ── Status display — derived from lifecycle model for consistency ── */
function getStatusDisplay(status: string, dispatchStatus?: string | null) {
  const stage = mapBookingStatusToStage(status, dispatchStatus);
  const info = LIFECYCLE_STAGES[stage];
  return { label: info.label, badgeBg: info.badgeBg };
}

const PAYMENT_BADGE: Record<string, { label: string; color: string }> = {
  paid:             { label: "Paid",     color: "text-green-700" },
  payment_verified: { label: "Verified", color: "text-green-700" },
  cash_collected:   { label: "Cash",     color: "text-green-700" },
  payment_pending:  { label: "Pending",  color: "text-amber-600" },
  failed:           { label: "Failed",   color: "text-destructive" },
};

type FilterTab = "all" | "active" | "completed" | "cancelled";

/** Derive a one-line next action hint */
function getNextActionHint(status: string): string | null {
  const stage = mapBookingStatusToStage(status, null);
  const info = LIFECYCLE_STAGES[stage];
  if (stage === "completed" || stage === "cancelled") return null;
  return `Next: ${info.actorLabel}`;
}

export default function ServiceHistoryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FilterTab>("all");

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["service-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("id, category_code, service_type, status, created_at, completed_at, final_price_lkr, estimated_price_lkr, partner_id, customer_rating, zone_code, payment_status, payment_method, dispatch_status")
        .eq("customer_id", user.id)
        .neq("is_pilot_test", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });

  /* Separate active bookings for priority display */
  const activeBookings = bookings.filter((b: any) => !["completed", "cancelled"].includes(b.status));
  const pastBookings = bookings.filter((b: any) => ["completed", "cancelled"].includes(b.status));

  const filtered = bookings.filter((b: any) => {
    if (tab === "all") return true;
    if (tab === "active") return !["completed", "cancelled"].includes(b.status);
    if (tab === "completed") return b.status === "completed";
    if (tab === "cancelled") return b.status === "cancelled";
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: bookings.length },
    { key: "active",    label: "Active",    count: activeBookings.length },
    { key: "completed", label: "Completed", count: pastBookings.filter((b: any) => b.status === "completed").length },
    { key: "cancelled", label: "Cancelled", count: pastBookings.filter((b: any) => b.status === "cancelled").length },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
          {/* Back */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {/* Page header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Bookings</h1>
              <p className="text-xs text-muted-foreground">Track requests and view history</p>
            </div>
          </div>

          {/* Active bookings hero section */}
          {!isLoading && activeBookings.length > 0 && tab === "all" && (
            <div className="mb-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Active Now ({activeBookings.length})
              </p>
              <div className="space-y-2">
                {activeBookings.slice(0, 3).map((b: any) => (
                  <ActiveBookingCard key={b.id} booking={b} onClick={() => navigate(`/booking/${b.id}`)} />
                ))}
              </div>
              {activeBookings.length > 3 && (
                <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setTab("active")}>
                  View all {activeBookings.length} active <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {tabs.map(t => (
              <Button
                key={t.key}
                size="sm"
                variant={tab === t.key ? "default" : "outline"}
                className="text-xs h-7 shrink-0"
                onClick={() => setTab(t.key)}
              >
                {t.label} {t.count > 0 && <span className="ml-1 opacity-60">({t.count})</span>}
              </Button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load bookings"
              description="Please try again later."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title={tab === "all" ? "No bookings yet" : `No ${tab} bookings`}
              description={tab === "all" ? "Your service bookings will appear here after your first request." : "Try a different filter."}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((b: any, i: number) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <BookingCard booking={b} onClick={() => navigate(`/booking/${b.id}`)} />
                </motion.div>
              ))}
            </div>
          )}

          {/* Trust footer */}
          {!isLoading && bookings.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>All transactions protected by the LankaFix Guarantee</span>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}

/* ── Active booking card with lifecycle awareness ── */
function ActiveBookingCard({ booking, onClick }: { booking: any; onClick: () => void }) {
  const catLabel = CATEGORY_LABELS[booking.category_code as CategoryCode] || booking.category_code;
  const stage = mapBookingStatusToStage(booking.status, booking.dispatch_status);
  const stageInfo = LIFECYCLE_STAGES[stage];
  const statusDisplay = getStatusDisplay(booking.status, booking.dispatch_status);

  return (
    <Card
      className="cursor-pointer border-primary/20 bg-primary/[0.02] hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{catLabel}</h3>
            {booking.service_type && (
              <p className="text-[11px] text-muted-foreground truncate">{booking.service_type}</p>
            )}
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${statusDisplay.badgeBg} border-0`}>
            {statusDisplay.label}
          </Badge>
        </div>

        {/* Lifecycle context */}
        <div className="bg-primary/5 rounded-lg p-2 mb-2">
          <p className="text-[11px] text-foreground font-medium">{stageInfo.label}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{stageInfo.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{stageInfo.actorLabel} • {new Date(booking.created_at).toLocaleDateString()}</span>
          <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
            View details <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Standard booking card ── */
function BookingCard({ booking, onClick }: { booking: any; onClick: () => void }) {
  const catLabel = CATEGORY_LABELS[booking.category_code as CategoryCode] || booking.category_code;
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.requested;
  const price = booking.final_price_lkr || booking.estimated_price_lkr;
  const payStatus = booking.payment_status ? PAYMENT_BADGE[booking.payment_status] : null;
  const StatusIcon = statusCfg.icon;
  const actionHint = getNextActionHint(booking.status);

  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onClick}>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{catLabel}</h3>
            {booking.service_type && (
              <p className="text-[11px] text-muted-foreground truncate">{booking.service_type}</p>
            )}
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3 mr-0.5" />
            {statusCfg.label}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(booking.created_at).toLocaleDateString()}
          </span>
          {price && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              Rs. {price.toLocaleString()}
            </span>
          )}
          {payStatus && booking.payment_status !== "unpaid" && (
            <span className={`flex items-center gap-1 ${payStatus.color}`}>
              <CreditCard className="w-3 h-3" />
              {payStatus.label}
            </span>
          )}
          {booking.customer_rating && (
            <span className="flex items-center gap-1 text-amber-600">
              <Star className="w-3 h-3 fill-amber-500" /> {booking.customer_rating}
            </span>
          )}
          {actionHint && (
            <span className="text-primary/70 font-medium ml-auto text-[10px]">{actionHint}</span>
          )}
          {!actionHint && <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/50" />}
        </div>
      </CardContent>
    </Card>
  );
}
