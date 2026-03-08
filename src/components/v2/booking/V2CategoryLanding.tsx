import type { V2CategoryFlow } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, ArrowRight, HelpCircle, Phone, MessageCircle } from "lucide-react";
import { SUPPORT_PHONE } from "@/config/contact";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";

const HERO_IMAGES: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, MOBILE: heroMobile, IT: heroIT,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, SMART_HOME_OFFICE: heroSmartHome,
};

interface Props {
  flow: V2CategoryFlow;
  onContinue: () => void;
}

const V2CategoryLanding = ({ flow, onContinue }: Props) => {
  const heroImg = HERO_IMAGES[flow.code];

  return (
    <div className="space-y-6">
      {/* Hero */}
      {heroImg && (
        <div className="relative rounded-2xl overflow-hidden h-48 md:h-64">
          <img src={heroImg} alt={`LankaFix ${flow.name}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{flow.heroTagline}</h1>
            <p className="text-white/80 text-sm">{flow.heroSubtext}</p>
          </div>
          {flow.availabilityLabel && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-warning/90 text-warning-foreground border-none text-xs">
                {flow.availabilityLabel}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Trust badges */}
      <div className="flex flex-wrap gap-2">
        {flow.trustBadges.map((badge) => (
          <Badge key={badge} variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            {badge}
          </Badge>
        ))}
      </div>

      {/* Common services / quick picks */}
      {flow.quickServices.length > 0 && (
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Common Services</h2>
          <div className="space-y-2">
            {flow.quickServices.map((qs) => (
              <div key={qs.serviceTypeId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground">{qs.label}</span>
                <span className="text-xs font-medium text-primary">{qs.priceLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">4.8</div>
          <div className="text-xs text-muted-foreground">Avg Rating</div>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">500+</div>
          <div className="text-xs text-muted-foreground">Jobs Done</div>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-2xl font-bold text-foreground">2h</span>
          </div>
          <div className="text-xs text-muted-foreground">Avg Response</div>
        </div>
      </div>

      {/* Service overview */}
      <div className="bg-card rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold text-foreground">All Services</h2>
        <div className="grid grid-cols-2 gap-2">
          {flow.serviceTypes.filter(s => s.id !== "not_sure").map((st) => (
            <div key={st.id} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Star className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Not Sure CTA */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Not sure what you need?</p>
          <p className="text-xs text-muted-foreground">Our technician will diagnose and recommend the right service</p>
        </div>
      </div>

      {/* Support strip */}
      <div className="flex gap-2">
        <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
          <Phone className="w-4 h-4" /> Call Us
        </a>
        <a href="https://wa.me/94770001234" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2">
        Get Started <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2CategoryLanding;
