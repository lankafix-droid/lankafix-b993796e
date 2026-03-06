import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SLAChip from "@/components/ui/SLAChip";
import { track } from "@/lib/analytics";
import mascotImg from "@/assets/lankafix-mascot.jpg";

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

// Category visual moods
const categoryMoods: Record<string, string> = {
  AC: "from-primary/8 to-primary/3",
  CCTV: "from-foreground/5 to-foreground/2",
  MOBILE: "from-accent/8 to-accent/3",
  IT: "from-primary/6 to-accent/3",
  SOLAR: "from-warning/8 to-warning/3",
  CONSUMER_ELEC: "from-primary/5 to-lankafix-green/3",
  COPIER: "from-muted-foreground/8 to-muted-foreground/3",
  SMART_HOME_OFFICE: "from-accent/6 to-primary/3",
  PRINT_SUPPLIES: "from-lankafix-green/6 to-lankafix-green/2",
};

// Category hero thumbnails
import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";
import heroSupplies from "@/assets/hero-supplies.jpg";

const categoryThumbs: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, COPIER: heroCopier,
  SMART_HOME_OFFICE: heroSmartHome, PRINT_SUPPLIES: heroSupplies,
};

function getAvailabilityChip(cat: typeof categories[number]): { label: string; color: string } | null {
  const hasEmergency = cat.tags.includes("Emergency") || cat.services.some((s) => s.slaMinutesEmergency);
  const hasSameDay = cat.tags.includes("Same Day");
  const hasRemote = cat.tags.includes("Remote Available") || cat.services.some((s) => s.allowedModes.includes("remote"));
  const hasDelivery = cat.tags.includes("Delivery") || cat.tags.includes("Store");

  if (hasEmergency) return { label: "Emergency", color: "border-lankafix-green/30 text-lankafix-green bg-lankafix-green/5" };
  if (hasSameDay) return { label: "Same Day", color: "border-lankafix-green/30 text-lankafix-green bg-lankafix-green/5" };
  if (hasRemote) return { label: "Remote", color: "border-primary/30 text-primary bg-primary/5" };
  if (hasDelivery) return { label: "Delivery", color: "border-primary/30 text-primary bg-primary/5" };
  return null;
}

function getPricingChip(cat: typeof categories[number]): { label: string; color: string } {
  if (cat.quoteRequired) {
    const hasInspection = cat.tags.includes("Inspection First");
    return hasInspection
      ? { label: "Inspection First", color: "border-warning/30 text-warning bg-warning/5" }
      : { label: "Quote Required", color: "border-warning/30 text-warning bg-warning/5" };
  }
  const hasDiagnostic = cat.services.some((s) => s.requiresDiagnostic);
  if (hasDiagnostic) return { label: "Estimate", color: "border-warning/30 text-warning bg-warning/5" };
  return { label: "Fixed Price", color: "border-lankafix-green/30 text-lankafix-green bg-lankafix-green/5" };
}

function getSelectedArea(): string {
  try {
    return localStorage.getItem("lankafix_area") || "Greater Colombo";
  } catch {
    return "Greater Colombo";
  }
}

const CategoryGrid = () => {
  const selectedArea = getSelectedArea();

  const getMinSla = (cat: typeof categories[number]) => {
    const slas = cat.services.map((s) => s.slaMinutesNormal).filter((s): s is number => !!s);
    return slas.length > 0 ? Math.min(...slas) : undefined;
  };

  return (
    <section id="categories" className="py-14 md:py-18">
      <div className="container">
        {/* Mascot welcome section */}
        <div className="flex items-center gap-4 mb-10 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-2xl p-5 md:p-6">
          <img
            src={mascotImg}
            alt="FixBuddy mascot"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-brand border-2 border-card shrink-0"
          />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Choose Your Service</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Browse our verified service categories below — each backed by trained, background-checked professionals across Sri Lanka.
            </p>
            <div className="inline-flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              Pricing for: <span className="font-semibold text-foreground">{selectedArea}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mb-6 max-w-md mx-auto">
          From price = base service within your zone. Parts, extra work & long-distance travel only after approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const minSla = getMinSla(cat);
            const availChip = getAvailabilityChip(cat);
            const priceChip = getPricingChip(cat);
            const mood = categoryMoods[cat.code] || "from-primary/5 to-primary/2";
            const thumb = categoryThumbs[cat.code];

            return (
              <Link
                key={cat.code}
                to={`/category/${cat.code}`}
                aria-label={`View ${cat.name} services`}
                onClick={() => track("category_card_click", { category: cat.code })}
                className={`group bg-card rounded-xl border overflow-hidden hover:shadow-lg hover:shadow-primary/8 hover:border-primary/25 transition-all duration-300`}
              >
                {/* Thumbnail */}
                {thumb && (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={thumb}
                      alt={`${cat.name} service`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${mood} from-card via-transparent to-transparent opacity-60`} />
                    <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
                      {availChip && (
                        <Badge variant="outline" className={`text-[10px] bg-card/80 backdrop-blur-sm ${availChip.color}`}>
                          {availChip.label}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] bg-card/80 backdrop-blur-sm ${priceChip.color}`}>
                        {priceChip.label}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-brand text-primary-foreground flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shrink-0">
                      {iconMap[cat.icon] || <Monitor className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{cat.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        From <span className="font-semibold text-foreground">LKR {cat.fromPrice.toLocaleString("en-LK")}</span>
                      </span>
                      {minSla && <SLAChip normalMinutes={minSla} compact />}
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
  );
};

export default CategoryGrid;
