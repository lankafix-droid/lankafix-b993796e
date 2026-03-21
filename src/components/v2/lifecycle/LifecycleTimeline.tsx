/**
 * LifecycleTimeline — Premium visual timeline for booking lifecycle.
 * Consumer-facing. Maps DB status → lifecycle stages → visual progress.
 */
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  mapBookingStatusToStage,
  getProgressStages,
  LIFECYCLE_STAGES,
  type BookingLifecycleStage,
} from "@/lib/bookingLifecycleModel";

interface Props {
  status: string;
  dispatchStatus?: string | null;
  className?: string;
}

export default function LifecycleTimeline({ status, dispatchStatus, className = "" }: Props) {
  const currentStage = mapBookingStatusToStage(status, dispatchStatus);
  const { completed, current, pending } = getProgressStages(currentStage);
  const currentInfo = LIFECYCLE_STAGES[currentStage];

  return (
    <div className={className}>
      {/* Current status hero */}
      <div className="text-center mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${currentInfo.badgeBg}`}>
          {current === "completed" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : current === "cancelled" ? (
            <Circle className="w-3.5 h-3.5" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {currentInfo.label}
        </span>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          {currentInfo.description}
        </p>
      </div>

      {/* Trust note */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {currentInfo.trustNote}
        </p>
        <p className="text-[10px] text-primary/60 mt-1.5 font-medium">
          Responsible: {currentInfo.actorLabel}
        </p>
      </div>

      {/* Timeline steps */}
      <div className="space-y-0">
        {[...completed, current, ...pending].map((stage, i) => {
          const info = LIFECYCLE_STAGES[stage];
          const isCompleted = completed.includes(stage);
          const isCurrent = stage === current;
          const isPending = pending.includes(stage);

          return (
            <div key={stage} className="flex items-start gap-3">
              {/* Connector line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-muted border border-border"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                {i < completed.length + pending.length && (
                  <div className={`w-px h-8 ${isCompleted ? "bg-primary/40" : "bg-border"}`} />
                )}
              </div>

              {/* Label */}
              <div className="pb-6 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isCompleted
                      ? "text-primary"
                      : isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {info.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-muted-foreground mt-0.5">
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
