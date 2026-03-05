import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookingState, CategoryCode } from "@/types/booking";
import { maskTechnicianName } from "@/types/booking";

interface Props {
  previousBooking: BookingState;
  categoryCode: CategoryCode;
}

const RepeatServiceBanner = ({ previousBooking, categoryCode }: Props) => {
  const techName = previousBooking.technician
    ? maskTechnicianName(previousBooking.technician.name)
    : "your technician";
  const completedDate = previousBooking.completionOtpVerifiedAt || previousBooking.createdAt;
  const daysSince = Math.floor((Date.now() - new Date(completedDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Need {techName} again?
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Book through LankaFix to keep your warranty protection active.
            Last service was {daysSince} days ago.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-[10px] gap-1 border-success/20 text-success">
              <ShieldCheck className="w-3 h-3" /> Warranty Protected
            </Badge>
          </div>
          <Button asChild size="sm" variant="hero" className="w-full">
            <Link to={`/category/${categoryCode}`}>
              Book Same Service Again
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RepeatServiceBanner;
