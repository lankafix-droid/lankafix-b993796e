import type { V2CategoryFlow, V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Clock, ArrowRight, Stethoscope, Phone, MessageCircle, Zap, Eye, Award, Lock, CheckCircle2 } from "lucide-react";
import { SUPPORT_PHONE } from "@/config/contact";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroSupplies from "@/assets/hero-supplies.jpg";

const HERO_IMAGES: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, MOBILE: heroMobile, IT: heroIT,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, SMART_HOME_OFFICE: heroSmartHome,
  COPIER: heroCopier, PRINT_SUPPLIES: heroSupplies,
};

const PRICING_BADGES: Record<V2PricingArchetype, { label: string; className: string; icon: React.ReactNode }> = {
  fixed_price: { label: "Fixed Price", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="w-3 h-3" /> },
  diagnostic_first: { label: "Diagnostic First", className: "bg-warning/10 text-warning border-warning/20", icon: <Eye className="w-3 h-3" /> },
  quote_required: { label: "Quote Required", className: "bg-primary/10 text-primary border-primary/20", icon: <Clock className="w-3 h-3" /> },
};

const BOOKING_MODEL_LABELS: Record<string, { title: string; desc: string }> = {
  fast_book: { title: "Instant Booking", desc: "Fixed pricing — book and get a technician assigned immediately" },
  diagnostic_first: { title: "Diagnostic First", desc: "Technician diagnoses first, then provides a detailed quote for your approval" },
  inspection_consultation: { title: "Inspection Required", desc: "Site inspection required before final quote — inspection fee deductible from project cost" },
};

const TRUST_ITEMS = [
  { icon: <ShieldCheck className="w-4 h-4" />, label: "Verified Technicians" },
  { icon: <Eye className="w-4 h-4" />, label: "Transparent Pricing" },
  { icon: <Award className="w-4 h-4" />, label: "Service Warranty" },
  { icon: <Lock className="w-4 h-4" />, label: "Secure Booking" },
];

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
  const bookingModel = BOOKING_MODEL_LABELS[flow.bookingModel];
  const supportsEmergency = EMERGENCY_CATEGORIES.includes(flow.code);

  return (
    <div className="space-y-6">
      {/* Hero with dark overlay */}
      {heroImg && (
        <motion.div
          className="relative rounded-2xl overflow-hidden h-52 md:h-64"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img src={heroImg} alt={`LankaFix ${flow.name}`} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.18) 100%)" }}
          />
          <div className="absolute bottom-4 left-4 right-4">
            <motion.h1
              className="text-2xl md:text-3xl font-extrabold mb-1"
              style={{ color: "#FFFFFF", textShadow: "0px 2px 8px rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {flow.heroTagline}
            </motion.h1>
            <motion.p
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.8)", textShadow: "0px 1px 4px rgba(0,0,0,0.4)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              {flow.heroSubtext}
            </motion.p>
          </div>
          {flow.availabilityLabel && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-warning/90 text-warning-foreground border-none text-xs font-semibold shadow-sm">
                {flow.availabilityLabel}
              </Badge>
            </div>
          )}
        </motion.div>
      )}

      {/* Trust badges row — animated */}
      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {flow.trustBadges.map((badge, i) => (
          <motion.span
            key={badge}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.06, duration: 0.3 }}
          >
            <Badge variant="secondary" className="gap-1.5 text-xs py-1.5 px-3 rounded-full">
              <ShieldCheck className="w-3 h-3 text-primary" />
              {badge}
            </Badge>
          </motion.span>
        ))}
      </motion.div>

      {/* Pricing archetype + zone */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <span className="text-xs text-muted-foreground">📍 Greater Colombo</span>
        <Badge variant="outline" className={`text-xs gap-1 ${pricingBadge.className}`}>
          {pricingBadge.icon}
          {pricingBadge.label}
        </Badge>
      </motion.div>

      {/* Smart Price Estimator — historical data */}
      <SmartPriceEstimator categoryCode={flow.code} />

      {/* Booking model card */}
      {bookingModel && (
        <motion.div
          className="bg-card rounded-2xl border p-4 space-y-1.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <h3 className="text-sm font-bold text-foreground">{bookingModel.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{bookingModel.desc}</p>
        </motion.div>
      )}

      {/* Emergency toggle */}
      {supportsEmergency && onEmergencyToggle && (
        <motion.button
          onClick={() => onEmergencyToggle(!isEmergency)}
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border w-full transition-all text-sm font-medium ${
            isEmergency
              ? "bg-warning/10 border-warning/30 text-warning"
              : "bg-card border-border text-muted-foreground hover:border-warning/20"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEmergency ? "bg-warning/20" : "bg-muted/50"}`}>
            <Zap className={`w-5 h-5 ${isEmergency ? "text-warning" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 text-left">
            <span className="block font-semibold">Emergency — Within 2 Hours</span>
            {isEmergency && <span className="text-[11px] block mt-0.5 text-warning/80">+25% surcharge applies</span>}
          </div>
          {isEmergency && (
            <Badge className="bg-warning/20 text-warning border-0 text-xs">Active</Badge>
          )}
        </motion.button>
      )}

      {/* Quick Services with pricing */}
      {flow.quickServices.length > 0 && (
        <motion.div
          className="bg-card rounded-2xl border p-5 space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2 className="font-bold text-foreground">Common Services & Pricing</h2>
          <div className="space-y-0">
            {flow.quickServices.map((qs, i) => (
              <div
                key={qs.serviceTypeId}
                className={`flex items-center justify-between py-3 ${i < flow.quickServices.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-sm text-foreground font-medium">{qs.label}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                    qs.pricingArchetype === "fixed_price" ? "bg-success/10 text-success" :
                    qs.pricingArchetype === "diagnostic_first" ? "bg-warning/10 text-warning" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {qs.pricingArchetype === "fixed_price" ? "Fixed" : qs.pricingArchetype === "diagnostic_first" ? "Diagnostic" : "Quote"}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary shrink-0 ml-2">{qs.priceLabel}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
            Final price confirmed after technician diagnosis. No work without your approval.
          </p>
        </motion.div>
      )}

      {/* All services grid */}
      <motion.div
        className="bg-card rounded-2xl border p-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        <h2 className="font-bold text-foreground">All Services</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {flow.serviceTypes.filter(s => s.id !== "not_sure").map((st) => (
            <div key={st.id} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span>{st.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Platform trust section */}
      <motion.div
        className="bg-navy rounded-2xl p-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <h3 className="text-sm font-bold text-navy-foreground">Why Choose LankaFix?</h3>
        <div className="grid grid-cols-2 gap-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary">{item.icon}</span>
              </div>
              <span className="text-[11px] font-medium text-navy-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Diagnose CTA */}
      <Link
        to="/diagnose"
        className="block bg-primary/5 border border-primary/20 rounded-2xl p-4 hover:bg-primary/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Not sure what's wrong?</p>
            <p className="text-xs text-muted-foreground">Diagnose your problem in 30 seconds</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
      </Link>

      {/* Support strip */}
      <div className="flex gap-2">
        <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-2xl py-3 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
          <Phone className="w-4 h-4" /> Call Us
        </a>
        <a href="https://wa.me/94770001234" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-card border rounded-2xl py-3 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2 min-h-[52px] rounded-2xl text-base font-bold">
        Get Started <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2CategoryLanding;
