import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { categories } from "@/data/categories";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, Printer, ShoppingBag, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TrustRibbon from "@/components/landing/TrustRibbon";
import SLAChip from "@/components/ui/SLAChip";

const iconMap: Record<string, React.ReactNode> = {
  Snowflake: <Snowflake className="w-7 h-7" />,
  Camera: <Camera className="w-7 h-7" />,
  Smartphone: <Smartphone className="w-7 h-7" />,
  Monitor: <Monitor className="w-7 h-7" />,
  Sun: <Sun className="w-7 h-7" />,
  Tv: <Tv className="w-7 h-7" />,
  Home: <Home className="w-7 h-7" />,
  Printer: <Printer className="w-7 h-7" />,
  ShoppingBag: <ShoppingBag className="w-7 h-7" />,
};

const CategoriesPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">All Service Categories</h1>
          <p className="text-muted-foreground mb-4">Choose a category to browse services and book</p>
          <TrustRibbon />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {categories.map((cat) => {
              const minSla = Math.min(...cat.services.map((s) => s.slaMinutesNormal || 999));
              return (
                <Link
                  key={cat.code}
                  to={`/category/${cat.code}`}
                  className="group bg-card rounded-xl border p-6 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {iconMap[cat.icon] || <Monitor className="w-7 h-7" />}
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {cat.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`text-xs ${tag === "Quote Required" || tag === "Inspection First" ? "border-warning/30 text-warning" : tag === "Remote Available" ? "border-primary/30 text-primary" : tag === "Store" || tag === "Delivery" ? "border-primary/30 text-primary" : "border-success/30 text-success"}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{cat.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      From <span className="font-bold text-foreground">LKR {cat.fromPrice.toLocaleString()}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {minSla < 999 && (
                    <SLAChip normalMinutes={minSla} compact />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoriesPage;