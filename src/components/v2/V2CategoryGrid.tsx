import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { v2CategoryFlows } from "@/data/v2CategoryFlows";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";

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
};

const categoryThumbs: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, COPIER: heroCopier,
  SMART_HOME_OFFICE: heroSmartHome,
};

const PHASE1_CODES = ["AC", "MOBILE", "CONSUMER_ELEC", "CCTV"];
const PHASE2_CODES = ["IT", "SOLAR", "SMART_HOME_OFFICE", "COPIER", "PRINT_SUPPLIES"];

const CategoryCard = ({ cat }: { cat: typeof categories[0] }) => {
  const thumb = categoryThumbs[cat.code];
  const hasEmergency = cat.tags.includes("Emergency");
  const hasSameDay = cat.tags.includes("Same Day");
  const needsQuote = cat.quoteRequired;

  return (
    <Link
      to={`/category/${cat.code}`}
      onClick={() => track("v2_category_click", { category: cat.code })}
      className="group bg-card rounded-2xl border overflow-hidden hover:shadow-lg hover:shadow-primary/8 hover:border-primary/25 transition-all duration-300"
    >
      <div className="relative h-36 sm:h-40 overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={cat.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {iconMap[cat.icon] || <Monitor className="w-8 h-8 text-muted-foreground" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Availability badge */}
        <div className="absolute top-2.5 left-2.5">
          {hasEmergency && (
            <Badge variant="outline" className="text-[10px] bg-destructive/90 text-destructive-foreground border-none mr-1">
              ⚡ Emergency
            </Badge>
          )}
          {hasSameDay && !hasEmergency && (
            <Badge variant="outline" className="text-[10px] bg-lankafix-green/90 text-lankafix-green-foreground border-none">
              Same Day
            </Badge>
          )}
        </div>

        {/* Pricing badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge variant="outline" className={`text-[10px] border-none ${needsQuote ? "bg-warning/90 text-warning-foreground" : "bg-lankafix-green/90 text-lankafix-green-foreground"}`}>
            {needsQuote ? "Quote Required" : "Fixed Price"}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
            {iconMap[cat.icon] || <Monitor className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm leading-tight">{cat.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              From <span className="font-bold text-foreground">Rs {cat.fromPrice.toLocaleString("en-LK")}</span>
            </span>
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <ShieldCheck className="w-3 h-3 text-lankafix-green" />
              <span className="text-[10px]">Verified</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
};

const V2CategoryGrid = () => {
  const phase1 = categories.filter((c) => PHASE1_CODES.includes(c.code));
  const phase2 = categories.filter((c) => PHASE2_CODES.includes(c.code));

  return (
    <section className="pb-10">
      <div className="container space-y-10">
        {/* Phase 1 — Popular */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Popular Services</h2>
              <p className="text-xs text-muted-foreground mt-0.5">High-demand services with same-day availability</p>
            </div>
            <Link to="/categories" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {phase1.map((cat) => <CategoryCard key={cat.code} cat={cat} />)}
          </div>
        </div>

        {/* Phase 2 — Specialized */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Specialized Services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Expert solutions for complex projects</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            {phase2.map((cat) => <CategoryCard key={cat.code} cat={cat} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default V2CategoryGrid;
