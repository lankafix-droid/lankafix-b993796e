/**
 * BookingCheckpointCard — Lightweight waiting-state checkpoint.
 * Display-only — does not modify booking state.
 */
import { Clock, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface Props {
  title: string;
  pendingAction: string;
  responsibleActor: string;
  recommendedAction?: string;
  showSupportCTA?: boolean;
}

const BookingCheckpointCard = ({
  title,
  pendingAction,
  responsibleActor,
  recommendedAction,
  showSupportCTA = false,
}: Props) => (
  <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-2">
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-primary" />
      <p className="text-xs font-bold text-foreground">{title}</p>
    </div>
    <div className="space-y-1.5 text-[11px]">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Waiting for</span>
        <span className="text-foreground font-medium">{pendingAction}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Handled by</span>
        <Badge variant="outline" className="text-[9px] h-4">{responsibleActor}</Badge>
      </div>
      {recommendedAction && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Next step</span>
          <span className="text-foreground font-medium">{recommendedAction}</span>
        </div>
      )}
    </div>
    {showSupportCTA && (
      <a
        href={whatsappLink(SUPPORT_WHATSAPP, "I have a question about my booking status")}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:underline pt-1"
      >
        <Headphones className="w-3 h-3" />
        Need help? Contact LankaFix
      </a>
    )}
  </div>
);

export default BookingCheckpointCard;
