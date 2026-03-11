import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentPartner, usePartnerBookings } from "@/hooks/useCurrentPartner";
import { ArrowLeft, BarChart3, Loader2, UserPlus, TrendingUp, CheckCircle2, XCircle, Clock, Star, Zap, Heart } from "lucide-react";

interface Metric {
  label: string;
  value: string | number;
  icon: any;
  available: boolean;
  description: string;
}

export default function PartnerPerformancePage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();
  const { data: bookings = [] } = usePartnerBookings(partner?.id);

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

  const completedCount = partner.completed_jobs_count || 0;
  const cancelledBookings = bookings.filter((b: any) => b.status === "cancelled").length;
  const totalBookings = bookings.length;

  const metrics: Metric[] = [
    {
      label: "Completed Jobs",
      value: completedCount,
      icon: CheckCircle2,
      available: true,
      description: "Total jobs successfully completed",
    },
    {
      label: "Average Rating",
      value: partner.rating_average ? Number(partner.rating_average).toFixed(1) : "—",
      icon: Star,
      available: !!partner.rating_average && Number(partner.rating_average) > 0,
      description: "Customer satisfaction score",
    },
    {
      label: "Acceptance Rate",
      value: partner.acceptance_rate ? `${Number(partner.acceptance_rate).toFixed(0)}%` : "—",
      icon: Zap,
      available: !!partner.acceptance_rate && Number(partner.acceptance_rate) > 0,
      description: "Percentage of offered jobs accepted",
    },
    {
      label: "Cancellation Rate",
      value: partner.cancellation_rate ? `${Number(partner.cancellation_rate).toFixed(0)}%` : totalBookings > 0 ? `${Math.round((cancelledBookings / totalBookings) * 100)}%` : "—",
      icon: XCircle,
      available: true,
      description: "Percentage of jobs cancelled",
    },
    {
      label: "On-Time Rate",
      value: partner.on_time_rate ? `${Number(partner.on_time_rate).toFixed(0)}%` : "—",
      icon: Clock,
      available: !!partner.on_time_rate && Number(partner.on_time_rate) > 0,
      description: "Arrival punctuality percentage",
    },
    {
      label: "Quote Approval Rate",
      value: partner.quote_approval_rate ? `${Number(partner.quote_approval_rate).toFixed(0)}%` : "—",
      icon: TrendingUp,
      available: !!partner.quote_approval_rate && Number(partner.quote_approval_rate) > 0,
      description: "Percentage of quotes approved by customers",
    },
    {
      label: "Response Time",
      value: partner.average_response_time_minutes ? `${partner.average_response_time_minutes} min` : "—",
      icon: Clock,
      available: !!partner.average_response_time_minutes,
      description: "Average time to respond to job offers",
    },
    {
      label: "Experience",
      value: partner.experience_years ? `${partner.experience_years}+ years` : "—",
      icon: Heart,
      available: !!partner.experience_years,
      description: "Years of professional experience",
    },
  ];

  const availableMetrics = metrics.filter((m) => m.available);
  const unavailableMetrics = metrics.filter((m) => !m.available);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Performance Scorecard
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Available Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {availableMetrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Unavailable Metrics */}
        {unavailableMetrics.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coming Soon</h3>
            <div className="grid grid-cols-2 gap-3">
              {unavailableMetrics.map((m) => (
                <Card key={m.label} className="opacity-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <m.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Not available yet</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Fairness Note */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Fair & Transparent:</strong> Your performance scorecard uses only real data from completed jobs. Better performance = higher visibility in technician matching = more job opportunities. LankaFix rewards merit.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
