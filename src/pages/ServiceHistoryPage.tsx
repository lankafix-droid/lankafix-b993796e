/**
 * Service History — DB-backed customer booking history.
 * Shows all bookings (completed, in-progress, cancelled) for the logged-in user.
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
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-primary/10 text-primary border-primary/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary border-primary/20", icon: Clock },
  requested: { label: "Requested", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  tech_assigned: { label: "Tech Assigned", color: "bg-accent/10 text-accent-foreground border-accent/20", icon: Wrench },
  tech_en_route: { label: "En Route", color: "bg-primary/10 text-primary border-primary/20", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  escalated: { label: "Escalated", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: "Paid", color: "text-success" },
  payment_verified: { label: "Verified", color: "text-success" },
  cash_collected: { label: "Cash", color: "text-success" },
  payment_pending: { label: "Pending", color: "text-warning" },
  unpaid: { label: "Unpaid", color: "text-muted-foreground" },
  failed: { label: "Failed", color: "text-destructive" },
};

type FilterTab = "all" | "active" | "completed" | "cancelled";

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
        .select("id, category_code, service_type, status, created_at, completed_at, final_price_lkr, estimated_price_lkr, partner_id, customer_rating, zone_code, payment_status, payment_method")
        .eq("customer_id", user.id)
        .neq("is_pilot_test", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });

  const filtered = bookings.filter((b: any) => {
    if (tab === "all") return true;
    if (tab === "active") return !["completed", "cancelled"].includes(b.status);
    if (tab === "completed") return b.status === "completed";
    if (tab === "cancelled") return b.status === "cancelled";
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${bookings.length})` },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Service History</h1>
              <p className="text-xs text-muted-foreground">All your bookings in one place</p>
            </div>
          </div>

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
                {t.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load history"
              description="Please try again later."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title={tab === "all" ? "No bookings yet" : `No ${tab} bookings`}
              description={tab === "all" ? "Your service bookings will appear here." : "Try a different filter."}
            />
          ) : (
            <div className="space-y-2.5">
              {filtered.map((b: any) => {
                const catLabel = CATEGORY_LABELS[b.category_code as CategoryCode] || b.category_code;
                const statusCfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.requested;
                const price = b.final_price_lkr || b.estimated_price_lkr;
                const payStatus = PAYMENT_STATUS_LABELS[b.payment_status] || PAYMENT_STATUS_LABELS.unpaid;
                const StatusIcon = statusCfg.icon;

                return (
                  <Card
                    key={b.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/tracker/${b.id}`)}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{catLabel}</h3>
                          {b.service_type && (
                            <p className="text-[11px] text-muted-foreground truncate">{b.service_type}</p>
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
                          {new Date(b.created_at).toLocaleDateString()}
                        </span>
                        {price && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            Rs. {price.toLocaleString()}
                          </span>
                        )}
                        {b.payment_status && b.payment_status !== "unpaid" && (
                          <span className={`flex items-center gap-1 ${payStatus.color}`}>
                            <CreditCard className="w-3 h-3" />
                            {payStatus.label}
                          </span>
                        )}
                        {b.customer_rating && (
                          <span className="flex items-center gap-1 text-warning">
                            <Star className="w-3 h-3" /> {b.customer_rating}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/50" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
