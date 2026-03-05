import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Clock, Loader2, ShieldCheck, Lock } from "lucide-react";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import { track } from "@/lib/analytics";

interface Props {
  nearbyTechCount: number;
  avgResponseMinutes: number;
  zone: string;
  extendedCoverage?: boolean;
  status: "matching" | "awaiting_partner_confirmation";
}

const MatchingCard = ({ nearbyTechCount, avgResponseMinutes, zone, extendedCoverage, status }: Props) => {
  const isAwaiting = status === "awaiting_partner_confirmation";

  return (
    <div className="bg-card rounded-2xl border p-5 space-y-4 animate-fade-in">
      {/* Pulse header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {isAwaiting ? "Awaiting partner confirmation..." : "Matching technician..."}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isAwaiting
              ? "Partner is reviewing your service request"
              : "Checking verified LankaFix partners in your area"}
          </p>
        </div>
      </div>

      {/* Zone intelligence */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{nearbyTechCount}</p>
          <p className="text-[10px] text-muted-foreground">Technicians nearby</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">~{avgResponseMinutes} min</p>
          <p className="text-[10px] text-muted-foreground">Avg response time</p>
        </div>
      </div>

      {extendedCoverage && (
        <Badge variant="outline" className="text-xs border-warning/30 text-warning">
          Nearby zone technician may be assigned
        </Badge>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Our support team may assign manually if required
      </p>

      {/* WhatsApp fallback */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          track("matching_whatsapp_fallback", { zone });
          window.open(whatsappLink(SUPPORT_WHATSAPP, `Hi, I'm waiting for technician matching in ${zone}`), "_blank");
        }}
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-4 h-4 mr-1.5 text-green-600" />
        Chat with Support on WhatsApp
      </Button>
    </div>
  );
};

export default MatchingCard;
