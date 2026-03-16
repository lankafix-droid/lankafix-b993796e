/**
 * AIEmptyState — Shared reusable empty/degraded state for AI advisory cards.
 * Modes: disabled, unavailable, no_data, blocked_by_consent, degraded.
 */
import { AlertTriangle, Lock, Power, SearchX, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateMode = "disabled" | "unavailable" | "no_data" | "blocked_by_consent" | "degraded";

interface AIEmptyStateProps {
  mode: EmptyStateMode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const MODE_DEFAULTS: Record<EmptyStateMode, { icon: typeof AlertTriangle; title: string; description: string }> = {
  disabled: {
    icon: Power,
    title: "AI feature is currently off",
    description: "This advisory feature is not enabled for your account.",
  },
  unavailable: {
    icon: ServerOff,
    title: "AI module unavailable",
    description: "This advisory feature cannot run right now. Your booking is not affected.",
  },
  no_data: {
    icon: SearchX,
    title: "No AI insights available",
    description: "Not enough information to generate a recommendation at this time.",
  },
  blocked_by_consent: {
    icon: Lock,
    title: "AI requires your permission",
    description: "This optional feature needs your consent before it can provide recommendations.",
  },
  degraded: {
    icon: AlertTriangle,
    title: "Limited AI availability",
    description: "Using estimated guidance due to limited data. Manual review recommended.",
  },
};

const AIEmptyState = ({
  mode,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: AIEmptyStateProps) => {
  const defaults = MODE_DEFAULTS[mode];
  const Icon = defaults.icon;

  return (
    <div className={`rounded-xl border border-border/30 bg-muted/10 p-4 text-center space-y-2 ${className}`}>
      <div className="flex justify-center">
        <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{title || defaults.title}</p>
      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        {description || defaults.description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="text-xs mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default AIEmptyState;
