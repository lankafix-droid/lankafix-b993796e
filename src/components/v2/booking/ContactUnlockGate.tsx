/**
 * ContactUnlockGate
 * Masks provider contact details until booking protection payment is confirmed.
 * Renders locked state or unlocked provider info.
 */
import { Lock, Phone, MessageSquare, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isContactUnlocked } from "@/engines/bookingProtectionEngine";

interface ProviderContact {
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  businessName?: string;
}

interface ContactUnlockGateProps {
  protectionStatus: string | null;
  provider?: ProviderContact;
  serviceMode?: string;
  className?: string;
}

const ContactUnlockGate = ({
  protectionStatus,
  provider,
  serviceMode,
  className = "",
}: ContactUnlockGateProps) => {
  const unlocked = isContactUnlocked(protectionStatus);

  // ─── Locked State ───
  if (!unlocked) {
    return (
      <div className={`bg-muted/50 border border-dashed border-border rounded-xl p-5 text-center space-y-3 ${className}`}>
        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Provider details locked</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete your LankaFix Booking Protection payment to unlock provider contact details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {["Phone number", "WhatsApp", "Business address"].map((item) => (
            <Badge key={item} variant="outline" className="text-[10px] font-normal text-muted-foreground gap-1">
              <Lock className="w-3 h-3" />
              {item}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // ─── Unlocked State ───
  if (!provider) {
    return (
      <div className={`bg-success/5 border border-success/20 rounded-xl p-5 text-center space-y-2 ${className}`}>
        <ShieldCheck className="w-6 h-6 text-success mx-auto" />
        <p className="text-sm font-medium text-foreground">Booking confirmed — awaiting provider acceptance</p>
        <p className="text-xs text-muted-foreground">Provider details will appear once they accept your job request.</p>
      </div>
    );
  }

  const showAddress = serviceMode === "drop_off";

  return (
    <div className={`bg-card border border-success/20 rounded-xl p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-success" />
        <span className="text-xs font-semibold text-success uppercase tracking-wide">Contact Unlocked</span>
      </div>

      <div className="space-y-1">
        <p className="text-base font-bold text-foreground">{provider.name}</p>
        {provider.businessName && (
          <p className="text-sm text-muted-foreground">{provider.businessName}</p>
        )}
      </div>

      <div className="space-y-2">
        {provider.phone && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => window.open(`tel:${provider.phone}`, "_blank")}
          >
            <Phone className="w-4 h-4 text-primary" />
            {provider.phone}
          </Button>
        )}
        {provider.whatsapp && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => window.open(`https://wa.me/${provider.whatsapp}`, "_blank")}
          >
            <MessageSquare className="w-4 h-4 text-success" />
            WhatsApp
          </Button>
        )}
        {showAddress && provider.address && (
          <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{provider.address}</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        LankaFix Booking Protection active · Warranty & mediation support included
      </p>
    </div>
  );
};

export default ContactUnlockGate;
