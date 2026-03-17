/**
 * ApprovalCheckpointCard — Human approval gate for booking decisions.
 * Advisory only — does not auto-approve anything.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertCircle } from "lucide-react";

interface Props {
  title: string;
  description: string;
  requestedBy: string;
  aiContributed?: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
  approveLabel?: string;
  declineLabel?: string;
  pending?: boolean;
}

const ApprovalCheckpointCard = ({
  title,
  description,
  requestedBy,
  aiContributed = false,
  onApprove,
  onDecline,
  approveLabel = "Approve",
  declineLabel = "Decline",
  pending = false,
}: Props) => (
  <Card className="border-primary/20">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Requested by: <strong className="text-foreground">{requestedBy}</strong></span>
        {aiContributed && (
          <Badge variant="outline" className="text-[8px]">AI advisory assisted</Badge>
        )}
      </div>

      <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-2.5">
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          No hidden charges. Your approval is required before any work proceeds.
        </p>
      </div>

      {(onApprove || onDecline) && (
        <div className="flex gap-2 pt-1">
          {onApprove && (
            <Button size="sm" onClick={onApprove} disabled={pending} className="flex-1 text-xs">
              {approveLabel}
            </Button>
          )}
          {onDecline && (
            <Button size="sm" variant="outline" onClick={onDecline} disabled={pending} className="flex-1 text-xs">
              {declineLabel}
            </Button>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default ApprovalCheckpointCard;
