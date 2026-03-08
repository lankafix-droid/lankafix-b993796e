import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, CreditCard, Headphones, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import type { CategoryCode } from "@/types/booking";
import {
  getProtectionConfig,
  getProtectionFee,
  getProtectionBenefits,
  getAntiBypassNotice,
  TRUST_BADGES,
} from "@/engines/bookingProtectionEngine";
import { formatLKR } from "@/engines/paymentEngine";

interface BookingProtectionCardProps {
  categoryCode: CategoryCode;
  isEmergency?: boolean;
  onConfirmPayment: (fee: number, protectionType: string) => void;
  onBack?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Headphones: <Headphones className="w-4 h-4" />,
};

const BookingProtectionCard = ({
  categoryCode,
  isEmergency = false,
  onConfirmPayment,
}: BookingProtectionCardProps) => {
  const [confirming, setConfirming] = useState(false);
  const config = getProtectionConfig(categoryCode);
  const fee = getProtectionFee(categoryCode, isEmergency);
  const benefits = getProtectionBenefits();
  const antiBypass = getAntiBypassNotice();

  const handleConfirm = () => {
    setConfirming(true);
    // Simulate payment processing
    setTimeout(() => {
      onConfirmPayment(fee, config.type);
      setConfirming(false);
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Secure Your Booking
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{config.uiMessage}</p>
      </div>

      {/* Protection Card */}
      <Card className="border-primary/30 shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="secondary" className="mb-2 text-xs font-medium">
                {config.label}
              </Badge>
              <CardTitle className="text-lg">{config.label}</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-primary">{formatLKR(fee)}</p>
              <p className="text-xs text-muted-foreground">one-time fee</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{config.description}</p>

          {/* Benefits */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              This payment helps LankaFix
            </p>
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>

          {/* Adjustable note for site visit */}
          {config.adjustableAgainstInvoice && (
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                <span className="font-semibold">Good news:</span> If you proceed with the project, this fee is deducted from your final invoice.
              </p>
            </div>
          )}

          {/* Payment summary */}
          <div className="border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{config.label}</span>
              <span className="font-semibold text-foreground">{formatLKR(fee)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Remaining payment</span>
              <span className="text-muted-foreground">After service completion</span>
            </div>
          </div>

          {/* Refund policy */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{config.refundPolicy}</span>
          </div>

          {/* CTA */}
          <Button
            variant="hero"
            size="lg"
            className="w-full text-base font-bold"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {config.ctaLabel}
              </>
            )}
          </Button>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-2 justify-center pt-1">
            {TRUST_BADGES.map((badge) => (
              <Badge
                key={badge.label}
                variant="outline"
                className="text-xs gap-1 font-normal border-border"
              >
                {ICON_MAP[badge.icon]}
                {badge.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anti-bypass notice */}
      <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-xl p-3">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{antiBypass}</p>
      </div>

      {/* Post-payment info preview */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">After payment you'll see</p>
        <div className="grid grid-cols-2 gap-2">
          {["Booking reference", "Provider assignment", "Technician ETA", "LankaFix support"].map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingProtectionCard;
