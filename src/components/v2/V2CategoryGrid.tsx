import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { v2CategoryFlows } from "@/data/v2CategoryFlows";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, ShieldCheck, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// Phase-1 launch hierarchy
const PRIMARY_CODES = ["MOBILE", "AC"];
const CONTROLLED_CODES = ["IT", "CCTV", "CONSUMER_ELEC"];
const COMING_SOON_CODES = ["SOLAR", "SMART_HOME_OFFICE"];

const TIER_LABELS: Record<string, { label: string; className: string }> = {
  controlled: { label: "Limited", className: "bg-warning/90 text-warning-foreground" },
  coming_soon: { label: "Coming Soon", className: "bg-muted text-muted-foreground" },
};

const CategoryCard = ({ cat, tier }: { cat: typeof categories[0]; tier?: string }) => {
  const thumb = categoryThumbs[cat.code];
  const hasEmergency = cat.tags.includes("Emergency");
  const hasSameDay = cat.tags.includes("Same Day");
  const needsQuote = cat.quoteRequired;
  const isComingSoon = tier === "coming_soon";
  const flow = v2CategoryFlows[cat.code];
  const tierMeta = tier ? TIER_LABELS[tier] : undefined;

  const linkTo = isComingSoon
    ? `/v2/book/${cat.code}`
    : (flow ? `/v2/book/${cat.code}` : `/category/${cat.code}`);

  return (
    <Link
      to={linkTo}
      onClick={() => track("v2_category_click", { category: cat.code, tier })}
      className={`group bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
        isComingSoon ? "opacity-70 hover:opacity-90" : "hover:shadow-lg hover:shadow-primary/8 hover:border-primary/25"
      }`}
    >
      <div className="relative h-36 sm:h-40 overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {iconMap[cat.icon] || <Monitor className="w-8 h-8 text-muted-foreground" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1">
          {hasEmergency && !isComingSoon && (
            <Badge variant="outline" className="text-[10px] bg-destructive/90 text-destructive-foreground border-none">
              ⚡ Emergency
            </Badge>
          )}
          {hasSameDay && !hasEmergency && !isComingSoon && (
            <Badge variant="outline" className="text-[10px] bg-success/90 text-success-foreground border-none">
              Same Day
            </Badge>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 flex gap-1">
          {tierMeta && (
            <Badge variant="outline" className={`text-[10px] border-none ${tierMeta.className}`}>
              {tierMeta.label}
            </Badge>
          )}
          {!tierMeta && (
            <Badge variant="outline" className={`text-[10px] border-none ${needsQuote ? "bg-warning/90 text-warning-foreground" : "bg-success/90 text-success-foreground"}`}>
              {needsQuote ? "Quote Required" : "Fixed Price"}
            </Badge>
          )}
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
              {isComingSoon ? "Join Waitlist" : <>From <span className="font-bold text-foreground">Rs {cat.fromPrice.toLocaleString("en-LK")}</span></>}
            </span>
            {!isComingSoon && (
              <div className="flex items-center gap-0.5 text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-success" />
                <span className="text-[10px]">Verified</span>
              </div>
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
};

// ─── Quick Book Cards ──────────────────────────────────────────────
const QUICK_BOOKS = [
  { label: "Broken Phone Screen", price: "From Rs 5,000", link: "/v2/book/MOBILE", icon: <Smartphone className="w-5 h-5" /> },
  { label: "AC Not Cooling", price: "Inspection Rs 2,500", link: "/v2/book/AC", icon: <Snowflake className="w-5 h-5" /> },
  { label: "Laptop Repair", price: "From Rs 3,500", link: "/v2/book/IT", icon: <Monitor className="w-5 h-5" /> },
  { label: "CCTV Site Visit", price: "Rs 3,000", link: "/v2/book/CCTV", icon: <Camera className="w-5 h-5" /> },
  { label: "Appliance Inspection", price: "From Rs 1,500", link: "/v2/book/CONSUMER_ELEC", icon: <Tv className="w-5 h-5" /> },
];

const V2CategoryGrid = () => {
  const primary = categories.filter((c) => PRIMARY_CODES.includes(c.code));
  const controlled = categories.filter((c) => CONTROLLED_CODES.includes(c.code));
  const comingSoon = categories.filter((c) => COMING_SOON_CODES.includes(c.code));

  return (
    <section className="pb-10">
      <div className="container space-y-10">
        {/* Quick Book */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">Quick Book</h2>
          <p className="text-xs text-muted-foreground mb-4">Most popular services — book in seconds</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {QUICK_BOOKS.map((qb) => (
              <Link
                key={qb.label}
                to={qb.link}
                onClick={() => track("v2_quickbook_click", { label: qb.label })}
                className="flex-shrink-0 w-36 bg-card rounded-xl border p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  {qb.icon}
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">{qb.label}</p>
                <p className="text-[10px] text-primary font-medium mt-1">{qb.price}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Primary launch */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Top Services</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Same-day availability · Emergency support</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
            {primary.map((cat) => <CategoryCard key={cat.code} cat={cat} />)}
          </div>
        </div>

        {/* Controlled launch */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground">More Services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Limited availability · Inspection-first for complex jobs</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {controlled.map((cat) => <CategoryCard key={cat.code} cat={cat} tier="controlled" />)}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Coming Soon</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Join the waitlist to be notified</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
            {comingSoon.map((cat) => <CategoryCard key={cat.code} cat={cat} tier="coming_soon" />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default V2CategoryGrid;
