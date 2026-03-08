/**
 * BookingReliabilityBanner — Shows booking lifecycle health status
 * with retry progress, escalation alerts, and recovery indicators.
 */
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, HeadphonesIcon, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type ReliabilityState } from "@/hooks/useBookingReliability";

interface BookingReliabilityBannerProps {
  state: ReliabilityState;
  className?: string;
}

const PHASE_CONFIG = {
  awaiting_payment: {
    icon: Clock,
    iconColor: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
    badge: null,
  },
  payment_confirmed: {
    icon: CheckCircle2,
    iconColor: "text-success",
    bg: "bg-success/5 border-success/20",
    badge: "Payment Confirmed",
  },
  dispatching: {
    icon: Loader2,
    iconColor: "text-primary animate-spin",
    bg: "bg-primary/5 border-primary/20",
    badge: "Searching",
  },
  pending_acceptance: {
    icon: Loader2,
    iconColor: "text-primary animate-spin",
    bg: "bg-primary/5 border-primary/20",
    badge: "Awaiting Response",
  },
  retrying: {
    icon: RefreshCw,
    iconColor: "text-warning animate-spin",
    bg: "bg-warning/5 border-warning/20",
    badge: "Retrying",
  },
  accepted: {
    icon: CheckCircle2,
    iconColor: "text-success",
    bg: "bg-success/5 border-success/20",
    badge: null,
  },
  assigned: {
    icon: ShieldCheck,
    iconColor: "text-success",
    bg: "bg-success/5 border-success/20",
    badge: "Confirmed",
  },
  escalated: {
    icon: HeadphonesIcon,
    iconColor: "text-warning",
    bg: "bg-warning/5 border-warning/20",
    badge: "Manual Review",
  },
  abandoned: {
    icon: AlertTriangle,
    iconColor: "text-destructive",
    bg: "bg-destructive/5 border-destructive/20",
    badge: "Expired",
  },
};

export default function BookingReliabilityBanner({
  state,
  className = "",
}: BookingReliabilityBannerProps) {
  const config = PHASE_CONFIG[state.phase];
  const Icon = config.icon;
  const showProgress = state.phase === "dispatching" || state.phase === "pending_acceptance" || state.phase === "retrying";
  const progressValue = showProgress ? Math.min((state.dispatchRound / state.maxRounds) * 100, 100) : 0;

  return (
    <div className={`border rounded-xl p-4 space-y-2 ${config.bg} ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${config.iconColor} shrink-0`} />
        <p className="text-sm font-medium text-foreground flex-1">{state.message}</p>
        {config.badge && (
          <Badge variant="outline" className="text-[10px] shrink-0">{config.badge}</Badge>
        )}
      </div>

      {/* Dispatch progress */}
      {showProgress && (
        <div className="space-y-1">
          <Progress value={progressValue} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Dispatch attempt {state.dispatchRound} of {state.maxRounds}</span>
            {state.isEmergency && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Emergency</Badge>
            )}
          </div>
        </div>
      )}

      {/* Escalation info */}
      {state.phase === "escalated" && (
        <div className="bg-card rounded-lg p-2.5 flex items-start gap-2">
          <HeadphonesIcon className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-foreground font-medium">LankaFix Operations Team Notified</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Our team is manually selecting the best available technician. You'll be notified once assigned.
            </p>
          </div>
        </div>
      )}

      {/* Retry info */}
      {state.isRetrying && (
        <p className="text-[10px] text-muted-foreground">
          Previous technician was unavailable. Automatically finding the next best match for you.
        </p>
      )}

      {/* Protection notice */}
      {(state.phase === "dispatching" || state.phase === "pending_acceptance" || state.phase === "retrying") && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3 text-success" />
          <span>Your booking is protected — no charge until technician is confirmed</span>
        </div>
      )}
    </div>
  );
}
