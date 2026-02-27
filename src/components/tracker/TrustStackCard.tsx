import { ShieldCheck, KeyRound, Clock, Shield, CheckCircle2, XCircle } from "lucide-react";
import type { BookingState } from "@/types/booking";

interface TrustStackCardProps {
  booking: BookingState;
}

const TrustStackCard = ({ booking }: TrustStackCardProps) => {
  const items = [
    {
      label: "Verified Technician",
      icon: <ShieldCheck className="w-4 h-4" />,
      status: !!booking.technician,
      detail: booking.technician ? `${booking.technician.name} — ${booking.technician.partnerName}` : "Pending assignment",
    },
    {
      label: "OTP Start Verification",
      icon: <KeyRound className="w-4 h-4" />,
      status: !!booking.startOtpVerifiedAt,
      detail: booking.startOtpVerifiedAt ? `Verified ${new Date(booking.startOtpVerifiedAt).toLocaleTimeString()}` : "Pending",
    },
    {
      label: "OTP Completion Verification",
      icon: <KeyRound className="w-4 h-4" />,
      status: !!booking.completionOtpVerifiedAt,
      detail: booking.completionOtpVerifiedAt ? `Verified ${new Date(booking.completionOtpVerifiedAt).toLocaleTimeString()}` : "Pending",
    },
    {
      label: "Digital Timeline Logged",
      icon: <Clock className="w-4 h-4" />,
      status: booking.timelineEvents.length > 0,
      detail: `${booking.timelineEvents.length} events recorded`,
    },
    {
      label: "Warranty Eligibility",
      icon: <Shield className="w-4 h-4" />,
      status: booking.status === "completed" || booking.status === "rated",
      detail: booking.status === "completed" || booking.status === "rated" ? "Active" : "Available after completion",
    },
  ];

  return (
    <div className="bg-card rounded-xl border p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        Trust Stack
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.status ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {item.status ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustStackCard;
