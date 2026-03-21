import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentPartner, usePartnerBookings } from "@/hooks/useCurrentPartner";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { motion } from "framer-motion";
import OnboardingStatusBanner from "@/components/v2/partner/OnboardingStatusBanner";
import {
  Briefcase, Clock, CheckCircle2, AlertTriangle, Users,
  MapPin, ArrowRight, Wrench, BarChart3, Wallet,
  Star, Shield, Settings, Loader2, UserPlus,
  FileText, GraduationCap, Headphones, ChevronRight,
  Bell, Zap, TrendingUp, Award,
} from "lucide-react";

const VERIFICATION_CONFIG: Record<string, { bg: string; label: string; icon: typeof Shield }> = {
  pending: { bg: "bg-warning/10 text-warning border-warning/20", label: "Pending Verification", icon: Clock },
  verified: { bg: "bg-success/10 text-success border-success/20", label: "Verified", icon: Shield },
  suspended: { bg: "bg-destructive/10 text-destructive border-destructive/20", label: "Suspended", icon: AlertTriangle },
};

function StatCard({ label, value, icon: Icon, color, urgent, onClick }: {
  label: string; value: number | string; icon: typeof Briefcase; color: string; urgent?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-card rounded-2xl border p-4 text-left transition-all ${urgent ? "border-warning/30 bg-warning/5" : "border-border/60"} ${onClick ? "hover:border-primary/30 cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${urgent ? "text-warning" : "text-foreground"}`}>{value}</p>
    </button>
  );
}

function QuickAction({ label, icon: Icon, onClick, badge }: {
  label: string; icon: typeof Briefcase; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-card rounded-xl border border-border/60 p-3.5 hover:border-primary/30 transition-all w-full text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      {badge && badge > 0 ? (
        <Badge className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5">{badge}</Badge>
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );
}

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();
  const { data: bookings = [] } = usePartnerBookings(partner?.id);

  useEffect(() => { track("partner_dashboard_view"); }, []);

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
        <motion.div
          className="bg-card rounded-2xl border border-border/60 max-w-md w-full p-8 text-center space-y-4 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No Partner Profile Found</h2>
          <p className="text-sm text-muted-foreground">Sign in with a partner account or complete provider onboarding to get started.</p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/join")} className="flex-1 rounded-xl">Join as Provider</Button>
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1 rounded-xl">Home</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const verConfig = VERIFICATION_CONFIG[partner.verification_status] || VERIFICATION_CONFIG.pending;

  const awaitingConfirmation = bookings.filter((b: any) => b.dispatch_status === "pending_acceptance" || b.status === "awaiting_partner_confirmation");
  const activeJobs = bookings.filter((b: any) => !["completed", "cancelled", "no_show"].includes(b.status));
  const inProgress = bookings.filter((b: any) => ["repair_started", "inspection_started", "arrived", "tech_en_route"].includes(b.status));
  const completedCount = partner.completed_jobs_count || bookings.filter((b: any) => b.status === "completed").length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border/60 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {partner.profile_photo_url ? (
                <img src={partner.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold">{partner.full_name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">{partner.full_name}</h1>
              <p className="text-[11px] text-muted-foreground">{partner.business_name || "Individual Provider"}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] ${verConfig.bg}`}>
            {verConfig.label}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Job Invitations Alert */}
        {awaitingConfirmation.length > 0 && (
          <motion.div
            className="bg-warning/5 border border-warning/25 rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/partner/jobs")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{awaitingConfirmation.length} Job {awaitingConfirmation.length === 1 ? "Invitation" : "Invitations"}</p>
              <p className="text-xs text-muted-foreground">Respond within 5 minutes to keep your acceptance rate high</p>
            </div>
            <ArrowRight className="w-4 h-4 text-warning" />
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Active Jobs" value={activeJobs.length} icon={Briefcase} color="text-primary" onClick={() => navigate("/partner/jobs")} />
          <StatCard label="Job Invitations" value={awaitingConfirmation.length} icon={Bell} color="text-warning" urgent={awaitingConfirmation.length > 0} onClick={() => navigate("/partner/jobs")} />
          <StatCard label="In Progress" value={inProgress.length} icon={Wrench} color="text-primary" onClick={() => navigate("/partner/jobs")} />
          <StatCard label="Completed" value={completedCount} icon={CheckCircle2} color="text-success" />
        </div>

        {/* Performance Summary */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Performance
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => navigate("/partner/performance")}>
              Details <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-0.5">
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span className="text-sm font-bold text-foreground">{partner.rating_average ? Number(partner.rating_average).toFixed(1) : "—"}</span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Rating</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5 text-center">
              <span className="text-sm font-bold text-foreground">{partner.acceptance_rate ? `${Number(partner.acceptance_rate).toFixed(0)}%` : "—"}</span>
              <p className="text-[9px] text-muted-foreground mt-0.5">Accept</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5 text-center">
              <span className="text-sm font-bold text-foreground">{partner.on_time_rate ? `${Number(partner.on_time_rate).toFixed(0)}%` : "—"}</span>
              <p className="text-[9px] text-muted-foreground mt-0.5">On-time</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5 text-center">
              <span className="text-sm font-bold text-foreground">{partner.experience_years || 0}y</span>
              <p className="text-[9px] text-muted-foreground mt-0.5">Exp</p>
            </div>
          </div>
        </motion.div>

        {/* Categories & Zones */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border/60 p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-2">Categories</p>
            <div className="flex flex-wrap gap-1">
              {partner.categories_supported.length > 0 ? partner.categories_supported.map((c: string) => (
                <Badge key={c} variant="secondary" className="text-[10px] rounded-full">{c}</Badge>
              )) : <span className="text-xs text-muted-foreground">None set</span>}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-2">Service Zones</p>
            <div className="flex flex-wrap gap-1">
              {partner.service_zones && partner.service_zones.length > 0 ? partner.service_zones.slice(0, 4).map((z: string) => (
                <Badge key={z} variant="outline" className="text-[10px] rounded-full">{z}</Badge>
              )) : <span className="text-xs text-muted-foreground">None set</span>}
              {partner.service_zones && partner.service_zones.length > 4 && (
                <Badge variant="outline" className="text-[10px] rounded-full">+{partner.service_zones.length - 4}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Recent Jobs */}
        {activeJobs.length > 0 && (
          <motion.div
            className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Active Jobs
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => navigate("/partner/jobs")}>
                View All <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {activeJobs.slice(0, 4).map((b: any) => {
                const JOB_LABELS: Record<string, string> = {
                  requested: "Submitted", matching: "Finding Provider",
                  awaiting_partner_confirmation: "Awaiting Confirmation", assigned: "Assigned",
                  tech_en_route: "En Route", arrived: "Arrived",
                  inspection_started: "Inspecting", quote_submitted: "Quote Submitted",
                  quote_approved: "Quote Approved", repair_started: "Repair In Progress",
                  in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
                };
                const JOB_COLORS: Record<string, string> = {
                  awaiting_partner_confirmation: "bg-warning/10 text-warning border-warning/20",
                  tech_en_route: "bg-warning/10 text-warning border-warning/20",
                  quote_submitted: "bg-warning/10 text-warning border-warning/20",
                  completed: "bg-success/10 text-success border-success/20",
                  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
                };
                const label = JOB_LABELS[b.status] || b.status.replace(/_/g, " ");
                const colorClass = b.dispatch_status === "pending_acceptance"
                  ? "bg-warning/10 text-warning border-warning/20"
                  : (JOB_COLORS[b.status] || "");
                return (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/partner/job/${b.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-all w-full text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {b.category_code} • {b.service_type || "General"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {b.id.slice(0, 8).toUpperCase()} • {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                        {label}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
          <QuickAction label="All Jobs" icon={Briefcase} onClick={() => navigate("/partner/jobs")} badge={activeJobs.length} />
          <QuickAction label="Earnings & Wallet" icon={Wallet} onClick={() => navigate("/partner/wallet")} />
          <QuickAction label="Quote History" icon={FileText} onClick={() => navigate("/partner/quotes")} />
          <QuickAction label="Profile & Documents" icon={Settings} onClick={() => navigate("/partner/profile")} />
          <QuickAction label="Training & Certifications" icon={GraduationCap} onClick={() => navigate("/technician/training")} />
          <QuickAction label="Support" icon={Headphones} onClick={() => navigate("/technician/support")} />
        </div>

        {/* Trust Footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-4">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>LankaFix Partner Platform</span>
        </div>
      </div>
    </div>
  );
}
