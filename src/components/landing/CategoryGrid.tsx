import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SLAChip from "@/components/ui/SLAChip";

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

/** Derive standardized availability chip from category data */
function getAvailabilityChip(cat: typeof categories[number]): { label: string; color: string } | null {
  const hasEmergency = cat.services.some((s) => s.slaMinutesEmergency);
  const hasSameDay = cat.tags.includes("Same Day");
  const hasRemote = cat.tags.includes("Remote Available") || cat.services.some((s) => s.allowedModes.includes("remote"));
  const hasDelivery = cat.tags.includes("Delivery") || cat.tags.includes("Store");

  if (hasEmergency) return { label: "Emergency", color: "border-success/30 text-success bg-success/5" };
  if (hasSameDay) return { label: "Same Day", color: "border-success/30 text-success bg-success/5" };
  if (hasRemote) return { label: "Remote", color: "border-primary/30 text-primary bg-primary/5" };
  if (hasDelivery) return { label: "Delivery", color: "border-primary/30 text-primary bg-primary/5" };
  return null;
}

/** Derive pricing type chip from category data */
function getPricingChip(cat: typeof categories[number]): { label: string; color: string } {
  if (cat.quoteRequired) {
    const hasInspection = cat.tags.includes("Inspection First");
    return hasInspection
      ? { label: "Inspection First", color: "border-warning/30 text-warning bg-warning/5" }
      : { label: "Quote Required", color: "border-warning/30 text-warning bg-warning/5" };
  }
  const hasDiagnostic = cat.services.some((s) => s.requiresDiagnostic);
  if (hasDiagnostic) return { label: "Estimate", color: "border-warning/30 text-warning bg-warning/5" };
  return { label: "Fixed Price", color: "border-success/30 text-success bg-success/5" };
}

const CategoryGrid = () => {
  const getMinSla = (cat: typeof categories[number]) => {
    const slas = cat.services.map((s) => s.slaMinutesNormal).filter((s): s is number => !!s);
    return slas.length > 0 ? Math.min(...slas) : undefined;
  };

  return (
    <section id="categories" className="py-14 md:py-18">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Service Categories</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Choose from our verified service categories — each backed by trained professionals
          </p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            From price = base service within your zone. Parts, extra work & long-distance travel only after approval.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const minSla = getMinSla(cat);
            const availChip = getAvailabilityChip(cat);
            const priceChip = getPricingChip(cat);

            return (
              <Link
                key={cat.code}
                to={`/category/${cat.code}`}
                className="group bg-card rounded-xl border p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {iconMap[cat.icon] || <Monitor className="w-6 h-6" />}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end max-w-[55%]">
                    {availChip && (
                      <Badge variant="outline" className={`text-[10px] ${availChip.color}`}>
                        {availChip.label}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${priceChip.color}`}>
                      {priceChip.label}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{cat.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cat.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      From <span className="font-semibold text-foreground">LKR {cat.fromPrice.toLocaleString("en-LK")}</span>
                    </span>
                    {minSla && <SLAChip normalMinutes={minSla} compact />}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
