import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, Clock } from "lucide-react";
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
  Snowflake: <Snowflake className="w-6 h-6" />,
  Camera: <Camera className="w-6 h-6" />,
  Smartphone: <Smartphone className="w-6 h-6" />,
  Monitor: <Monitor className="w-6 h-6" />,
  Sun: <Sun className="w-6 h-6" />,
  Tv: <Tv className="w-6 h-6" />,
  Home: <Home className="w-6 h-6" />,
  Printer: <Printer className="w-6 h-6" />,
  ShoppingBag: <ShoppingBag className="w-6 h-6" />,
};

const categoryThumbs: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, COPIER: heroCopier,
  SMART_HOME_OFFICE: heroSmartHome,
};

const PHASE1_CODES = ["MOBILE", "IT", "AC", "CCTV"] as const;
const PHASE2_CODES = ["SOLAR", "CONSUMER_ELEC", "SMART_HOME_OFFICE", "COPIER"] as const;

const PHASE1_SUBTITLES: Record<string, string> = {
  MOBILE: "Screen, battery, charging port & software repairs",
  IT: "Laptop, desktop repairs, networking & data recovery",
  AC: "Gas top-up, installation, full service & repairs",
  CCTV: "Installation, repair, maintenance & remote setup",
};

const CategoryGrid = () => {
  const phase1 = PHASE1_CODES.map(code => categories.find(c => c.code === code)!).filter(Boolean);
  const phase2 = PHASE2_CODES.map(code => categories.find(c => c.code === code)!).filter(Boolean);

  return (
    <>
      {/* Phase-1: Popular Services */}
      <section id="popular-services" className="py-14 md:py-18">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Popular Services</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Our most requested services — verified technicians, transparent pricing, warranty included.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {phase1.map((cat) => {
              const thumb = categoryThumbs[cat.code];
              const subtitle = PHASE1_SUBTITLES[cat.code] || cat.description;
              const hasEmergency = cat.tags.includes("Emergency");

              return (
                <Link
                  key={cat.code}
                  to={`/category/${cat.code}`}
                  aria-label={`View ${cat.name} services`}
                  onClick={() => track("category_card_click", { category: cat.code })}
                  className="group bg-card rounded-2xl border overflow-hidden hover:shadow-lg hover:shadow-primary/8 hover:border-primary/25 transition-all duration-300"
                >
                  {/* Large thumbnail */}
                  <div className="relative h-44 sm:h-52 overflow-hidden">
                    {thumb && (
                      <img
                        src={thumb}
                        alt={`${cat.name} — verified LankaFix technician`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {hasEmergency && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/90 text-destructive-foreground border-none">
                          ⚡ Emergency
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-card/80 backdrop-blur-sm border-lankafix-green/30 text-lankafix-green">
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-brand text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                        {iconMap[cat.icon] || <Monitor className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-base">{cat.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          Starting from <span className="font-bold text-foreground">Rs {cat.fromPrice.toLocaleString("en-LK")}</span>
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="text-[11px]">Same day</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Phase-2: More Services / Coming Soon */}
      <section className="py-10 bg-muted/30">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">More Services</h2>
            <p className="text-xs text-muted-foreground mt-1">Launching soon across Sri Lanka</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {phase2.map((cat) => {
              const thumb = categoryThumbs[cat.code];
              return (
                <div
                  key={cat.code}
                  className="bg-card rounded-xl border overflow-hidden opacity-75 relative"
                >
                  {thumb && (
                    <div className="h-24 overflow-hidden">
                      <img
                        src={thumb}
                        alt={cat.name}
                        className="w-full h-full object-cover grayscale"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-3 text-center">
                    <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-1.5">
                      {iconMap[cat.icon] || <Monitor className="w-4 h-4" />}
                    </div>
                    <h4 className="text-xs font-semibold text-foreground">{cat.name}</h4>
                    <Badge variant="outline" className="text-[9px] mt-1.5 border-warning/30 text-warning bg-warning/5">
                      Coming Soon
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default CategoryGrid;
