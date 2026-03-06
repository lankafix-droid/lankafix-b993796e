import { useParams, Link, useNavigate } from "react-router-dom";
import { getCategoryByCode } from "@/data/categories";
import { categoryPricingRules } from "@/config/pricingRules";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import TrustRibbon from "@/components/landing/TrustRibbon";
import SLAChip from "@/components/ui/SLAChip";
import RepeatServiceBanner from "@/components/tracker/RepeatServiceBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Zap, Stethoscope, FileText, ShieldCheck, KeyRound, Award, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import type { CategoryCode, ServiceMode } from "@/types/booking";
import { SERVICE_MODE_LABELS } from "@/types/booking";
import { track } from "@/lib/analytics";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";
import heroSupplies from "@/assets/hero-supplies.jpg";

const HERO_IMAGES: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, COPIER: heroCopier,
  SMART_HOME_OFFICE: heroSmartHome, PRINT_SUPPLIES: heroSupplies,
};

const HERO_ALT: Record<string, string> = {
  AC: "LankaFix AC technician servicing a split unit",
  CCTV: "LankaFix CCTV installation specialist",
  IT: "LankaFix IT support engineer repairing a laptop",
  MOBILE: "LankaFix mobile repair technician fixing a phone",
  SOLAR: "LankaFix solar panel technician on rooftop",
  CONSUMER_ELEC: "LankaFix electronics repair technician",
  COPIER: "LankaFix copier repair specialist",
  SMART_HOME_OFFICE: "LankaFix smart home technician",
  PRINT_SUPPLIES: "LankaFix printing supplies",
};

const TRUST_BADGES = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified" },
  { icon: <KeyRound className="w-3.5 h-3.5" />, label: "OTP Protected" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Warranty" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
];

const CategoryPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { setDraftCategory, setDraftService, setDraftMode, setDraftEmergency, getRepeatBooking } = useBookingStore();
  const category = getCategoryByCode(code || "");
  const [modeFilter, setModeFilter] = useState<ServiceMode | "all">("all");
  const [emergency, setEmergency] = useState(false);

  const repeatBooking = category ? getRepeatBooking(category.code) : undefined;

  useEffect(() => {
    if (category) track("service_lane_view", { category: category.code });
  }, [category?.code]);

  if (!category) {
    return (<div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-foreground mb-2">Category Not Found</h1><Button asChild variant="outline"><Link to="/categories">View All Categories</Link></Button></div></main><Footer /></div>);
  }

  const heroImg = HERO_IMAGES[category.code];
  const heroAlt = HERO_ALT[category.code] || `LankaFix ${category.name} service`;
  const pricingRule = categoryPricingRules[category.code as CategoryCode];
  const hasEmergency = pricingRule && pricingRule.emergencySurchargePercent > 0;
  const allModes = Array.from(new Set(category.services.flatMap((s) => s.allowedModes)));
  const filteredServices = modeFilter === "all" ? category.services : category.services.filter((s) => s.allowedModes.includes(modeFilter));

  const handleServiceClick = (serviceCode: string, serviceName: string, mode: ServiceMode) => {
    setDraftCategory(category.code, category.name);
    setDraftService(serviceCode, serviceName);
    setDraftMode(mode);
    setDraftEmergency(emergency);
    track("service_lane_selected", { category: category.code, service: serviceCode, mode });
    navigate(`/precheck/${category.code}/${serviceCode}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        {/* Hero image banner */}
        {heroImg && (
          <div className="relative w-full h-48 md:h-64 overflow-hidden">
            <img
              src={heroImg}
              alt={heroAlt}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 container pb-4">
              <Link to="/categories" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white mb-2 transition-colors drop-shadow-sm">
                <ArrowLeft className="w-4 h-4" /> All Categories
              </Link>
            </div>
          </div>
        )}

        <div className="container py-6 max-w-3xl">
          {!heroImg && (
            <Link to="/categories" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> All Categories
            </Link>
          )}

          <h1 className="text-3xl font-bold text-foreground mb-1">{category.name}</h1>
          <p className="text-muted-foreground mb-3">{category.description}</p>

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-3 mb-4">
            {TRUST_BADGES.map((badge, i) => (
              <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-lankafix-green">{badge.icon}</span>
                <span className="text-xs font-medium">{badge.label}</span>
              </div>
            ))}
          </div>

          <TrustRibbon />

          {repeatBooking && (
            <RepeatServiceBanner previousBooking={repeatBooking} categoryCode={category.code} />
          )}

          <div className="flex flex-wrap gap-2 mb-4 mt-4">
            <Button variant={modeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setModeFilter("all")}>All</Button>
            {allModes.map((mode) => (<Button key={mode} variant={modeFilter === mode ? "default" : "outline"} size="sm" onClick={() => setModeFilter(mode)}>{SERVICE_MODE_LABELS[mode]}</Button>))}
          </div>
          {hasEmergency && (
            <button onClick={() => setEmergency(!emergency)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border mb-6 transition-all text-sm font-medium w-full ${emergency ? "bg-warning/10 border-warning/30 text-warning" : "bg-card border-border text-muted-foreground hover:border-warning/20"}`}>
              <Zap className={`w-4 h-4 ${emergency ? "text-warning" : ""}`} /><span>Emergency (Within 2 Hours)</span>
              {emergency && <Badge className="ml-auto bg-warning/20 text-warning border-0 text-xs">+{pricingRule.emergencySurchargePercent}% surcharge</Badge>}
            </button>
          )}
          <div className="space-y-3">
            {filteredServices.map((svc) => {
              const primaryMode = modeFilter !== "all" ? modeFilter : svc.allowedModes[0];
              return (
                <button key={svc.code} onClick={() => handleServiceClick(svc.code, svc.name, primaryMode)} className="w-full text-left bg-card rounded-xl border p-5 hover:shadow-md hover:border-primary/20 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{svc.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{svc.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">From <span className="font-bold text-foreground">LKR {svc.fromPrice.toLocaleString()}</span></span>
                        {svc.requiresDiagnostic && <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1"><Stethoscope className="w-3 h-3" /> Diagnostic</Badge>}
                        {svc.requiresQuote && <Badge variant="outline" className="text-xs border-warning/30 text-warning gap-1"><FileText className="w-3 h-3" /> Quote Required</Badge>}
                        <SLAChip normalMinutes={svc.slaMinutesNormal} emergencyMinutes={emergency ? svc.slaMinutesEmergency : undefined} typicalDurationMinutes={svc.typicalDurationMinutes} />
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
          {filteredServices.length === 0 && <div className="text-center py-12 text-muted-foreground">No services available for this mode.</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
