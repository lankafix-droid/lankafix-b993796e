/**
 * OperatorCommunicationStatePanel — Shows operator what the customer is seeing.
 * Informational only — does not alter dispatch or booking logic.
 */
import { Eye, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LIFECYCLE_STAGES, type BookingLifecycleStage } from "@/lib/bookingLifecycleModel";
import { getSLAExpectation, isLikelyDelayed } from "@/lib/bookingSLAExpectations";

interface Props {
  stage: BookingLifecycleStage;
  stageEnteredAt?: string | null;
  hasActiveSupport?: boolean;
  hasActiveDispute?: boolean;
}

const OperatorCommunicationStatePanel = ({
  stage,
  stageEnteredAt,
  hasActiveSupport = false,
  hasActiveDispute = false,
}: Props) => {
  const info = LIFECYCLE_STAGES[stage];
  const sla = getSLAExpectation(stage);
  const delayed = sla ? isLikelyDelayed(stage, stageEnteredAt) : false;

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Customer View</h4>
      </div>

      {/* What customer sees */}
      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status shown</span>
          <Badge variant="outline" className={`text-[9px] ${info.badgeBg}`}>{info.label}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Trust note</span>
          <span className="text-foreground text-right max-w-[200px] text-[10px]">{info.trustNote.slice(0, 80)}…</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Actor shown</span>
          <span className="text-foreground font-medium">{info.actorLabel}</span>
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5">
        {delayed && (
          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Delay Detected
          </Badge>
        )}
        {hasActiveSupport && (
          <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
            <MessageCircle className="w-2.5 h-2.5 mr-1" /> Support Active
          </Badge>
        )}
        {hasActiveDispute && (
          <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20">
            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Dispute Open
          </Badge>
        )}
        {!delayed && !hasActiveSupport && !hasActiveDispute && (
          <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Normal
          </Badge>
        )}
      </div>

      {sla && (
        <p className="text-[10px] text-muted-foreground">
          SLA window: {sla.expectedWindow}
          {delayed && " — exceeded"}
        </p>
      )}
    </div>
  );
};

export default OperatorCommunicationStatePanel;
