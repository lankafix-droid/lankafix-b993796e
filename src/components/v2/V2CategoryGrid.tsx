import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { v2CategoryFlows, type V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, ShieldCheck, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";

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

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroSupplies from "@/assets/hero-supplies.jpg";

const categoryThumbs: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics,
  SMART_HOME_OFFICE: heroSmartHome, COPIER: heroCopier,
  PRINT_SUPPLIES: heroSupplies,
};

const PRICING_CHIPS: Record<V2PricingArchetype, { label: string; className: string }> = {
  fixed_price: { label: "Fixed Price", className: "bg-success/90 text-success-foreground" },
  diagnostic_first: { label: "Diagnostic First", className: "bg-warning/90 text-warning-foreground" },
  quote_required: { label: "Quote Required", className: "bg-primary/90 text-primary-foreground" },
};

const PRIORITY_CODES = ["AC", "MOBILE", "IT", "CCTV"];
const MORE_CODES = ["CONSUMER_ELEC", "SOLAR", "SMART_HOME_OFFICE", "COPIER", "PRINT_SUPPLIES"];

const CategoryCard = ({ cat, featured = false }: { cat: typeof categories[0]; featured?: boolean }) => {
  const thumb = categoryThumbs[cat.code];
  const flow = v2CategoryFlows[cat.code];
  const hasEmergency = cat.tags.includes("Emergency");
  const hasSameDay = cat.tags.includes("Same Day");
  const pricingChip = flow ? PRICING_CHIPS[flow.pricingArchetype] : null;

  return (
    <Link
      to={`/book/${cat.code}`}
      onClick={() => track("v2_category_click", { category: cat.code })}
      className="group bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-primary/20 active:scale-[0.98]"
    >
      <div className={`relative ${featured ? "h-40 sm:h-44" : "h-32 sm:h-36"} overflow-hidden`}>
        {thumb ? (
          <img src={thumb} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {iconMap[cat.icon] || <Monitor className="w-8 h-8 text-muted-foreground" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1">
          {hasEmergency && (
            <Badge variant="outline" className="text-[10px] bg-destructive/90 text-destructive-foreground border-none font-medium">
              ⚡ Emergency
            </Badge>
          )}
          {hasSameDay && !hasEmergency && (
            <Badge variant="outline" className="text-[10px] bg-success/90 text-success-foreground border-none font-medium">
              Same Day
            </Badge>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5">
          {pricingChip && (
            <Badge variant="outline" className={`text-[10px] border-none font-medium ${pricingChip.className}`}>
              {pricingChip.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {iconMap[cat.icon] || <Monitor className="w-4.5 h-4.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm leading-tight">{cat.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground">
              From <span className="font-bold text-foreground">Rs {cat.fromPrice.toLocaleString("en-LK")}</span>
            </span>
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <ShieldCheck className="w-3 h-3 text-success" />
              <span className="text-[10px]">Verified</span>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// Quick Book horizontal cards
const QUICK_BOOKS = [
  { label: "Broken Phone Screen", price: "From Rs 5,000", link: "/book/MOBILE", icon: <Smartphone className="w-5 h-5" /> },
  { label: "AC Not Cooling", price: "Rs 2,500 inspection", link: "/book/AC", icon: <Snowflake className="w-5 h-5" /> },
  { label: "Laptop Screen Fix", price: "From Rs 8,000", link: "/book/IT", icon: <Monitor className="w-5 h-5" /> },
  { label: "SSD Upgrade", price: "From Rs 2,500", link: "/book/IT", icon: <Monitor className="w-5 h-5" /> },
  { label: "WiFi / Router Issue", price: "From Rs 2,000", link: "/book/IT", icon: <Monitor className="w-5 h-5" /> },
  { label: "Appliance Inspection", price: "From Rs 1,500", link: "/book/CONSUMER_ELEC", icon: <Tv className="w-5 h-5" /> },
  { label: "Printer Repair", price: "Rs 2,500 inspection", link: "/book/COPIER", icon: <Printer className="w-5 h-5" /> },
  { label: "Toner / Ink Order", price: "From Rs 1,500", link: "/book/PRINT_SUPPLIES", icon: <Package className="w-5 h-5" /> },
];

const V2CategoryGrid = () => {
  const priorityServices = categories.filter((c) => PRIORITY_CODES.includes(c.code));
  const moreServices = categories.filter((c) => MORE_CODES.includes(c.code));

  return (
    <section id="categories" className="pb-10">
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
                className="flex-shrink-0 w-36 bg-card rounded-xl border p-4 hover:border-primary/30 hover:shadow-sm transition-all group active:scale-[0.97]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  {qb.icon}
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">{qb.label}</p>
                <p className="text-[10px] text-primary font-medium mt-1.5">{qb.price}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Priority Services */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Popular Services</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Same-day availability · Emergency support</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {priorityServices.map((cat) => <CategoryCard key={cat.code} cat={cat} featured />)}
          </div>
        </div>

        {/* More Services */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground">More Services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">All categories live across Greater Colombo</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {moreServices.map((cat) => <CategoryCard key={cat.code} cat={cat} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default V2CategoryGrid;
