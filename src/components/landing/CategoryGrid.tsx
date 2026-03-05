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

const CategoryGrid = () => {
  // Compute fastest SLA across services for each category
  const getMinSla = (cat: typeof categories[number]) => {
    const slas = cat.services.map((s) => s.slaMinutesNormal).filter((s): s is number => !!s);
    return slas.length > 0 ? Math.min(...slas) : undefined;
  };

  return (
    <section id="categories" className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Service Categories</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Choose from our verified service categories — each backed by trained professionals</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const minSla = getMinSla(cat);
            return (
              <Link key={cat.code} to={`/category/${cat.code}`} className="group bg-card rounded-xl border p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{iconMap[cat.icon] || <Monitor className="w-6 h-6" />}</div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {cat.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className={`text-[10px] ${tag === "Quote Required" || tag === "Inspection First" ? "border-warning/30 text-warning" : tag === "Remote Available" ? "border-primary/30 text-primary" : tag === "Store" || tag === "Delivery" ? "border-primary/30 text-primary" : "border-success/30 text-success"}`}>{tag}</Badge>
                    ))}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{cat.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cat.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">From <span className="font-semibold text-foreground">LKR {cat.fromPrice.toLocaleString()}</span></span>
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
