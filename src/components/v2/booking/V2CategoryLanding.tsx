import type { V2CategoryFlow, V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, ArrowRight, Stethoscope, Zap, Eye, Award, Lock, CheckCircle2, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CategoryContentIntelligence from "@/components/content/CategoryContentIntelligence";
import { useMemo } from "react";
import { getArrivalEstimate } from "@/utils/arrivalEstimate";

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

const TRUST_ITEMS = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Technicians" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Service Warranty" },
  { icon: <Lock className="w-3.5 h-3.5" />, label: "Secure Booking" },
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
  const supportsEmergency = EMERGENCY_CATEGORIES.includes(flow.code);
  const arrivalEstimate = useMemo(() => getArrivalEstimate(), []);

  return (
    <div className="space-y-5">
      {/* Hero with dark overlay */}
      {heroImg && (
        <motion.div
          className="relative rounded-2xl overflow-hidden h-48 md:h-56"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img src={heroImg} alt={`LankaFix ${flow.name}`} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)" }}
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
        </motion.div>
      )}

      {/* Compact info row: pricing + arrival + coverage */}
      <motion.div
        className="flex items-center justify-between text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">📍 Greater Colombo</span>
          <span className="inline-flex items-center gap-1 text-success font-medium">
            <Timer className="w-3 h-3" />
            {arrivalEstimate}
          </span>
        </div>
        <Badge variant="outline" className={`text-[10px] gap-1 ${pricingBadge.className}`}>
          {pricingBadge.icon}
          {pricingBadge.label}
        </Badge>
      </motion.div>

      {/* Trust badges — compact inline */}
      <motion.div
        className="flex flex-wrap gap-x-4 gap-y-1.5"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        {TRUST_ITEMS.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <span className="text-primary">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </motion.div>

      {/* Quick Services with pricing — the key conversion element */}
      {flow.quickServices.length > 0 && (
        <motion.div
          className="bg-card rounded-2xl border border-border/40 p-4 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h2 className="font-bold text-foreground text-sm">Common Services & Pricing</h2>
          <div className="space-y-0">
            {flow.quickServices.map((qs, i) => (
              <div
                key={qs.serviceTypeId}
                className={`flex items-center justify-between py-2.5 ${i < flow.quickServices.length - 1 ? "border-b border-border/30" : ""}`}
              >
                <span className="text-sm text-foreground font-medium">{qs.label}</span>
                <span className="text-xs font-bold text-primary shrink-0 ml-2">{qs.priceLabel}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/20">
            Final price confirmed after technician diagnosis. No work without your approval.
          </p>
        </motion.div>
      )}

      {/* Emergency toggle */}
      {supportsEmergency && onEmergencyToggle && (
        <motion.button
          onClick={() => onEmergencyToggle(!isEmergency)}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border w-full transition-all text-sm font-medium ${
            isEmergency
              ? "bg-warning/10 border-warning/30 text-warning"
              : "bg-card border-border/40 text-muted-foreground hover:border-warning/20"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEmergency ? "bg-warning/20" : "bg-muted/50"}`}>
            <Zap className={`w-4 h-4 ${isEmergency ? "text-warning" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 text-left">
            <span className="block font-semibold text-sm">Emergency — Within 2 Hours</span>
            {isEmergency && <span className="text-[11px] block mt-0.5 text-warning/80">+25% surcharge applies</span>}
          </div>
          {isEmergency && (
            <Badge className="bg-warning/20 text-warning border-0 text-xs">Active</Badge>
          )}
        </motion.button>
      )}

      {/* Diagnose CTA — for unsure users */}
      <Link
        to="/diagnose"
        className="block bg-primary/5 border border-primary/15 rounded-2xl p-3.5 hover:bg-primary/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Not sure what's wrong?</p>
            <p className="text-[11px] text-muted-foreground">Diagnose your problem in 30 seconds</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
      </Link>

      {/* Primary CTA */}
      <Button onClick={onContinue} size="lg" className="w-full gap-2 min-h-[52px] rounded-2xl text-base font-bold">
        Get Started <ArrowRight className="w-4 h-4" />
      </Button>

      {/* Category Content Intelligence */}
      <CategoryContentIntelligence categoryCode={flow.code} categoryLabel={flow.name} />
    </div>
  );
};

export default V2CategoryLanding;
