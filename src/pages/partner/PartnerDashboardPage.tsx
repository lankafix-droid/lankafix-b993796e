import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentPartner, usePartnerBookings } from "@/hooks/useCurrentPartner";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import {
  Briefcase, Clock, CheckCircle2, AlertTriangle, Users,
  MapPin, ArrowRight, Wrench, BarChart3, Wallet,
  TrendingUp, Shield, Settings, Loader2, UserPlus,
} from "lucide-react";

const VERIFICATION_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  verified: "bg-success/10 text-success",
  suspended: "bg-destructive/10 text-destructive",
};

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
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold text-foreground">No Partner Profile Found</h2>
            <p className="text-sm text-muted-foreground">
              You need to sign in with a partner account or complete provider onboarding first.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate("/join")}>Join as Provider</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeJobs = bookings.filter((b: any) => !["completed", "cancelled", "no_show"].includes(b.status));
  const awaitingConfirmation = bookings.filter((b: any) => b.status === "awaiting_partner_confirmation");
  const inProgress = bookings.filter((b: any) => ["repair_started", "inspection_started"].includes(b.status));
  const completedJobs = bookings.filter((b: any) => b.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Partner Dashboard</h1>
            <p className="text-xs text-muted-foreground">{partner.business_name || partner.full_name}</p>
          </div>
          <Badge className={`text-xs ${VERIFICATION_COLORS[partner.verification_status] || "bg-muted text-muted-foreground"}`}>
            {partner.verification_status}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Job Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, color: "text-primary" },
            { label: "Awaiting Confirm", value: awaitingConfirmation.length, icon: AlertTriangle, color: "text-warning" },
            { label: "In Progress", value: inProgress.length, icon: Wrench, color: "text-primary" },
            { label: "Completed", value: partner.completed_jobs_count || completedJobs.length, icon: CheckCircle2, color: "text-success" },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Overview — Real Data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">
                  {partner.rating_average ? `⭐ ${Number(partner.rating_average).toFixed(1)}` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Avg Rating</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">
                  {partner.completed_jobs_count || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Jobs Completed</p>
              </div>
            </div>
            {/* Categories */}
            {partner.categories_supported.length > 0 && (
              <div className="border-t pt-2 mt-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Categories</p>
                <div className="flex flex-wrap gap-1">
                  {partner.categories_supported.map((c: string) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Zones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Service Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partner.service_zones && partner.service_zones.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {partner.service_zones.map((z: string) => (
                  <Badge key={z} variant="outline" className="text-[10px]">{z}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No zones configured</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeJobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active jobs yet</p>
            )}
            {activeJobs.slice(0, 5).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/partner/job/${b.id}`)}>
                <div>
                  <p className="text-sm font-medium text-foreground">{b.id.slice(0, 8)}...</p>
                  <p className="text-xs text-muted-foreground">{b.category_code} • {b.service_type || "General"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{b.status.replace(/_/g, " ")}</Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/jobs")}>
            <Briefcase className="w-4 h-4 mr-2" /> All Jobs
          </Button>
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/wallet")}>
            <Wallet className="w-4 h-4 mr-2" /> Wallet
          </Button>
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/profile")}>
            <Settings className="w-4 h-4 mr-2" /> Profile
          </Button>
          <Button variant="outline" className="h-auto py-3" onClick={() => navigate("/partner/premium")}>
            <TrendingUp className="w-4 h-4 mr-2" /> Premium
          </Button>
        </div>
      </div>
    </div>
  );
}
