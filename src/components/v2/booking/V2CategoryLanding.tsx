import type { V2CategoryFlow, V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, ArrowRight, Stethoscope, Phone, MessageCircle, Zap } from "lucide-react";
import { SUPPORT_PHONE } from "@/config/contact";
import { Link } from "react-router-dom";

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

const PRICING_BADGES: Record<V2PricingArchetype, { label: string; className: string }> = {
  fixed_price: { label: "Fixed Price", className: "bg-success/10 text-success border-success/20" },
  diagnostic_first: { label: "Diagnostic First", className: "bg-warning/10 text-warning border-warning/20" },
  quote_required: { label: "Quote Required", className: "bg-primary/10 text-primary border-primary/20" },
};

const BOOKING_MODEL_LABELS: Record<string, string> = {
  fast_book: "Book instantly — fixed pricing",
  diagnostic_first: "Technician diagnoses first, then quotes",
  inspection_consultation: "Site inspection required before final quote",
};

// Categories that support emergency mode
const EMERGENCY_CATEGORIES = ["AC", "MOBILE", "IT", "CONSUMER_ELEC"];

interface Props {
  flow: V2CategoryFlow;
  onContinue: () => void;
  isEmergency?: boolean;
  onEmergencyToggle?: (v: boolean) => void;
}

const V2CategoryLanding = ({ flow, onContinue, isEmergency, onEmergencyToggle }: Props) => {
  const heroImg = HERO_IMAGES[flow.code];
  const pricingBadge = PRICING_BADGES[flow.pricingArchetype];
  const supportsEmergency = EMERGENCY_CATEGORIES.includes(flow.code);

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

      {/* Zone + pricing archetype */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">📍 Greater Colombo</span>
        <Badge variant="outline" className={`text-xs ${pricingBadge.className}`}>
          {pricingBadge.label}
        </Badge>
      </div>

      {/* Booking model explanation */}
      <div className="bg-muted/30 rounded-xl p-3 text-sm text-muted-foreground">
        {BOOKING_MODEL_LABELS[flow.bookingModel]}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-2">
        {flow.trustBadges.map((badge) => (
          <Badge key={badge} variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            {badge}
          </Badge>
        ))}
      </div>

      {/* Emergency Mode Toggle */}
      {supportsEmergency && onEmergencyToggle && (
        <button
          onClick={() => onEmergencyToggle(!isEmergency)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border w-full transition-all text-sm font-medium ${
            isEmergency
              ? "bg-warning/10 border-warning/30 text-warning"
              : "bg-card border-border text-muted-foreground hover:border-warning/20"
          }`}
        >
          <Zap className={`w-4 h-4 ${isEmergency ? "text-warning" : ""}`} />
          <div className="flex-1 text-left">
            <span>Emergency — Within 2 Hours</span>
            {isEmergency && <span className="text-xs block mt-0.5 text-warning/80">+25% surcharge applies</span>}
          </div>
          {isEmergency && (
            <Badge className="bg-warning/20 text-warning border-0 text-xs">Active</Badge>
          )}
        </button>
      )}

      {flow.quickServices.length > 0 && (
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Common Services</h2>
          <div className="space-y-2">
            {flow.quickServices.map((qs) => (
              <div key={qs.serviceTypeId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{qs.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    qs.pricingArchetype === "fixed_price" ? "bg-success/10 text-success" :
                    qs.pricingArchetype === "diagnostic_first" ? "bg-warning/10 text-warning" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {qs.pricingArchetype === "fixed_price" ? "Fixed" : qs.pricingArchetype === "diagnostic_first" ? "Diagnostic" : "Quote"}
                  </span>
                </div>
                <span className="text-xs font-medium text-primary">{qs.priceLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Diagnose My Problem CTA */}
      <Link
        to="/diagnose"
        className="block bg-primary/5 border border-primary/20 rounded-xl p-4 hover:bg-primary/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Diagnose My Problem</p>
            <p className="text-xs text-muted-foreground">Takes less than 30 seconds</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
      </Link>

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
