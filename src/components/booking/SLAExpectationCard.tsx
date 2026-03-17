/**
 * SLAExpectationCard — Shows advisory-only expectation window for current stage.
 * Does not promise guaranteed times. Display-only.
 */
import { Clock } from "lucide-react";
import { getSLAExpectation, isLikelyDelayed } from "@/lib/bookingSLAExpectations";
import type { BookingLifecycleStage } from "@/lib/bookingLifecycleModel";

interface Props {
  stage: BookingLifecycleStage;
  stageEnteredAt?: string | null;
}

const SLAExpectationCard = ({ stage, stageEnteredAt }: Props) => {
  const sla = getSLAExpectation(stage);
  if (!sla || sla.maxMinutes === 0) return null;

  const delayed = isLikelyDelayed(stage, stageEnteredAt);

  return (
    <div className={`rounded-2xl border p-4 ${
      delayed
        ? "bg-amber-500/5 border-amber-500/20"
        : "bg-card border-border/60"
    } shadow-[var(--shadow-card)]`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          delayed ? "bg-amber-500/10" : "bg-primary/10"
        }`}>
          <Clock className={`w-4 h-4 ${delayed ? "text-amber-600" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">
            {delayed ? sla.delayMessage : sla.description}
          </p>
          <p className={`text-[10px] mt-0.5 ${delayed ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
            Expected: {sla.expectedWindow}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SLAExpectationCard;
