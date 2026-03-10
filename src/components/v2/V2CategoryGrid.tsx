import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { v2CategoryFlows, type V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, ShieldCheck, Package, Clock, Zap, Droplets, Wifi, Shield, BatteryCharging } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ReactNode> = {
  Snowflake: <Snowflake className="w-5 h-5" />,
  Camera: <Camera className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  Monitor: <Monitor className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Tv: <Tv className="w-5 h-5" />,
  Home: <Home className="w-5 h-5" />,
  Printer: <Printer className="w-5 h-5" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Droplets: <Droplets className="w-5 h-5" />,
  Wifi: <Wifi className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  BatteryCharging: <BatteryCharging className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
};

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

const categoryThumbs: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics,
  SMART_HOME_OFFICE: heroSmartHome, COPIER: heroCopier,
  PRINT_SUPPLIES: heroSupplies,
  ELECTRICAL: heroElectrical, PLUMBING: heroPlumbing,
  NETWORK: heroNetwork, HOME_SECURITY: heroHomeSecurity,
  POWER_BACKUP: heroPowerBackup, APPLIANCE_INSTALL: heroApplianceInstall,
};

const ESTIMATED_TIMES: Record<string, string> = {
  AC: "60–90 min", MOBILE: "45–90 min", IT: "60–120 min", CCTV: "2–4 hrs",
  SOLAR: "Half day", CONSUMER_ELEC: "60–120 min", SMART_HOME_OFFICE: "2–3 hrs",
  COPIER: "60–90 min", PRINT_SUPPLIES: "Delivery",
  ELECTRICAL: "45–90 min", PLUMBING: "60–90 min", NETWORK: "45–120 min",
  HOME_SECURITY: "2–4 hrs", POWER_BACKUP: "60–180 min", APPLIANCE_INSTALL: "60–180 min",
};

// Clearer pricing microcopy per archetype
const PRICING_MICROCOPY: Record<string, string> = {
  AC: "Inspection from Rs 2,500",
  MOBILE: "Repair from Rs 3,000",
  IT: "Diagnosis from Rs 2,000",
  ELECTRICAL: "Visit from Rs 1,500",
  PLUMBING: "Visit from Rs 1,500",
  NETWORK: "Setup from Rs 2,000",
  CCTV: "Site visit required · Quote after inspection",
  SMART_HOME_OFFICE: "Site visit required",
  HOME_SECURITY: "Inspection required · Custom quote",
  POWER_BACKUP: "From Rs 3,000 · Parts separate",
  SOLAR: "Free site inspection · Custom quote",
  CONSUMER_ELEC: "Final quote after diagnosis",
  COPIER: "Diagnosis from Rs 2,000",
  PRINT_SUPPLIES: "Delivery available",
  APPLIANCE_INSTALL: "From Rs 2,500 · Parts separate",
};

const PRICING_CHIPS: Record<V2PricingArchetype, { label: string; className: string }> = {
  fixed_price: { label: "Fixed Price", className: "bg-success text-success-foreground" },
  diagnostic_first: { label: "Diagnostic First", className: "bg-warning text-warning-foreground" },
  quote_required: { label: "Quote Required", className: "bg-primary text-primary-foreground" },
};

const GROUP_A = ["AC", "MOBILE", "IT", "ELECTRICAL", "PLUMBING", "NETWORK"];
const GROUP_B = ["CCTV", "SMART_HOME_OFFICE", "HOME_SECURITY", "POWER_BACKUP", "SOLAR"];
const GROUP_C = ["CONSUMER_ELEC", "COPIER", "PRINT_SUPPLIES", "APPLIANCE_INSTALL"];

const QUICK_BOOKS = [
  { label: "Broken Phone Screen", price: "Repair from Rs 5,000", link: "/book/MOBILE", icon: <Smartphone className="w-5 h-5" /> },
  { label: "AC Not Cooling", price: "Inspection Rs 2,500", link: "/book/AC", icon: <Snowflake className="w-5 h-5" /> },
  { label: "Laptop Screen Fix", price: "From Rs 8,000", link: "/book/IT", icon: <Monitor className="w-5 h-5" /> },
  { label: "Electrical Repair", price: "Visit from Rs 1,500", link: "/book/ELECTRICAL", icon: <Zap className="w-5 h-5" /> },
  { label: "Plumbing Fix", price: "Visit from Rs 1,500", link: "/book/PLUMBING", icon: <Droplets className="w-5 h-5" /> },
  { label: "WiFi / Router Issue", price: "From Rs 2,000", link: "/book/NETWORK", icon: <Wifi className="w-5 h-5" /> },
  { label: "TV Wall Mount", price: "From Rs 2,500", link: "/book/APPLIANCE_INSTALL", icon: <Monitor className="w-5 h-5" /> },
  { label: "UPS Installation", price: "From Rs 3,000", link: "/book/POWER_BACKUP", icon: <BatteryCharging className="w-5 h-5" /> },
];

const CategoryCard = ({ cat, featured = false, index = 0 }: { cat: typeof categories[0]; featured?: boolean; index?: number }) => {
  const thumb = categoryThumbs[cat.code];
  const flow = v2CategoryFlows[cat.code];
  const hasEmergency = cat.tags.includes("Emergency");
  const hasSameDay = cat.tags.includes("Same Day");
  const pricingChip = flow ? PRICING_CHIPS[flow.pricingArchetype] : null;
  const estTime = ESTIMATED_TIMES[cat.code];
  const pricingMicrocopy = PRICING_MICROCOPY[cat.code];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
    >
      <Link
        to={`/book/${cat.code}`}
        onClick={() => track("v2_category_click", { category: cat.code })}
        className="group block bg-card rounded-2xl border border-border/60 overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 active:scale-[0.98]"
      >
        <div className={`relative ${featured ? "h-36 sm:h-40" : "h-28 sm:h-32"} overflow-hidden`}>
          {thumb ? (
            <img src={thumb} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              {iconMap[cat.icon] || <Monitor className="w-8 h-8 text-muted-foreground" />}
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,27,51,0.70) 0%, rgba(8,27,51,0.15) 55%, transparent 100%)" }} />

          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            {hasEmergency && (
              <Badge variant="outline" className="text-[10px] bg-destructive text-destructive-foreground border-none font-semibold shadow-sm">
                ⚡ Emergency
              </Badge>
            )}
            {hasSameDay && !hasEmergency && (
              <Badge variant="outline" className="text-[10px] bg-success text-success-foreground border-none font-semibold shadow-sm">
                Same Day
              </Badge>
            )}
          </div>
          <div className="absolute top-2.5 right-2.5">
            {pricingChip && (
              <Badge variant="outline" className={`text-[10px] border-none font-semibold shadow-sm ${pricingChip.className}`}>
                {pricingChip.label}
              </Badge>
            )}
          </div>

          <div className="absolute bottom-2.5 left-3 right-3">
            <h3 className="font-heading font-bold text-primary-foreground text-sm leading-tight drop-shadow-lg">{cat.name}</h3>
          </div>
        </div>

        <div className="p-3.5">
          {/* Pricing microcopy — clearer per archetype */}
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
            {pricingMicrocopy || cat.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {estTime && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {estTime}
                </span>
              )}
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center group-hover:bg-gradient-brand group-hover:text-primary-foreground text-primary transition-all duration-300">
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
    className="mb-4"
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.4 }}
  >
    <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">{title}</h2>
    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
  </motion.div>
);

const V2CategoryGrid = () => {
  const groupA = categories.filter((c) => GROUP_A.includes(c.code));
  const groupB = categories.filter((c) => GROUP_B.includes(c.code));
  const groupC = categories.filter((c) => GROUP_C.includes(c.code));

  return (
    <section id="categories" className="pb-10">
      <div className="container space-y-10">
        {/* Quick Book */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1">Quick Book</h2>
            <p className="text-xs text-muted-foreground mb-4">Most popular services — book in seconds</p>
          </motion.div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {QUICK_BOOKS.map((qb, i) => (
              <motion.div
                key={qb.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="flex-shrink-0"
              >
                <Link
                  to={qb.link}
                  onClick={() => track("v2_quickbook_click", { label: qb.label })}
                  className="block w-36 bg-card rounded-2xl border border-border/60 p-4 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 group active:scale-[0.97]"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    {qb.icon}
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{qb.label}</p>
                  <p className="text-[10px] font-bold mt-1.5 text-gradient bg-gradient-brand bg-clip-text text-transparent">{qb.price}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Group A */}
        <div>
          <SectionHeader title="Popular Services" subtitle="Same-day availability · Emergency support" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {groupA.map((cat, i) => <CategoryCard key={cat.code} cat={cat} featured index={i} />)}
          </div>
        </div>

        {/* Group B */}
        <div>
          <SectionHeader title="Home & Office Systems" subtitle="Installations, security, and energy solutions" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {groupB.map((cat, i) => <CategoryCard key={cat.code} cat={cat} index={i} />)}
          </div>
        </div>

        {/* Group C */}
        <div>
          <SectionHeader title="More Technical Services" subtitle="Electronics, printers, and appliance support" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {groupC.map((cat, i) => <CategoryCard key={cat.code} cat={cat} index={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default V2CategoryGrid;
