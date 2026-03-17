/**
 * BookingExceptionCard — Displays exception/escalation states.
 * Advisory only — does not modify booking state.
 */
import { AlertTriangle, Headphones, Phone, UserCheck } from "lucide-react";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface Props {
  type: "no_partner" | "quote_delayed" | "technician_declined" | "escalated" | "dispute" | "schedule_conflict" | "service_delayed";
  message?: string;
}

const EXCEPTION_CONFIG: Record<Props["type"], {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  no_partner: {
    label: "Expanding Search",
    description: "All nearby technicians are busy. Our team is personally finding someone for you.",
    icon: Headphones,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  quote_delayed: {
    label: "Quote Delayed",
    description: "The quote is taking longer than expected. Our team is following up.",
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  technician_declined: {
    label: "Technician Unavailable",
    description: "The assigned technician is no longer available. We're finding a replacement.",
    icon: UserCheck,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  escalated: {
    label: "Team Assisting",
    description: "A senior operator is personally handling your booking to ensure the best outcome.",
    icon: Headphones,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  dispute: {
    label: "Dispute Under Review",
    description: "Our mediation team is reviewing your case and will contact you shortly.",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
  },
  schedule_conflict: {
    label: "Schedule Conflict",
    description: "There's a scheduling conflict. Our team is coordinating a new time.",
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  service_delayed: {
    label: "Service Delayed",
    description: "The service is running behind schedule. Updated timing will be shared shortly.",
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
};

const BookingExceptionCard = ({ type, message }: Props) => {
  const config = EXCEPTION_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border border-border/60 p-4 ${config.bgColor} space-y-3`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${config.color}`}>{config.label}</p>
          <p className="text-[11px] text-foreground/80 mt-0.5">{message || config.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={whatsappLink("I need help with my booking")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:underline"
        >
          <Phone className="w-3 h-3" />
          Contact Support
        </a>
      </div>
    </div>
  );
};

export default BookingExceptionCard;
