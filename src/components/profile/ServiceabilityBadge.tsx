/**
 * ServiceabilityBadge — Shows address verification/coverage status.
 * Supports both serviceability status and verification state labels.
 */
import { MapPin, CheckCircle2, Clock, AlertTriangle, HelpCircle } from "lucide-react";
import type { AddressVerificationState } from "@/lib/categoryOnboardingConfig";

interface Props {
  status?: "inside" | "edge" | "outside" | null;
  verificationState?: AddressVerificationState;
  compact?: boolean;
}

export default function ServiceabilityBadge({ status, verificationState, compact }: Props) {
  // Prefer verificationState if provided
  const resolvedKey = verificationState
    ? verificationState
    : status === "inside" ? "verified_serviceable"
    : status === "edge" ? "edge_serviceable"
    : status === "outside" ? "outside_coverage"
    : null;

  if (!resolvedKey) return null;

  const config = {
    verified_serviceable: {
      label: "Verified Serviceable",
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    edge_serviceable: {
      label: "Edge Serviceable",
      icon: Clock,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    needs_verification: {
      label: "Needs Verification",
      icon: HelpCircle,
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    },
    outside_coverage: {
      label: "Outside Coverage",
      icon: AlertTriangle,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  }[resolvedKey];

  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium ${config.className}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{config.label}</span>
    </div>
  );
}
