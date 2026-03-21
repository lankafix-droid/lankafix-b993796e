/**
 * OnboardingStatusBanner — Shows partner verification state with next-action guidance.
 * Used on Partner Dashboard and Onboarding page.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Clock, ShieldCheck, AlertTriangle, FileSearch, CheckCircle2, XCircle,
} from "lucide-react";

type VerificationStatus = "pending" | "under_review" | "verified" | "rejected" | "suspended" | "incomplete";

interface Props {
  status: string;
  rejectionReason?: string | null;
  profileComplete?: boolean;
}

const STATUS_CONFIG: Record<VerificationStatus, {
  icon: typeof Clock;
  bg: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}> = {
  incomplete: {
    icon: AlertTriangle,
    bg: "border-warning/30 bg-warning/5",
    title: "Complete Your Application",
    description: "Your profile is incomplete. Finish all steps to submit for review.",
    actionLabel: "Continue Application",
    actionPath: "/join",
  },
  pending: {
    icon: Clock,
    bg: "border-primary/30 bg-primary/5",
    title: "Application Submitted",
    description: "Your application is in the queue. Our team typically reviews within 24–48 hours. You'll be notified when verified.",
  },
  under_review: {
    icon: FileSearch,
    bg: "border-accent/30 bg-accent/5",
    title: "Under Review",
    description: "A LankaFix team member is reviewing your documents and profile. This usually takes 1–2 business days.",
  },
  verified: {
    icon: ShieldCheck,
    bg: "border-success/30 bg-success/5",
    title: "Verified Provider",
    description: "You're verified and ready to receive job offers. Keep your availability updated for best matching.",
  },
  rejected: {
    icon: XCircle,
    bg: "border-destructive/30 bg-destructive/5",
    title: "Action Required",
    description: "Your application needs changes before we can verify you. Please review the feedback and update your profile.",
    actionLabel: "Update Application",
    actionPath: "/join",
  },
  suspended: {
    icon: AlertTriangle,
    bg: "border-destructive/30 bg-destructive/5",
    title: "Account Suspended",
    description: "Your account has been temporarily suspended. Please contact LankaFix support for more information.",
  },
};

export default function OnboardingStatusBanner({ status, rejectionReason, profileComplete }: Props) {
  const navigate = useNavigate();
  const effectiveStatus: VerificationStatus = 
    profileComplete === false ? "incomplete" : (status as VerificationStatus) || "pending";
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border p-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-background/80 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-foreground">{config.title}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
          {rejectionReason && effectiveStatus === "rejected" && (
            <div className="mt-2 bg-destructive/5 border border-destructive/15 rounded-lg p-2.5">
              <p className="text-xs text-destructive font-medium">Feedback: {rejectionReason}</p>
            </div>
          )}
          {config.actionLabel && config.actionPath && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 text-xs rounded-lg"
              onClick={() => navigate(config.actionPath!)}
            >
              {config.actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
