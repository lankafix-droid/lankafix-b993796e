import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";
import { trackCategoryClick } from "@/lib/marketplaceAnalytics";
import { CONSUMER_CATEGORIES } from "@/data/consumerBookingCategories";
import { getCategoryLaunchState } from "@/config/categoryLaunchConfig";

const FEATURED_CODES = ["AC", "MOBILE", "IT", "CONSUMER_ELEC", "CCTV", "COPIER"];

const V2PopularServices = () => {
  const featured = FEATURED_CODES.map(code => CONSUMER_CATEGORIES.find(c => c.code === code)).filter(Boolean);

  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
          className="mb-5"
        >
          <h2 className="font-heading text-base md:text-lg font-bold text-foreground">Most Booked Services</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Trusted by homes and businesses across Greater Colombo</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {featured.map((cat, i) => {
            if (!cat) return null;
            const isComingSoon = getCategoryLaunchState(cat.code) === "coming_soon";

            return (
              <motion.div
                key={cat.code}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Link
                  to={`/book/${cat.code}`}
                  onClick={() => { track("homepage_popular_click", { label: cat.label }); trackCategoryClick(cat.code, "homepage_popular"); }}
                  className="group block bg-card rounded-2xl border border-border/40 p-4 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 active:scale-[0.97]"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors duration-300 text-xl">
                    {cat.icon}
                  </div>
                  <p className="text-sm font-bold text-foreground font-heading leading-tight mb-1">{cat.label}</p>
                  <p className="text-[11px] font-semibold text-primary/80 mb-0.5">{cat.priceHint}</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium">
                      <Clock className="w-3 h-3" />{cat.etaHint}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mb-2">{cat.description}</p>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {cat.archetypeLabel} <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default V2PopularServices;
