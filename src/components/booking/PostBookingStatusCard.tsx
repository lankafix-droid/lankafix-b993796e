/**
 * PostBookingStatusCard — Customer-friendly booking status display.
 * Advisory only — does not modify booking state.
 */
import { Clock, Search, UserCheck, FileText, Wrench, CheckCircle2, Headphones } from "lucide-react";
import {
  LIFECYCLE_STAGES,
  type BookingLifecycleStage,
} from "@/lib/bookingLifecycleModel";

interface Props {
  stage: BookingLifecycleStage;
}

const STAGE_ICONS: Partial<Record<BookingLifecycleStage, React.ElementType>> = {
  booking_submitted: Clock,
  awaiting_operator_review: Search,
  awaiting_partner_selection: Search,
  awaiting_partner_response: UserCheck,
  awaiting_quote: FileText,
  quote_ready: FileText,
  awaiting_quote_approval: FileText,
  partner_assigned: UserCheck,
  en_route: UserCheck,
  service_in_progress: Wrench,
  completed: CheckCircle2,
  escalated: Headphones,
};

const PostBookingStatusCard = ({ stage }: Props) => {
  const info = LIFECYCLE_STAGES[stage];
  const Icon = STAGE_ICONS[stage] || Clock;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${info.badgeBg.split(" ")[0]}`}>
          <Icon className={`w-5 h-5 ${info.colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{info.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{info.description}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/30">
        <p className="text-[10px] text-primary/80 italic">{info.trustNote}</p>
        <span className="inline-block text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 mt-1.5">
          {info.actorLabel}
        </span>
      </div>
    </div>
  );
};

export default PostBookingStatusCard;
