import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Lock, CreditCard, Headphones, CheckCircle2, Info,
  AlertTriangle, QrCode, Building2, Wallet, Timer, Eye, Shield,
  ChevronDown, ChevronUp, XCircle, RefreshCw,
} from "lucide-react";
import type { CategoryCode } from "@/types/booking";
import {
  getProtectionConfig,
  getProtectionFee,
  getProtectionBenefits,
  getAntiBypassNotice,
  TRUST_BADGES,
  PAYMENT_METHOD_OPTIONS,
  SLOT_HOLD_SECONDS,
  type PaymentMethodId,
} from "@/engines/bookingProtectionEngine";
import { formatLKR } from "@/engines/paymentEngine";
import { track } from "@/lib/analytics";

interface BookingProtectionCardProps {
  categoryCode: CategoryCode;
  isEmergency?: boolean;
  onConfirmPayment: (fee: number, protectionType: string, paymentMethod: PaymentMethodId) => void;
  onBack?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Headphones: <Headphones className="w-4 h-4" />,
  QrCode: <QrCode className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  Wallet: <Wallet className="w-4 h-4" />,
  Eye: <Eye className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
};

const REFUND_CHIP_STYLES: Record<string, string> = {
  adjustable: "bg-success/10 text-success border-success/20",
  non_refundable: "bg-muted text-muted-foreground border-border",
  sla_protected: "bg-primary/10 text-primary border-primary/20",
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BookingProtectionCard = ({
  categoryCode,
  isEmergency = false,
  onConfirmPayment,
}: BookingProtectionCardProps) => {
  const config = getProtectionConfig(categoryCode);
  const fee = getProtectionFee(categoryCode, isEmergency);
  const benefits = getProtectionBenefits();
  const antiBypass = getAntiBypassNotice();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>("lankaqr");
  const [confirming, setConfirming] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [slotSeconds, setSlotSeconds] = useState(SLOT_HOLD_SECONDS);
  const [slotExpired, setSlotExpired] = useState(false);

  // Slot hold countdown
  useEffect(() => {
    if (slotExpired || confirming) return;
    const interval = setInterval(() => {
      setSlotSeconds((prev) => {
        if (prev <= 1) {
          setSlotExpired(true);
          track("booking_slot_expired", { category: categoryCode });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [slotExpired, confirming, categoryCode]);

  const handleConfirm = useCallback(() => {
    setConfirming(true);
    setPaymentFailed(false);
    track("booking_protection_attempt", { category: categoryCode, method: selectedMethod, fee });

    // Simulate payment (replace with real gateway)
    setTimeout(() => {
      // 90% success for demo
      const success = Math.random() > 0.1;
      if (success) {
        track("booking_protection_paid", { category: categoryCode, method: selectedMethod, fee, type: config.type });
        onConfirmPayment(fee, config.type, selectedMethod);
      } else {
        setPaymentFailed(true);
        track("booking_protection_failed", { category: categoryCode, method: selectedMethod });
      }
      setConfirming(false);
    }, 2000);
  }, [categoryCode, selectedMethod, fee, config.type, onConfirmPayment]);

  const isTimeLow = slotSeconds < 120 && slotSeconds > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Reserve Your Technician
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{config.uiMessage}</p>
      </div>

      {/* Slot Timer */}
      {!slotExpired && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
          isTimeLow ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground"
        }`}>
          <Timer className="w-3.5 h-3.5" />
          <span>Your secure booking slot will be held for</span>
          <span className="font-bold tabular-nums">{formatCountdown(slotSeconds)}</span>
        </div>
      )}

      {slotExpired && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center space-y-2">
          <p className="text-sm font-medium text-destructive">Your booking slot has expired</p>
          <Button variant="outline" size="sm" onClick={() => { setSlotExpired(false); setSlotSeconds(SLOT_HOLD_SECONDS); }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Request New Slot
          </Button>
        </div>
      )}

      {/* Main Payment Card */}
      <Card className="border-primary/30 shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

        <CardContent className="p-5 space-y-5">
          {/* Category-specific message */}
          <p className="text-sm text-muted-foreground">{config.categoryMessage}</p>

          {/* ── PAY NOW / PAY LATER ── */}
          <div className="space-y-3">
            {/* Pay Now */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Pay Now</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{config.label}</p>
                  <Badge variant="outline" className={`text-[10px] mt-1 ${REFUND_CHIP_STYLES[config.refundChipVariant]}`}>
                    {config.refundChipLabel}
                  </Badge>
                </div>
                <p className="text-2xl font-extrabold text-primary">{formatLKR(fee)}</p>
              </div>
            </div>

            {/* Pay Later */}
            <div className="bg-muted/40 border border-border rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pay Later</p>
              <p className="text-sm text-foreground">{config.payLaterLabel}</p>
            </div>
          </div>

          {/* ── Payment Methods ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHOD_OPTIONS.filter(m => m.available).map((method) => (
                <button
                  key={method.id}
                  onClick={() => { setSelectedMethod(method.id); setPaymentFailed(false); }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selectedMethod === method.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={selectedMethod === method.id ? "text-primary" : "text-muted-foreground"}>
                      {ICON_MAP[method.icon]}
                    </span>
                    <span className="text-sm font-medium text-foreground">{method.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{method.description}</p>
                  {method.instant && (
                    <Badge variant="secondary" className="text-[9px] mt-1 font-normal">Instant</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Failed */}
          {paymentFailed && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">Payment unsuccessful</p>
              </div>
              <p className="text-xs text-muted-foreground">Please try again or select another payment method.</p>
            </div>
          )}

          {/* Benefits (collapsible) */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-full"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? "Hide details" : "Why is this payment needed?"}
          </button>

          {showDetails && (
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
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
          )}

          {/* Adjustable note for site visits */}
          {config.adjustableAgainstInvoice && (
            <div className="flex items-start gap-2 bg-success/5 border border-success/20 rounded-lg p-3">
              <Info className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                <span className="font-semibold">Good news:</span> If you proceed with the project, this fee is deducted from your final invoice.
              </p>
            </div>
          )}

          {/* CTA */}
          <Button
            variant="hero"
            size="lg"
            className="w-full text-base font-bold"
            onClick={handleConfirm}
            disabled={confirming || slotExpired}
          >
            {confirming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Processing Payment...
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {paymentFailed ? "Retry Payment" : config.ctaLabel}
              </>
            )}
          </Button>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {TRUST_BADGES.map((badge) => (
              <Badge
                key={badge.label}
                variant="outline"
                className="text-[10px] gap-1 font-normal border-border"
              >
                {ICON_MAP[badge.icon]}
                {badge.label}
              </Badge>
            ))}
          </div>

          {/* Refund policy */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{config.refundPolicy}</span>
          </div>
        </CardContent>
      </Card>

      {/* Anti-bypass notice */}
      <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-xl p-3">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{antiBypass}</p>
      </div>

      {/* Post-payment preview */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">After payment you'll receive</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            "Booking reference",
            "Provider assignment status",
            "Technician ETA",
            "LankaFix support access",
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingProtectionCard;
