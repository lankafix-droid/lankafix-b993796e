import { Link } from "react-router-dom";
import { categories } from "@/data/mockData";
import { Snowflake, Camera, Smartphone, Monitor, Sun, Tv, Home, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ReactNode> = {
  Snowflake: <Snowflake className="w-6 h-6" />,
  Camera: <Camera className="w-6 h-6" />,
  Smartphone: <Smartphone className="w-6 h-6" />,
  Monitor: <Monitor className="w-6 h-6" />,
  Sun: <Sun className="w-6 h-6" />,
  Tv: <Tv className="w-6 h-6" />,
  Home: <Home className="w-6 h-6" />,
};

const CategoryGrid = () => {
  return (
    <section id="categories" className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Service Categories</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Choose from our verified service categories — each backed by trained professionals
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.code}`}
              className="group bg-card rounded-xl border p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {iconMap[cat.icon]}
                </div>
                {cat.quoteRequired && (
                  <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                    Quote
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{cat.name}</h3>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cat.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  From <span className="font-semibold text-foreground">LKR {cat.fromPrice.toLocaleString()}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
