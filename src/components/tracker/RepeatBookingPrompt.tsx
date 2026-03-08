/**
 * RepeatBookingPrompt — Encourages customers to rebook through LankaFix
 * when they've previously used the same partner.
 */
import { ShieldCheck, Star, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RepeatBookingPromptProps {
  partnerName: string;
  previousBookings: number;
  loyaltyPoints?: number;
  categoryCode?: string;
  onRebook?: () => void;
  className?: string;
}

export default function RepeatBookingPrompt({
  partnerName,
  previousBookings,
  loyaltyPoints = 0,
  onRebook,
  className = "",
}: RepeatBookingPromptProps) {
  if (previousBookings < 1) return null;

  return (
    <div className={`bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">Rebook with LankaFix Protection</span>
      </div>

      <p className="text-xs text-muted-foreground">
        You've booked <strong>{partnerName}</strong> {previousBookings} time{previousBookings > 1 ? "s" : ""} through LankaFix. 
        Book again to keep your service protection and warranty coverage active.
      </p>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[10px] gap-1">
          <ShieldCheck className="w-3 h-3 text-success" />
          Warranty Protected
        </Badge>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Star className="w-3 h-3 text-warning" />
          Priority Matching
        </Badge>
        {loyaltyPoints > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Gift className="w-3 h-3 text-primary" />
            {loyaltyPoints} Points Earned
          </Badge>
        )}
      </div>

      <div className="bg-card rounded-lg p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">Why book through LankaFix?</p>
        <ul className="text-[11px] text-muted-foreground space-y-1">
          <li>✓ Full service warranty coverage</li>
          <li>✓ Mediation support if issues arise</li>
          <li>✓ Loyalty rewards on every booking</li>
          <li>✓ Complete service history & records</li>
        </ul>
      </div>

      {onRebook && (
        <Button onClick={onRebook} size="sm" className="w-full gap-2">
          Book Again with Protection
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
