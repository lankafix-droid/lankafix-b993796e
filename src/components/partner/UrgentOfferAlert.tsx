/**
 * UrgentOfferAlert — High-visibility alert overlay for time-critical dispatch offers.
 * Shows pulsing banner for emergency, expiring-soon, or pilot-critical offers.
 * Designed to plug into real push notifications later.
 */
import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Clock, Zap, Bell, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface UrgentOffer {
  id: string;
  booking_id: string;
  category_code: string;
  is_emergency: boolean;
  expires_at: string;
  service_type?: string | null;
  zone_code?: string | null;
  price_estimate_lkr?: number | null;
}

interface UrgentOfferAlertProps {
  offers: UrgentOffer[];
  onViewOffer: (offerId: string, bookingId: string) => void;
}

function getUrgencyLevel(offer: UrgentOffer): "critical" | "urgent" | "normal" {
  if (offer.is_emergency) return "critical";
  const remaining = (new Date(offer.expires_at).getTime() - Date.now()) / 1000;
  if (remaining < 30) return "critical";
  if (remaining < 60) return "urgent";
  return "normal";
}

const URGENCY_STYLES = {
  critical: {
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    icon: AlertTriangle,
    pulse: true,
    label: "URGENT",
  },
  urgent: {
    bg: "bg-warning/10 border-warning/30",
    text: "text-warning",
    icon: Clock,
    pulse: true,
    label: "EXPIRING",
  },
  normal: {
    bg: "bg-primary/10 border-primary/30",
    text: "text-primary",
    icon: Bell,
    pulse: false,
    label: "NEW",
  },
};

function OfferCountdownCompact({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 30;

  return (
    <span className={`font-mono font-bold text-sm ${isUrgent ? "text-destructive" : "text-warning"}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

export default function UrgentOfferAlert({ offers, onViewOffer }: UrgentOfferAlertProps) {
  const urgentOffers = offers
    .map(o => ({ ...o, urgency: getUrgencyLevel(o) }))
    .filter(o => o.urgency !== "normal")
    .sort((a, b) => {
      const order = { critical: 0, urgent: 1, normal: 2 };
      return order[a.urgency] - order[b.urgency];
    });

  // Fire vibration for critical offers (browser API)
  useEffect(() => {
    const hasCritical = urgentOffers.some(o => o.urgency === "critical");
    if (hasCritical && "vibrate" in navigator) {
      try { navigator.vibrate([200, 100, 200, 100, 300]); } catch {}
    }
  }, [urgentOffers.length]);

  if (urgentOffers.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
      >
        {/* Summary badge */}
        <div className="flex items-center gap-2 px-1">
          <Volume2 className="w-4 h-4 text-destructive animate-pulse" />
          <span className="text-xs font-bold text-destructive">
            {urgentOffers.length} urgent offer{urgentOffers.length > 1 ? "s" : ""} — respond now!
          </span>
        </div>

        {urgentOffers.slice(0, 3).map(offer => {
          const style = URGENCY_STYLES[offer.urgency];
          const Icon = style.icon;

          return (
            <motion.div
              key={offer.id}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:scale-[1.01] ${style.bg} ${style.pulse ? "animate-pulse" : ""}`}
              onClick={() => onViewOffer(offer.id, offer.booking_id)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${style.text}`} />
                  <Badge className={`text-[10px] font-bold ${style.bg} ${style.text} border-none`}>
                    {style.label}
                  </Badge>
                  {offer.is_emergency && (
                    <Badge className="text-[10px] bg-destructive text-destructive-foreground">
                      🔴 EMERGENCY
                    </Badge>
                  )}
                </div>
                <OfferCountdownCompact expiresAt={offer.expires_at} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {offer.category_code} — {offer.service_type || "General"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {offer.zone_code || "Zone TBD"}
                    {offer.price_estimate_lkr ? ` · LKR ${offer.price_estimate_lkr.toLocaleString()}` : ""}
                  </p>
                </div>
                <Button size="sm" className="rounded-xl h-8 text-xs font-bold gap-1">
                  <Zap className="w-3 h-3" /> Respond
                </Button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
