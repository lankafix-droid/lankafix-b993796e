/**
 * BookingProgressTimeline — Visual booking journey progress.
 * Shows completed, current, and pending stages with trust notes.
 * Advisory only — does not modify booking state.
 */
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  LIFECYCLE_STAGES,
  getProgressStages,
  type BookingLifecycleStage,
} from "@/lib/bookingLifecycleModel";

interface Props {
  currentStage: BookingLifecycleStage;
  compact?: boolean;
}

const BookingProgressTimeline = ({ currentStage, compact = false }: Props) => {
  const { completed, current, pending } = getProgressStages(currentStage);
  const currentInfo = LIFECYCLE_STAGES[current];
  const allStages = [...completed, current, ...pending];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {allStages.map((stage, i) => {
            const isCompleted = completed.includes(stage);
            const isCurrent = stage === current;
            return (
              <div key={stage} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  isCompleted ? "bg-green-500" : isCurrent ? "bg-primary animate-pulse" : "bg-muted"
                }`} />
                {i < allStages.length - 1 && (
                  <div className={`w-4 h-0.5 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs font-semibold text-foreground">{currentInfo.label}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-sm font-bold text-foreground">Booking Progress</h3>

      <div className="space-y-0">
        {allStages.map((stage, i) => {
          const info = LIFECYCLE_STAGES[stage];
          const isCompleted = completed.includes(stage);
          const isCurrent = stage === current;

          return (
            <div key={stage} className="flex gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted ? "bg-green-500" : isCurrent ? "bg-primary" : "bg-muted"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                {i < allStages.length - 1 && (
                  <div className={`w-0.5 h-8 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 ${!isCurrent && !isCompleted ? "opacity-50" : ""}`}>
                <p className={`text-xs font-semibold ${isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {info.label}
                </p>
                {(isCurrent || isCompleted) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{info.description}</p>
                )}
                {isCurrent && (
                  <p className="text-[10px] text-primary/80 mt-1 italic">{info.trustNote}</p>
                )}
                {isCurrent && (
                  <span className="inline-block text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 mt-1">
                    {info.actorLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingProgressTimeline;
