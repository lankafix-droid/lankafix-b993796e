import { CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { BookingState } from "@/types/booking";
import { TRUST_ICONS, computeTrustScore } from "@/brand/trustSystem";

interface TrustStackCardProps {
  booking: BookingState;
}

const TrustStackCard = ({ booking }: TrustStackCardProps) => {
  const trustScore = computeTrustScore(booking);

  const items = [
    {
      label: "Verified Technician",
      icon: <TRUST_ICONS.ShieldCheck className="w-4 h-4" />,
      status: !!booking.technician,
      detail: booking.technician ? `${booking.technician.name} — ${booking.technician.partnerName}` : "Pending assignment",
    },
    {
      label: "OTP Start Verification",
      icon: <TRUST_ICONS.KeyRound className="w-4 h-4" />,
      status: !!booking.startOtpVerifiedAt,
      detail: booking.startOtpVerifiedAt ? `Verified ${new Date(booking.startOtpVerifiedAt).toLocaleTimeString()}` : "Pending",
    },
    {
      label: "OTP Completion Verification",
      icon: <TRUST_ICONS.KeyRound className="w-4 h-4" />,
      status: !!booking.completionOtpVerifiedAt,
      detail: booking.completionOtpVerifiedAt ? `Verified ${new Date(booking.completionOtpVerifiedAt).toLocaleTimeString()}` : "Pending",
    },
    {
      label: "Digital Timeline Logged",
      icon: <TRUST_ICONS.Clock className="w-4 h-4" />,
      status: booking.timelineEvents.length > 0,
      detail: `${booking.timelineEvents.length} events recorded`,
    },
    {
      label: "Warranty Eligibility",
      icon: <TRUST_ICONS.ShieldCheck className="w-4 h-4" />,
      status: booking.status === "completed" || booking.status === "rated",
      detail: booking.status === "completed" || booking.status === "rated" ? "Active" : "Available after completion",
    },
  ];

  return (
    <div className="bg-card rounded-xl border p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TRUST_ICONS.ShieldCheck className="w-4 h-4 text-primary" />
        Trust Stack
      </h3>

      {/* Trust Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Trust Score</span>
          <span className="font-bold text-foreground">{trustScore}/100</span>
        </div>
        <Progress value={trustScore} className="h-2" />
      </div>

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
