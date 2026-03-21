/**
 * ConsumerLifecycleTracker — Premium lifecycle timeline for the tracker page.
 * Replaces the compact dot timeline with a full trust-first experience.
 */
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  mapBookingStatusToStage,
  getProgressStages,
  LIFECYCLE_STAGES,
} from "@/lib/bookingLifecycleModel";

interface Props {
  status: string;
  dispatchStatus?: string | null;
  className?: string;
}

export default function ConsumerLifecycleTracker({ status, dispatchStatus, className = "" }: Props) {
  const currentStage = mapBookingStatusToStage(status, dispatchStatus);
  const { completed, current, pending } = getProgressStages(currentStage);
  const currentInfo = LIFECYCLE_STAGES[currentStage];
  const allStages = [...completed, current, ...pending];

  return (
    <div className={`bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)] ${className}`}>
      {/* Current status hero */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${currentInfo.badgeBg}`}>
            {current === "completed" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : current === "cancelled" ? null : (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {currentInfo.label}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {currentInfo.actorLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{currentInfo.description}</p>
      </div>

      {/* Trust note */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
          {currentInfo.trustNote}
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {allStages.map((stage, i) => {
          const info = LIFECYCLE_STAGES[stage];
          const isCompleted = completed.includes(stage);
          const isCurrent = stage === current;

          return (
            <div key={stage} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-muted border border-border"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : isCurrent ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                {i < allStages.length - 1 && (
                  <div className={`w-px h-6 ${isCompleted ? "bg-primary/40" : "bg-border"}`} />
                )}
              </div>
              <div className="pb-3 min-w-0">
                <p className={`text-xs font-semibold ${
                  isCompleted ? "text-primary" : isCurrent ? "text-foreground" : "text-muted-foreground/50"
                }`}>
                  {info.label}
                </p>
                {isCurrent && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {info.actorLabel} • In progress
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
