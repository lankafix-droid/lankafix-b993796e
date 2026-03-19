import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { v2CategoryFlows, type V2PricingArchetype } from "@/data/v2CategoryFlows";
import { getCategoryLaunchState } from "@/config/categoryLaunchConfig";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, Package, Clock, Zap, Droplets, Wifi, Shield, BatteryCharging } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";
import { logCategoryInterest } from "@/lib/demandCapture";
import { motion } from "framer-motion";
import { useUserBehavior } from "@/hooks/useUserBehavior";
import { useSupplyIntelligence, type CategorySupplyDetail } from "@/hooks/useSupplyIntelligence";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroSupplies from "@/assets/hero-supplies.jpg";
import heroElectrical from "@/assets/hero-electrical-service.jpg";
import heroPlumbing from "@/assets/hero-plumbing-service.jpg";
import heroNetwork from "@/assets/hero-network-service.jpg";
import heroHomeSecurity from "@/assets/hero-home-security-service.jpg";
import heroPowerBackup from "@/assets/hero-power-backup-service.jpg";
import heroApplianceInstall from "@/assets/hero-appliance-install-service.jpg";

const iconMap: Record<string, React.ReactNode> = {
  Snowflake: <Snowflake className="w-5 h-5" />, Camera: <Camera className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />, Monitor: <Monitor className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />, Tv: <Tv className="w-5 h-5" />, Home: <Home className="w-5 h-5" />,
  Printer: <Printer className="w-5 h-5" />, ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />, Droplets: <Droplets className="w-5 h-5" />,
  Wifi: <Wifi className="w-5 h-5" />, Shield: <Shield className="w-5 h-5" />,
  BatteryCharging: <BatteryCharging className="w-5 h-5" />, Package: <Package className="w-5 h-5" />,
};

const categoryThumbs: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, SMART_HOME_OFFICE: heroSmartHome,
  COPIER: heroCopier, PRINT_SUPPLIES: heroSupplies, ELECTRICAL: heroElectrical,
  PLUMBING: heroPlumbing, NETWORK: heroNetwork, HOME_SECURITY: heroHomeSecurity,
  POWER_BACKUP: heroPowerBackup, APPLIANCE_INSTALL: heroApplianceInstall,
};

const ESTIMATED_TIMES: Record<string, string> = {
  AC: "60–90 min", MOBILE: "45–90 min", IT: "60–120 min", CCTV: "2–4 hrs",
  SOLAR: "Half day", CONSUMER_ELEC: "60–120 min", SMART_HOME_OFFICE: "2–3 hrs",
  COPIER: "60–90 min", PRINT_SUPPLIES: "Delivery", ELECTRICAL: "45–90 min",
  PLUMBING: "60–90 min", NETWORK: "45–120 min", HOME_SECURITY: "2–4 hrs",
  POWER_BACKUP: "60–180 min", APPLIANCE_INSTALL: "60–180 min",
};

const PRICING_MICROCOPY: Record<string, string> = {
  AC: "Inspection from Rs 2,500", MOBILE: "Repair from Rs 3,000",
  IT: "Diagnosis from Rs 2,000", CONSUMER_ELEC: "Quote after diagnosis",
  CCTV: "Quote after site visit", SMART_HOME_OFFICE: "Project quote after assessment",
  SOLAR: "Free site inspection",
  ELECTRICAL: "Visit from Rs 1,500", PLUMBING: "Visit from Rs 1,500",
  NETWORK: "Setup from Rs 2,000",
  HOME_SECURITY: "Equipment quoted separately", POWER_BACKUP: "From Rs 3,000",
  COPIER: "Diagnosis from Rs 2,000", PRINT_SUPPLIES: "Delivery available",
  APPLIANCE_INSTALL: "From Rs 2,500",
};

const PRICING_CHIPS: Record<V2PricingArchetype, { label: string; className: string }> = {
  fixed_price: { label: "Fixed Price", className: "bg-success/90 text-success-foreground" },
  diagnostic_first: { label: "Diagnostic First", className: "bg-warning/90 text-warning-foreground" },
  quote_required: { label: "Quote Required", className: "bg-primary/90 text-primary-foreground" },
};

// Phase-1 launch priority: primary categories first, then secondary, then coming soon
const PRIMARY_CATS = ["AC", "MOBILE", "CONSUMER_ELEC", "IT"];
const SECONDARY_CATS = ["CCTV", "SOLAR", "SMART_HOME_OFFICE"];
const COMING_SOON_CATS = ["ELECTRICAL", "PLUMBING", "NETWORK", "HOME_SECURITY", "POWER_BACKUP", "COPIER", "PRINT_SUPPLIES", "APPLIANCE_INSTALL"];

/** Reorder categories by user behavior — recently used categories first */
function reorderByBehavior(codes: string[], rankedCategories: string[]): string[] {
  if (rankedCategories.length === 0) return codes;
  
  const ranked = new Map(rankedCategories.map((c, i) => [c, i]));
  return [...codes].sort((a, b) => {
    const aRank = ranked.get(a) ?? 999;
    const bRank = ranked.get(b) ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    // Preserve original order for unranked items
    return codes.indexOf(a) - codes.indexOf(b);
  });
}

const CategoryCard = ({ cat, featured = false, index = 0, recentlyUsed = false, supplyDetail }: { cat: typeof categories[0]; featured?: boolean; index?: number; recentlyUsed?: boolean; supplyDetail?: CategorySupplyDetail }) => {
  const thumb = categoryThumbs[cat.code];
  const flow = v2CategoryFlows[cat.code];
  const launchState = getCategoryLaunchState(cat.code);
  const hasEmergency = cat.tags.includes("Emergency");
  const hasSameDay = cat.tags.includes("Same Day");
  const pricingChip = flow ? PRICING_CHIPS[flow.pricingArchetype] : null;
  const estTime = ESTIMATED_TIMES[cat.code];
  const pricingMicrocopy = PRICING_MICROCOPY[cat.code];
  const isComingSoon = launchState === "coming_soon";
  const isConsultation = launchState === "consultation";

  const linkTarget = isComingSoon ? "/waitlist" : `/book/${cat.code}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={linkTarget}
        onClick={() => {
          track("homepage_category_click", { category: cat.code, launchState });
          if (isComingSoon) {
            logCategoryInterest(cat.code, "category_grid");
          }
        }}
        className={`group block bg-card rounded-2xl border border-border/40 overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-primary/20 active:scale-[0.97] ${isComingSoon ? "opacity-60" : ""}`}
      >
        <div className={`relative ${featured ? "h-32 sm:h-36" : "h-24 sm:h-28"} overflow-hidden`}>
          {thumb ? (
            <img src={thumb} alt={cat.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${isComingSoon ? "grayscale" : ""}`} loading="lazy" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              {iconMap[cat.icon] || <Monitor className="w-8 h-8 text-muted-foreground" />}
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(213 75% 8% / 0.8) 0%, hsl(213 75% 8% / 0.15) 55%, transparent 100%)" }} />

          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            {recentlyUsed && !isComingSoon && (
              <Badge variant="outline" className="text-[9px] bg-primary/90 text-primary-foreground border-none font-bold shadow-sm px-2 py-0.5">
                Recently Used
              </Badge>
            )}
            {isComingSoon && (
              <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-none font-bold shadow-sm px-2 py-0.5">
                Coming Soon
              </Badge>
            )}
            {isConsultation && (
              <Badge variant="outline" className="text-[9px] bg-accent text-accent-foreground border-none font-bold shadow-sm px-2 py-0.5">
                Consultation
              </Badge>
            )}
            {!isComingSoon && !isConsultation && recentlyUsed && (
              <Badge variant="outline" className="text-[9px] bg-primary/90 text-primary-foreground border-none font-bold shadow-sm px-2 py-0.5">
                Recently Used
              </Badge>
            )}
            {!isComingSoon && !isConsultation && !recentlyUsed && hasEmergency && (
              <Badge variant="outline" className="text-[9px] bg-destructive text-destructive-foreground border-none font-bold shadow-sm px-2 py-0.5">
                ⚡ Emergency
              </Badge>
            )}
            {!isComingSoon && !isConsultation && !recentlyUsed && hasSameDay && !hasEmergency && (
              <Badge variant="outline" className="text-[9px] bg-success text-success-foreground border-none font-bold shadow-sm px-2 py-0.5">
                Same Day
              </Badge>
            )}
          </div>

          {/* Archetype-aware availability badge */}
          {!isComingSoon && supplyDetail && (
            <div className="absolute top-2.5 right-2.5">
              <Badge variant="outline" className={`text-[9px] border-none font-bold shadow-sm px-2 py-0.5 ${supplyDetail.badgeClass}`}>
                {supplyDetail.availabilityLabel}
              </Badge>
            </div>
          )}

          <div className="absolute bottom-2.5 left-3 right-3">
            <h3 className="font-heading font-bold text-white text-sm leading-tight drop-shadow-lg">{cat.name}</h3>
          </div>
        </div>

        <div className="p-3.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
            {isComingSoon ? "Launching soon — join the waitlist" : isConsultation ? "Submit your requirement for a custom quote" : (pricingMicrocopy || cat.description)}
          </p>
          <div className="flex items-center justify-between">
            {!isComingSoon && estTime && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <Clock className="w-3 h-3" />
                {estTime}
              </span>
            )}
            <div className="w-7 h-7 rounded-full bg-primary/8 flex items-center justify-center group-hover:bg-gradient-brand group-hover:text-primary-foreground text-primary transition-colors ml-auto">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div
    className="mb-5"
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  >
    <h2 className="font-heading text-lg font-bold text-foreground tracking-tight">{title}</h2>
    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
  </motion.div>
);

const V2CategoryGrid = () => {
  const { rankedCategories, isReturningUser } = useUserBehavior();
  const { categorySupply } = useSupplyIntelligence();

  const primary = categories.filter((c) => PRIMARY_CATS.includes(c.code));
  const secondary = categories.filter((c) => SECONDARY_CATS.includes(c.code));
  const comingSoon = categories.filter((c) => COMING_SOON_CATS.includes(c.code));

  // Dynamically reorder primary/secondary based on user behavior
  const reorderedPrimary = reorderByBehavior(PRIMARY_CATS, rankedCategories);
  const reorderedSecondary = reorderByBehavior(SECONDARY_CATS, rankedCategories);

  const sortByOrder = (cats: typeof categories, order: string[]) =>
    [...cats].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));

  // Track which categories user has booked before
  const usedCategorySet = new Set(rankedCategories);

  return (
    <section id="categories" className="pb-12">
      <div className="container space-y-10">
        {/* Primary — Phase-1 launch categories */}
        <div>
          <SectionHeader
            title={isReturningUser ? "Your Services" : "Launch Services"}
            subtitle={isReturningUser ? "Personalized based on your history" : "Available now across Greater Colombo"}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {sortByOrder(primary, reorderedPrimary).map((cat, i) => (
              <CategoryCard
                key={cat.code}
                cat={cat}
                featured
                index={i}
                recentlyUsed={isReturningUser && usedCategorySet.has(cat.code)}
                supplyDetail={categorySupply[cat.code]}
              />
            ))}
          </div>
        </div>

        {/* Secondary — consultation / project-based */}
        <div>
          <SectionHeader title="More Solutions" subtitle="Installations, energy & automation" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortByOrder(secondary, reorderedSecondary).map((cat, i) => (
              <CategoryCard
                key={cat.code}
                cat={cat}
                index={i}
                recentlyUsed={isReturningUser && usedCategorySet.has(cat.code)}
                supplyDetail={categorySupply[cat.code]}
              />
            ))}
          </div>
        </div>

        {/* Coming Soon — demand capture */}
        {comingSoon.length > 0 && (
          <div>
            <SectionHeader title="Coming Soon" subtitle="Join the waitlist to get early access" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {sortByOrder(comingSoon, COMING_SOON_CATS).map((cat, i) => (
                <CategoryCard key={cat.code} cat={cat} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default V2CategoryGrid;
