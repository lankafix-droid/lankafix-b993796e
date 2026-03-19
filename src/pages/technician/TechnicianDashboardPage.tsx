/**
 * LankaFix Technician Dashboard — DB-backed
 * Replaces all MOCK_TECHNICIANS and Zustand bookingStore with real Supabase queries.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTechnicianJobs } from "@/hooks/useTechnicianJobs";
import { usePartnerSettlements } from "@/hooks/useCurrentPartner";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Briefcase, CheckCircle2, Wrench, User, Star, Calendar,
  Shield, DollarSign, MapPin, Wallet, Package,
  GraduationCap, Headphones, AlertTriangle, Zap, Navigation,
  TrendingUp, Clock, Loader2,
} from "lucide-react";

type AvailabilityStatus = "online" | "busy" | "offline";

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  online: "Online",
  busy: "Busy",
  offline: "Offline",
};

const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  online: "bg-success/10 text-success border-success/20",
  busy: "bg-warning/10 text-warning border-warning/20",
  offline: "bg-muted text-muted-foreground border-border",
};

const ACTIVE_STATUSES = ["tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress", "assigned"];
const PENDING_STATUSES = ["matching", "awaiting_partner_confirmation", "requested"];
const COMPLETED_STATUSES = ["completed", "rated"];

export default function TechnicianDashboardPage() {
  const navigate = useNavigate();
  const { partner, partnerLoading, bookings, offers, isLoading } = useTechnicianJobs();
  const { data: settlements = [] } = usePartnerSettlements(partner?.id);

  useEffect(() => { track("technician_dashboard_view"); }, []);

  // Availability toggle — writes to DB
  const availabilityMutation = useMutation({
    mutationFn: async (newStatus: AvailabilityStatus) => {
      if (!partner?.id) throw new Error("No partner");
      const { error } = await supabase
        .from("partners")
        .update({
          availability_status: newStatus,
          availability_last_updated: new Date().toISOString(),
        } as any)
        .eq("id", partner.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Availability updated"),
    onError: () => toast.error("Failed to update availability"),
  });

  if (partnerLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <User className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No technician profile found</p>
          <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
        </div>
      </div>
    );
  }

  const availability = (partner.availability_status || "offline") as AvailabilityStatus;
  const newJobs = bookings.filter((b: any) => PENDING_STATUSES.includes(b.status));
  const activeJobs = bookings.filter((b: any) => ACTIVE_STATUSES.includes(b.status));
  const completedJobs = bookings.filter((b: any) => COMPLETED_STATUSES.includes(b.status));

  // Earnings from settlements
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const todayEarnings = settlements
    .filter((s: any) => new Date(s.created_at) >= todayStart)
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);
  const monthEarnings = settlements
    .filter((s: any) => new Date(s.created_at) >= monthStart)
    .reduce((sum: number, s: any) => sum + (s.net_payout_lkr || 0), 0);

  const formatLKR = (n: number) => `Rs ${n.toLocaleString("en-LK")}`;

  const cycleAvailability = () => {
    const order: AvailabilityStatus[] = ["online", "busy", "offline"];
    const idx = order.indexOf(availability);
    const next = order[(idx + 1) % order.length];
    availabilityMutation.mutate(next);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {partner.profile_photo_url ? (
              <img src={partner.profile_photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">
              Welcome, {partner.full_name?.split(" ")[0] || "Technician"} 👋
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Star className="w-3 h-3 text-warning" /> {Number(partner.rating_average || 0).toFixed(1)} • {partner.completed_jobs_count || 0} jobs
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {partner.verification_status === "verified" ? "Verified" : "Pending"}
              </Badge>
            </div>
          </div>
          <button
            onClick={cycleAvailability}
            disabled={availabilityMutation.isPending}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${AVAILABILITY_COLORS[availability]}`}
          >
            {availabilityMutation.isPending ? "…" : AVAILABILITY_LABELS[availability]}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pending Offers Alert */}
        {offers.length > 0 && (
          <Card className="border-warning/30 bg-warning/5 cursor-pointer" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0 animate-pulse">
                <Zap className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{offers.length} New Job Offer{offers.length > 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Respond before they expire</p>
              </div>
              <Badge className="bg-warning text-warning-foreground">{offers.length}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Today's Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Today's Jobs</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{activeJobs.length + newJobs.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Today's Earnings</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatLKR(todayEarnings)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{newJobs.length + offers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatLKR(monthEarnings)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Job Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-3 text-center">
              <Briefcase className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold">{newJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-3 text-center">
              <Wrench className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{activeJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate("/technician/jobs")}>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-xl font-bold">{completedJobs.length}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Jobs", icon: Briefcase, path: "/technician/jobs", color: "text-primary" },
            { label: "Parts", icon: Package, path: "/technician/parts", color: "text-warning" },
            { label: "Training", icon: GraduationCap, path: "/technician/training", color: "text-success" },
            { label: "Support", icon: Headphones, path: "/technician/support", color: "text-muted-foreground" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-xl border hover:border-primary/20 transition-colors"
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-[10px] font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Performance Metrics — from real DB data */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">My Performance</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Rating", value: Number(partner.rating_average || 0).toFixed(1), icon: Star, color: "text-warning" },
                { label: "Completed", value: `${partner.completed_jobs_count || 0}`, icon: CheckCircle2, color: "text-success" },
                { label: "Accept Rate", value: `${Math.round(Number(partner.acceptance_rate || 0))}%`, icon: Zap, color: "text-primary" },
                { label: "On Time", value: `${Math.round(Number(partner.on_time_rate || 95))}%`, icon: Clock, color: "text-muted-foreground" },
              ].map((metric) => (
                <div key={metric.label} className="text-center">
                  <metric.icon className={`w-4 h-4 mx-auto mb-1 ${metric.color}`} />
                  <p className="text-sm font-bold text-foreground">{metric.value}</p>
                  <p className="text-[9px] text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Safety Banner */}
        <Card className="border-destructive/20 bg-destructive/5 cursor-pointer" onClick={() => navigate("/technician/safety")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Safety Tools</p>
              <p className="text-xs text-muted-foreground">SOS button, live tracking & support alerts</p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="w-full" onClick={() => navigate("/technician/jobs")}>
            <Briefcase className="w-4 h-4 mr-2" /> View All Jobs
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/technician/earnings")}>
            <Wallet className="w-4 h-4 mr-2" /> View Earnings
          </Button>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-3">
          <p className="text-xs text-success text-center">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            All payouts are released after completion verification.
          </p>
        </div>
      </div>
    </div>
  );
}
